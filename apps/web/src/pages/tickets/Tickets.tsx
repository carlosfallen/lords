// ============================================================
// Tickets Page — Support System
// ============================================================
import { useState, useEffect } from 'react';
import { apiFetch } from '../../stores/authStore';
import { HeadphonesIcon, AlertTriangle, CheckCircle, Clock, Plus } from 'lucide-react';

export default function Tickets() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const params = filter ? `?status=${filter}` : '';
        apiFetch(`/api/tickets${params}`).then(r => r.success && setTickets(r.data));
    }, [filter]);

    const statusBadge = (s: string) => {
        const map: Record<string, [string, string]> = {
            open: ['badge-danger', 'Aberto'], in_progress: ['badge-warning', 'Em Andamento'],
            waiting_client: ['badge-info', 'Aguardando Cliente'], resolved: ['badge-success', 'Resolvido'],
            closed: ['badge-neutral', 'Fechado'],
        };
        const [cls, label] = map[s] || ['badge-neutral', s];
        return <span className={`badge ${cls}`}>{label}</span>;
    };

    const priorityBadge = (p: string) => {
        const map: Record<string, [string, string]> = {
            urgent: ['badge-danger', '🔴 Urgente'], high: ['badge-warning', '🟠 Alta'],
            medium: ['badge-info', '🔵 Média'], low: ['badge-neutral', '⚪ Baixa'],
        };
        const [cls, label] = map[p] || ['badge-neutral', p];
        return <span className={`badge ${cls}`}>{label}</span>;
    };

    const stats = {
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        avgTime: '4.2h',
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="grid grid-cols-4 gap-3 flex-1 mr-4">
                    <div className="text-center p-3 rounded-lg bg-danger/10 border border-danger/20"><p className="text-xl font-bold text-danger">{stats.open}</p><p className="text-xs text-dark-400">Abertos</p></div>
                    <div className="text-center p-3 rounded-lg bg-warning/10 border border-warning/20"><p className="text-xl font-bold text-warning">{stats.inProgress}</p><p className="text-xs text-dark-400">Em Andamento</p></div>
                    <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20"><p className="text-xl font-bold text-success">{stats.resolved}</p><p className="text-xs text-dark-400">Resolvidos</p></div>
                    <div className="text-center p-3 rounded-lg bg-dark-800 border border-dark-700"><p className="text-xl font-bold text-dark-200">{stats.avgTime}</p><p className="text-xs text-dark-400">Tempo Médio</p></div>
                </div>
                <button className="btn-primary btn-sm"><Plus size={14} /> Novo Ticket</button>
            </div>

            <div className="flex gap-2 mb-2">
                {['', 'open', 'in_progress', 'resolved'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
                        {f === '' ? 'Todos' : f === 'open' ? 'Abertos' : f === 'in_progress' ? 'Em Andamento' : 'Resolvidos'}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {tickets.map(t => (
                    <div key={t.id} className={`card flex items-start gap-4 ${t.priority === 'urgent' ? 'border-danger/30' : ''}`}>
                        <div className={`mt-1 p-2 rounded-lg ${t.priority === 'urgent' ? 'bg-danger/10' : 'bg-dark-800'}`}>
                            <HeadphonesIcon size={18} className={t.priority === 'urgent' ? 'text-danger' : 'text-dark-400'} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-medium text-dark-200">{t.title}</h4>
                                {statusBadge(t.status)}
                                {priorityBadge(t.priority)}
                            </div>
                            <p className="text-xs text-dark-400 mb-2">{t.description}</p>
                            <div className="flex items-center gap-4 text-xs text-dark-500">
                                <span>{t.tenantName}</span>
                                <span>{t.systemType}</span>
                                <span>{t.assignedTo || 'Não atribuído'}</span>
                                {t.elapsed > t.slaHours && <span className="text-danger flex items-center gap-1"><AlertTriangle size={10} /> SLA excedido</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
