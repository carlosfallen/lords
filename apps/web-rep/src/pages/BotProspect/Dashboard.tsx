import { useState, useEffect, useCallback } from 'react';
import {
  Crown, MessageSquare, Users, Activity, AlertTriangle,
  Wifi, WifiOff, ChevronDown, ChevronUp, Layers,
} from 'lucide-react';
import { ConversationList } from './components/chat/ConversationList';
import { ChatView } from './components/chat/ChatView';
import { AgentConfigModal } from './components/AgentConfigModal';
import { QueuePanel } from './components/queue/QueuePanel';
import { ContactsPage } from './components/contacts/ContactsPage';
import { LogsPage } from './components/logs/LogsPage';
import type { ConversationWithContact, QueueStats, WhatsAppStatus } from './types/index';
import { conversationsApi, waApi } from './services/api';
import { useSocket } from './hooks/useSocket';
import { SocketEvent, getSocket } from './services/socket';

type NavTab = 'inbox' | 'contacts' | 'logs' | 'queue';

export function Dashboard() {
  const [tab, setTab] = useState<NavTab>('inbox');
  const [conversations, setConversations] = useState<ConversationWithContact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);

  const refreshConversations = useCallback(async () => {
    try {
      const [convs, s] = await Promise.all([
        conversationsApi.list(),
        conversationsApi.queueStats(),
      ]);
      setConversations(convs);
      setStats(s);
    } catch (err) {
      console.warn('[BotProspect] Failed to load data:', err);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const s = await conversationsApi.queueStats();
      setStats(s);
    } catch (err) {
      console.warn('[BotProspect] Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    refreshConversations();

    // WhatsApp status
    waApi.status().then(setWaStatus).catch(() => { });
    const waInterval = setInterval(() => {
      waApi.status().then(setWaStatus).catch(() => { });
    }, 30000);

    const socket = getSocket();
    setSocketConnected(socket.connected);
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    return () => {
      clearInterval(waInterval);
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [refreshConversations]);

  // Real-time WA status
  useSocket(SocketEvent.WA_STATUS, (s: WhatsAppStatus) => setWaStatus(s));
  useSocket(SocketEvent.WA_DISCONNECTED, () => {
    setWaStatus(prev => prev ? { ...prev, connected: false } : null);
  });

  // Real-time conversation updates
  useSocket(SocketEvent.CONVERSATION_NEW, (conv: ConversationWithContact) => {
    setConversations((prev) => {
      if (prev.find((c) => c.id === conv.id)) return prev;
      return [conv, ...prev];
    });
  });

  useSocket(SocketEvent.MESSAGE_NEW, ({ conversation }: any) => {
    if (!conversation) return;
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conversation.id);
      if (idx === -1) return [conversation, ...prev];
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...conversation };
      return updated.sort((a, b) =>
        (b.last_message_at || b.updated_at).localeCompare(a.last_message_at || a.updated_at)
      );
    });
  });

  useSocket(SocketEvent.WA_MESSAGE, (data: any) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === data.leadId);
      if (idx === -1) {
        // Unknown lead, fetch full list to get lead details
        refreshConversations();
        return prev;
      }
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        lastMessage: data.message.content || `[${data.message.messageType}]`,
        lastMessageAt: data.message.createdAt,
        unreadCount: selectedId === data.leadId ? 0 : (updated[idx].unreadCount || 0) + 1
      };
      return updated.sort((a, b) =>
        new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
      );
    });
  });

  useSocket(SocketEvent.CONVERSATION_UPDATED, (update: Partial<ConversationWithContact> & { id: string }) => {
    setConversations((prev) =>
      prev.map((c) => c.id === update.id ? { ...c, ...update } : c)
    );
  });

  useSocket(SocketEvent.CONVERSATION_COMPLETED, ({ id, result }: any) => {
    setConversations((prev) =>
      prev.map((c) => c.id === id ? { ...c, status: 'completed', result, bot_active: 0 } : c)
    );
    refreshStats();
  });

  useSocket(SocketEvent.CONVERSATION_NEEDS_HUMAN, ({ id }: { id: string }) => {
    setConversations((prev) =>
      prev.map((c) => c.id === id ? { ...c, status: 'human_takeover', bot_active: 0 } : c)
    );
    if (!selectedId) setSelectedId(id);
  });

  useSocket(SocketEvent.QUEUE_UPDATED, (s: QueueStats) => setStats(s));

  const humanWaiting = conversations.filter((c) => c.status === 'human_takeover').length;
  const activeCount = conversations.filter((c) => c.status === 'active').length;
  const isWaConnected = waStatus?.connected;

  const navItems: { id: NavTab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'inbox', icon: <MessageSquare size={15} />, label: 'Inbox', badge: humanWaiting },
    { id: 'contacts', icon: <Users size={15} />, label: 'Contatos' },
    { id: 'logs', icon: <Activity size={15} />, label: 'Logs' },
    { id: 'queue', icon: <Layers size={15} />, label: 'Fila' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-dark-950">
      {/* ── Top Header Bar ──────────────────────────────────────────── */}
      <div className="flex rounded-lg items-center justify-between px-6 py-3 border-b border-dark-700 bg-dark-900 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Tabs */}
          <nav className="flex gap-1">
            {navItems.map(({ id, icon, label, badge }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative flex items-center gap-1.5 text-xs py-2 px-4 rounded-lg font-medium transition-all ${tab === id
                  ? 'bg-imperio-600 text-white'
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                  }`}
              >
                {icon} {label}
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold bg-red-500" style={{ fontSize: 9 }}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Right side: status indicators */}
        <div className="flex items-center gap-4">
          {/* WhatsApp status badge */}
          <span className={`flex items-center gap-1.5 text-xs ${isWaConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isWaConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            WA {isWaConnected ? 'Conectado' : 'Offline'}
          </span>

          {activeCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {activeCount} ativo{activeCount > 1 ? 's' : ''}
            </span>
          )}
          {humanWaiting > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-yellow-400">
              <AlertTriangle size={11} />
              {humanWaiting} aguardando
            </span>
          )}
          <span className={`flex items-center gap-1.5 text-xs ${socketConnected ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {socketConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {tab === 'inbox' ? (
          <>
            {/* Left panel: Conversations */}
            <div className="w-80 flex-shrink-0 flex flex-col border-r border-dark-700 bg-dark-900">
              <div className="flex-1 min-h-0 overflow-hidden">
                <ConversationList
                  conversations={conversations}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 min-w-0">
              {selectedId ? (
                <ChatView key={selectedId} conversationId={selectedId} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Crown size={52} className="text-dark-700" />
                  <div className="text-center">
                    <p className="text-xl font-semibold text-dark-500">
                      Selecione uma conversa
                    </p>
                    <p className="text-sm mt-1 text-dark-600">
                      ou inicie a fila de prospecção
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : tab === 'contacts' ? (
          <div className="flex-1 min-w-0 overflow-hidden">
            <ContactsPage />
          </div>
        ) : tab === 'logs' ? (
          <div className="flex-1 min-w-0 overflow-hidden">
            <LogsPage />
          </div>
        ) : (
          /* Queue tab */
          <div className="flex-1 min-w-0 overflow-hidden p-6">
            <QueuePanel stats={stats} onRefresh={refreshConversations} />
          </div>
        )}
      </div>
    </div>
  );
}
