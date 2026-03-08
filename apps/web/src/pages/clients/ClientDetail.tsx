// ============================================================
// Client Detail - Admin Level (Full access)
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Phone, MessageSquare, MapPin, Calendar as CalendarIcon,
    Clock, Edit2, Save, X, Plus, Send, FileText, Link as LinkIcon,
    AlertTriangle, Trash2, UserPlus, Shield, Upload, User, History, RefreshCw
} from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

interface Lead { [key: string]: any; }
interface Activity { id: string; canal: string; resultado: string; observacao: string; contactedAt: string; userName: string; }
interface Note { id: string; texto: string; createdAt: string; userName: string; }
interface Proposal { id: string; tipo: string; arquivoPdfUrl: string; url: string; statusProposta: string; observacaoAdmin: string; createdAt: string; }

const CANAL_OPTS = [{ v: 'whatsapp', l: 'WhatsApp' }, { v: 'ligacao', l: 'Ligação' }, { v: 'email', l: 'Email' }, { v: 'outro', l: 'Outro' }];
const RESULT_OPTS = [{ v: 'sem_resposta', l: 'Sem resposta' }, { v: 'conversou', l: 'Conversou' }, { v: 'pediu_retorno', l: 'Pediu retorno' }, { v: 'sem_interesse', l: 'Sem interesse' }, { v: 'outro', l: 'Outro' }];

