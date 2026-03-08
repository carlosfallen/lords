import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, ArrowRight, Plus, CheckCircle } from 'lucide-react';

const PIPELINE_STAGES = [
    { id: 'lead', name: 'Lead', color: '#6B7280' },
    { id: 'qualification', name: 'Qualificação', color: '#3B82F6' },
    { id: 'demo', name: 'Demo', color: '#8B5CF6' },
    { id: 'proposal', name: 'Proposta', color: '#F59E0B' },
    { id: 'negotiation', name: 'Negociação', color: '#EF4444' },
    { id: 'closing', name: 'Fechamento', color: '#10B981' },
];

interface Props {
    contactName: string;
    contactPhone: string;
    onClose: () => void;
}

export function KanbanMoveModal({ contactName, contactPhone, onClose }: Props) {
    const [loading, setLoading] = useState(true);
    const [existingDeal, setExistingDeal] = useState<any>(null);
    const [selectedStage, setSelectedStage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const getToken = useCallback(() => {
        try {
            const stored = localStorage.getItem('imperio-auth');
            return stored ? JSON.parse(stored)?.state?.accessToken : null;
        } catch { return null; }
    }, []);

    const apiFetch = useCallback(async (url: string, options?: RequestInit) => {
        const token = getToken();
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(options?.headers || {}),
            },
        });
        return res.json();
    }, [getToken]);

    // Look up existing deal by phone
    useEffect(() => {
        (async () => {
            try {
                const res = await apiFetch(`/api/pipeline/by-phone/${encodeURIComponent(contactPhone)}`);
                if (res.success && res.data) {
                    setExistingDeal(res.data);
                    setSelectedStage(res.data.stage);
                }
            } catch { /* No deal found */ }
            finally { setLoading(false); }
        })();
    }, [contactPhone, apiFetch]);

    const handleSave = async () => {
        if (!selectedStage) return;
        setSaving(true);
        setError(null);

        try {
            if (existingDeal) {
                // Move existing deal
                const res = await apiFetch(`/api/pipeline/${existingDeal.id}/move`, {
                    method: 'PUT',
                    body: JSON.stringify({ stage: selectedStage }),
                });
                if (!res.success) throw new Error(res.error || 'Erro ao mover');
                setSuccess(`Movido para ${PIPELINE_STAGES.find(s => s.id === selectedStage)?.name}`);
            } else {
                // Create new deal
                const res = await apiFetch('/api/pipeline', {
                    method: 'POST',
                    body: JSON.stringify({
                        title: `Lead - ${contactName}`,
                        contactName,
                        contactPhone,
                        stage: selectedStage,
                        temperature: 'warm',
                    }),
                });
                if (!res.success) throw new Error(res.error || 'Erro ao criar');
                setExistingDeal(res.data);
                setSuccess(`Deal criado em ${PIPELINE_STAGES.find(s => s.id === selectedStage)?.name}`);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <div
                className="w-full max-w-md mx-4 rounded-2xl shadow-2xl animate-slide-up overflow-hidden"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h3 className="font-display font-semibold text-sm">📊 Mover no Pipeline</h3>
                    <button onClick={onClose} className="p-1 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Contact info */}
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--gold)' }}>
                            {contactName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{contactName}</div>
                            <div className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>{contactPhone}</div>
                        </div>
                        {existingDeal && (
                            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                                Deal existente
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-dim)' }} />
                        </div>
                    ) : success ? (
                        <div className="flex flex-col items-center py-6 gap-2">
                            <CheckCircle size={32} className="text-green-500" />
                            <p className="text-sm font-medium text-green-400">{success}</p>
                            <button onClick={onClose} className="mt-2 text-xs py-2 px-4 rounded-lg" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                                Fechar
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Stage selector */}
                            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                                {existingDeal ? 'Selecione o estágio para mover:' : 'Selecione o estágio para criar o deal:'}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {PIPELINE_STAGES.map(stage => {
                                    const isCurrent = existingDeal?.stage === stage.id;
                                    const isSelected = selectedStage === stage.id;
                                    return (
                                        <button
                                            key={stage.id}
                                            onClick={() => setSelectedStage(stage.id)}
                                            className="flex items-center gap-2 p-3 rounded-xl text-left transition-all"
                                            style={{
                                                background: isSelected ? `${stage.color}12` : 'var(--surface-3)',
                                                border: `1px solid ${isSelected ? stage.color : 'var(--border)'}`,
                                                opacity: isCurrent && existingDeal ? 0.5 : 1,
                                            }}
                                            disabled={isCurrent && !!existingDeal}
                                        >
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                                            <div>
                                                <span className="text-xs font-medium" style={{ color: isSelected ? stage.color : 'var(--text)' }}>
                                                    {stage.name}
                                                </span>
                                                {isCurrent && existingDeal && (
                                                    <span className="block text-[9px]" style={{ color: 'var(--text-dim)' }}>Atual</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {error && (
                                <p className="text-xs text-red-400 mt-3 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    {error}
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!success && !loading && (
                    <div className="px-6 py-4 flex items-center justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <button onClick={onClose} className="text-xs py-2 px-4 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!selectedStage || saving || (existingDeal && selectedStage === existingDeal.stage)}
                            className="flex items-center gap-1.5 text-xs py-2 px-4 rounded-lg font-medium transition-all disabled:opacity-40"
                            style={{ background: 'var(--gold)', color: '#000' }}
                        >
                            {saving ? <Loader2 size={13} className="animate-spin" /> : existingDeal ? <ArrowRight size={13} /> : <Plus size={13} />}
                            {existingDeal ? 'Mover' : 'Criar Deal'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
