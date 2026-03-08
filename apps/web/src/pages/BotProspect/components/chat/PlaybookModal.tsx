import { useState } from 'react';
import { X, BookOpen, Send, Loader2 } from 'lucide-react';

interface Playbook {
    id: string;
    title: string;
    description: string;
    text: string;
}

const PLAYBOOKS: Playbook[] = [
    {
        id: 'prospeccao',
        title: 'Playbook Prospecção',
        description: 'Abordagem inicial com foco em diagnóstico rápido',
        text: `Olá! Tudo bem? 👋

Sou da equipe comercial da Império Lord e vi que você pode se beneficiar das nossas soluções.

Posso te fazer uma pergunta rápida? Qual é o maior desafio que você enfrenta hoje na sua operação?

Quero entender sua realidade antes de apresentar qualquer coisa. 🎯`,
    },
    {
        id: 'qualificacao',
        title: 'Playbook Qualificação',
        description: 'Aprofundamento para qualificar o lead',
        text: `Entendi! Obrigado por compartilhar.

Para eu verificar se realmente faz sentido conversarmos, preciso entender melhor:

1️⃣ Qual o seu volume mensal aproximado?
2️⃣ Você já usa alguma ferramenta para isso hoje?
3️⃣ Se tivesse uma solução ideal, como ela seria?

Assim consigo avaliar se nossa solução se encaixa no seu cenário. 🤝`,
    },
    {
        id: 'convite',
        title: 'Playbook Convite para Reunião',
        description: 'Convite direto para demo/reunião',
        text: `Pelo que você me contou, acho que temos um fit excelente! 🎉

Que tal agendarmos uma conversa rápida de 15 minutos para eu te mostrar como outros clientes com desafios parecidos resolveram isso?

Tenho disponibilidade amanhã ou depois. Qual horário funciona melhor para você? 📅`,
    },
];

interface Props {
    onSelect: (text: string) => void;
    onClose: () => void;
}

export function PlaybookModal({ onSelect, onClose }: Props) {
    const [selected, setSelected] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        const pb = PLAYBOOKS.find(p => p.id === selected);
        if (!pb) return;
        setSending(true);
        try {
            await onSelect(pb.text);
        } finally {
            setSending(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <div
                className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl animate-slide-up overflow-hidden"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                        <BookOpen size={18} style={{ color: 'var(--gold)' }} />
                        <h3 className="font-display font-semibold text-sm">Enviar Playbook</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* List */}
                <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
                    {PLAYBOOKS.map(pb => (
                        <button
                            key={pb.id}
                            onClick={() => setSelected(pb.id)}
                            className="w-full text-left p-4 rounded-xl transition-all"
                            style={{
                                background: selected === pb.id ? 'rgba(245,158,11,0.08)' : 'var(--surface-3)',
                                border: `1px solid ${selected === pb.id ? 'var(--gold)' : 'var(--border)'}`,
                            }}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm" style={{ color: selected === pb.id ? 'var(--gold)' : 'var(--text)' }}>
                                    {pb.title}
                                </span>
                            </div>
                            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{pb.description}</p>
                            {selected === pb.id && (
                                <div
                                    className="text-xs p-3 rounded-lg mt-2 whitespace-pre-wrap"
                                    style={{ background: 'var(--surface-2)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}
                                >
                                    {pb.text}
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 flex items-center justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={onClose}
                        className="text-xs py-2 px-4 rounded-lg transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!selected || sending}
                        className="flex items-center gap-1.5 text-xs py-2 px-4 rounded-lg font-medium transition-all disabled:opacity-40"
                        style={{ background: 'var(--gold)', color: '#000' }}
                    >
                        {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        Enviar no Chat
                    </button>
                </div>
            </div>
        </div>
    );
}
