import React, { useState, useEffect } from 'react';
import { X, Send, BookOpen, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../../stores/authStore';

interface PlaybookModalProps {
    playbook: any;
    onClose: () => void;
    onDeploy: (data: { playbookId: string, tenantId: string, priority: string }) => void;
}

export default function PlaybookModal({ playbook, onClose, onDeploy }: PlaybookModalProps) {
    const [tenants, setTenants] = useState<any[]>([]);
    const [tenantId, setTenantId] = useState('');
    const [priority, setPriority] = useState('normal');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        apiFetch('/api/clients').then(res => {
            if (res.success) setTenants(res.data);
        });
    }, []);

    if (!playbook) return null;

    const handleDeploy = () => {
        if (!tenantId) {
            alert('Selecione um cliente primeiro.');
            return;
        }
        setLoading(true);
        onDeploy({ playbookId: playbook.id, tenantId, priority });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-dark-800 bg-dark-850">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-imperio-600/20 text-imperio-400 rounded-lg">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">{playbook.title}</h2>
                            <p className="text-xs text-dark-400">{playbook.category}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">

                    {/* Left Col - Info */}
                    <div className="flex-1 space-y-6">
                        <div>
                            <h3 className="text-sm font-semibold text-dark-200 mb-2 uppercase tracking-wider">Descrição do Playbook</h3>
                            <p className="text-sm text-dark-300 leading-relaxed bg-dark-850 p-4 rounded-lg border border-dark-800">
                                {playbook.description}
                            </p>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-dark-200 mb-2 uppercase tracking-wider">Checklist Padrão</h3>
                            <div className="bg-dark-850 border border-dark-800 rounded-lg p-4 space-y-3 max-h-[200px] overflow-y-auto">
                                {playbook.defaultChecklist && playbook.defaultChecklist.length > 0 ? (
                                    playbook.defaultChecklist.map((item: any, idx: number) => (
                                        <div key={idx} className="flex gap-3 text-sm text-dark-300">
                                            <div className="flex-shrink-0 mt-0.5 w-4 h-4 rounded border border-dark-600 bg-dark-800"></div>
                                            <span>{item.item || item}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-dark-500 italic">Nenhum checklist defindo neste playbook.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Col - Form */}
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-1">Cliente Alvo</label>
                            <select
                                className="w-full input-field"
                                value={tenantId}
                                onChange={e => setTenantId(e.target.value)}
                            >
                                <option value="">-- Selecionar Cliente --</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-1">Prioridade</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setPriority('normal')}
                                    className={`p-3 rounded-lg border text-sm font-medium transition flex items-center justify-center gap-2 ${priority === 'normal'
                                            ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                                            : 'bg-dark-800 border-dark-700 text-dark-400 hover:bg-dark-700'
                                        }`}
                                >
                                    Normal
                                </button>
                                <button
                                    onClick={() => setPriority('urgent')}
                                    className={`p-3 rounded-lg border text-sm font-medium transition flex items-center justify-center gap-2 ${priority === 'urgent'
                                            ? 'bg-danger/10 border-danger text-danger shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                                            : 'bg-dark-800 border-dark-700 text-dark-400 hover:bg-dark-700'
                                        }`}
                                >
                                    <AlertTriangle size={16} /> Urgente
                                </button>
                            </div>

                            {priority === 'urgent' && (
                                <div className="mt-4 p-3 bg-danger/10 border border-danger/30 rounded-lg animate-fade-in flex gap-2">
                                    <AlertTriangle size={18} className="text-danger shrink-0" />
                                    <p className="text-xs text-danger/90 leading-relaxed">
                                        <strong>Trava de Sistema (Locking):</strong> Esta missão irá bloquear partes essenciais do Portal do Cliente até que o checklist seja cumprido na íntegra.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-dark-800 bg-dark-850 flex items-center justify-between">
                    <p className="text-xs text-dark-500">
                        O cliente será notificado via portal após o deploy.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} disabled={loading} className="btn-secondary">
                            Cancelar
                        </button>
                        <button onClick={handleDeploy} disabled={loading || !tenantId} className="btn-primary gap-2">
                            {loading ? 'Processando...' : (
                                <>
                                    <Send size={16} />
                                    Gerar Missão
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
