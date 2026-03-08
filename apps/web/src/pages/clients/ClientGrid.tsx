// ============================================================
// Clients — View All Leads (Controle de Leads)
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Filter, Phone, MessageSquare, AlertTriangle, Clock,
    Flame, Snowflake, Thermometer, Users, Eye, ChevronDown,
    UserPlus, ArrowRight, RefreshCw, MapPin, ArrowUpDown, CheckCircle, XCircle
} from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

interface Lead {
    id: string; name: string; phone: string; cidade: string; temperature: string;
    status: string; source: string; lastContactAt: string | null; nextFollowUpAt: string | null;
    snoozeUntil: string | null; createdAt: string; assignedTo: string; representativeId: string;
}

const TEMP_L: Record<string, { l: string; c: string }> = { cold: { l: 'Frio', c: 'text-blue-400 bg-blue-400/10' }, warm: { l: 'Morno', c: 'text-amber-400 bg-amber-400/10' }, hot: { l: 'Quente', c: 'text-red-400 bg-red-400/10' }, cooled: { l: 'Esfriou', c: 'text-slate-400 bg-slate-400/10' } };
const STATUS_L: Record<string, { l: string; c: string }> = { ativo: { l: 'Ativo', c: 'text-emerald-400 bg-emerald-400/10' }, fechado: { l: 'Fechado', c: 'text-blue-400 bg-blue-400/10' }, perdido: { l: 'Perdido', c: 'text-red-400 bg-red-400/10' } };

function getDias(d: string | null) { return d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 999; }

