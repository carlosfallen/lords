import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search, Play, Pause, Users, Clock, CheckCircle, XCircle,
    ArrowRight, RefreshCw, Loader2, AlertTriangle, Zap, BarChart3
} from 'lucide-react';
import { leadsApi, queueApi, campaignsApi } from '../../services/api';
import type { Lead, QueueStats, QueueItem, Campaign, WhatsAppStatus } from '../../types/index';

interface Props {
    stats: QueueStats | null;
    onRefresh: () => void;
    waStatus: WhatsAppStatus | null;
}

const TEMP_COLORS: Record<string, string> = {
    cold: 'text-blue-400 bg-blue-400/10',
    warm: 'text-amber-400 bg-amber-400/10',
    hot: 'text-red-400 bg-red-400/10',
    cooled: 'text-slate-400 bg-slate-400/10',
};

export function OperationView({ stats, onRefresh, waStatus }: Props) {
    const [view, setView] = useState<'leads' | 'queue'>('leads');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterTemp, setFilterTemp] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedCampaign, setSelectedCampaign] = useState('');
    const [enqueueing, setEnqueueing] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [leadsData, campaignsData, queueData] = await Promise.all([
                leadsApi.list(),
                campaignsApi.list(),
                queueApi.list({ limit: 30 }),
            ]);
            setLeads(leadsData);
            setCampaigns(campaignsData);
            setQueueItems(queueData);
        } catch (err) {
            console.error('[OperationView] load error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filtered = useMemo(() => leads.filter((l) => {
        if (search) {
            const q = search.toLowerCase();
            if (!(l.name || '').toLowerCase().includes(q) && !l.phone.includes(q) && !(l.city || '').toLowerCase().includes(q)) return false;
        }
        if (filterTemp && l.temperature !== filterTemp) return false;
        return true;
    }), [leads, search, filterTemp]);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(l => l.id)));
        }
    };

    const handleEnqueue = async () => {
        if (selectedIds.size === 0) return;
        setEnqueueing(true);
        try {
            // Auto-create a default campaign if none exist and none selected
            let campaignId = selectedCampaign;
            if (!campaignId) {
                if (campaigns.length > 0) {
                    // Use the first campaign as default
                    campaignId = campaigns[0].id;
                } else {
                    // Auto-create a default campaign
                    const newCampaign = await campaignsApi.create({
                        name: 'Prospecção Padrão',
                        playbookBasePrompt: 'Olá {{name}}, tudo bem? Somos da equipe de vendas e gostaríamos de apresentar nosso serviço. Tem um momento?',
                    });
                    campaignId = newCampaign.id;
                    setCampaigns([newCampaign]);
                    setSelectedCampaign(campaignId);
                }
            }

            const result = await leadsApi.enqueue(Array.from(selectedIds), campaignId);
            const count = result?.enqueuedCount || selectedIds.size;

            // Auto-start the queue after enqueuing
            if (!stats?.isRunning) {
                await queueApi.start();
            }

            alert(`✅ ${count} leads enfileirados e fila iniciada!`);
            setSelectedIds(new Set());
            onRefresh();
            loadData();
        } catch (err) {
            console.error('[Enqueue] Failed:', err);
            alert('Erro ao enfileirar leads. Verifique o console.');
        } finally {
            setEnqueueing(false);
        }
    };

    const handleQueueToggle = async () => {
        try {
            if (stats?.isRunning) {
                await queueApi.stop();
            } else {
                await queueApi.start();
            }
            onRefresh();
        } catch (err) {
            console.error('[Queue toggle]:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-imperio-400" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* ─── Stats Bar ─────────────────────────────────────────── */}
            <div className="px-6 py-4 border-b border-dark-800 bg-dark-900 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Zap size={18} className="text-imperio-400" />
                        Operação de Prospecção
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleQueueToggle}
                            className={`flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg font-semibold transition-all border ${stats?.isRunning
                                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                                : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                                }`}
                        >
                            {stats?.isRunning ? <><Pause size={13} /> Parar Fila</> : <><Play size={13} /> Iniciar Fila</>}
                        </button>
                        <button onClick={() => { loadData(); onRefresh(); }} className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400">
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-3">
                    {[
                        { label: 'Total Leads', value: leads.length, icon: <Users size={14} />, color: 'text-white bg-dark-800/50 border-dark-700' },
                        { label: 'Na Fila', value: stats?.pending ?? 0, icon: <Clock size={14} />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                        { label: 'Processando', value: stats?.active ?? 0, icon: <Zap size={14} />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                        { label: 'Concluídos', value: stats?.done ?? 0, icon: <CheckCircle size={14} />, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
                        { label: 'Falhas', value: stats?.failed ?? 0, icon: <XCircle size={14} />, color: stats?.failed ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-dark-400 bg-dark-800/50 border-dark-700' },
                    ].map((s) => (
                        <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
                            <div className="flex items-center gap-1.5 mb-1">{s.icon}<span className="text-[10px] font-medium opacity-70">{s.label}</span></div>
                            <p className="text-xl font-bold">{s.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── Sub-tabs ──────────────────────────────────────────── */}
            <div className="px-6 py-2 border-b border-dark-800 bg-dark-900 shrink-0 flex items-center justify-between">
                <div className="flex gap-1">
                    {[
                        { id: 'leads' as const, label: 'Leads do Sistema', count: leads.length },
                        { id: 'queue' as const, label: 'Fila de Envio', count: queueItems.length },
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setView(t.id)}
                            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${view === t.id ? 'bg-imperio-600/15 text-imperio-400' : 'text-dark-400 hover:bg-dark-800'
                                }`}
                        >
                            {t.label} <span className="ml-1 text-[10px] opacity-60">({t.count})</span>
                        </button>
                    ))}
                </div>

                {/* Enqueue controls */}
                {view === 'leads' && selectedIds.size > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-dark-400">{selectedIds.size} selecionados</span>
                        {campaigns.length > 0 && (
                            <select
                                value={selectedCampaign}
                                onChange={(e) => setSelectedCampaign(e.target.value)}
                                className="text-xs px-2 py-1.5 rounded-lg bg-dark-800 border border-dark-700 text-white"
                            >
                                <option value="">Auto</option>
                                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        )}
                        <button
                            onClick={handleEnqueue}
                            disabled={enqueueing}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-imperio-600 text-white font-medium disabled:opacity-40 hover:bg-imperio-500 transition-colors"
                        >
                            {enqueueing ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                            Prospectar
                        </button>
                    </div>
                )}
            </div>

            {/* ─── Content ───────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden">
                {view === 'leads' ? (
                    <div className="flex flex-col h-full">
                        {/* Filters */}
                        <div className="flex gap-3 px-6 py-3 border-b border-dark-800 shrink-0">
                            <div className="relative flex-1 max-w-sm">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar lead..."
                                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:ring-1 focus:ring-imperio-600/50"
                                />
                            </div>
                            <select
                                value={filterTemp}
                                onChange={(e) => setFilterTemp(e.target.value)}
                                className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
                            >
                                <option value="">Todas Temp.</option>
                                <option value="hot">🔥 Quente</option>
                                <option value="warm">🌡 Morno</option>
                                <option value="cold">❄️ Frio</option>
                            </select>
                        </div>

                        {/* Leads Table */}
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-dark-900 border-b border-dark-800">
                                        <th className="text-left p-3 text-dark-500 text-xs uppercase w-8">
                                            <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded" />
                                        </th>
                                        <th className="text-left p-3 text-dark-500 text-xs uppercase">Lead</th>
                                        <th className="text-left p-3 text-dark-500 text-xs uppercase">Telefone</th>
                                        <th className="text-left p-3 text-dark-500 text-xs uppercase">Cidade</th>
                                        <th className="text-left p-3 text-dark-500 text-xs uppercase">Temp.</th>
                                        <th className="text-left p-3 text-dark-500 text-xs uppercase">Status</th>
                                        <th className="text-left p-3 text-dark-500 text-xs uppercase">Último Contato</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-dark-500">Nenhum lead encontrado</td></tr>
                                    ) : (
                                        filtered.map((lead) => {
                                            const isSelected = selectedIds.has(lead.id);
                                            const tempCfg = TEMP_COLORS[lead.temperature] || TEMP_COLORS.cold;
                                            const lastContact = lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleDateString('pt-BR') : '—';

                                            return (
                                                <tr
                                                    key={lead.id}
                                                    className={`border-b border-dark-800/50 transition-colors cursor-pointer ${isSelected ? 'bg-imperio-600/5' : 'hover:bg-dark-800/30'}`}
                                                    onClick={() => toggleSelect(lead.id)}
                                                >
                                                    <td className="p-3">
                                                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead.id)} className="rounded" />
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="font-medium text-white">{lead.name || lead.phone}</span>
                                                    </td>
                                                    <td className="p-3 text-dark-400 font-mono text-xs">{lead.phone}</td>
                                                    <td className="p-3 text-dark-400">{lead.city || '—'}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs ${tempCfg}`}>
                                                            {lead.temperature === 'hot' ? '🔥' : lead.temperature === 'warm' ? '🌡' : '❄️'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs ${lead.status === 'ativo' ? 'text-green-400 bg-green-400/10' :
                                                            lead.status === 'fechado' ? 'text-blue-400 bg-blue-400/10' :
                                                                'text-dark-400 bg-dark-700'
                                                            }`}>{lead.status}</span>
                                                    </td>
                                                    <td className="p-3 text-dark-500 text-xs">{lastContact}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Queue Items */
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-dark-900 border-b border-dark-800">
                                    <th className="text-left p-3 text-dark-500 text-xs uppercase">Contato</th>
                                    <th className="text-left p-3 text-dark-500 text-xs uppercase">Campanha</th>
                                    <th className="text-left p-3 text-dark-500 text-xs uppercase">Status</th>
                                    <th className="text-left p-3 text-dark-500 text-xs uppercase">Tentativas</th>
                                    <th className="text-left p-3 text-dark-500 text-xs uppercase">Erro</th>
                                    <th className="text-left p-3 text-dark-500 text-xs uppercase">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queueItems.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-dark-500">Fila vazia</td></tr>
                                ) : (
                                    queueItems.map((item) => (
                                        <tr key={item.id} className="border-b border-dark-800/50 hover:bg-dark-800/30">
                                            <td className="p-3">
                                                <p className="font-medium text-white">{item.contactName || '—'}</p>
                                                <p className="text-xs text-dark-500 font-mono">{item.contactPhone || '—'}</p>
                                            </td>
                                            <td className="p-3 text-dark-400 text-xs">{item.campaignName || '—'}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${item.status === 'completed' ? 'text-green-400 bg-green-400/10' :
                                                    item.status === 'failed' ? 'text-red-400 bg-red-400/10' :
                                                        item.status === 'active' ? 'text-blue-400 bg-blue-400/10' :
                                                            'text-dark-400 bg-dark-700'
                                                    }`}>{item.status}</span>
                                            </td>
                                            <td className="p-3 text-dark-400">{item.attempts}</td>
                                            <td className="p-3 text-xs text-red-400">{item.lastError || '—'}</td>
                                            <td className="p-3 text-dark-500 text-xs">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
