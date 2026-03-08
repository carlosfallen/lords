import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Activity, Brain, Settings, Wifi, WifiOff, RefreshCw } from 'lucide-react';

import { ConversationList } from './components/chat/ConversationList';
import { ChatView } from './components/chat/ChatView';
import { OperationView } from './components/operation/OperationView';
import { BrainPanel } from './components/brain/BrainPanel';
import { BotSettings } from './components/settings/BotSettings';
import { conversationsApi, queueApi, waApi } from './services/api';
import { useSocket } from './hooks/useSocket';
import { SocketEvent } from './services/socket';
import type { QueueStats, WhatsAppStatus, BrainEvent } from './types/index';

type TabId = 'inbox' | 'operation' | 'brain' | 'config';

export default function Dashboard() {
  const [tab, setTab] = useState<TabId>('inbox');
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
  const [brainEvents, setBrainEvents] = useState<BrainEvent[]>([]);
  const brainIdRef = useRef(0);

  // ─── Data loaders ─────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const data = await conversationsApi.list();
      setConversations(data);
    } catch (err) {
      console.error('[Dashboard] conversations:', err);
    }
  }, []);

  const loadQueueStats = useCallback(async () => {
    try {
      setQueueStats(await queueApi.stats());
    } catch (err) {
      console.error('[Dashboard] queue stats:', err);
    }
  }, []);

  const loadWaStatus = useCallback(async () => {
    try {
      setWaStatus(await waApi.status());
    } catch (err) {
      console.error('[Dashboard] wa status:', err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadQueueStats();
    loadWaStatus();
    const t1 = setInterval(loadQueueStats, 15000);
    const t2 = setInterval(loadWaStatus, 30000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [loadConversations, loadQueueStats, loadWaStatus]);

  // ─── WS: new incoming WA message → update conversation list ───
  useSocket(SocketEvent.WA_MESSAGE, (data: any) => {
    if (!data) return;
    setConversations((prev) => {
      const idx = prev.findIndex((c: any) => c.id === data.leadId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          lastMessage: data.message?.content || '',
          lastMessageAt: data.message?.createdAt || new Date().toISOString(),
        };
        // Move to top
        const item = updated.splice(idx, 1)[0];
        return [item, ...updated];
      }
      // New lead conversation — reload list
      loadConversations();
      return prev;
    });
  }, [loadConversations]);

  useSocket(SocketEvent.QUEUE_UPDATED, () => { loadQueueStats(); }, [loadQueueStats]);
  useSocket(SocketEvent.WA_STATUS, (d: any) => { setWaStatus((p) => ({ ...p, ...d })); }, []);

  // ─── Brain events from Dolphin Engine ─────────────────────────
  useSocket('feed.message', (data: any) => {
    if (!data) return;
    const evt: BrainEvent = {
      id: `b-${++brainIdRef.current}`,
      timestamp: data.timestamp || new Date().toISOString(),
      phone: data.phone || data.from || '—',
      intent: data.intent || data.event || '—',
      confidence: typeof data.confidence === 'number' ? data.confidence : 0,
      mode: data.llm_provider || data.mode || (data.local ? 'local' : 'unknown'),
      userInput: data.user_text || data.input || '',
      botResponse: data.llm_response || data.response || data.reply || '',
      latencyMs: data.latency_ms || data.latency || 0,
      contextUsed: !!data.context_used || !!data.memory_used,
      action: data.action,
      error: data.error,
      pipeline: data.pipeline || undefined,
    };
    setBrainEvents((prev) => [evt, ...prev].slice(0, 200));
  }, []);

  // ─── Tab config ───────────────────────────────────────────────
  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'inbox', label: 'Inbox', icon: <MessageSquare size={16} />, count: conversations.length },
    { id: 'operation', label: 'Operação', icon: <Activity size={16} />, count: queueStats?.pending },
    { id: 'brain', label: 'Cérebro', icon: <Brain size={16} />, count: brainEvents.filter(e => e.error).length || undefined },
    { id: 'config', label: 'Config', icon: <Settings size={16} /> },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] animate-fade-in">
      {/* ─── Top Bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-dark-800 bg-dark-900 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-white">Prospecção</h1>
          <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-0.5">
            {tabs.map(({ id, label, icon, count }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${tab === id
                  ? 'bg-imperio-600/20 text-imperio-400'
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700'
                  }`}
              >
                {icon}
                {label}
                {count != null && count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${id === 'brain' ? 'bg-red-500/20 text-red-400' : 'bg-dark-700 text-dark-300'
                    }`}>{count > 99 ? '99+' : count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* WA Status */}
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${waStatus?.connected
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
            }`}>
            {waStatus?.connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {waStatus?.connected ? 'WhatsApp' : 'Desconectado'}
          </div>
          <button onClick={() => { loadConversations(); loadQueueStats(); }} className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ─── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        {tab === 'inbox' && (
          <>
            <div className="w-80 shrink-0 border-r border-dark-800 overflow-hidden">
              <ConversationList
                conversations={conversations}
                selectedId={selectedLeadId}
                onSelect={setSelectedLeadId}
              />
            </div>
            <div className="flex-1 min-w-0">
              {selectedLeadId ? (
                <ChatView leadId={selectedLeadId} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare size={32} className="mx-auto mb-3 text-dark-600" />
                    <p className="text-sm text-dark-400">Selecione uma conversa</p>
                    <p className="text-xs text-dark-500 mt-1">{conversations.length} conversas disponíveis</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'operation' && (
          <div className="flex-1 overflow-hidden">
            <OperationView stats={queueStats} onRefresh={loadQueueStats} waStatus={waStatus} />
          </div>
        )}

        {tab === 'brain' && (
          <div className="flex-1 overflow-hidden">
            <BrainPanel events={brainEvents} />
          </div>
        )}

        {tab === 'config' && (
          <div className="flex-1 overflow-hidden">
            <BotSettings />
          </div>
        )}
      </div>
    </div>
  );
}
