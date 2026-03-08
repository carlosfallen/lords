import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Bot, User, Send, PauseCircle, PlayCircle, MoreVertical, Zap } from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

interface Message {
    id: string;
    text: string;
    isBot: boolean;
    timestamp: string;
    intent?: string;
}

interface Conversation {
    phone: string;
    contactName?: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    isBotActive: boolean;
    messages: Message[];
}

export default function BotInbox() {
    const { on, send } = useWebSocket();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activePhone, setActivePhone] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial load and WebSocket subscription
    useEffect(() => {
        // Mock initial conversations (in real life, fetch from /api/conversations)
        setConversations([
            {
                phone: '5511999999999',
                contactName: 'João Silva',
                lastMessage: 'Queria saber o preço do sistema',
                lastMessageAt: new Date().toISOString(),
                unreadCount: 1,
                isBotActive: true,
                messages: [
                    { id: '1', text: 'Queria saber o preço do sistema', isBot: false, timestamp: new Date().toISOString(), intent: 'intencao.pergunta_preco' }
                ]
            }
        ]);

        const unsubMessage = on('feed.message', (payload: any) => {
            setConversations(prev => {
                const existingIndex = prev.findIndex(c => c.phone === payload.phone);
                const newMsg: Message = {
                    id: crypto.randomUUID(),
                    text: payload.text,
                    isBot: payload.direction === 'outbound' || payload.type === 'bot.reply',
                    timestamp: payload.timestamp || new Date().toISOString(),
                    intent: payload.intent
                };

                if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex].messages.push(newMsg);
                    updated[existingIndex].lastMessage = payload.text;
                    updated[existingIndex].lastMessageAt = newMsg.timestamp;
                    if (updated[existingIndex].phone !== activePhone && !newMsg.isBot) {
                        updated[existingIndex].unreadCount++;
                    }
                    return updated;
                } else {
                    // New conversation
                    return [{
                        phone: payload.phone,
                        contactName: payload.phone, // fallback
                        lastMessage: payload.text,
                        lastMessageAt: newMsg.timestamp,
                        unreadCount: 1,
                        isBotActive: true,
                        messages: [newMsg]
                    }, ...prev];
                }
            });
        });

        return () => {
            unsubMessage();
        };
    }, [activePhone, on]);

    // Scroll to bottom effect
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversations, activePhone]);

    const handleSend = () => {
        if (!newMessage.trim() || !activePhone) return;

        // 1. Optimistic UI Update
        const newMsg: Message = {
            id: crypto.randomUUID(),
            text: newMessage,
            isBot: false, // Sent by human agent
            timestamp: new Date().toISOString()
        };

        setConversations(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(c => c.phone === activePhone);
            if (idx >= 0) {
                updated[idx].messages.push(newMsg);
                updated[idx].lastMessage = newMessage;
            }
            return updated;
        });

        // 2. Publish to backend via WebSocket (which forwards to redis -> bot-bridge)
        send('bot.action', {
            type: 'message.send',
            phone: activePhone,
            text: newMessage
        });

        setNewMessage('');

        // Ensure bot is paused when human intervenes
        toggleBotState(activePhone, false);
    };

    const toggleBotState = (phone: string, activate: boolean) => {
        setConversations(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(c => c.phone === phone);
            if (idx >= 0) updated[idx].isBotActive = activate;
            return updated;
        });

        send('bot.action', {
            type: activate ? 'bot.resume' : 'bot.takeover',
            phone: phone
        });
    };

    const activeConv = conversations.find(c => c.phone === activePhone);

    return (
        <div className="flex h-[calc(100vh-120px)] bg-dark-900 border border-dark-800 rounded-xl overflow-hidden animate-fade-in shadow-2xl">
            {/* Sidebar Left: Conversas */}
            <div className="w-80 bg-dark-850 border-r border-dark-800 flex flex-col">
                <div className="p-4 border-b border-dark-800 bg-dark-900/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Bot size={20} className="text-imperio-500" /> Inbox IA
                    </h2>
                    <input
                        type="text"
                        placeholder="Buscar lead ou telefone..."
                        className="mt-4 w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:border-imperio-500 outline-none transition"
                    />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-6 text-center text-dark-500 text-sm">Nenhuma conversa ativa</div>
                    ) : (
                        conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()).map(conv => (
                            <button
                                key={conv.phone}
                                onClick={() => {
                                    setActivePhone(conv.phone);
                                    // mark as read
                                    const cIdx = conversations.findIndex(x => x.phone === conv.phone);
                                    if (cIdx >= 0) {
                                        const newConvs = [...conversations];
                                        newConvs[cIdx].unreadCount = 0;
                                        setConversations(newConvs);
                                    }
                                }}
                                className={`w-full text-left p-4 border-b border-dark-800 transition hover:bg-dark-800 ${activePhone === conv.phone ? 'bg-dark-800 border-l-4 border-l-imperio-500' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-dark-100 truncate">{conv.contactName || conv.phone}</span>
                                    {conv.unreadCount > 0 && (
                                        <span className="bg-imperio-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-dark-400 truncate pr-2">{conv.lastMessage}</p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] text-dark-500">{new Date(conv.lastMessageAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    <div className="flex gap-1" title={conv.isBotActive ? "Robô Ativo" : "Atendimento Humano"}>
                                        {conv.isBotActive ? <Bot size={12} className="text-success" /> : <User size={12} className="text-warning" />}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-[#0b1014] relative">
                {activeConv ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 px-6 bg-dark-850 border-b border-dark-800 flex items-center justify-between sticky top-0 z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-dark-300">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-white">{activeConv.contactName || activeConv.phone}</h2>
                                    <p className="text-xs text-success flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-success"></span> Online
                                    </p>
                                </div>
                            </div>

                            {/* Bot Control */}
                            <div className="flex items-center gap-2">
                                {activeConv.isBotActive ? (
                                    <button onClick={() => toggleBotState(activeConv.phone, false)} className="btn-sm bg-warning/10 text-warning hover:bg-warning/20 border border-warning/30 flex items-center gap-2">
                                        <PauseCircle size={14} /> Pausar Bot
                                    </button>
                                ) : (
                                    <button onClick={() => toggleBotState(activeConv.phone, true)} className="btn-sm bg-success/10 text-success hover:bg-success/20 border border-success/30 flex items-center gap-2">
                                        <PlayCircle size={14} /> Reativar Bot
                                    </button>
                                )}
                                <button className="p-2 text-dark-400 hover:text-white rounded transition"><MoreVertical size={18} /></button>
                            </div>
                        </div>

                        {/* Chat History */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', opacity: 0.9 }}>
                            {activeConv.messages.map((msg, i) => {
                                const isFromMe = msg.isBot || !msg.intent; // Simplified rule: true if it's our sent copy
                                return (
                                    <div key={msg.id || i} className={`flex flex-col ${isFromMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[75%] rounded-lg p-3 relative shadow-sm ${isFromMe ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#202c33] text-[#e9edef]'}`}>
                                            <p className="text-sm leading-relaxed">{msg.text}</p>

                                            <div className="flex items-center justify-end gap-2 mt-1 -mr-1">
                                                {msg.intent && !isFromMe && (
                                                    <span className="text-[9px] bg-dark-950/50 px-1.5 py-0.5 rounded text-imperio-300 flex items-center gap-1">
                                                        <Zap size={8} /> {msg.intent.replace('intencao.', '')}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-white/50">
                                                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 bg-dark-850 border-t border-dark-800 shrink-0">
                            {activeConv.isBotActive && (
                                <div className="mb-2 text-xs text-warning flex items-center gap-1">
                                    <Bot size={12} /> O bot está ativo. Ao enviar uma mensagem, ele será pausado automaticamente.
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                    placeholder="Digite uma mensagem..."
                                    className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-4 py-3 text-sm text-white focus:border-imperio-500 outline-none transition"
                                />
                                <button
                                    onClick={handleSend}
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
                        <h2 className="text-xl font-bold text-dark-300">Inbox Central</h2>
                        <p className="text-sm mt-2">Selecione uma conversa ao lado para monitorar a IA ou intervir.</p>
                    </div>
                )}
            </div>

            {/* Sidebar Right: Lead Intel Extrusion */}
            {activeConv && (
                <div className="w-72 bg-dark-850 border-l border-dark-800 hidden lg:flex flex-col animate-slide-left">
                    <div className="p-4 border-b border-dark-800">
                        <h3 className="text-sm font-bold text-dark-200 uppercase tracking-wider">Inteligência do Lead</h3>
                    </div>
                    <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto rounded-full bg-dark-700 flex items-center justify-center mb-3">
                                <User size={24} className="text-dark-300" />
                            </div>
                            <h4 className="font-bold text-white text-lg">{activeConv.contactName || 'Lead Desconhecido'}</h4>
                            <p className="text-xs text-dark-400">{activeConv.phone}</p>
                        </div>

                        <div className="bg-dark-900 rounded-xl p-4 border border-dark-800 shadow-inner">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-dark-400 font-medium">Score de Retenção</span>
                                <span className="text-xs font-bold text-success">Alta (84)</span>
                            </div>
                            <div className="w-full bg-dark-950 rounded-full h-1.5 mb-4">
                                <div className="bg-gradient-to-r from-success/50 to-success h-1.5 rounded-full" style={{ width: '84%' }}></div>
                            </div>

                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-dark-400 font-medium">Temperatura</span>
                                <span className="text-xs font-bold text-orange-500">Morno</span>
                            </div>
                            <div className="w-full bg-dark-950 rounded-full h-1.5">
                                <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: '50%' }}></div>
                            </div>
                        </div>

                        <div>
                            <h5 className="text-xs font-bold text-dark-300 uppercase tracking-wider mb-3">Ações Rápidas</h5>
                            <div className="space-y-2">
                                <button className="w-full btn-secondary text-left py-2 px-3 text-sm flex justify-between items-center group">
                                    Enviar Playbook <Zap size={14} className="group-hover:text-imperio-400 opacity-50 transition" />
                                </button>
                                <button className="w-full btn-secondary text-left py-2 px-3 text-sm flex justify-between items-center group">
                                    Mover no Kanban <Zap size={14} className="group-hover:text-imperio-400 opacity-50 transition" />
                                </button>
                                <button className="w-full btn-secondary text-left py-2 px-3 text-sm flex justify-between items-center group text-danger hover:border-danger hover:bg-danger/10">
                                    Travar Portal Cliente
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
