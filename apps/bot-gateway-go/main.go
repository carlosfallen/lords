package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"

	_ "github.com/mattn/go-sqlite3"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "imp-gateway/pb" // The generated protobuf
)

// Global reference to the gRPC client
var engineClient pb.CognitiveEngineClient

// Global WhatsApp state accessible by HTTP handlers
// WhatsAppSession wraps a client and its metadata
type WhatsAppSession struct {
	Client    *whatsmeow.Client
	Connected bool
	QRCode    string
	Generating bool
}

// Global state now manages multiple sessions keyed by TenantID
var (
	sessions    = make(map[string]*WhatsAppSession)
	sessionsMu  sync.RWMutex
	redisPub    *redis.Client
)

func getSession(tenantID string) *WhatsAppSession {
	sessionsMu.Lock()
	defer sessionsMu.Unlock()
	s, ok := sessions[tenantID]
	if !ok {
		s = &WhatsAppSession{}
		sessions[tenantID] = s
	}
	return s
}

type OutboundPayload struct {
	Type     string `json:"type"`
	Phone    string `json:"phone"`
	Text     string `json:"text"`
	TenantID string `json:"tenantId"` // Added for isolation
	TypingMs int    `json:"typingMs"` // If > 0, show composing indicator for this duration before sending
}

// WaMessageEvent is the payload published to Redis channel:wa_messages
type WaMessageEvent struct {
	Type      string `json:"type"`      // "message.new" | "message.history" | "message.sent"
	JID       string `json:"jid"`       // full JID e.g. "5511999@s.whatsapp.net"
	Phone     string `json:"phone"`     // normalized phone e.g. "5511999"
	PushName  string `json:"pushName"`  // contact push name from WA
	Text      string `json:"text"`
	MsgID     string `json:"msgId"`
	Timestamp int64  `json:"timestamp"` // unix millis
	IsFromMe  bool   `json:"isFromMe"`
	MediaType string `json:"mediaType,omitempty"` // "image"|"audio"|"document"|"" for text
	TenantID  string `json:"tenantId"`            // Added for isolation
}

// publishWaMessage sends a message event to Redis for the API to persist
func publishWaMessage(evt WaMessageEvent) {
	if redisPub == nil {
		return
	}
	data, err := json.Marshal(evt)
	if err != nil {
		log.Printf("⚠️ Erro ao serializar evento WA: %v", err)
		return
	}
	redisPub.Publish(context.Background(), "channel:wa_messages", string(data))
}

// extractPhone strips @s.whatsapp.net from JID to get clean phone number
func extractPhone(jid string) string {
	parts := strings.SplitN(jid, "@", 2)
	if len(parts) > 0 {
		return parts[0]
	}
	return jid
}

