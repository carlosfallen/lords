// ============================================================
// Onboarding Page
// ============================================================
import { useState, useEffect } from 'react';
import { UserPlus, CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

export default function Onboarding() {
    const [onboardings, setOnboardings] = useState<any[]>([]);

    useEffect(() => {
        apiFetch('/api/onboarding').then(r => r.success && setOnboardings(r.data));
    }, []);

    const calculateProgress = (checklist: any[]) => {
        if (!checklist || checklist.length === 0) return 0;
        const done = checklist.filter(c => c.completed).length;
        return Math.round((done / checklist.length) * 100);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <p className="text-sm text-dark-400">{onboardings.length} processos de onboarding ativos</p>
                <button className="btn-primary btn-sm"><UserPlus size={14} /> Novo Onboarding</button>
            </div>

            {onboardings.map(o => {
                const prog = calculateProgress(o.checklist);
                return (
                    <div key={o.id} className="card">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold text-white">{o.tenantName || 'Cliente sem nome'}</h3>
                                <p className="text-xs text-dark-400">Início: {new Date(o.startedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-imperio-400">{prog}%</p>
                                <p className="text-xs text-dark-500">Progresso</p>
                            </div>
                        </div>
                        {/* Progress bar */}
                        <div className="h-2 bg-dark-800 rounded-full mb-4 overflow-hidden"><div className="h-full bg-imperio-500 rounded-full transition-all" style={{ width: `${prog}%` }} /></div>
                        {/* Steps */}
                        <div className="flex items-center gap-2">
                            {o.checklist && o.checklist.map((step: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 flex-1">
                                    <div className="flex flex-col items-center gap-1 flex-1">
                                        {step.completed ? <CheckCircle size={18} className="text-success" /> : <Circle size={18} className="text-dark-600" />}
                                        <span className={`text-[10px] text-center ${step.completed ? 'text-dark-300' : 'text-dark-500'}`}>{step.step}</span>
                                    </div>
                                    {i < o.checklist.length - 1 && <ArrowRight size={12} className="text-dark-700 shrink-0" />}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
