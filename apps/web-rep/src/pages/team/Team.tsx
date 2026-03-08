// ============================================================
// Meu CRM — Main Representative Dashboard (List + Kanban)
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Filter, LayoutGrid, List, Phone, MessageSquare,
    AlertTriangle, Clock, Flame, Snowflake, Thermometer,
    ChevronDown, ChevronRight, UserPlus, Calendar, Eye, Plus
} from 'lucide-react';
import { apiFetch, useAuthStore } from '../../stores/authStore';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    useDroppable,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Lead {
    id: string;
    name: string;
    phone: string;
    email: string;
    cidade: string;
    temperature: string;
    status: string;
    source: string;
    lastContactAt: string | null;
    nextFollowUpAt: string | null;
    snoozeUntil: string | null;
    currentFunnelStageId: string | null;
    createdAt: string;
    assignedTo: string;
    estimatedValue: string;
}

interface ActionSummary {
    atrasados: number;
    followUpHoje: number;
    quentesSemContato: number;
    totalAtivos: number;
}

const TEMP_LABELS: Record<string, { label: string; color: string; icon: any }> = {
    cold: { label: 'Frio', color: 'text-blue-400 bg-blue-400/10', icon: Snowflake },
    warm: { label: 'Morno', color: 'text-amber-400 bg-amber-400/10', icon: Thermometer },
    hot: { label: 'Quente', color: 'text-red-400 bg-red-400/10', icon: Flame },
    cooled: { label: 'Esfriou', color: 'text-slate-400 bg-slate-400/10', icon: Snowflake },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    ativo: { label: 'Ativo', color: 'text-emerald-400 bg-emerald-400/10' },
    fechado: { label: 'Fechado', color: 'text-blue-400 bg-blue-400/10' },
    perdido: { label: 'Perdido', color: 'text-red-400 bg-red-400/10' },
    excluido: { label: 'Excluído', color: 'text-dark-500 bg-dark-800' },
    new_lead: { label: 'Novo', color: 'text-purple-400 bg-purple-400/10' },
};