// eventHandler receives all messages and events from Whatsmeow
func eventHandler(tenantID string, evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		text := v.Message.GetConversation()
		if text == "" {
			text = v.Message.GetExtendedTextMessage().GetText()
		}

		mediaType := ""
		if v.Message.GetImageMessage() != nil {
			mediaType = "image"
			if text == "" { text = v.Message.GetImageMessage().GetCaption() }
		} else if v.Message.GetAudioMessage() != nil {
			mediaType = "audio"
		} else if v.Message.GetDocumentMessage() != nil {
			mediaType = "document"
			if text == "" { text = v.Message.GetDocumentMessage().GetFileName() }
		} else if v.Message.GetVideoMessage() != nil {
			mediaType = "video"
			if text == "" { text = v.Message.GetVideoMessage().GetCaption() }
		}

		if text == "" && mediaType == "" { return }
		if text == "" { text = fmt.Sprintf("[%s]", mediaType) }
		if v.Info.IsGroup { return }

		senderJID := v.Info.Sender.ToNonAD().String()
		chatJID := v.Info.Chat.ToNonAD().String()
		msgID := v.Info.ID
		pushName := v.Info.PushName
		isFromMe := v.Info.IsFromMe

		contactJID := chatJID
		if !isFromMe { contactJID = senderJID }

		log.Printf("[WA][%s] %s | from_me=%v | %s", tenantID, contactJID, isFromMe, text[:min(len(text), 50)])

		publishWaMessage(WaMessageEvent{
			Type:      "message.new",
			JID:       contactJID,
			Phone:     extractPhone(contactJID),
			PushName:  pushName,
			Text:      text,
			MsgID:     msgID,
			Timestamp: v.Info.Timestamp.UnixMilli(),
			IsFromMe:  isFromMe,
			MediaType: mediaType,
			TenantID:  tenantID,
		})

		if !isFromMe {
			// Phase 8: Brain invocation is now managed centrally by the Node.js API to enforce Mode routing.
			// We no longer call engineClient.ProcessMessage here directly.
			log.Printf("[WA][%s] Message from %s. Awaiting Node.js routing...", tenantID, contactJID)
		}

	case *events.Connected:
		s := getSession(tenantID)
		s.Connected = true
		s.QRCode = ""
		s.Generating = false
		log.Printf("✅ [%s] WhatsApp conectado", tenantID)

		// Send presence to trigger history sync delivery
		if s.Client != nil {
			_ = s.Client.SendPresence(context.Background(), types.PresenceAvailable)
		}

	case *events.Disconnected:
		s := getSession(tenantID)
		s.Connected = false
		log.Printf("🔌 [%s] WhatsApp desconectado", tenantID)

	case *events.HistorySync:
		// Handle historical message sync from WhatsApp
		data := v.Data
		if data == nil { return }
		log.Printf("📜 [%s] History sync received: %d conversations", tenantID, len(data.GetConversations()))

		for _, conv := range data.GetConversations() {
			chatJID := conv.GetID()
			if chatJID == "" { continue }
			// Skip group chats
			if strings.Contains(chatJID, "@g.us") { continue }

			phone := extractPhone(chatJID)
			displayName := conv.GetDisplayName()

			for _, histMsg := range conv.GetMessages() {
				msg := histMsg.GetMessage()
				if msg == nil || msg.GetMessage() == nil { continue }

				msgInfo := msg.GetMessage()
				text := ""
				mediaType := ""

				// Extract text from various message types
				if msgInfo.GetConversation() != "" {
					text = msgInfo.GetConversation()
				} else if msgInfo.GetExtendedTextMessage() != nil {
					text = msgInfo.GetExtendedTextMessage().GetText()
				} else if msgInfo.GetImageMessage() != nil {
					mediaType = "image"
					text = msgInfo.GetImageMessage().GetCaption()
				} else if msgInfo.GetVideoMessage() != nil {
					mediaType = "video"
					text = msgInfo.GetVideoMessage().GetCaption()
				} else if msgInfo.GetDocumentMessage() != nil {
					mediaType = "document"
					text = msgInfo.GetDocumentMessage().GetFileName()
				} else if msgInfo.GetAudioMessage() != nil {
					mediaType = "audio"
				}

				if text == "" && mediaType == "" { continue }
				if text == "" { text = fmt.Sprintf("[%s]", mediaType) }

				isFromMe := msg.GetKey().GetFromMe()
				msgID := msg.GetKey().GetID()
				ts := int64(msg.GetMessageTimestamp()) * 1000 // Convert to milliseconds

				publishWaMessage(WaMessageEvent{
					Type:      "message.history",
					JID:       chatJID,
					Phone:     phone,
					PushName:  displayName,
					Text:      text,
					MsgID:     msgID,
					Timestamp: ts,
					IsFromMe:  isFromMe,
					MediaType: mediaType,
					TenantID:  tenantID,
				})
			}
		}
		log.Printf("📜 [%s] History sync processing complete", tenantID)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// ─── HTTP API Handlers ──────────────────────────────────────

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Content-Type", "application/json")
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		next(w, r)
	}
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	tenantID := r.URL.Query().Get("tenantId")
	if tenantID == "" {
		tenantID = os.Getenv("TENANT_ID")
	}

	sessionsMu.RLock()
	s, ok := sessions[tenantID]
	sessionsMu.RUnlock()

	status := "disconnected"
	phoneNumber := ""

	if ok && s.Client != nil && s.Client.IsConnected() && s.Client.Store.ID != nil {
		status = "connected"
		phoneNumber = s.Client.Store.ID.User
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"status":      status,
			"phoneNumber": phoneNumber,
			"connected":   status == "connected",
		},
	})
}

func handleQRCode(w http.ResponseWriter, r *http.Request) {
	tenantID := r.URL.Query().Get("tenantId")
	if tenantID == "" {
		tenantID = os.Getenv("TENANT_ID")
	}

	sessionsMu.RLock()
	s, ok := sessions[tenantID]
	sessionsMu.RUnlock()

	if !ok || s.Client == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Sessão não inicializada para este tenant",
		})
		return
	}

	isSocketOpen := s.Client.IsConnected()
	hasSession := s.Client.Store.ID != nil
	connected := isSocketOpen && hasSession

	if connected {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "WhatsApp já está conectado.",
		})
		return
	}

	if s.QRCode != "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    map[string]interface{}{"value": s.QRCode},
		})
		return
	}

	if !s.Generating {
		go startQRFlow(tenantID)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   "QR Code sendo gerado. Tente em instantes.",
	})
}

