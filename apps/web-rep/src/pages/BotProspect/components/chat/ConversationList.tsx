import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bot, User, AlertTriangle, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import type { ConversationWithContact, ConversationStatus } from '../../types/index';

interface Props {
  conversations: ConversationWithContact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_CFG: Record<ConversationStatus, {
  label: string;
  dotClass: string;
  icon?: React.ReactNode;
}> = {
  queued: { label: 'Na fila', dotClass: 'status-dot-gray' },
  active: { label: 'Bot ativo', dotClass: 'status-dot-blue', icon: <Bot size={11} /> },
  human_takeover: { label: 'Aguardando você', dotClass: 'status-dot-yellow', icon: <User size={11} /> },
  waiting_response: { label: 'Aguardando', dotClass: 'status-dot-gray' },
  completed: { label: 'Concluído', dotClass: 'status-dot-green', icon: <CheckCircle size={11} /> },
  failed: { label: 'Erro', dotClass: 'status-dot-red', icon: <XCircle size={11} /> },
};

const RESULT_LABELS: Record<string, string> = {
  meeting_scheduled: '🎉 Reunião marcada',
  not_interested: 'Sem interesse',
  no_response: 'Sem resposta',
  callback: 'Callback',
};

export function ConversationList({ conversations, selectedId, onSelect }: Props) {
  const [filter, setFilter] = useState<'all' | 'active' | 'human_takeover' | 'completed'>('all');
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = c.contact?.name || (c as any).contactName || '';
      const company = c.contact?.company || '';
      return (
        name.toLowerCase().includes(q) ||
        company.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      );
    }
    return true;
  });

  const needsHuman = conversations.filter((c) => c.status === 'human_takeover').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <span className="font-display text-base tracking-tight">Conversas</span>
          {needsHuman > 0 && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full animate-pulse"
              style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', border: '1px solid rgba(234,179,8,0.2)' }}>
              <AlertTriangle size={11} />
              {needsHuman} aguardando
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg focus:outline-none"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {(['all', 'active', 'human_takeover', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 text-xs py-1 rounded-md transition-colors"
              style={filter === f
                ? { background: 'var(--gold)', color: '#000', fontWeight: 600 }
                : { color: 'var(--text-muted)', background: 'var(--surface-3)' }
              }
            >
              {f === 'all' ? 'Todas' : f === 'active' ? 'Bot' : f === 'human_takeover' ? 'Humano' : 'Fim'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Clock size={20} style={{ color: 'var(--text-dim)' }} className="mb-2" />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {search ? 'Nenhum resultado' : 'Nenhuma conversa'}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const cfg = STATUS_CFG[conv.status] || STATUS_CFG.queued;
            const isSelected = conv.id === selectedId;
            const isUrgent = conv.status === 'human_takeover';
            const lastMsg = conv.messages?.[conv.messages.length - 1] || { content: (conv as any).lastMessage, direction: 'inbound' }; // fallback

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className="w-full text-left px-4 py-3 transition-all relative"
                style={{
                  background: isSelected ? 'var(--surface-3)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: isUrgent ? '2px solid #eab308' : '2px solid transparent',
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-medium text-sm truncate">{conv.contact?.name || (conv as any).contactName || 'Desconhecido'}</span>
                    </div>
                    {conv.contact?.company && (
                      <div className="text-xs truncate mb-0.5" style={{ color: 'var(--text-dim)' }}>
                        {conv.contact.company}
                      </div>
                    )}
                    {lastMsg?.content ? (
                      <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {lastMsg.direction === 'outbound' ? '→ ' : ''}
                        {lastMsg.content}
                      </div>
                    ) : conv.result ? (
                      <div className="text-xs" style={{ color: conv.result === 'meeting_scheduled' ? '#22c55e' : 'var(--text-muted)' }}>
                        {RESULT_LABELS[conv.result] || conv.result}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs flex items-center gap-1 status-dot ${cfg.dotClass}`}
                      style={{ color: 'var(--text-muted)' }}>
                      {cfg.label}
                    </span>
                    {(conv as any).lastMessageAt || conv.updated_at ? (
                      <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                        {formatDistanceToNow(new Date((conv as any).lastMessageAt || conv.updated_at), {
                          locale: ptBR, addSuffix: true,
                        })}
                      </span>
                    ) : null}
                    {/* Step indicator */}
                    {conv.status === 'active' && (
                      <div className="flex gap-0.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="w-1 h-1 rounded-full"
                            style={{ background: i <= conv.step ? 'var(--gold)' : 'var(--surface-3)' }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
