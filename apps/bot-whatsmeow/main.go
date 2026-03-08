package main

import (
"context"
"encoding/json"
"log"
"os"
"os/signal"
"strings"
"syscall"

"github.com/redis/go-redis/v9"
"go.mau.fi/whatsmeow"
"go.mau.fi/whatsmeow/store/sqlstore"
"go.mau.fi/whatsmeow/types"
"go.mau.fi/whatsmeow/types/events"
waLog "go.mau.fi/whatsmeow/util/log"

"google.golang.org/protobuf/proto"
waProto "go.mau.fi/whatsmeow/binary/proto"
_ "github.com/mattn/go-sqlite3" // SQLite is used strictly for storing Whatmeow sessions natively
)

// ─── Constants ──────────────────────────────────────────────
const (
RedisHost         = "localhost:6379"
RedisInboundQueue = "CRM:bot:inbound_messages" // Where to send what we receive
RedisOutboundCh   = "CRM:bot:outbound_stream" // Where to listen for messages to send
)

var (
rdb *redis.Client
cli *whatsmeow.Client
ctx context.Context
)

// MessagePayload represents the structure expected from Bun backend
type MessagePayload struct {
Jid  string `json:"jid"`
Text string `json:"text"`
}

func main() {
// 1. Initialize DB for session storage
dbLog := waLog.Stdout("Database", "DEBUG", true)
container, err := sqlstore.New("sqlite3", "file:sessions.db?_foreign_keys=on", dbLog)
if err != nil {
to connect to session database: %v", err)
}

deviceStore, err := container.GetFirstDevice()
if err != nil {
to fetch device: %v", err)
}

clientLog := waLog.Stdout("Client", "DEBUG", true)
cli = whatsmeow.NewClient(deviceStore, clientLog)

// 2. Setup Redis
ctx = context.Background()
rdb = redis.NewClient(&redis.Options{
RedisHost,
})
if err := rdb.Ping(ctx).Err(); err != nil {
to connect to Redis: %v", err)
}
defer rdb.Close()
log.Println("✅ Connected to Redis")

// 3. Connect Event Handler
cli.AddEventHandler(eventHandler)

// 4. Start login or connection
if cli.Store.ID == nil {
New device / Needs pairing
tln("📱 No session found. Spawning QR Code flow...")
rChan, _ := cli.GetQRChannel(context.Background())
= cli.Connect()
err != nil {
to connect: %v", err)
evt := range qrChan {
evt.Event == "code" {
tln("\n\n#####################################################")
tln("Use this string to generate a QR and scan to login:")
tln(evt.Code)
tln("#####################################################\n\n")
else {
tln("Login event:", evt.Event)
else {
Already logged in
= cli.Connect()
err != nil {
to connect: %v", err)
tln("✅ Connected to WhatsApp Session")
}

// 5. Start listening for Outbound messages from Redis
go listenOutboundMessages()

// 6. Graceful Shutdown
c := make(chan os.Signal, 1)
signal.Notify(c, os.Interrupt, syscall.SIGTERM)
<-c

log.Println("🛑 Shutting down Whatsmeow...")
cli.Disconnect()
}

// ─── Event Handler (Inbound) ────────────────────────────────
func eventHandler(evt interface{}) {
switch v := evt.(type) {
case *events.Message:
Ignore our own messages or broadcasts
v.Info.IsFromMe || v.Info.IsGroup || v.Info.IsStatus {

Only handle text for now
text string
v.Message.GetConversation() != "" {
= v.Message.GetConversation()
else if v.Message.GetExtendedTextMessage() != nil {
= v.Message.GetExtendedTextMessage().GetText()
text == "" {

derNumber := strings.Split(v.Info.Sender.ToNonAD().String(), "@")[0]

loadRaw := map[string]interface{}{
v.Info.Sender.ToNonAD().String(),
ame":  v.Info.PushName,
umber":    senderNumber,
     text,
v.Info.Timestamp.Unix(),
tes, _ := json.Marshal(payloadRaw)

Publish to Redis List (Inbound Queue for Bun/TS to process)
:= rdb.RPush(ctx, RedisInboundQueue, string(bytes)).Err()
err != nil {
tf("❌ Failed to push to Redis: %v", err)

tf("📥 Captured message from %s pushed to Redis queue", senderNumber)
}
}

// ─── Send Messages (Outbound) ───────────────────────────────
func listenOutboundMessages() {
pubsub := rdb.Subscribe(ctx, RedisOutboundCh)
defer pubsub.Close()

ch := pubsub.Channel()

log.Printf("👂 Listening for outbound messages on Redis channel: %s", RedisOutboundCh)

for msg := range ch {
payload MessagePayload
err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
tf("❌ Invalid outbound JSON format: %v", err)
tinue
Fix format if it lacks explicit domain
:= strings.TrimSpace(payload.Jid)
!strings.Contains(jidStr, "@") {
= jidStr + "@s.whatsapp.net"
err := types.ParseJID(jidStr)
err != nil {
tf("❌ Invalid JID format for sending: %s", jidStr)
tinue
Assemble proto payload proper to whatsmeow API
:= &waProto.Message{
versation: proto.String(payload.Text),
err = cli.SendMessage(context.Background(), remoteJID, msgObj)

err != nil {
tf("❌ Failed to send message to %s: %v", remoteJID.String(), err)
else {
tf("📤 Message successfully sent to %s", remoteJID.String())