func startQRFlow(tenantID string) {
	s := getSession(tenantID)
	
	sessionsMu.Lock()
	if s.Generating || (s.Client != nil && s.Client.IsConnected() && s.Client.Store.ID != nil) {
		sessionsMu.Unlock()
		return
	}
	s.Generating = true
	client := s.Client
	sessionsMu.Unlock()

	if client == nil { return }

	if client.IsConnected() {
		client.Disconnect()
		time.Sleep(500 * time.Millisecond)
	}

	qrChan, _ := client.GetQRChannel(context.Background())
	err := client.Connect()
	if err != nil {
		log.Printf("❌ [%s] Erro ao conectar para QR: %v", tenantID, err)
		sessionsMu.Lock()
		s.Generating = false
		sessionsMu.Unlock()
		return
	}

	for evt := range qrChan {
		sessionsMu.Lock()
		if evt.Event == "code" {
			s.QRCode = evt.Code
			log.Printf("📱 [%s] Novo QR Code gerado", tenantID)
		} else if evt.Event == "success" {
			s.Connected = true
			s.QRCode = ""
			s.Generating = false
		} else if evt.Event == "timeout" {
			s.QRCode = ""
			s.Generating = false
		}
		sessionsMu.Unlock()
	}

	sessionsMu.Lock()
	s.Generating = false
	sessionsMu.Unlock()
}

func handleDisconnect(w http.ResponseWriter, r *http.Request) {
	tenantID := r.URL.Query().Get("tenantId")
	if tenantID == "" {
		tenantID = os.Getenv("TENANT_ID")
	}

	sessionsMu.Lock()
	s, ok := sessions[tenantID]
	if ok && s.Client != nil {
		if s.Client.Store.ID != nil {
			s.Client.Logout(context.Background())
		}
		s.Client.Disconnect()
		s.Connected = false
		s.QRCode = ""
		s.Generating = false
		log.Printf("🔌 [%s] WhatsApp desconectado via API", tenantID)
	}
	sessionsMu.Unlock()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    map[string]interface{}{"status": "disconnected"},
	})
}

func handleReconnect(w http.ResponseWriter, r *http.Request) {
	tenantID := r.URL.Query().Get("tenantId")
	if tenantID == "" {
		tenantID = os.Getenv("TENANT_ID")
	}

	s := getSession(tenantID)
	if s.Client == nil {
		// Try to initialize a new client if missing
		// For now we'll return error as we need a DeviceStore
		http.Error(w, "Session not initialized", 400)
		return
	}

	if s.Client.Store.ID != nil {
		s.Client.Logout(context.Background())
		time.Sleep(300 * time.Millisecond)
	}

	if s.Client.IsConnected() {
		s.Client.Disconnect()
		time.Sleep(300 * time.Millisecond)
	}

	s.Connected = false
	s.QRCode = ""

	go startQRFlow(tenantID)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{"status": "qr_generating"},
	})
}

// ─── Brain API Route ────────────────────────────────────────

type AskBrainPayload struct {
	PhoneID   string `json:"phoneId"`
	Text      string `json:"text"`
	Timestamp int64  `json:"timestamp"`
	MessageID string `json:"messageId"`
	TenantID  string `json:"tenantId"`
}

func handleAskBrain(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}

	var p AskBrainPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid payload", 400)
		return
	}

	if engineClient == nil {
		http.Error(w, "Brain engine not connected", 503)
		return
	}

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
		defer cancel()
		_, err := engineClient.ProcessMessage(ctx, &pb.IncomingMessage{
			PhoneId:   p.PhoneID,
			Text:      p.Text,
			Timestamp: p.Timestamp,
			MessageId: p.MessageID,
			TenantId:  p.TenantID,
		})
		if err != nil {
			log.Printf("[gRPC Error][%s] Failed to trigger Brain from API: %v", p.TenantID, err)
		}
	}()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "sent to brain",
	})
}

func startHTTPServer(port string) {
	mux := http.NewServeMux()
	mux.HandleFunc("/status", corsMiddleware(handleStatus))
	mux.HandleFunc("/qr", corsMiddleware(handleQRCode))
	mux.HandleFunc("/disconnect", corsMiddleware(handleDisconnect))
	mux.HandleFunc("/reconnect", corsMiddleware(handleReconnect))
	mux.HandleFunc("/api/brain/ask", corsMiddleware(handleAskBrain))
	mux.HandleFunc("/health", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	}))

	log.Printf("🌐 HTTP API listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("HTTP server failed: %v", err)
	}
}

func initSession(container *sqlstore.Container, tenantID string) *WhatsAppSession {
	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		log.Fatalf("Failed to get device for %s: %v", tenantID, err)
	}

	clientLog := waLog.Stdout("Client", "WARN", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	
	// Register event handler with tenant context
	client.AddEventHandler(func(evt interface{}) {
		eventHandler(tenantID, evt)
	})

	s := getSession(tenantID)
	s.Client = client
	return s
}