export default function ClientDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [lead, setLead] = useState<Lead | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('info');
    const [reps, setReps] = useState<{ id: string; name: string }[]>([]);

    // Forms
    const [activityForm, setActivityForm] = useState({ canal: 'whatsapp', resultado: 'conversou', observacao: '' });
    const [showActivityForm, setShowActivityForm] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [proposalForm, setProposalForm] = useState({ tipo: 'link', url: '', arquivoPdfUrl: '', observacaoAdmin: '' });
    const [showProposalForm, setShowProposalForm] = useState(false);
    const [reassignId, setReassignId] = useState('');
    const [showReassign, setShowReassign] = useState(false);
    const [pendingDeletes, setPendingDeletes] = useState<any[]>([]);
    const [pendingAdj, setPendingAdj] = useState<any[]>([]);

    useEffect(() => { if (id) load(); }, [id]);

    async function load() {
        setLoading(true);
        const [leadRes, usersRes, delRes, adjRes] = await Promise.all([
            apiFetch(`/api/leads/${id}`),
            apiFetch('/api/users'),
            apiFetch('/api/delete-requests?status=pendente'),
            apiFetch('/api/proposal-adjustments?status=pendente'),
        ]);
        if (leadRes.success) {
            setLead(leadRes.data); setActivities(leadRes.data.activities || []);
            setNotes(leadRes.data.notes || []); setProposals(leadRes.data.proposals || []);
        }
        if (usersRes.success) setReps(usersRes.data.filter((u: any) => u.role === 'representante').map((u: any) => ({ id: u.id, name: u.name })));
        if (delRes.success) setPendingDeletes(delRes.data.filter((d: any) => d.leadId === id));
        if (adjRes.success) setPendingAdj(adjRes.data.filter((a: any) => a.leadId === id));
        setLoading(false);
    }

    async function updateLead(data: any) {
        const res = await apiFetch(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        if (res.success) setLead(res.data);
    }

    async function submitActivity() {
        const res = await apiFetch(`/api/leads/${id}/activities`, { method: 'POST', body: JSON.stringify(activityForm) });
        if (res.success) { setShowActivityForm(false); load(); }
    }

    async function submitNote() {
        if (!noteText.trim()) return;
        await apiFetch(`/api/leads/${id}/notes`, { method: 'POST', body: JSON.stringify({ texto: noteText }) });
        setNoteText(''); load();
    }

    async function submitProposal() {
        await apiFetch(`/api/leads/${id}/proposals`, { method: 'POST', body: JSON.stringify(proposalForm) });
        setShowProposalForm(false); load();
    }

    async function reassignLead() {
        if (!reassignId) return;
        await apiFetch(`/api/admin/leads/${id}/reassign`, { method: 'PUT', body: JSON.stringify({ newOwnerId: reassignId }) });
        setShowReassign(false); load();
    }

    async function handleDeleteRequest(reqId: string, status: string) {
        await apiFetch(`/api/delete-requests/${reqId}`, { method: 'PUT', body: JSON.stringify({ status }) });
        load();
    }

    async function handleAdjRequest(reqId: string, status: string, response: string) {
        await apiFetch(`/api/proposal-adjustments/${reqId}`, { method: 'PUT', body: JSON.stringify({ status, adminResponse: response }) });
        load();
    }

    if (loading || !lead) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-imperio-500 border-t-transparent rounded-full animate-spin" /></div>;

    const diasSemContato = lead.lastContactAt ? Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / 86400000) : null;
    const tabs = [
        { id: 'info', label: 'Informações' },
        { id: 'activities', label: `Tentativas (${activities.length})` },
        { id: 'notes', label: `Notas (${notes.length})` },
        { id: 'proposals', label: `Propostas (${proposals.length})` },
        { id: 'admin', label: '⚙️ Admin', badge: pendingDeletes.length + pendingAdj.length },
    ];

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start gap-4">
                <button onClick={() => navigate('/clients')} className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 mt-1"><ArrowLeft size={20} /></button>
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-xl font-bold text-white">{lead.name || lead.phone}</h1>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 flex items-center gap-1"><Shield size={10} />Admin View</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-dark-400 flex-wrap">
                        <span><Phone size={14} className="inline mr-1" />{lead.phone}</span>
                        {lead.cidade && <span><MapPin size={14} className="inline mr-1" />{lead.cidade}</span>}
                        {diasSemContato !== null && <span className={diasSemContato >= 1 ? 'text-red-400' : 'text-emerald-400'}><Clock size={14} className="inline mr-1" />{diasSemContato}d sem contato</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <button onClick={() => setShowReassign(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-medium hover:bg-purple-500/20"><UserPlus size={14} />Reatribuir</button>
                        <button onClick={() => setShowActivityForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-imperio-500/10 text-imperio-400 text-xs font-medium hover:bg-imperio-500/20"><Plus size={14} />Registrar Tentativa</button>
                        <button onClick={() => setShowProposalForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20"><Upload size={14} />Nova Proposta</button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-dark-800 overflow-x-auto scrollbar-hide">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${tab === t.id ? 'text-imperio-400 border-imperio-500' : 'text-dark-500 border-transparent hover:text-white'}`}>
                        {t.label}
                        {t.badge ? <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">{t.badge}</span> : null}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {tab === 'info' && (
                <div className="bg-dark-900 rounded-xl border border-dark-800 p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[['name', 'Nome'], ['phone', 'Telefone'], ['cidade', 'Cidade'], ['email', 'Email']].map(([f, l]) => (
                            <AdminField key={f} label={l} value={lead[f] || ''} onSave={v => updateLead({ [f]: v })} />
                        ))}
                        <div><label className="block text-xs text-dark-500 mb-1">Temperatura</label>
                            <select value={lead.temperature} onChange={e => updateLead({ temperature: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm"><option value="cold">Frio</option><option value="warm">Morno</option><option value="hot">Quente</option></select></div>
                        <div><label className="block text-xs text-dark-500 mb-1">Status</label>
                            <select value={lead.status} onChange={e => { if (e.target.value === 'perdido') { const m = prompt('Motivo:'); if (!m) return; updateLead({ status: e.target.value, motivoPerdaTexto: m }); } else updateLead({ status: e.target.value }); }} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm"><option value="ativo">Ativo</option><option value="fechado">Fechado</option><option value="perdido">Perdido</option></select></div>
                    </div>
                </div>
            )}

            {tab === 'activities' && (
                <div className="space-y-3">
                    {showActivityForm && (
                        <div className="bg-dark-900 rounded-xl border border-dark-800 p-4 space-y-3 animate-fade-in">
                            <div className="grid grid-cols-2 gap-3">
                                <select value={activityForm.canal} onChange={e => setActivityForm(p => ({ ...p, canal: e.target.value }))} className="px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm">{CANAL_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
                                <select value={activityForm.resultado} onChange={e => setActivityForm(p => ({ ...p, resultado: e.target.value }))} className="px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm">{RESULT_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
                            </div>
                            <textarea value={activityForm.observacao} onChange={e => setActivityForm(p => ({ ...p, observacao: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm resize-none" placeholder="Observação..." />
                            <button onClick={submitActivity} className="px-4 py-2 rounded-lg bg-imperio-600 text-white text-sm">Salvar</button>
                        </div>
                    )}
                    {activities.map(a => (
                        <div key={a.id} className="bg-dark-900 rounded-lg border border-dark-800 p-3 flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-imperio-500/10 flex items-center justify-center"><Phone size={14} className="text-imperio-400" /></div>
                            <div><div className="flex gap-2"><span className="text-sm text-white capitalize">{a.canal}</span><span className="text-xs px-2 py-0.5 rounded-full bg-dark-800 text-dark-400">{a.resultado.replace(/_/g, ' ')}</span></div>{a.observacao && <p className="text-xs text-dark-400 mt-1">{a.observacao}</p>}<p className="text-[10px] text-dark-600 mt-1">{a.userName} · {new Date(a.contactedAt).toLocaleString('pt-BR')}</p></div>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'notes' && (
                <div className="space-y-3">
                    <div className="flex gap-2"><input value={noteText} onChange={e => setNoteText(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-dark-900 border border-dark-800 text-white text-sm" placeholder="Adicionar nota..." onKeyDown={e => e.key === 'Enter' && submitNote()} /><button onClick={submitNote} className="p-2 rounded-lg bg-imperio-600 text-white"><Send size={16} /></button></div>
                    {notes.map(n => (<div key={n.id} className="bg-dark-900 rounded-lg border border-dark-800 p-3"><p className="text-sm text-white">{n.texto}</p><p className="text-[10px] text-dark-600 mt-1">{n.userName} · {new Date(n.createdAt).toLocaleString('pt-BR')}</p></div>))}
                </div>
            )}

            {tab === 'proposals' && (
                <div className="space-y-3">
                    {showProposalForm && (
                        <div className="bg-dark-900 rounded-xl border border-dark-800 p-4 space-y-3 animate-fade-in">
                            <select value={proposalForm.tipo} onChange={e => setProposalForm(p => ({ ...p, tipo: e.target.value }))} className="px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm"><option value="link">Link</option><option value="pdf">PDF</option></select>
                            <input value={proposalForm.url} onChange={e => setProposalForm(p => ({ ...p, url: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm" placeholder="URL da proposta..." />
                            <textarea value={proposalForm.observacaoAdmin} onChange={e => setProposalForm(p => ({ ...p, observacaoAdmin: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm resize-none" rows={2} placeholder="Observação..." />
                            <button onClick={submitProposal} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">Cadastrar Proposta</button>
                        </div>
                    )}
                    {proposals.map(p => (
                        <div key={p.id} className="bg-dark-900 rounded-lg border border-dark-800 p-3">
                            <div className="flex items-center gap-2 mb-1">{p.tipo === 'pdf' ? <FileText size={14} className="text-red-400" /> : <LinkIcon size={14} className="text-blue-400" />}<span className="text-sm text-white">{p.tipo.toUpperCase()}</span></div>
                            {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 underline">{p.url}</a>}
                            {p.observacaoAdmin && <p className="text-xs text-dark-400 mt-1">{p.observacaoAdmin}</p>}
                        </div>
                    ))}
                </div>
            )}

            {tab === 'admin' && (
                <div className="space-y-4">
                    {/* Pending delete requests */}
                    {pendingDeletes.length > 0 && (
                        <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2"><Trash2 size={14} />Solicitações de Exclusão Pendentes</h3>
                            {pendingDeletes.map((d: any) => (
                                <div key={d.id} className="bg-dark-950 rounded-lg p-3">
                                    <p className="text-sm text-white mb-1">Motivo: {d.motivo}</p>
                                    <p className="text-xs text-dark-500 mb-2">Por: {d.representanteName} · {new Date(d.createdAt).toLocaleString('pt-BR')}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleDeleteRequest(d.id, 'aprovado')} className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs">Aprovar Exclusão</button>
                                        <button onClick={() => handleDeleteRequest(d.id, 'recusado')} className="px-3 py-1 rounded-lg bg-dark-700 text-dark-300 text-xs">Recusar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pending proposal adjustments */}
                    {pendingAdj.length > 0 && (
                        <div className="bg-amber-500/5 rounded-xl border border-amber-500/20 p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2"><Edit2 size={14} />Ajustes de Proposta Pendentes</h3>
                            {pendingAdj.map((a: any) => (
                                <div key={a.id} className="bg-dark-950 rounded-lg p-3">
                                    <p className="text-sm text-white mb-1">{a.mensagem}</p>
                                    <p className="text-xs text-dark-500 mb-2">Por: {a.representanteName}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAdjRequest(a.id, 'atendido', 'Ajuste realizado')} className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs">Marcar Atendido</button>
                                        <button onClick={() => handleAdjRequest(a.id, 'recusado', 'Recusado')} className="px-3 py-1 rounded-lg bg-dark-700 text-dark-300 text-xs">Recusar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {pendingDeletes.length === 0 && pendingAdj.length === 0 && (
                        <p className="text-center text-sm text-dark-500 py-8">Nenhuma solicitação pendente para este lead</p>
                    )}
                </div>
            )}

            {/* Reassign Modal */}
            {showReassign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-dark-900 rounded-2xl border border-dark-800 p-6 w-full max-w-sm mx-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Reatribuir Lead</h3>
                        <select value={reassignId} onChange={e => setReassignId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm mb-4">
                            <option value="">Selecionar vendedor...</option>
                            {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <button onClick={reassignLead} className="flex-1 px-4 py-2 rounded-lg bg-imperio-600 text-white text-sm">Reatribuir</button>
                            <button onClick={() => setShowReassign(false)} className="px-4 py-2 rounded-lg bg-dark-800 text-dark-400 text-sm">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AdminField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value);
    return (
        <div>
            <label className="block text-xs text-dark-500 mb-1">{label}</label>
            {editing ? (
                <div className="flex gap-1"><input value={val} onChange={e => setVal(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm" /><button onClick={() => { onSave(val); setEditing(false); }} className="p-2 text-emerald-400"><Save size={14} /></button><button onClick={() => { setVal(value); setEditing(false); }} className="p-2 text-dark-500"><X size={14} /></button></div>
            ) : (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-dark-950 border border-dark-800"><span className="text-sm text-white">{value || '—'}</span><button onClick={() => setEditing(true)} className="text-dark-500 hover:text-white"><Edit2 size={12} /></button></div>
            )}
        </div>
    );
}
