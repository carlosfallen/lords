import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Bot, User, Send, CheckCircle, Loader2, PhoneCall,
  AlertTriangle, MoreVertical, CheckCheck, Clock,
} from 'lucide-react';
import type { ConversationWithContact, Message } from '../../types/index';
import { conversationsApi } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { SocketEvent } from '../../services/socket';

const STEP_LABELS = ['Primeiro contato', 'Diagnóstico', 'Qualificação', 'Convite', 'Fechamento'];

const RESULT_LABELS: Record<string, { label: string; color: string }> = {
  meeting_scheduled: { label: '🎉 Reunião marcada!', color: '#22c55e' },
  not_interested: { label: 'Lead sem interesse', color: '#888' },
  no_response: { label: 'Sem resposta', color: '#888' },
  callback: { label: 'Callback', color: '#3b82f6' },
  done: { label: 'Finalizado', color: '#888' },
};

interface Props {
  conversationId: string;
}

export function ChatView({ conversationId }: Props) {
  const [conv, setConv] = useState<ConversationWithContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchConv = useCallback(async () => {
    try {
      const data = await conversationsApi.get(conversationId);
      setConv(data);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    fetchConv();
  }, [fetchConv]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages?.length]);

  // Live updates
  useSocket(SocketEvent.MESSAGE_NEW, ({ conversationId: cid, message, conversation }: any) => {
    if (cid !== conversationId) return;
    setConv((prev) => {
      if (!prev) return prev;
      const currentMessages = prev.messages || [];
      const exists = currentMessages.find((m: Message) => m.id === message.id);
      if (exists) return prev;
      return {
        ...conversation,
        contact: prev.contact,
        messages: [...currentMessages, message],
      };
    });
  }, [conversationId]);

  useSocket(SocketEvent.WA_MESSAGE, (data: any) => {
    if (data.leadId !== conversationId) return;
    setConv((prev) => {
      if (!prev) return prev;
      const currentMessages = prev.messages || [];
      const exists = currentMessages.find((m: Message) => m.id === data.message.id);
      if (exists) return prev;
      return {
        ...prev,
        messages: [...currentMessages, data.message as Message],
      };
    });
  }, [conversationId]);

  useSocket(SocketEvent.CONVERSATION_UPDATED, (update: any) => {
    if (update.id !== conversationId) return;
    setConv((prev) => prev ? { ...prev, ...update } : prev);
  }, [conversationId]);

  useSocket(SocketEvent.CONVERSATION_COMPLETED, ({ id, result }: any) => {
    if (id !== conversationId) return;
    setConv((prev) => prev ? { ...prev, status: 'completed', result } : prev);
  }, [conversationId]);

  const handleTakeover = async (botActive: boolean) => {
    await conversationsApi.takeover(conversationId, botActive);
    await fetchConv();
    if (!botActive) inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await conversationsApi.sendMessage(conversationId, text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  const handleComplete = async (result: string) => {
    setShowMenu(false);
    await conversationsApi.complete(conversationId, result);
    await fetchConv();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-dim)' }} />
      </div>
    );
  }

  if (!conv) return null;

  const isBotActive = conv.bot_active === 1;
  const isCompleted = conv.status === 'completed' || conv.status === 'failed';
  const isHuman = conv.status === 'human_takeover';
  const resultCfg = conv.result ? RESULT_LABELS[conv.result] : null;

  return (
    <div className="flex h-full">
      {/* Main Chat Column */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display truncate font-medium text-lg leading-tight">{conv.contact?.name || (conv as any).contactName || 'Desconhecido'}</span>
                {isHuman && (
                  <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', border: '1px solid rgba(234,179,8,0.2)' }}>
                    <AlertTriangle size={10} /> Aguardando você
                  </span>
                )}
                {resultCfg && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(34,197,94,0.1)', color: resultCfg.color, border: `1px solid ${resultCfg.color}30` }}>
                    {resultCfg.label}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between items-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span>Nome</span>
                  <span className="font-display truncate font-medium">{conv.contact?.name || (conv as any).contactName || 'Desconhecido'}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span>Telefone</span>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>{conv.phone || conv.contact?.phone}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span>Empresa</span>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>{conv.contact?.company || (conv as any).contactCompany || '—'}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span>Cidade</span>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>{conv.contact?.city || (conv as any).contactCity || '—'} {conv.contact?.state}</span>
                </div>
                {conv.contact?.opt_in ? (
                  <span className="text-green-500 flex items-center gap-0.5 text-[10px]"><CheckCheck size={10} /> opt-in</span>
                ) : (
                  <span className="text-[10px]" style={{ color: '#ef4444' }}>sem opt-in</span>
                )}
              </div>

              {/* Step progress */}
              {!isCompleted && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-1">
                    {STEP_LABELS.map((label, i) => (
                      <div
                        key={i}
                        title={label}
                        className="h-1.5 w-8 rounded-full transition-all"
                        style={{ background: i <= conv.step ? 'var(--gold)' : 'var(--surface-3)' }}
                      />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    {STEP_LABELS[Math.min(conv.step, STEP_LABELS.length - 1)]}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isCompleted && (
                <>
                  {isBotActive ? (
                    <button
                      onClick={() => handleTakeover(false)}
                      className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg font-medium transition-all"
                      style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', border: '1px solid rgba(234,179,8,0.2)' }}
                    >
                      <User size={13} /> Assumir
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTakeover(true)}
                      className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg font-medium transition-all"
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}
                    >
                      <Bot size={13} /> Retornar ao bot
                    </button>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--text-muted)', background: 'var(--surface-3)' }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {showMenu && (
                      <div
                        className="absolute right-0 top-full mt-1 w-48 rounded-xl py-1 z-10 shadow-2xl animate-slide-up"
                        style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}
                      >
                        {[
                          { result: 'meeting_scheduled', label: '🎉 Reunião marcada', color: '#22c55e' },
                          { result: 'not_interested', label: '❌ Sem interesse', color: '#ef4444' },
                          { result: 'no_response', label: '💤 Sem resposta', color: '#888' },
                          { result: 'callback', label: '📅 Callback', color: '#3b82f6' },
                        ].map(({ result, label, color }) => (
                          <button
                            key={result}
                            onClick={() => handleComplete(result)}
                            className="w-full text-left text-xs px-4 py-2 transition-colors hover:bg-white/5"
                            style={{ color }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Messages ───────────────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3"
          onClick={() => setShowMenu(false)}
        >
          {(conv.messages || []).length === 0 && (
            <div className="flex flex-col items-center justify-center h-24 text-center">
              <Clock size={20} style={{ color: 'var(--text-dim)' }} className="mb-2" />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aguardando início...</p>
            </div>
          )}

          {(conv.messages || []).map((msg) => {
            const isOut = msg.direction === 'outbound';
            const isBot = msg.sender_type === 'bot';

            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isOut ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                {/* Avatar */}
                {!isOut && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mb-1"
                    style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                    <span className="text-xs">
                      {(conv.contact?.name || (conv as any).contactName || 'D').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="max-w-[72%]">
                  {/* Sender label */}
                  {isOut && (
                    <div className={`text-xs mb-0.5 text-right flex items-center justify-end gap-1`}
                      style={{ color: 'var(--text-dim)' }}>
                      {isBot ? <Bot size={10} /> : <User size={10} />}
                      {isBot ? 'Bot' : 'Agente'}
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
                    style={{
                      background: isOut ? 'var(--gold)' : 'var(--surface-3)',
                      color: isOut ? '#000' : 'var(--text)',
                      borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      border: isOut ? 'none' : '1px solid var(--border)',
                      opacity: msg.status === 'failed' ? 0.5 : 1,
                    }}
                  >
                    {msg.content}
                  </div>

                  {/* Timestamp + status */}
                  <div className={`text-xs mt-0.5 flex items-center gap-1 ${isOut ? 'justify-end' : 'justify-start'}`}
                    style={{ color: 'var(--text-dim)' }}>
                    {format(new Date(msg.sent_at), 'HH:mm', { locale: ptBR })}
                    {isOut && msg.status === 'failed' && <span className="text-red-500">✗ falhou</span>}
                  </div>
                </div>

                {isOut && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mb-1"
                    style={{ background: isBot ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)', border: '1px solid var(--border)' }}>
                    {isBot ? <Bot size={12} style={{ color: 'var(--gold)' }} /> : <User size={12} style={{ color: '#3b82f6' }} />}
                  </div>
                )}
              </div>
            );
          })}

          <div ref={endRef} />
        </div>

        {/* ── Input ──────────────────────────────────────────────────────────── */}
        {!isCompleted && (
          <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
            {isBotActive ? (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}
              >
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span style={{ color: 'var(--text-muted)' }}>
                  Bot em operação — clique em <strong>"Assumir"</strong> para enviar mensagens.
                </span>
              </div>
            ) : (
              <div className="flex gap-3 items-end">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite como agente... (Enter envia)"
                  rows={2}
                  className="flex-1 px-4 py-3 text-sm rounded-xl resize-none focus:outline-none scrollbar-thin"
                  style={{
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    maxHeight: '120px',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className="p-3 rounded-xl transition-all self-end disabled:opacity-40"
                  style={{ background: 'var(--gold)', color: '#000' }}
                >
                  {sending
                    ? <Loader2 size={18} className="animate-spin" />
                    : <Send size={18} />
                  }
                </button>
              </div>
            )}
          </div>
        )}

        {isCompleted && resultCfg && (
          <div
            className="px-5 py-3 text-center text-sm flex-shrink-0"
            style={{ borderTop: '1px solid var(--border)', color: resultCfg.color }}
          >
            Conversa encerrada · {resultCfg.label}
            {conv.ended_at && (
              <span className="ml-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                {format(new Date(conv.ended_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </span>
            )}
          </div>
        )}

      </div>
      {/* ── Lead Intel Sidebar ─────────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 hidden lg:flex flex-col overflow-y-auto" style={{ borderLeft: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Inteligência do Lead
          </h3>
        </div>
        <div className="p-5 space-y-5 flex-1">
          {/* Contact info */}
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-2"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
              <User size={22} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h4 className="font-bold text-sm" style={{ color: 'var(--text)' }}>
              {conv.contact?.name || (conv as any).contactName || 'Lead'}
            </h4>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-dim)' }}>
              {conv.phone || conv.contact?.phone}
            </p>
            {conv.contact?.company || (conv as any).contactCompany ? (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {conv.contact?.company || (conv as any).contactCompany}
              </p>
            ) : null}
          </div>

          {/* Metrics */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Status</span>
                <span className="text-xs font-bold" style={{ color: isBotActive ? '#3b82f6' : '#eab308' }}>
                  {isBotActive ? '🤖 Bot Ativo' : '👤 Humano'}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Etapa</span>
                <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>
                  {STEP_LABELS[Math.min(conv.step, STEP_LABELS.length - 1)]}
                </span>
              </div>
              <div className="flex gap-0.5">
                {STEP_LABELS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all"
                    style={{ background: i <= conv.step ? 'var(--gold)' : 'var(--surface-2)' }}
                  />
                ))}
              </div>
            </div>
            {conv.contact?.opt_in ? (
              <div className="flex items-center gap-1 text-xs text-green-500">
                <CheckCircle size={10} /> Opt-in confirmado
              </div>
            ) : (
              <div className="text-xs" style={{ color: '#ef4444' }}>Sem opt-in</div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Ações</h5>
            <div className="space-y-1.5">
              <button className="w-full text-left text-xs py-2 px-3 rounded-lg transition-colors"
                style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                📋 Enviar Playbook
              </button>
              <button className="w-full text-left text-xs py-2 px-3 rounded-lg transition-colors"
                style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                📊 Mover no Kanban
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