func main() {
	fmt.Println("🦈 Músculo Gateway Go: Multi-Tenant Mode")

	grpcHost := os.Getenv("RUST_ENGINE_ADDR")
	if grpcHost == "" { grpcHost = "localhost:4051" }

	conn, err := grpc.Dial(grpcHost, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed gRPC connection: %v", err)
	}
	defer conn.Close()
	engineClient = pb.NewCognitiveEngineClient(conn)

	httpPort := os.Getenv("HTTP_PORT")
	if httpPort == "" { httpPort = "8080" }
	go startHTTPServer(httpPort)

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" { redisURL = "redis://localhost:6379" }
	opt, _ := redis.ParseURL(redisURL)
	redisPub = redis.NewClient(opt)

	container, err := sqlstore.New(context.Background(), "sqlite3", "file:/app/data/gatewaystore.db?_foreign_keys=on", nil)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// For Phase 7, we boot one primary tenant from ENV, but handle others via API/Discovery
	tenantID := os.Getenv("TENANT_ID")
	if tenantID == "" { tenantID = "default" }
	
	s := initSession(container, tenantID)
	if s.Client.Store.ID != nil {
		if err := s.Client.Connect(); err != nil {
			log.Printf("⚠️ [%s] Failed to auto-connect: %v", tenantID, err)
		} else {
			s.Connected = true
			log.Printf("✅ [%s] Gateway online", tenantID)
		}
	}

	// 4. Redis Subscriber for multi-tenant outbound
	go func() {
		rdb := redis.NewClient(opt)
		ctx := context.Background()
		pubsub := rdb.Subscribe(ctx, "channel:crm_to_bot")
		defer pubsub.Close()
		ch := pubsub.Channel()

		for msg := range ch {
			var p OutboundPayload
			if err := json.Unmarshal([]byte(msg.Payload), &p); err == nil {
				targetTenant := p.TenantID
				if targetTenant == "" { targetTenant = tenantID }

				sessionsMu.RLock()
				sess, ok := sessions[targetTenant]
				sessionsMu.RUnlock()

				if !ok || sess.Client == nil || !sess.Client.IsConnected() {
					log.Printf("❌ [%s] Account not connected for outbound message", targetTenant)
					continue
				}

				targetJID := p.Phone
				if !strings.Contains(targetJID, "@") {
					cleanPhone := strings.TrimPrefix(p.Phone, "+")
					
					// First try resolving via IsOnWhatsApp
					res, err := sess.Client.IsOnWhatsApp(ctx, []string{cleanPhone})
					if err == nil && len(res) > 0 && res[0].IsIn {
						targetJID = res[0].JID.String()
						log.Printf("📱 Resolved proper JID: %s -> %s", cleanPhone, targetJID)
					} else {
						// Fallbacks: If it's a very long ID, it is typically a WA Business LID.
						if len(cleanPhone) >= 15 {
							targetJID = cleanPhone + "@lid"
							log.Printf("⚠️ IsOnWhatsApp not found for %s (>=15 digits), using LID fallback: %s (Err: %v)", cleanPhone, targetJID, err)
						} else {
							targetJID = cleanPhone + "@s.whatsapp.net"
							log.Printf("⚠️ IsOnWhatsApp not found for %s, using normal fallback: %s (Err: %v)", cleanPhone, targetJID, err)
						}
					}
				}
				jid, _ := types.ParseJID(targetJID)
				
				waMsg := &waProto.Message{Conversation: &p.Text}

				// Show typing indicator if requested (human pacing — Section 9 of playbook)
				if p.TypingMs > 0 {
					err := sess.Client.SendChatPresence(ctx, jid, types.ChatPresenceComposing, types.ChatPresenceMediaText)
					if err != nil {
						log.Printf("⚠️ [%s] Typing indicator failed (non-critical): %v", targetTenant, err)
					} else {
						sleepMs := p.TypingMs
						if sleepMs > 9000 { sleepMs = 9000 } // cap at 9s
						time.Sleep(time.Duration(sleepMs) * time.Millisecond)
						_ = sess.Client.SendChatPresence(ctx, jid, types.ChatPresencePaused, types.ChatPresenceMediaText)
					}
				}

				resp, err := sess.Client.SendMessage(ctx, jid, waMsg)
				if err != nil {
					log.Printf("❌ [%s] Send error: %v", targetTenant, err)
				} else {
					publishWaMessage(WaMessageEvent{
						Type: "message.sent", JID: targetJID, Phone: p.Phone,
						Text: p.Text, MsgID: resp.ID, Timestamp: time.Now().UnixMilli(),
						IsFromMe: true, TenantID: targetTenant,
					})
				}
			}
		}
	}()

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c
	
	sessionsMu.Lock()
	for t, s := range sessions {
		if s.Client != nil {
			s.Client.Disconnect()
			log.Printf("🔌 [%s] Disconnected", t)
		}
	}
	sessionsMu.Unlock()
}
