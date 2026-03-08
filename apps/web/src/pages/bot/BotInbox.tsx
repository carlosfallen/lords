// ============================================================
// BotInbox — Central IA (Real Data + Real-time WebSocket)
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Bot, User, Send, PauseCircle, PlayCircle, MoreVertical, Zap } from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

interface Message {
    id: string;
    direction: string;
    senderType: string;
    content: string;
    createdAt: string;
    intent?: string;
}

interface Conversation {
    id: string;
    contactName: string;
    contactPhone: string;
    temperature: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    isHumanTakeover: boolean;
}

export default function BotInbox() {
    const { on, send } = useWebSocket();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load real conversations from API
    useEffect(() => {
        apiFetch('/api/bot/conversations').then(r => {
            if (r.success) setConversations(r.data);
        });
    }, []);

    // Load messages when selecting a conversation
    useEffect(() => {
        if (selectedId) {
            apiFetch(`/api/bot/conversations/${selectedId}/messages`).then(r => {
                if (r.success) setMessages(r.data);
            });
        }
    }, [selectedId]);

    // Real-time WebSocket: listen for new WhatsApp messages
    useEffect(() => {
        const unsubWa = on('wa.message', (data: any) => {
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
                    // New conversation appeared
                    return [{
                        id: data.leadId,
                        contactName: data.pushName || data.phone,
                        contactPhone: data.phone,
                        temperature: 'cold',
                        lastMessage: data.message?.content || '',
                        lastMessageAt: data.message?.createdAt || new Date().toISOString(),
                        unreadCount: 1,
                        isHumanTakeover: false,
                    }, ...prev];
                }
            });

            // If this conversation is selected, append the message
            if (data.leadId === selectedId && data.message) {
                setMessages(prev => {
                    // Deduplicate by id
                    if (prev.some(m => m.id === data.message.id)) return prev;
                    return [...prev, data.message];
                });
            }
        });

        const unsubFeed = on('feed.message', (data: any) => {
            // Also listen for bot events (brain responses)
            if (data.phone) {
                setConversations(prev => {
                    const idx = prev.findIndex(c => c.contactPhone === data.phone);
                    if (idx >= 0) {
                        const updated = [...prev];
                        updated[idx] = {
                            ...updated[idx],
                            lastMessage: data.llm_response || data.text || updated[idx].lastMessage,
                            lastMessageAt: new Date().toISOString(),
                        };
                        return updated;
                    }
                    return prev;
                });
            }
        });

        return () => { unsubWa(); unsubFeed(); };
    }, [on, selectedId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const selected = conversations.find(c => c.id === selectedId);

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedId) return;

        // Optimistic UI
        const optimisticMsg: Message = {
            id: crypto.randomUUID(),
            direction: 'outbound',
            senderType: 'human',
            content: newMessage,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMsg]);

        // Send via API
        await apiFetch(`/api/bot/conversations/${selectedId}/send`, {
            method: 'POST',
            body: JSON.stringify({ content: newMessage }),
        });

        setNewMessage('');
    };

    const toggleBotState = (activate: boolean) => {
        if (!selected) return;
        setConversations(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(c => c.id === selected.id);
            if (idx >= 0) updated[idx] = { ...updated[idx], isHumanTakeover: !activate };
            return updated;
        });

        send('bot.action', {
            type: activate ? 'bot.resume' : 'bot.takeover',
            phone: selected.contactPhone,
        });
    };

    const formatTime = (ts: string) => {
        try {
            return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    const tempDot = (t: string) => {
        const map: Record<string, string> = { cold: 'bg-blue-400', warm: 'bg-yellow-400', hot: 'bg-red-400', cooled: 'bg-gray-400' };
        return <span className={`w-2 h-2 rounded-full ${map[t] || 'bg-gray-400'}`} />;
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-dark-900 border border-dark-800 rounded-xl overflow-hidden animate-fade-in shadow-2xl">
            {/* Sidebar Left: Conversas */}
            <div className="w-80 bg-dark-850 border-r border-dark-800 flex flex-col">
                <div className="p-4 border-b border-dark-800 bg-dark-900/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Bot size={20} className="text-imperio-500" /> Inbox IA
                    </h2>
                    <p className="text-xs text-dark-500 mt-1">{conversations.length} conversas ativas</p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-6 text-center text-dark-500 text-sm">
                            <Bot size={32} className="text-dark-700 mx-auto mb-2" />
                            Nenhuma conversa WhatsApp ativa
                        </div>
                    ) : (
                        conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()).map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => {
                                    setSelectedId(conv.id);
                                    setConversations(prev => prev.map(c =>
                                        c.id === conv.id ? { ...c, unreadCount: 0 } : c
                                    ));
                                }}
                                className={`w-full text-left p-4 border-b border-dark-800 transition hover:bg-dark-800 ${selectedId === conv.id ? 'bg-dark-800 border-l-4 border-l-imperio-500' : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {tempDot(conv.temperature)}
                                        <span className="font-semibold text-dark-100 truncate">{conv.contactName || conv.contactPhone}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {conv.unreadCount > 0 && (
                                            <span className="bg-imperio-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                        {conv.isHumanTakeover ? <User size={12} className="text-warning" /> : <Bot size={12} className="text-success" />}
                                    </div>
                                </div>
                                <p className="text-xs text-dark-400 truncate pr-2">{conv.lastMessage}</p>
                                <span className="text-[10px] text-dark-500">{formatTime(conv.lastMessageAt)}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-[#0b1014] relative">
                {selected ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 px-6 bg-dark-850 border-b border-dark-800 flex items-center justify-between sticky top-0 z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-dark-300">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-white">{selected.contactName || selected.contactPhone}</h2>
                                    <p className="text-xs text-dark-500">{selected.contactPhone}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {!selected.isHumanTakeover ? (
                                    <button onClick={() => toggleBotState(false)} className="btn-sm bg-warning/10 text-warning hover:bg-warning/20 border border-warning/30 flex items-center gap-2">
                                        <PauseCircle size={14} /> Pausar Bot
                                    </button>
                                ) : (
                                    <button onClick={() => toggleBotState(true)} className="btn-sm bg-success/10 text-success hover:bg-success/20 border border-success/30 flex items-center gap-2">
                                        <PlayCircle size={14} /> Reativar Bot
                                    </button>
                                )}
                                <button className="p-2 text-dark-400 hover:text-white rounded transition"><MoreVertical size={18} /></button>
                            </div>
                        </div>

                        {/* Chat History */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.direction === 'outbound' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[75%] rounded-lg p-3 shadow-sm ${msg.direction === 'outbound' ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#202c33] text-[#e9edef]'
                                        }`}>
                                        {msg.senderType === 'bot' && (
                                            <div className="flex items-center gap-1 mb-1">
                                                <Bot size={10} className="text-imperio-300" />
                                                <span className="text-[10px] text-imperio-300 font-medium">Bot</span>
                                            </div>
                                        )}
                                        {msg.senderType === 'human' && msg.direction === 'outbound' && (
                                            <div className="flex items-center gap-1 mb-1">
                                                <User size={10} className="text-blue-300" />
                                                <span className="text-[10px] text-blue-300 font-medium">Agente</span>
                                            </div>
                                        )}
                                        <p className="text-sm leading-relaxed">{msg.content}</p>
                                        <div className="flex items-center justify-end gap-2 mt-1">
                                            {msg.intent && (
                                                <span className="text-[9px] bg-dark-950/50 px-1.5 py-0.5 rounded text-imperio-300 flex items-center gap-1">
                                                    <Zap size={8} /> {msg.intent}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-white/50">{formatTime(msg.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 bg-dark-850 border-t border-dark-800 shrink-0">
                            {!selected.isHumanTakeover && (
                                <div className="mb-2 text-xs text-warning flex items-center gap-1">
                                    <Bot size={12} /> O bot está ativo. Ao enviar uma mensagem, ele será pausado automaticamente.
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            handleSend();
                                            if (!selected.isHumanTakeover) toggleBotState(false);
                                        }
                                    }}
                                    placeholder="Digite uma mensagem..."
                                    className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-4 py-3 text-sm text-white focus:border-imperio-500 outline-none transition"
                                />
                                <button
                                    onClick={() => {
                                        handleSend();
                                        if (!selected.isHumanTakeover) toggleBotState(false);
                                    }}
                                    disabled={!newMessage.trim()}
                                    className="w-12 h-12 rounded-full bg-imperio-600 flex items-center justify-center text-white hover:bg-imperio-500 disabled:opacity-50 transition"
                                >
                                    <Send size={18} className="translate-x-[-1px]" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-dark-500">
                        <div className="w-20 h-20 rounded-full bg-dark-800 flex items-center justify-center mb-4 border-4 border-dark-900 shadow-xl">
                            <Bot size={32} className="text-dark-400" />
                        </div>
                        <h2 className="text-xl font-bold text-dark-300">Inbox Central IA</h2>
                        <p className="text-sm mt-2">Selecione uma conversa ao lado para monitorar a IA ou intervir.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
