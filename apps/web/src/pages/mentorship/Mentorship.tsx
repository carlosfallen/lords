import { useState, useEffect } from 'react';
import { apiFetch } from '../../stores/authStore';
import { Target, BookOpen, CheckCircle, Clock, AlertTriangle, Plus, DollarSign, TrendingDown, ArrowRight } from 'lucide-react';
import PlaybookModal from './modals/PlaybookModal';

export default function Mentorship() {
    const [missions, setMissions] = useState<any[]>([]);
    const [playbooks, setPlaybooks] = useState<any[]>([]);
    const [motSnapshots, setMotSnapshots] = useState<any[]>([]);
    const [tab, setTab] = useState<'money-on-table' | 'missions' | 'playbooks'>('money-on-table');
    const [selectedPlaybook, setSelectedPlaybook] = useState<any | null>(null);

    useEffect(() => {
        apiFetch('/api/mentorship/missions').then(r => r.success && setMissions(r.data));
        apiFetch('/api/mentorship/playbooks').then(r => r.success && setPlaybooks(r.data));
        apiFetch('/api/mentorship/money-on-table').then(r => r.success && setMotSnapshots(r.data));
    }, []);

    const statusIcon = (s: string) => {
        if (s === 'completed') return <CheckCircle size={16} className="text-success" />;
        if (s === 'overdue') return <AlertTriangle size={16} className="text-danger" />;
        return <Clock size={16} className="text-warning" />;
    };

    // Calculate total lost across all clients
    const globalTotalLost = motSnapshots.reduce((acc, s) => acc + Number(s.totalLost || 0), 0);

    const handleDeployPlaybook = async (data: { playbookId: string, tenantId: string, priority: string }) => {
        if (!selectedPlaybook) return;

        const res = await apiFetch('/api/mentorship/missions', {
            method: 'POST',
            body: JSON.stringify({
                tenantId: data.tenantId,
                playbookId: data.playbookId,
                priority: data.priority,
                title: `Playbook: ${selectedPlaybook.title}`,
                description: selectedPlaybook.description,
                checklist: selectedPlaybook.defaultChecklist?.map((c: any) => ({ item: c.item || c, done: false })) || []
            })
        });

        if (res.success) {
            alert('Playbook implantado com sucesso! A missão foi enviada.');
            setSelectedPlaybook(null);
            setTab('missions');
            // Refresh missions
            apiFetch('/api/mentorship/missions').then(r => r.success && setMissions(r.data));
        } else {
            alert('Erro ao implantar playbook.');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-dark-850 rounded-lg border border-dark-700">
                    <p className="text-xl font-bold text-dark-200">{missions.length}</p>
                    <p className="text-xs text-dark-400">Total Missões</p>
                </div>
                <div className="text-center p-3 bg-dark-850 rounded-lg border border-dark-700">
                    <p className="text-xl font-bold text-danger">R$ {globalTotalLost.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-dark-400">Total Dinheiro na Mesa</p>
                </div>
                <div className="text-center p-3 bg-dark-850 rounded-lg border border-dark-700">
                    <p className="text-xl font-bold text-danger">{missions.filter(m => m.status === 'overdue').length}</p>
                    <p className="text-xs text-dark-400">Missões Atrasadas</p>
                </div>
                <div className="text-center p-3 bg-dark-850 rounded-lg border border-dark-700">
                    <p className="text-xl font-bold text-success">{missions.filter(m => m.status === 'completed').length}</p>
                    <p className="text-xs text-dark-400">Missões Concluídas</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1">
                    <button onClick={() => setTab('money-on-table')} className={`btn-sm ${tab === 'money-on-table' ? 'btn-primary' : 'btn-secondary'}`}>
                        <DollarSign size={14} /> Dinheiro na Mesa
                    </button>
                    <button onClick={() => setTab('missions')} className={`btn-sm ${tab === 'missions' ? 'btn-primary' : 'btn-secondary'}`}>
                        <Target size={14} /> Missões
                    </button>
                    <button onClick={() => setTab('playbooks')} className={`btn-sm ${tab === 'playbooks' ? 'btn-primary' : 'btn-secondary'}`}>
                        <BookOpen size={14} /> Playbooks
                    </button>
                </div>
                {tab === 'missions' && <button className="btn-primary btn-sm"><Plus size={14} /> Nova Missão</button>}
            </div>

            {tab === 'money-on-table' && (
                <div className="space-y-6">
                    {motSnapshots.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-dark-500 text-sm border-2 border-dashed border-dark-700 rounded-xl">
                            Nenhum snapshot financeiro encontrado.
                        </div>
                    ) : (
                        motSnapshots.map(snapshot => (
                            <div key={snapshot.id} className="card border-l-4 border-l-danger/80">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            {snapshot.tenant}
                                        </h3>
                                        <p className="text-xs text-dark-400 mt-1">Snapshot auditado em: {new Date(snapshot.calculatedAt).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-danger">R$ {Number(snapshot.totalLost).toLocaleString('pt-BR')}</p>
                                        <p className="text-[10px] text-dark-400 font-medium uppercase tracking-wider">Perdido em ineficiências</p>
                                    </div>
                                </div>

                                {/* Graph Breakdown */}
                                <div className="space-y-4">
                                    {[
                                        { label: 'Leads não respondidos (< 10m)', value: Number(snapshot.unansweredLeadsLoss), color: 'bg-red-500', icon: Clock },
                                        { label: 'Taxa de No-Show / Faltas', value: Number(snapshot.noShowLoss), color: 'bg-orange-500', icon: AlertTriangle },
                                        { label: 'Leads parados no funil', value: Number(snapshot.stuckLeadsLoss), color: 'bg-yellow-500', icon: TrendingDown },
                                        { label: 'Custo de Estoque Imobilizado', value: Number(snapshot.stuckInventoryLoss), color: 'bg-purple-500', icon: Target },
                                        { label: 'Conversão Abaixo da Meta', value: Number(snapshot.lowConversionLoss), color: 'bg-blue-500', icon: DollarSign },
                                    ].filter(item => item.value > 0).map((item, i) => {
                                        const percent = (item.value / snapshot.totalLost) * 100;
                                        return (
                                            <div key={i} className="group flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center shrink-0">
                                                    <item.icon size={14} className={item.color.replace('bg-', 'text-')} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xs mb-1.5 align-bottom">
                                                        <span className="text-dark-300 font-medium">{item.label}</span>
                                                        <span className="text-dark-200 font-bold">R$ {item.value.toLocaleString('pt-BR')} <span className="text-dark-500 font-normal ml-1">({percent.toFixed(1)}%)</span></span>
                                                    </div>
                                                    <div className="h-2 bg-dark-850 rounded-full overflow-hidden relative">
                                                        <div
                                                            className={`h-full rounded-full ${item.color} shadow-[0_0_10px_rgba(0,0,0,0.5)] shadow-${item.color.replace('bg-', '')}/50`}
                                                            style={{ width: `${Math.min(100, percent)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                {/* Action CTA */}
                                                <button
                                                    onClick={() => setTab('playbooks')}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost btn-sm text-imperio-400 hover:text-white shrink-0"
                                                    title="Resolver gargalo"
                                                >
                                                    <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {tab === 'missions' && (
                <div className="space-y-3">
                    {missions.map(m => (
                        <div key={m.id} className={`card ${m.status === 'overdue' ? 'border-danger/30' : ''}`}>
                            <div className="flex items-start gap-3">
                                {statusIcon(m.status)}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm font-medium text-dark-200">{m.title}</h4>
                                        <span className={`badge ${m.priority === 'urgent' ? 'badge-danger' : m.priority === 'high' ? 'badge-warning' : 'badge-neutral'}`}>
                                            {m.priority === 'urgent' ? 'Urgente' : m.priority === 'high' ? 'Alta' : 'Normal'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-dark-400 mb-3">{m.tenant} • Prazo: {m.dueDate} • Por: {m.createdBy}</p>
                                    {/* Checklist */}
                                    <div className="space-y-1">
                                        {m.checklist?.map((c: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2 text-xs">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${c.done ? 'bg-success/20 border-success text-success' : 'border-dark-600'}`}>
                                                    {c.done && <CheckCircle size={10} />}
                                                </div>
                                                <span className={c.done ? 'text-dark-400 line-through' : 'text-dark-300'}>{c.item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'playbooks' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {playbooks.map(pb => (
                        <div key={pb.id} onClick={() => setSelectedPlaybook(pb)} className="card hover:border-imperio-600/30 cursor-pointer group">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="p-2 rounded-lg bg-imperio-600/10"><BookOpen size={18} className="text-imperio-400" /></div>
                                <div>
                                    <h4 className="text-sm font-medium text-dark-200 group-hover:text-white transition">{pb.title}</h4>
                                    <span className="badge badge-neutral mt-1">{pb.category}</span>
                                </div>
                            </div>
                            <p className="text-xs text-dark-400 leading-relaxed max-h-16 overflow-hidden relative">
                                {pb.description}
                                <span className="absolute bottom-0 right-0 left-0 h-8 bg-gradient-to-t from-dark-800 to-transparent"></span>
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {selectedPlaybook && (
                <PlaybookModal
                    playbook={selectedPlaybook}
                    onClose={() => setSelectedPlaybook(null)}
                    onDeploy={handleDeployPlaybook}
                />
            )}
        </div>
    );
}
