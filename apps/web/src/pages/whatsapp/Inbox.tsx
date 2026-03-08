// ============================================================
// WhatsApp Inbox — Central de Atendimento (Real-time)
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../stores/authStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Send, Phone, UserCheck, Bot, Search, Zap, MoreVertical } from 'lucide-react';

interface Conversation {
    id: string; contactName: string; contactPhone: string; temperature: string; trail: string;
    currentStage: string; lastMessage: string; lastMessageAt: string; unreadCount: number;
    mentorName: string; isHumanTakeover: boolean;
}

interface Message {
    id: string; direction: string; senderType: string; content: string; createdAt: string;
}

export default function Inbox() {
    const { on } = useWebSocket();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [botStatus, setBotStatus] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        apiFetch('/api/bot/conversations').then(r => r.success && setConversations(r.data));
        apiFetch('/api/bot/status').then(r => r.success && setBotStatus(r.data));
    }, []);

    useEffect(() => {
        if (selectedId) {
            apiFetch(`/api/bot/conversations/${selectedId}/messages`).then(r => r.success && setMessages(r.data));
        }
    }, [selectedId]);

    // Real-time: listen for new WhatsApp messages
    useEffect(() => {
        const unsub = on('wa.message', (data: any) => {
            // Update conversation list
            setConversations(prev => {
                const idx = prev.findIndex(c => c.id === data.leadId);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = {
                        ...updated[idx],
                        lastMessage: data.message?.content || '',
                        lastMessageAt: data.message?.createdAt || new Date().toISOString(),
                        unreadCount: updated[idx].id === selectedId ? 0 : updated[idx].unreadCount + 1,
                    };
                    return updated;
                } else {
                    // New conversation, add it
                    return [{
                        id: data.leadId,
                        contactName: data.pushName || data.phone,
                        contactPhone: data.phone,
                        temperature: 'cold',
                        trail: 'sale',
                        currentStage: 'Recepção',
                        lastMessage: data.message?.content || '',
                        lastMessageAt: data.message?.createdAt || new Date().toISOString(),
                        unreadCount: 1,
                        mentorName: '',
                        isHumanTakeover: false,
                    }, ...prev];
                }
            });

            // Append message if this conversation is selected
            if (data.leadId === selectedId && data.message) {
                setMessages(prev => {
                    if (prev.some(m => m.id === data.message.id)) return prev;
                    return [...prev, data.message];
                });
            }
        });

        return unsub;
    }, [on, selectedId]);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const selected = conversations.find(c => c.id === selectedId);

    const tempDot = (t: string) => {
        const map: Record<string, string> = { cold: 'bg-blue-400', warm: 'bg-yellow-400', hot: 'bg-red-400', cooled: 'bg-gray-400' };
        return <span className={`w-2 h-2 rounded-full ${map[t] || 'bg-gray-400'}`} />;
    };

    const trailBadge = (t: string) => {
        const map: Record<string, [string, string]> = {
            sale: ['badge-info', '🎯 Venda'],
            support: ['badge-warning', '🔧 Suporte'],
            mentorship: ['badge-success', '📈 Mentoria'],
        };
        const [cls, label] = map[t] || ['badge-neutral', t];
        return <span className={`badge ${cls}`}>{label}</span>;
    };

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const handleSend = async () => {
        if (!newMsg.trim() || !selectedId) return;
        await apiFetch(`/api/bot/conversations/${selectedId}/send`, {
            method: 'POST',
            body: JSON.stringify({ content: newMsg }),
        });
        setMessages(prev => [...prev, {
            id: crypto.randomUUID(), direction: 'outbound', senderType: 'human',
            content: newMsg, createdAt: new Date().toISOString(),
        }]);
        setNewMsg('');
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-0 rounded-xl overflow-hidden border border-dark-700 animate-fade-in">
            {/* Conversation List */}
            <div className="w-80 shrink-0 bg-dark-900 border-r border-dark-800 flex flex-col">
                {/* Bot status header */}
                <div className="p-3 border-b border-dark-800">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`status-dot ${botStatus?.status === 'connected' ? 'online' : 'offline'}`} />
                        <span className="text-xs font-medium text-dark-300">
                            Bot {botStatus?.status === 'connected' ? 'Online' : 'Offline'}
                        </span>
                        <span className="text-[10px] text-dark-500 ml-auto">{botStatus?.totalConversationsToday} conversas hoje</span>
                    </div>
                    <div className="flex items-center gap-2 bg-dark-800 rounded-lg px-2.5 py-1.5">
                        <Search size={13} className="text-dark-500" />
                        <input type="text" placeholder="Buscar conversa..." className="bg-transparent text-xs text-dark-300 outline-none w-full placeholder:text-dark-500" />
                    </div>
                </div>

                {/* Conversations */}
                <div className="flex-1 overflow-y-auto">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => setSelectedId(conv.id)}
                            className={`w-full text-left p-3 border-b border-dark-800/50 hover:bg-dark-800/50 transition ${selectedId === conv.id ? 'bg-dark-800' : ''
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold text-dark-300">
                                    {conv.contactName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        {tempDot(conv.temperature)}
                                        <span className="text-sm font-medium text-dark-200 truncate">{conv.contactName}</span>
                                        {conv.isHumanTakeover && <UserCheck size={12} className="text-imperio-400" />}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[10px] text-dark-500">{formatTime(conv.lastMessageAt)}</p>
                                    {conv.unreadCount > 0 && (
                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-imperio-600 text-[9px] font-bold text-white mt-0.5">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-dark-400 truncate ml-10">{conv.lastMessage}</p>
                            <div className="flex items-center gap-1.5 ml-10 mt-1">
                                {trailBadge(conv.trail)}
                                <span className="text-[10px] text-dark-600">{conv.currentStage}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            {selected ? (
                <div className="flex-1 flex flex-col bg-dark-950">
                    {/* Chat header */}
                    <div className="flex items-center justify-between p-3 border-b border-dark-800 bg-dark-900">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-dark-700 flex items-center justify-center text-sm font-bold text-dark-300">
                                {selected.contactName.charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-white">{selected.contactName}</p>
                                    {trailBadge(selected.trail)}
                                </div>
                                <p className="text-xs text-dark-500">{selected.contactPhone} • {selected.currentStage}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button className={`btn-sm ${selected.isHumanTakeover ? 'btn-danger' : 'btn-secondary'}`}>
                                {selected.isHumanTakeover ? <><Bot size={14} /> Devolver ao Bot</> : <><UserCheck size={14} /> Assumir</>}
                            </button>
                            <button className="btn-ghost btn-sm"><MoreVertical size={14} /></button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`chat-bubble ${msg.direction === 'inbound' ? 'inbound' : 'outbound'}`}>
                                    {msg.senderType === 'bot' && (
                                        <div className="flex items-center gap-1 mb-1">
                                            <Bot size={10} className="text-imperio-300" />
                                            <span className="text-[10px] text-imperio-300 font-medium">Bot</span>
                                        </div>
                                    )}
                                    <p>{msg.content}</p>
                                    <p className={`text-[10px] mt-1 ${msg.direction === 'outbound' ? 'text-white/50' : 'text-dark-500'}`}>
                                        {formatTime(msg.createdAt)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-dark-800 bg-dark-900">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newMsg}
                                onChange={(e) => setNewMsg(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Digite uma mensagem..."
                                className="input flex-1"
                            />
                            <button onClick={handleSend} className="btn-primary p-2.5">
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center bg-dark-950">
                    <div className="text-center">
                        <Zap size={48} className="text-dark-700 mx-auto mb-3" />
                        <p className="text-dark-500">Selecione uma conversa</p>
                    </div>
                </div>
            )}
        </div>
    );
}
