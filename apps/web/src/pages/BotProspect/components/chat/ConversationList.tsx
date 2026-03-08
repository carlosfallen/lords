import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Bot, User, MessageSquare } from 'lucide-react';

interface Props {
  conversations: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'human' | 'unread'>('all');

  const filtered = useMemo(() => conversations.filter((c) => {
    if (filter === 'human' && !c.isHumanTakeover) return false;
    if (filter === 'unread' && (c.unreadCount || 0) === 0) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (c.contactName || c.name || c.phone || '').toLowerCase();
      const phone = (c.contactPhone || c.phone || '').toLowerCase();
      if (!name.includes(q) && !phone.includes(q)) return false;
    }
    return true;
  }), [conversations, filter, search]);

  function timeAgo(d?: string) {
    if (!d) return '';
    try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR }); }
    catch { return ''; }
  }

  return (
    <div className="flex flex-col h-full bg-dark-900">
      {/* Search */}
      <div className="p-3 border-b border-dark-800 shrink-0 space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:ring-1 focus:ring-imperio-600/50"
          />
        </div>
        <div className="flex gap-1">
          {[
            { id: 'all' as const, label: 'Todas' },
            { id: 'human' as const, label: '🙋 Humano' },
            { id: 'unread' as const, label: '🔵 Não lidas' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${filter === f.id
                  ? 'bg-imperio-600/15 text-imperio-400 font-semibold'
                  : 'text-dark-400 hover:bg-dark-800'
                }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-dark-500">
            <MessageSquare size={24} className="mb-2" />
            <p className="text-xs">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = conv.id === selectedId;
            const name = conv.contactName || conv.name || conv.contactPhone || conv.phone || '—';
            const phone = conv.contactPhone || conv.phone || '';
            const lastMsg = conv.lastMessage || '';
            const unread = conv.unreadCount || 0;
            const isHuman = conv.isHumanTakeover;

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left px-4 py-3 border-b border-dark-800/50 transition-all ${isSelected ? 'bg-imperio-600/10 border-l-2 border-l-imperio-500' : 'hover:bg-dark-800/50'
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {isHuman ? (
                        <User size={12} className="text-amber-400 shrink-0" />
                      ) : (
                        <Bot size={12} className="text-blue-400 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-white truncate">{name}</span>
                    </div>
                    <p className="text-xs text-dark-500 mt-0.5 font-mono">{phone}</p>
                    {lastMsg && (
                      <p className="text-xs text-dark-400 mt-1 truncate">{lastMsg}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-dark-500">{timeAgo(conv.lastMessageAt)}</span>
                    {unread > 0 && (
                      <span className="w-5 h-5 text-[10px] font-bold rounded-full bg-imperio-600 text-white flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                    {isHuman && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">
                        HUMANO
                      </span>
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