function getDiasSemContato(lastContactAt: string | null): number {
    if (!lastContactAt) return 999;
    const diff = Date.now() - new Date(lastContactAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isAtrasado(lead: Lead): boolean {
    if (lead.status !== 'ativo') return false;
    if (lead.snoozeUntil && new Date(lead.snoozeUntil) > new Date()) return false;
    return getDiasSemContato(lead.lastContactAt) >= 1;
}

export default function MeuCRM() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [summary, setSummary] = useState<ActionSummary>({ atrasados: 0, followUpHoje: 0, quentesSemContato: 0, totalAtivos: 0 });
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [search, setSearch] = useState('');
    const [filterTemp, setFilterTemp] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCidade, setFilterCidade] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [activeLead, setActiveLead] = useState<Lead | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const lead = leads.find(l => l.id === active.id);
        setActiveLead(lead || null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveLead(null);

        if (!over) return;
        const activeId = active.id as string;
        const overId = over.id as string;

        const activeLeadItem = leads.find(l => l.id === activeId);
        if (!activeLeadItem) return;

        const overLeadItem = leads.find(l => l.id === overId);
        const overTemperature = overLeadItem ? overLeadItem.temperature : overId;

        if (!TEMP_LABELS[overTemperature]) return;

        if (activeLeadItem.temperature !== overTemperature) {
            setLeads(items => items.map(l => l.id === activeId ? { ...l, temperature: overTemperature } : l));
            try {
                await apiFetch(`/api/leads/${activeId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ temperature: overTemperature })
                });
            } catch (err) {
                console.error('Failed to update lead temperature:', err);
                loadData();
            }
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [leadsRes, summaryRes] = await Promise.all([
                apiFetch('/api/leads'),
                apiFetch('/api/leads/action-summary'),
            ]);
            if (leadsRes.success) setLeads(leadsRes.data);
            if (summaryRes.success) setSummary(summaryRes.data);
        } catch (err) {
            console.error('Error loading CRM data:', err);
        } finally {
            setLoading(false);
        }
    }

    const filteredLeads = useMemo(() => {
        return leads.filter(l => {
            if (search) {
                const s = search.toLowerCase();
                if (!l.name?.toLowerCase().includes(s) && !l.phone?.includes(s) && !l.cidade?.toLowerCase().includes(s)) return false;
            }
            if (filterTemp && l.temperature !== filterTemp) return false;
            if (filterStatus && l.status !== filterStatus) return false;
            if (filterCidade && l.cidade !== filterCidade) return false;
            return true;
        });
    }, [leads, search, filterTemp, filterStatus, filterCidade]);

    const cidades = useMemo(() => [...new Set(leads.map(l => l.cidade).filter(Boolean))].sort(), [leads]);

    // Kanban columns by temperature (or could be by funnel stage)
    const kanbanColumns = useMemo(() => {
        const cols: Record<string, Lead[]> = { hot: [], warm: [], cold: [], cooled: [] };
        filteredLeads.filter(l => l.status === 'ativo').forEach(l => {
            (cols[l.temperature] || cols.cold).push(l);
        });
        return cols;
    }, [filteredLeads]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-imperio-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Action Summary Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ActionCard
                    label="Leads Atrasados"
                    value={summary.atrasados}
                    icon={<AlertTriangle size={20} />}
                    color={summary.atrasados > 0 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}
                    pulse={summary.atrasados > 0}
                />
                <ActionCard
                    label="Follow-up Hoje"
                    value={summary.followUpHoje}
                    icon={<Calendar size={20} />}
                    color="text-amber-400 bg-amber-500/10 border-amber-500/20"
                />
                <ActionCard
                    label="Quentes s/ Contato"
                    value={summary.quentesSemContato}
                    icon={<Flame size={20} />}
                    color="text-orange-400 bg-orange-500/10 border-orange-500/20"
                />
                <ActionCard
                    label="Total Ativos"
                    value={summary.totalAtivos}
                    icon={<Eye size={20} />}
                    color="text-imperio-400 bg-imperio-500/10 border-imperio-500/20"
                />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div className="flex items-center gap-3 flex-1 w-full md:w-auto">
                    <div className="relative flex-1 md:max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, telefone, cidade..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg bg-dark-900 border border-dark-800 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-imperio-500 transition-colors"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${showFilters ? 'bg-imperio-500/10 border-imperio-500/30 text-imperio-400' : 'bg-dark-900 border-dark-800 text-dark-400 hover:text-white'}`}
                    >
                        <Filter size={14} /> Filtros
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex rounded-lg bg-dark-900 border border-dark-800 overflow-hidden">
                        <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-imperio-500/20 text-imperio-400' : 'text-dark-500 hover:text-white'}`}>
                            <List size={16} />
                        </button>
                        <button onClick={() => setViewMode('kanban')} className={`p-2 ${viewMode === 'kanban' ? 'bg-imperio-500/20 text-imperio-400' : 'text-dark-500 hover:text-white'}`}>
                            <LayoutGrid size={16} />
                        </button>
                    </div>
                    <button
                        onClick={() => navigate('/leads/create')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-imperio-600 to-imperio-700 text-white text-sm font-medium hover:from-imperio-500 hover:to-imperio-600 transition-all shadow-lg shadow-imperio-600/20"
                    >
                        <Plus size={16} /> Novo Lead
                    </button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-dark-900 border border-dark-800 animate-fade-in">
                    <select value={filterTemp} onChange={e => setFilterTemp(e.target.value)} className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="">Todas Temperaturas</option>
                        <option value="hot">🔥 Quente</option>
                        <option value="warm">🌡 Morno</option>
                        <option value="cold">❄️ Frio</option>
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="">Todos Status</option>
                        <option value="ativo">Ativo</option>
                        <option value="fechado">Fechado</option>
                        <option value="perdido">Perdido</option>
                    </select>
                    <select value={filterCidade} onChange={e => setFilterCidade(e.target.value)} className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="">Todas Cidades</option>
                        {cidades.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => { setFilterTemp(''); setFilterStatus(''); setFilterCidade(''); }} className="text-xs text-dark-500 hover:text-white underline">Limpar</button>
                </div>
            )}

            {/* Content */}
            {viewMode === 'list' ? (
                <LeadTable leads={filteredLeads} onSelect={(id) => navigate(`/leads/${id}`)} />
            ) : (
                <KanbanBoard
                    columns={kanbanColumns}
                    onSelect={(id) => navigate(`/leads/${id}`)}
                    sensors={sensors}
                    activeLead={activeLead}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                />
            )}
        </div>
    );
}

// ─── Action Card ─────────────────────────────────────────────
function ActionCard({ label, value, icon, color, pulse }: { label: string; value: number; icon: React.ReactNode; color: string; pulse?: boolean }) {
    return (
        <div className={`rounded-xl border p-4 ${color} ${pulse ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                {icon}
                <span className="text-2xl font-bold">{value}</span>
            </div>
            <p className="text-xs font-medium opacity-80">{label}</p>
        </div>
    );
}

// ─── Lead Table ──────────────────────────────────────────────
function LeadTable({ leads, onSelect }: { leads: Lead[]; onSelect: (id: string) => void }) {
    return (
        <div className="rounded-xl bg-dark-900 border border-dark-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-dark-800">
                            <th className="text-left p-3 text-dark-500 font-medium text-xs uppercase tracking-wider">Lead</th>
                            <th className="text-left p-3 text-dark-500 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Cidade</th>
                            <th className="text-left p-3 text-dark-500 font-medium text-xs uppercase tracking-wider">Temp.</th>
                            <th className="text-left p-3 text-dark-500 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Status</th>
                            <th className="text-left p-3 text-dark-500 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Dias s/ Contato</th>
                            <th className="text-left p-3 text-dark-500 font-medium text-xs uppercase tracking-wider hidden xl:table-cell">Próx. Follow-up</th>
                            <th className="text-left p-3 text-dark-500 font-medium text-xs uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-dark-500">Nenhum lead encontrado</td></tr>
                        ) : leads.map(lead => {
                            const dias = getDiasSemContato(lead.lastContactAt);
                            const atrasado = isAtrasado(lead);
                            const temp = TEMP_LABELS[lead.temperature] || TEMP_LABELS.cold;
                            const statusInfo = STATUS_LABELS[lead.status] || STATUS_LABELS.ativo;

                            return (
                                <tr
                                    key={lead.id}
                                    onClick={() => onSelect(lead.id)}
                                    className={`border-b border-dark-800/50 cursor-pointer transition-colors hover:bg-dark-800/30 ${atrasado ? 'bg-red-500/5' : ''}`}
                                >
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            {atrasado && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
                                            <div>
                                                <p className="font-medium text-white">{lead.name || lead.phone}</p>
                                                <p className="text-xs text-dark-500">{lead.phone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-dark-400 hidden md:table-cell">{lead.cidade || '—'}</td>
                                    <td className="p-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${temp.color}`}>
                                            <temp.icon size={12} /> {temp.label}
                                        </span>
                                    </td>
                                    <td className="p-3 hidden lg:table-cell">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                                    </td>
                                    <td className="p-3 hidden lg:table-cell">
                                        <span className={`text-sm font-medium ${dias >= 1 ? 'text-red-400' : dias > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {lead.lastContactAt ? `${dias}d` : 'Nunca'}
                                        </span>
                                    </td>
                                    <td className="p-3 hidden xl:table-cell text-dark-400 text-xs">
                                        {lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString('pt-BR') : '—'}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                            <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition-colors">
                                                <MessageSquare size={14} />
                                            </a>
                                            <a href={`tel:${lead.phone}`} className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-colors">
                                                <Phone size={14} />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Kanban Board ────────────────────────────────────────────
function KanbanBoard({
    columns,
    onSelect,
    sensors,
    activeLead,
    onDragStart,
    onDragEnd
}: {
    columns: Record<string, Lead[]>;
    onSelect: (id: string) => void;
    sensors: any;
    activeLead: Lead | null;
    onDragStart: (event: DragStartEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
}) {
    const order = ['hot', 'warm', 'cold', 'cooled'];

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {order.map(key => {
                    const temp = TEMP_LABELS[key];
                    const items = columns[key] || [];
                    const itemIds = items.map(item => item.id);

                    return (
                        <div key={key} className="bg-dark-900 rounded-xl border border-dark-800 overflow-hidden flex flex-col max-h-[70vh]">
                            <div className={`px-4 py-3 border-b border-dark-800 flex items-center justify-between ${temp.color}`}>
                                <div className="flex items-center gap-2">
                                    <temp.icon size={16} />
                                    <span className="text-sm font-semibold">{temp.label}</span>
                                </div>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-dark-800 text-dark-400">{items.length}</span>
                            </div>
                            <DroppableColumn id={key} className="p-2 space-y-2 flex-1 overflow-y-auto scrollbar-hide min-h-[150px]">
                                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                                    {items.length === 0 ? (
                                        <div className="h-full min-h-[100px] border-2 border-dashed border-dark-700/50 rounded-lg flex items-center justify-center pointer-events-none">
                                            <span className="text-xs text-dark-500">Soltar aqui</span>
                                        </div>
                                    ) : (
                                        items.map(lead => (
                                            <SortableLeadCard key={lead.id} lead={lead} onSelect={onSelect} />
                                        ))
                                    )}
                                </SortableContext>
                            </DroppableColumn>
                        </div>
                    );
                })}
            </div>
            <DragOverlay>
                {activeLead ? <SortableLeadCard lead={activeLead} onSelect={onSelect} forceOverlay={true} /> : null}
            </DragOverlay>
        </DndContext>
    );
}

// ─── Droppable Column ──────────────────────────────────────────
function DroppableColumn({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={className} id={id}>
            {children}
        </div>
    );
}

// ─── Sortable Lead Card ──────────────────────────────────────────
function SortableLeadCard({ lead, onSelect, forceOverlay = false }: { lead: Lead; onSelect: (id: string) => void; forceOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id, data: { ...lead } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !forceOverlay ? 0.4 : 1,
        zIndex: isDragging || forceOverlay ? 50 : 1,
    };

    const dias = getDiasSemContato(lead.lastContactAt);
    const atrasado = isAtrasado(lead);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onSelect(lead.id)}
            className={`p-3 rounded-lg border transition-all ${isDragging || forceOverlay ? 'ring-2 ring-imperio-500 shadow-xl scale-[1.02] cursor-grabbing' : 'hover:scale-[1.02] hover:shadow-md cursor-grab'} ${atrasado ? 'border-red-500/30 bg-red-500/5' : 'border-dark-800 bg-dark-950 hover:border-dark-700'}`}
        >
            <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white truncate">{lead.name || lead.phone}</p>
                {atrasado && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
            </div>
            <p className="text-xs text-dark-500 mb-2">{lead.cidade || lead.phone}</p>
            <div className="flex items-center justify-between text-xs">
                <span className={dias >= 1 ? 'text-red-400' : 'text-dark-500'}>{lead.lastContactAt ? `${dias}d` : 'Sem contato'}</span>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-emerald-500/10 text-emerald-500 mousedown-prevent-default" onPointerDown={e => e.stopPropagation()}><MessageSquare size={12} /></a>
                    <a href={`tel:${lead.phone}`} className="p-1 rounded hover:bg-blue-500/10 text-blue-500 mousedown-prevent-default" onPointerDown={e => e.stopPropagation()}><Phone size={12} /></a>
                </div>
            </div>
        </div>
    );
}
