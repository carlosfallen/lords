import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, User, Bot, CheckCircle, XCircle, Phone, ArrowDownCircle, Loader2 } from 'lucide-react';
import { conversationsApi } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { SocketEvent } from '../../services/socket';
import type { Message } from '../../types/index';

interface Props {
  leadId: string;
}

const RESULT_OPTIONS = [
  { value: 'meeting_scheduled', label: '🎉 Reunião Marcada', color: 'text-green-400 bg-green-500/10', pipelineStage: 'diagnostico' },
  { value: 'not_interested', label: '❌ Sem Interesse', color: 'text-red-400 bg-red-500/10', pipelineStage: null },
  { value: 'no_response', label: '😶 Sem Resposta', color: 'text-dark-400 bg-dark-700', pipelineStage: null },
  { value: 'callback', label: '📞 Retornar Depois', color: 'text-amber-400 bg-amber-500/10', pipelineStage: null },
];

export function ChatView({ leadId }: Props) {
  const [lead, setLead] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [botActive, setBotActive] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Load historical messages from the real leadConversations table ───
  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await conversationsApi.getMessages(leadId);
      setLead(data);
      // Messages come in data.messages (from backend GET /conversations/:id/messages)
      const msgs: Message[] = (data.messages || []).map((m: any) => ({
        id: m.id,
        leadId: m.leadId || m.lead_id || leadId,
        direction: m.direction,
        senderType: m.senderType || m.sender_type,
        messageType: m.messageType || m.message_type || 'text',
        content: m.content,
        mediaUrl: m.mediaUrl || m.media_url,
        isRead: m.isRead ?? m.is_read ?? true,
        waMessageId: m.waMessageId || m.wa_message_id,
        createdAt: m.createdAt || m.created_at || m.sent_at,
      }));
      setMessages(msgs);
      const rawData = data as any;
      setBotActive(rawData.bot_active === 1 || rawData.bot_active === true);
    } catch (err) {
      console.error('[ChatView] Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadMessages();
    setInput('');
    setShowResults(false);
  }, [loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ─── Real-time: receive new WA messages via WebSocket ─────────
  useSocket(SocketEvent.WA_MESSAGE, (data: any) => {
    if (!data || data.leadId !== leadId) return;
    const msg = data.message;
    if (!msg) return;

    setMessages((prev) => {
      // Deduplicate by ID
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, {
        id: msg.id,
        leadId,
        direction: msg.direction,
        senderType: msg.senderType || msg.sender_type || 'lead',
        messageType: msg.messageType || msg.message_type || 'text',
        content: msg.content,
        mediaUrl: msg.mediaUrl || msg.media_url || null,
        isRead: true,
        waMessageId: null,
        createdAt: msg.createdAt || new Date().toISOString(),
      }];
    });
  }, [leadId]);

  // ─── Send a human operator message ────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput('');

    // Optimistic append
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId,
      leadId,
      direction: 'outbound',
      senderType: 'human',
      messageType: 'text',
      content: text,
      mediaUrl: null,
      isRead: true,
      waMessageId: null,
      createdAt: new Date().toISOString(),
    }]);

    try {
      await conversationsApi.sendMessage(leadId, text);
    } catch (err) {
      console.error('[ChatView] Send failed:', err);
      // Remove failed message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ─── Takeover / Resume bot ────────────────────────────────────
  const handleTakeover = async () => {
    try {
      const result = await conversationsApi.takeover(leadId);
      setBotActive(result?.botActive ?? !botActive);
      if (!result?.botActive) inputRef.current?.focus();
    } catch (err) {
      console.error('[ChatView] Takeover failed:', err);
    }
  };

  // ─── Complete conversation with result ────────────────────────
  const handleComplete = async (result: string) => {
    setShowResults(false);
    try {
      await conversationsApi.complete(leadId, result);
      await loadMessages();
    } catch (err) {
      console.error('[ChatView] Complete failed:', err);
    }
  };

  const contactName = lead?.contact?.name || lead?.contactName || lead?.name || lead?.phone || '—';
  const contactPhone = lead?.contact?.phone || lead?.contactPhone || lead?.phone || '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-imperio-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-dark-950">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-dark-800 bg-dark-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-dark-700 flex items-center justify-center text-sm font-bold text-dark-300">
            {(contactName[0] || '?').toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{contactName}</p>
            <p className="text-xs text-dark-500 font-mono flex items-center gap-1">
              <Phone size={10} />{contactPhone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Bot / Human toggle */}
          <button
            onClick={handleTakeover}
            className={`flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg font-medium transition-all border ${botActive
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
              }`}
          >
            {botActive ? <><User size={13} /> Assumir</> : <><Bot size={13} /> Retornar ao bot</>}
          </button>

          {/* Complete */}
          <div className="relative">
            <button
              onClick={() => setShowResults(!showResults)}
              className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg font-medium transition-all bg-dark-800 border border-dark-700 text-dark-300 hover:text-white"
            >
              <CheckCircle size={13} /> Finalizar
            </button>
            {showResults && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-dark-800 rounded-xl border border-dark-700 shadow-xl z-50 p-1.5 animate-fade-in">
                {RESULT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleComplete(opt.value)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors hover:bg-dark-700 ${opt.color}`}
                  >{opt.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Messages ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dark-500">
            <p className="text-sm">Nenhuma mensagem nesta conversa</p>
            <p className="text-xs mt-1">Mensagens do WhatsApp aparecerão aqui</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === 'outbound';
            const isBot = msg.senderType === 'bot';
            const isHuman = msg.senderType === 'human';

            return (
              <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-xl px-4 py-2.5 ${isOutbound
                  ? isHuman
                    ? 'bg-imperio-600 text-white rounded-br-md'
                    : 'bg-dark-800 text-dark-100 rounded-br-md'
                  : 'bg-dark-800 text-dark-100 rounded-bl-md'
                  }`}>
                  {/* Sender label */}
                  <div className="flex items-center gap-1.5 mb-1">
                    {isBot && <Bot size={10} className="text-blue-400" />}
                    {isHuman && <User size={10} className="text-imperio-400" />}
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ opacity: 0.5 }}>
                      {isOutbound ? (isHuman ? 'Humano' : 'Bot') : 'Lead'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content || '[mídia]'}</p>
                  <p className={`text-[10px] mt-1 ${isOutbound && isHuman ? 'text-white/50' : 'text-dark-500'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ─── Input ───────────────────────────────────────────── */}
      <div className="px-5 py-3 border-t border-dark-800 bg-dark-900 shrink-0">
        {botActive ? (
          <div className="flex items-center gap-2 text-xs text-dark-500 py-2">
            <Bot size={14} className="text-blue-400" />
            <span>Bot está ativo. Clique em &quot;Assumir&quot; para responder manualmente.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-2.5 rounded-lg bg-dark-800 border border-dark-700 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:ring-1 focus:ring-imperio-600/50"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="p-2.5 rounded-lg bg-imperio-600 text-white hover:bg-imperio-500 disabled:opacity-40 transition-all"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
