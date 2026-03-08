// ============================================================
// Campaigns Page — Real CRUD (replaces placeholder)
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Trash2, Loader2, RefreshCw, DollarSign, Users, TrendingUp, X } from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

interface Campaign {
    id: string;
    name: string;
    platform: string;
    spent: number;
    leadsGenerated: number;
    cpl: number;
    conversions: number;
    status: string;
    createdAt: string;
}

interface Stats {
    totalSpent: number;
    totalLeads: number;
    avgCpl: number;
    totalConversions: number;
}

export default function Campaigns() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createPlatform, setCreatePlatform] = useState('google');
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/campaigns');
            if (res.success) {
                setCampaigns(res.data.campaigns || []);
                setStats(res.data.stats || null);
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        if (!createName.trim()) return;
        setCreating(true);
        try {
            const res = await apiFetch('/api/campaigns', {
                method: 'POST',
                body: JSON.stringify({ name: createName.trim(), platform: createPlatform }),
            });
            if (res.success) {
                setCreateName('');
                setShowCreate(false);
                load();
            }
        } finally { setCreating(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir esta campanha?')) return;
        await apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' });
        load();
    };

    const statCards = stats ? [
        { label: 'Investimento Total', value: `R$ ${stats.totalSpent.toLocaleString('pt-BR')}`, icon: <DollarSign size={16} />, color: '#ef4444' },
        { label: 'Leads Gerados', value: stats.totalLeads.toLocaleString('pt-BR'), icon: <Users size={16} />, color: '#3b82f6' },
        { label: 'CPL Médio', value: `R$ ${stats.avgCpl.toFixed(2)}`, icon: <TrendingUp size={16} />, color: '#f59e0b' },
        { label: 'Conversões', value: stats.totalConversions.toLocaleString('pt-BR'), icon: <Megaphone size={16} />, color: '#22c55e' },
    ] : [];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Megaphone size={22} className="text-imperio-400" />
                        Campanhas
                    </h1>
                    <p className="text-sm text-dark-400 mt-0.5">
                        Gestão de campanhas de marketing — {campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={load} className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors">
                        <RefreshCw size={16} />
                    </button>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="btn-primary btn-sm flex items-center gap-1.5"
                    >
                        <Plus size={14} /> Nova Campanha
                    </button>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-4 gap-4">
                    {statCards.map(s => (
                        <div key={s.label} className="rounded-xl p-4 bg-dark-900 border border-dark-800">
                            <div className="flex items-center gap-2 mb-2">
                                <div style={{ color: s.color, opacity: 0.7 }}>{s.icon}</div>
                                <span className="text-xs text-dark-400">{s.label}</span>
                            </div>
                            <div className="text-lg font-bold text-white">{s.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="rounded-xl p-5 bg-dark-900 border border-dark-800 space-y-4 animate-slide-up">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-white">Nova Campanha</h3>
                        <button onClick={() => setShowCreate(false)} className="text-dark-500 hover:text-white"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text"
                            placeholder="Nome da campanha *"
                            value={createName}
                            onChange={e => setCreateName(e.target.value)}
                            className="col-span-2 rounded-lg px-4 py-2.5 text-sm bg-dark-800 border border-dark-700 text-white focus:outline-none focus:border-imperio-500"
                        />
                        <select
                            value={createPlatform}
                            onChange={e => setCreatePlatform(e.target.value)}
                            className="rounded-lg px-4 py-2.5 text-sm bg-dark-800 border border-dark-700 text-white focus:outline-none"
                        >
                            <option value="google">Google Ads</option>
                            <option value="meta">Meta Ads</option>
                            <option value="linkedin">LinkedIn Ads</option>
                            <option value="organic">Orgânico</option>
                            <option value="other">Outro</option>
                        </select>
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={!createName.trim() || creating}
                        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Criar Campanha
                    </button>
                </div>
            )}

            {/* Campaign List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={24} className="animate-spin text-dark-500" />
                </div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-16">
                    <Megaphone size={36} className="mx-auto mb-3 text-dark-600" />
                    <p className="text-dark-400">Nenhuma campanha cadastrada.</p>
                    <p className="text-dark-500 text-sm mt-1">Clique em "Nova Campanha" para começar.</p>
                </div>
            ) : (
                <div className="rounded-xl overflow-hidden bg-dark-900 border border-dark-800">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-dark-950/50 text-dark-400 text-xs uppercase tracking-wider">
                                <th className="px-5 py-3 font-medium">Nome</th>
                                <th className="px-5 py-3 font-medium">Plataforma</th>
                                <th className="px-5 py-3 font-medium text-right">Investido</th>
                                <th className="px-5 py-3 font-medium text-right">Leads</th>
                                <th className="px-5 py-3 font-medium text-right">CPL</th>
                                <th className="px-5 py-3 font-medium text-right">Conversões</th>
                                <th className="px-5 py-3 font-medium text-center">Status</th>
                                <th className="px-5 py-3 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.map(c => (
                                <tr key={c.id} className="border-t border-dark-800 hover:bg-dark-800/50 transition-colors">
                                    <td className="px-5 py-3 font-medium text-white">{c.name}</td>
                                    <td className="px-5 py-3 text-dark-300">{c.platform || '—'}</td>
                                    <td className="px-5 py-3 text-right text-dark-300">R$ {Number(c.spent || 0).toLocaleString('pt-BR')}</td>
                                    <td className="px-5 py-3 text-right text-dark-300">{c.leadsGenerated || 0}</td>
                                    <td className="px-5 py-3 text-right text-dark-300">R$ {Number(c.cpl || 0).toFixed(2)}</td>
                                    <td className="px-5 py-3 text-right text-dark-300">{c.conversions || 0}</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'active'
                                            ? 'bg-green-950 text-green-400 border border-green-900'
                                            : 'bg-dark-800 text-dark-400 border border-dark-700'
                                            }`}>
                                            {c.status === 'active' ? 'Ativa' : c.status || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <button
                                            onClick={() => handleDelete(c.id)}
                                            className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
