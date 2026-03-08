// ============================================================
// Dashboard — Centro de Comando Global
// ============================================================
import { useState, useEffect } from 'react';
import { apiFetch } from '../stores/authStore';
import {
    TrendingUp, TrendingDown, Users, DollarSign, Activity, AlertTriangle,
    MessageSquare, Target, HeadphonesIcon, Zap, ArrowRight, Clock, ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface KPI {
    mrr: number; arr: number; totalActiveClients: number; monthlyChurn: number;
    averageNps: number; mrrGrowth: number; newLeadsToday: number; pendingMissions: number;
    openTickets: number; botStatus: string; revenueThisMonth: number; revenueLastMonth: number;
    newClientsThisMonth: number; totalLeadsActive: number;
}

interface FeedItem {
    id: string; type: string; message: string; severity: string; timestamp: string;
}

interface AttentionClient {
    id: string; name: string; score: number; reason: string; segment: string;
}

interface ServiceStatus {
    name: string; status: string; uptime: string; latency: string;
}

export default function Dashboard() {
    const [kpis, setKpis] = useState<KPI | null>(null);
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [attention, setAttention] = useState<AttentionClient[]>([]);
    const [bottlenecks, setBottlenecks] = useState<any[]>([]);
    const [health, setHealth] = useState<{ services: ServiceStatus[]; cpu: number; memory: number; disk: number } | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        apiFetch('/api/dashboard/kpis').then(r => r.success && setKpis(r.data));
        apiFetch('/api/dashboard/feed').then(r => r.success && setFeed(r.data));
        apiFetch('/api/dashboard/clients-attention').then(r => r.success && setAttention(r.data));
        apiFetch('/api/dashboard/bottlenecks').then(r => r.success && setBottlenecks(r.data));
        apiFetch('/api/dashboard/health').then(r => r.success && setHealth(r.data));
    }, []);

    const formatCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
    const formatTime = (ts: string) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
        if (diffMin < 60) return `${diffMin}min atrás`;
        if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h atrás`;
        return d.toLocaleDateString('pt-BR');
    };

    const severityIcon = (type: string) => {
        const map: Record<string, React.ReactNode> = {
            lead_new: <MessageSquare size={14} className="text-info" />,
            bottleneck: <AlertTriangle size={14} className="text-warning" />,
            mission_completed: <Target size={14} className="text-success" />,
            deal_won: <DollarSign size={14} className="text-success" />,
            churn_risk: <AlertTriangle size={14} className="text-danger" />,
            bot_reconnect: <Zap size={14} className="text-warning" />,
            payment: <DollarSign size={14} className="text-info" />,
            nps: <Activity size={14} className="text-imperio-400" />,
        };
        return map[type] || <Activity size={14} className="text-dark-500" />;
    };

    if (!kpis) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-imperio-500/30 border-t-imperio-500 rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="kpi-card">
                    <div className="flex items-center justify-between">
                        <span className="kpi-label">MRR</span>
                        <DollarSign size={16} className="text-imperio-400" />
                    </div>
                    <span className="kpi-value">{formatCurrency(kpis.mrr)}</span>
                    <span className={`kpi-change ${kpis.mrrGrowth >= 0 ? 'positive' : 'negative'}`}>
                        {kpis.mrrGrowth >= 0 ? <TrendingUp size={12} className="inline" /> : <TrendingDown size={12} className="inline" />}
                        {' '}{kpis.mrrGrowth}% vs. mês anterior
                    </span>
                </div>

                <div className="kpi-card">
                    <div className="flex items-center justify-between">
                        <span className="kpi-label">Clientes Ativos</span>
                        <Users size={16} className="text-imperio-400" />
                    </div>
                    <span className="kpi-value">{kpis.totalActiveClients}</span>
                    <span className="kpi-change positive">+{kpis.newClientsThisMonth} este mês</span>
                </div>

                <div className="kpi-card">
                    <div className="flex items-center justify-between">
                        <span className="kpi-label">Leads Ativos</span>
                        <MessageSquare size={16} className="text-imperio-400" />
                    </div>
                    <span className="kpi-value">{kpis.totalLeadsActive}</span>
                    <span className="kpi-change positive">+{kpis.newLeadsToday} hoje</span>
                </div>

                <div className="kpi-card">
                    <div className="flex items-center justify-between">
                        <span className="kpi-label">Churn Mensal</span>
                        <TrendingDown size={16} className="text-danger" />
                    </div>
                    <span className="kpi-value text-warning">{kpis.monthlyChurn}%</span>
                    <span className="kpi-change negative">Meta: &lt;3%</span>
                </div>

                <div className="kpi-card">
                    <div className="flex items-center justify-between">
                        <span className="kpi-label">NPS Médio</span>
                        <Activity size={16} className="text-success" />
                    </div>
                    <span className="kpi-value text-success">{kpis.averageNps}</span>
                    <span className="kpi-change positive">Promotores</span>
                </div>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Missões Pendentes', value: kpis.pendingMissions, icon: Target, color: 'text-warning', to: '/mentorship' },
                    { label: 'Tickets Abertos', value: kpis.openTickets, icon: HeadphonesIcon, color: 'text-danger', to: '/tickets' },
                    { label: 'Bot WhatsApp', value: kpis.botStatus === 'connected' ? 'Online' : 'Offline', icon: Zap, color: kpis.botStatus === 'connected' ? 'text-success' : 'text-danger', to: '/whatsapp' },
                    { label: 'Receita do Mês', value: formatCurrency(kpis.revenueThisMonth), icon: DollarSign, color: 'text-success', to: '/finance' },
                ].map((item) => (
                    <button
                        key={item.label}
                        onClick={() => navigate(item.to)}
                        className="card flex items-center gap-3 hover:border-imperio-600/30 group"
                    >
                        <div className={`p-2 rounded-lg bg-dark-800 ${item.color}`}>
                            <item.icon size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-lg font-bold text-white">{item.value}</p>
                            <p className="text-xs text-dark-400">{item.label}</p>
                        </div>
                        <ArrowRight size={14} className="text-dark-600 ml-auto opacity-0 group-hover:opacity-100 transition" />
                    </button>
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Feed de Eventos */}
                <div className="lg:col-span-2 card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-dark-200">Feed de Eventos em Tempo Real</h3>
                        <span className="flex items-center gap-1.5 text-xs text-success">
                            <span className="status-dot online" /> Ao vivo
                        </span>
                    </div>
                    <div className="space-y-3 max-h-[420px] overflow-y-auto">
                        {feed.map((item) => (
                            <div
                                key={item.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${item.severity === 'critical' ? 'bg-danger/5 border-danger/20' :
                                    item.severity === 'warning' ? 'bg-warning/5 border-warning/20' :
                                        'bg-dark-800/50 border-dark-700/50'
                                    }`}
                            >
                                <div className="mt-0.5 shrink-0">{severityIcon(item.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-dark-200 leading-snug">{item.message}</p>
                                    <p className="text-[11px] text-dark-500 mt-1 flex items-center gap-1">
                                        <Clock size={10} /> {formatTime(item.timestamp)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Clientes que Precisam de Atenção */}
                <div className="card">
                    <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-warning" />
                        Atenção Necessária
                    </h3>
                    <div className="space-y-3">
                        {attention.map((client) => (
                            <button
                                key={client.id}
                                onClick={() => navigate(`/clients/${client.id}`)}
                                className="w-full text-left p-3 rounded-lg bg-dark-800/50 border border-dark-700/50 hover:border-dark-600 transition group"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-dark-200 group-hover:text-white transition">{client.name}</span>
                                    <span className={`text-lg font-bold ${client.score < 25 ? 'traction-collapsing' :
                                        client.score < 50 ? 'traction-stagnant' :
                                            'traction-stable'
                                        }`}>
                                        {client.score}
                                    </span>
                                </div>
                                <p className="text-xs text-dark-400 leading-snug">{client.reason}</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className={`badge ${client.segment === 'critical' ? 'badge-danger' :
                                        client.segment === 'at_risk' ? 'badge-warning' :
                                            'badge-neutral'
                                        }`}>
                                        {client.segment === 'critical' ? 'Crítico' : client.segment === 'at_risk' ? 'Em Risco' : client.segment}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sistema de Alerta de Gargalos Automáticos (Módulo 5.3) */}
            {bottlenecks.length > 0 && (
                <div className="card border-warning/50 bg-gradient-to-br from-dark-800 to-warning/5 ring-1 ring-warning/20">
                    <h3 className="text-sm font-semibold text-warning mb-4 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-warning animate-pulse" />
                        Sistema de Alerta de Gargalos Automático
                        <span className="ml-auto text-xs text-dark-400 font-normal px-2 py-0.5 bg-dark-900 rounded-full border border-dark-700">Powered by Worker</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bottlenecks.map((alert) => (
                            <div key={alert.id} className="p-4 rounded-lg bg-dark-900/60 border border-warning/20 hover:border-warning/40 transition">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-bold text-dark-100">{alert.tenantName || 'Cliente Desconhecido'}</span>
                                    <span className={`badge ${alert.severity === 'critical' ? 'badge-danger animate-pulse' : 'badge-warning'}`}>
                                        {alert.severity === 'critical' ? 'Crítico' : 'Alto'}
                                    </span>
                                </div>
                                <p className="text-xs text-dark-300 leading-relaxed mb-3">
                                    {alert.message}
                                </p>
                                <div className="flex items-center gap-4 text-xs font-semibold">
                                    <div className="flex flex-col">
                                        <span className="text-dark-500 font-normal">Represado</span>
                                        <span className="text-danger flex items-center gap-1">
                                            <DollarSign size={12} /> R$ {Number(alert.estimatedRevenueLost).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-dark-500 font-normal">Tempo Parado</span>
                                        <span className="text-warning flex items-center gap-1">
                                            <Clock size={12} /> {alert.hoursStuck}h
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Infrastructure Health */}
            {health && (
                <div className="card">
                    <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
                        <Activity size={14} className="text-imperio-400" />
                        Status da Infraestrutura
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {health.services.map((svc) => (
                            <div key={svc.name} className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/50">
                                <span className={`status-dot ${svc.status === 'operational' ? 'online' : 'offline'}`} />
                                <div>
                                    <p className="text-xs font-medium text-dark-200">{svc.name}</p>
                                    <p className="text-[10px] text-dark-500">{svc.uptime} • {svc.latency}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        {[
                            { label: 'CPU', value: health.cpu, color: health.cpu > 80 ? 'bg-danger' : health.cpu > 60 ? 'bg-warning' : 'bg-success' },
                            { label: 'Memória', value: health.memory, color: health.memory > 80 ? 'bg-danger' : health.memory > 60 ? 'bg-warning' : 'bg-success' },
                            { label: 'Disco', value: health.disk, color: health.disk > 80 ? 'bg-danger' : health.disk > 60 ? 'bg-warning' : 'bg-success' },
                        ].map((m) => (
                            <div key={m.label} className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                    <span className="text-dark-400">{m.label}</span>
                                    <span className="text-dark-200 font-medium">{m.value}%</span>
                                </div>
                                <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${m.color}`} style={{ width: `${m.value}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
