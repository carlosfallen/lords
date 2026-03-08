import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

export function MissionLockOverlay() {
    const [lockedMission, setLockedMission] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);

    const checkMissions = async () => {
        try {
            const res = await apiFetch('/api/client-portal/missions');
            if (res.success) {
                // Find any urgent mission that blocks access and is not completed
                const blocking = res.data.find((m: any) => m.blocksAccess && m.status !== 'completed');
                setLockedMission(blocking || null);
            }
        } catch (err) {
            console.error('Failed to check missions', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkMissions();
    }, []);

    const toggleCheck = async (index: number) => {
        if (!lockedMission) return;
        const newChecklist = [...lockedMission.checklist];
        newChecklist[index].done = !newChecklist[index].done;

        setLockedMission({ ...lockedMission, checklist: newChecklist });

        // Persist change
        await apiFetch(`/api/client-portal/missions/${lockedMission.id}`, {
            method: 'PUT',
            body: JSON.stringify({ checklist: newChecklist })
        });
    };

    const completeMission = async () => {
        if (!lockedMission) return;

        const allDone = lockedMission.checklist.every((c: any) => c.done);
        if (!allDone) {
            alert('Por favor, conclua todas as subtarefas primeiro.');
            return;
        }

        setCompleting(true);
        try {
            const res = await apiFetch(`/api/client-portal/missions/${lockedMission.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'completed' })
            });

            if (res.success) {
                // Mission cleared, remove lock
                setLockedMission(null);
            }
        } catch (err) {
            console.error('Failed to complete', err);
        } finally {
            setCompleting(false);
        }
    };

    if (loading || !lockedMission) return null;

    const allChecked = lockedMission.checklist?.length > 0 && lockedMission.checklist.every((c: any) => c.done);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="max-w-md w-full bg-dark-900 border border-danger/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-danger via-danger/50 to-transparent"></div>

                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
                        <ShieldAlert className="text-danger" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Choque de Gestão</h2>
                        <p className="text-xs text-danger uppercase tracking-wider font-semibold">Ação Imediata Necessária</p>
                    </div>
                </div>

                <div className="mb-6">
                    <p className="text-sm text-dark-300 mb-2 leading-relaxed">
                        Seu acesso a algumas áreas do sistema foi temporariamente pausado. Nossa equipe de mentoria identificou uma trava crítica no seu negócio.
                        Execute o playbook abaixo para liberar o sistema.
                    </p>
                    <div className="bg-dark-850 p-4 rounded-xl border border-dark-700 mt-4">
                        <h3 className="text-md font-semibold text-dark-100 mb-1">{lockedMission.title}</h3>
                        <p className="text-sm text-dark-400 mb-4">{lockedMission.description}</p>

                        <div className="space-y-2">
                            {lockedMission.checklist?.map((item: any, idx: number) => (
                                <label key={idx} className="flex items-start gap-3 p-2 rounded hover:bg-dark-800 transition cursor-pointer">
                                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition ${item.done ? 'bg-success border-success text-white' : 'border-dark-600'}`}>
                                        {item.done && <CheckCircle size={14} />}
                                    </div>
                                    <span className={`text-sm ${item.done ? 'text-dark-500 line-through' : 'text-dark-200'}`}>
                                        {item.item}
                                    </span>
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={item.done}
                                        onChange={() => toggleCheck(idx)}
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    onClick={completeMission}
                    disabled={!allChecked || completing}
                    className="w-full btn-primary py-3 flex items-center justify-center gap-2 font-medium"
                >
                    {completing ? 'Processando...' : 'Concluir Missão e Desbloquear'}
                    <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
}