export default function ClientGrid() {
    const navigate = useNavigate();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [reps, setReps] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRep, setFilterRep] = useState('');
    const [filterTemp, setFilterTemp] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterAtrasados, setFilterAtrasados] = useState(false);
    const [stats, setStats] = useState<any>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', phone: '', email: '', cidade: '', representativeId: '', temperature: 'cold', source: 'whatsapp_direct', observacaoInicial: '' });
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');

    useEffect(() => { loadData(); }, []);

    async function handleCreateLead(e: React.FormEvent) {
        e.preventDefault();
        if (!createForm.name.trim() || !createForm.phone.trim()) { setCreateError('Nome e Telefone são obrigatórios'); return; }
        setCreateLoading(true); setCreateError('');
        try {
            const res = await apiFetch('/api/leads', { method: 'POST', body: JSON.stringify(createForm) });
            if (res.success) {
                setShowCreateModal(false);
                loadData();
                setCreateForm({ name: '', phone: '', email: '', cidade: '', representativeId: '', temperature: 'cold', source: 'whatsapp_direct', observacaoInicial: '' });
            }
            else setCreateError(res.error || 'Erro ao criar lead');
        } catch (err: any) { setCreateError(err.message || 'Erro de conexão'); }
        finally { setCreateLoading(false); }
    }

    async function loadData() {
        setLoading(true);
        const [leadsRes, statsRes, usersRes] = await Promise.all([
            apiFetch('/api/leads'),
            apiFetch('/api/admin/lead-stats'),
            apiFetch('/api/users'),
        ]);
        if (leadsRes.success) setLeads(leadsRes.data);
        if (statsRes.success) setStats(statsRes.data);
        if (usersRes.success) setReps(usersRes.data.filter((u: any) => u.role === 'representante').map((u: any) => ({ id: u.id, name: u.name })));
        setLoading(false);
    }

    const filtered = useMemo(() => {
        return leads.filter(l => {
            if (search) { const s = search.toLowerCase(); if (!l.name?.toLowerCase().includes(s) && !l.phone?.includes(s) && !l.cidade?.toLowerCase().includes(s)) return false; }
            if (filterRep && l.representativeId !== filterRep) return false;
            if (filterTemp && l.temperature !== filterTemp) return false;
            if (filterStatus && l.status !== filterStatus) return false;
            if (filterAtrasados) {
                const dias = getDias(l.lastContactAt);
                if (l.status !== 'ativo' || dias < 1) return false;
                if (l.snoozeUntil && new Date(l.snoozeUntil) > new Date()) return false;
            }
            return true;
        });
    }, [leads, search, filterRep, filterTemp, filterStatus, filterAtrasados]);

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-imperio-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">Controle de Leads</h1>
                    <p className="text-sm text-dark-500">Gestão consolidada de todos os leads</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadData} className="p-2 rounded-lg hover:bg-dark-800 text-dark-400"><RefreshCw size={16} /></button>
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-imperio-500 hover:bg-imperio-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                        <UserPlus size={16} />
                        <span className="hidden sm:inline">Novo Lead</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <StatCard label="Total" value={stats.total} color="text-white bg-dark-800/50 border-dark-700" />
                    <StatCard label="Ativos" value={stats.ativos} color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20" />
                    <StatCard label="Fechados" value={stats.fechados} color="text-blue-400 bg-blue-500/10 border-blue-500/20" />
                    <StatCard label="Perdidos" value={stats.perdidos} color="text-red-400 bg-red-500/10 border-red-500/20" />
                    <StatCard label="Atrasados" value={stats.atrasados} color={stats.atrasados > 0 ? 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'} />
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-dark-900 border border-dark-800">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm" />
                </div>
                <select value={filterRep} onChange={e => setFilterRep(e.target.value)} className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">Todos Vendedores</option>
                    {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select value={filterTemp} onChange={e => setFilterTemp(e.target.value)} className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">Todas Temp.</option>
                    <option value="hot">🔥 Quente</option><option value="warm">🌡 Morno</option><option value="cold">❄️ Frio</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">Todos Status</option>
                    <option value="ativo">Ativo</option><option value="fechado">Fechado</option><option value="perdido">Perdido</option>
                </select>
                <button onClick={() => setFilterAtrasados(!filterAtrasados)} className={`px-3 py-2 rounded-lg text-sm border ${filterAtrasados ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-dark-800 border-dark-700 text-dark-400'}`}>
                    <AlertTriangle size={14} className="inline mr-1" />Atrasados
                </button>
            </div>

            {/* Table */}
            <div className="rounded-xl bg-dark-900 border border-dark-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-dark-800">
                                <th className="text-left p-3 text-dark-500 text-xs uppercase">Lead</th>
                                <th className="text-left p-3 text-dark-500 text-xs uppercase hidden md:table-cell">Vendedor</th>
                                <th className="text-left p-3 text-dark-500 text-xs uppercase hidden md:table-cell">Cidade</th>
                                <th className="text-left p-3 text-dark-500 text-xs uppercase">Temp.</th>
                                <th className="text-left p-3 text-dark-500 text-xs uppercase">Status</th>
                                <th className="text-left p-3 text-dark-500 text-xs uppercase hidden lg:table-cell">Dias s/C</th>
                                <th className="text-left p-3 text-dark-500 text-xs uppercase hidden xl:table-cell">Origem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-dark-500">Nenhum lead encontrado</td></tr>
                            ) : filtered.map(l => {
                                const dias = getDias(l.lastContactAt);
                                const atrasado = l.status === 'ativo' && dias >= 1 && (!l.snoozeUntil || new Date(l.snoozeUntil) <= new Date());
                                const t = TEMP_L[l.temperature] || TEMP_L.cold;
                                const s = STATUS_L[l.status] || STATUS_L.ativo;
                                return (
                                    <tr key={l.id} onClick={() => navigate(`/clients/${l.id}`)} className={`border-b border-dark-800/50 cursor-pointer hover:bg-dark-800/30 ${atrasado ? 'bg-red-500/5' : ''}`}>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                {atrasado && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                                                <div><p className="font-medium text-white">{l.name || l.phone}</p><p className="text-xs text-dark-500">{l.phone}</p></div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-dark-400 hidden md:table-cell">{l.assignedTo || '—'}</td>
                                        <td className="p-3 text-dark-400 hidden md:table-cell">{l.cidade || '—'}</td>
                                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${t.c}`}>{t.l}</span></td>
                                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${s.c}`}>{s.l}</span></td>
                                        <td className="p-3 hidden lg:table-cell"><span className={dias >= 1 ? 'text-red-400' : 'text-emerald-400'}>{l.lastContactAt ? `${dias}d` : '—'}</span></td>
                                        <td className="p-3 text-dark-500 hidden xl:table-cell text-xs">{l.source?.replace(/_/g, ' ') || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Lead Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-dark-900 rounded-2xl border border-dark-800 w-full max-w-2xl my-auto shadow-2xl animate-fade-in relative flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-dark-800 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-bold text-white">Novo Lead</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-dark-400 hover:text-white"><XCircle size={24} /></button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            {createError && <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{createError}</div>}
                            <form id="create-lead-form" onSubmit={handleCreateLead} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-sm text-dark-400 mb-1">Nome *</label><input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white" required /></div>
                                    <div><label className="block text-sm text-dark-400 mb-1">Telefone / WhatsApp *</label><input value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white" required /></div>
                                    <div><label className="block text-sm text-dark-400 mb-1">Email</label><input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white" /></div>
                                    <div><label className="block text-sm text-dark-400 mb-1">Cidade</label><input value={createForm.cidade} onChange={e => setCreateForm({ ...createForm, cidade: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white" /></div>
                                    <div>
                                        <label className="block text-sm text-dark-400 mb-1">Vendedor</label>
                                        <select value={createForm.representativeId} onChange={e => setCreateForm({ ...createForm, representativeId: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white">
                                            <option value="">(Sem vendedor definido)</option>
                                            {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-dark-400 mb-1">Temperatura</label>
                                        <select value={createForm.temperature} onChange={e => setCreateForm({ ...createForm, temperature: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white">
                                            <option value="cold">Frio</option><option value="warm">Morno</option><option value="hot">Quente</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-dark-400 mb-1">Origem</label>
                                        <select value={createForm.source} onChange={e => setCreateForm({ ...createForm, source: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white">
                                            <option value="whatsapp_direct">WhatsApp Direto</option>
                                            <option value="meta_ads">Meta Ads</option>
                                            <option value="google_ads">Google Ads</option>
                                            <option value="organic_instagram">Instagram Orgânico</option>
                                            <option value="referral">Indicação</option>
                                            <option value="other">Outro</option>
                                        </select>
                                    </div>
                                </div>
                                <div><label className="block text-sm text-dark-400 mb-1">Observação Inicial</label><textarea value={createForm.observacaoInicial} onChange={e => setCreateForm({ ...createForm, observacaoInicial: e.target.value })} rows={3} className="w-full px-4 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white resize-none" /></div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-dark-800 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white transition-colors">Cancelar</button>
                            <button type="submit" form="create-lead-form" disabled={createLoading} className="px-6 py-2 rounded-lg bg-imperio-600 text-white font-medium hover:bg-imperio-500 disabled:opacity-50 transition-colors">
                                {createLoading ? 'Salvando...' : 'Salvar Lead'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className={`rounded-xl border p-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium opacity-80">{label}</p>
        </div>
    );
}
