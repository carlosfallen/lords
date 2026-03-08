// ============================================================
// Lead Detail — Full CRM Detail Page (6 Sections)
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Phone, MessageSquare, MapPin, Thermometer, Calendar as CalendarIcon,
    Clock, Edit2, Save, X, Plus, Send, FileText, Link as LinkIcon,
    AlertTriangle, SnowflakeIcon, Flame, User, History, Trash2
} from 'lucide-react';
import { apiFetch, useAuthStore } from '../../stores/authStore';

// ─── Types ───────────────────────────────────────────────────
interface Lead { [key: string]: any; }
interface Activity { id: string; canal: string; resultado: string; observacao: string; contactedAt: string; userName: string; }
interface Note { id: string; texto: string; createdAt: string; userName: string; }
interface Proposal { id: string; tipo: string; arquivoPdfUrl: string; url: string; statusProposta: string; observacaoAdmin: string; createdAt: string; }

const TEMP = { cold: { l: 'Frio', c: 'text-blue-400 bg-blue-400/10' }, warm: { l: 'Morno', c: 'text-amber-400 bg-amber-400/10' }, hot: { l: 'Quente', c: 'text-red-400 bg-red-400/10' }, cooled: { l: 'Esfriou', c: 'text-slate-400 bg-slate-400/10' } };
const CANAL_OPTS = [{ v: 'whatsapp', l: 'WhatsApp' }, { v: 'ligacao', l: 'Ligação' }, { v: 'email', l: 'Email' }, { v: 'outro', l: 'Outro' }];
const RESULT_OPTS = [{ v: 'sem_resposta', l: 'Sem resposta' }, { v: 'conversou', l: 'Conversou' }, { v: 'pediu_retorno', l: 'Pediu retorno' }, { v: 'sem_interesse', l: 'Sem interesse' }, { v: 'outro', l: 'Outro' }];

export default function LeadDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [lead, setLead] = useState<Lead | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('info');

    // Modal states
    const [showActivityForm, setShowActivityForm] = useState(false);
    const [showJustifyModal, setShowJustifyModal] = useState<{ field: string; value: string } | null>(null);
    const [showSnoozeModal, setShowSnoozeModal] = useState(false);
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [showDeleteRequest, setShowDeleteRequest] = useState(false);
    const [showProposalRequest, setShowProposalRequest] = useState(false);

    // Form states
    const [activityForm, setActivityForm] = useState({ canal: 'whatsapp', resultado: 'conversou', observacao: '' });
    const [noteText, setNoteText] = useState('');
    const [justification, setJustification] = useState('');
    const [snoozeForm, setSnoozeForm] = useState({ until: '', motivo: '' });
    const [followUpDate, setFollowUpDate] = useState('');
    const [deleteMotivo, setDeleteMotivo] = useState('');
    const [proposalMsg, setProposalMsg] = useState('');

    useEffect(() => { if (id) loadLead(); }, [id]);

    async function loadLead() {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/leads/${id}`);
            if (res.success) {
                const d = res.data;
                setLead(d);
                setActivities(d.activities || []);
                setNotes(d.notes || []);
                setProposals(d.proposals || []);
            }
        } finally { setLoading(false); }
    }

    async function updateField(field: string, value: any, justificationText?: string) {
        const body: any = { [field]: value };
        if (justificationText) body.justification = justificationText;
        if (field === 'status' && value === 'perdido') {
            const motivo = prompt('Motivo da perda:');
            if (!motivo) return;
            body.motivoPerdaTexto = motivo;
        }
        const res = await apiFetch(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(body) });
        if (res.success) setLead(res.data);
        else if (res.error?.includes('Justificativa')) {
            setShowJustifyModal({ field, value: String(value) });
        } else alert(res.error || 'Erro');
    }

    async function submitActivity() {
        const res = await apiFetch(`/api/leads/${id}/activities`, { method: 'POST', body: JSON.stringify(activityForm) });
        if (res.success) { setShowActivityForm(false); setActivityForm({ canal: 'whatsapp', resultado: 'conversou', observacao: '' }); loadLead(); }
    }

    async function submitNote() {
        if (!noteText.trim()) return;
        const res = await apiFetch(`/api/leads/${id}/notes`, { method: 'POST', body: JSON.stringify({ texto: noteText }) });
        if (res.success) { setNoteText(''); loadLead(); }
    }

    async function submitSnooze() {
        const res = await apiFetch(`/api/leads/${id}/snooze`, { method: 'PUT', body: JSON.stringify({ snoozeUntil: snoozeForm.until, snoozeMotivo: snoozeForm.motivo }) });
        if (res.success) { setShowSnoozeModal(false); loadLead(); }
    }

    async function submitFollowUp() {
        const res = await apiFetch(`/api/leads/${id}/follow-up`, { method: 'PUT', body: JSON.stringify({ nextFollowUpAt: followUpDate }) });
        if (res.success) { setShowFollowUpModal(false); loadLead(); }
    }

    async function submitDeleteRequest() {
        const res = await apiFetch(`/api/leads/${id}/delete-request`, { method: 'POST', body: JSON.stringify({ motivo: deleteMotivo }) });
        if (res.success) { setShowDeleteRequest(false); setDeleteMotivo(''); alert('Solicitação de exclusão enviada ao Admin'); }
    }

    async function submitProposalRequest() {
        const res = await apiFetch(`/api/leads/${id}/proposal-adjustment`, { method: 'POST', body: JSON.stringify({ mensagem: proposalMsg }) });
        if (res.success) { setShowProposalRequest(false); setProposalMsg(''); alert('Solicitação enviada ao Admin'); }
    }

    async function submitJustification() {
        if (!showJustifyModal || !justification.trim()) return;
        await updateField(showJustifyModal.field, showJustifyModal.value, justification);
        setShowJustifyModal(null); setJustification('');
    }

    if (loading || !lead) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-imperio-500 border-t-transparent rounded-full animate-spin" /></div>;

    const diasSemContato = lead.lastContactAt ? Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / 86400000) : null;
    const t = (TEMP as any)[lead.temperature] || TEMP.cold;

    const tabs = [
        { id: 'info', label: 'Informações' },
        { id: 'activities', label: 'Tentativas', count: activities.length },
        { id: 'notes', label: 'Notas', count: notes.length },
        { id: 'proposals', label: 'Proposta', count: proposals.length },
        { id: 'timeline', label: 'Timeline' },
    ];

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            {/* Back + Header */}
            <div className="flex items-start gap-4">
                <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white mt-1"><ArrowLeft size={20} /></button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-xl font-bold text-white truncate">{lead.name || lead.phone}</h1>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.c}`}>{t.l}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${lead.status === 'ativo' ? 'text-emerald-400 bg-emerald-400/10' : lead.status === 'perdido' ? 'text-red-400 bg-red-400/10' : 'text-blue-400 bg-blue-400/10'}`}>{lead.status}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-dark-400 flex-wrap">
                        <span className="flex items-center gap-1"><Phone size={14} />{lead.phone}</span>
                        {lead.cidade && <span className="flex items-center gap-1"><MapPin size={14} />{lead.cidade}</span>}
                        <span className="flex items-center gap-1"><CalendarIcon size={14} />Criado: {new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
                        {diasSemContato !== null && (
                            <span className={`flex items-center gap-1 ${diasSemContato >= 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                                <Clock size={14} />{diasSemContato}d sem contato
                            </span>
                        )}
                    </div>
                    {/* Quick actions */}
                    <div className="flex items-center gap-2 mt-3">
                        <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"><MessageSquare size={14} />WhatsApp</a>
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"><Phone size={14} />Ligar</a>
                        <button onClick={() => setShowActivityForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-imperio-500/10 text-imperio-400 text-xs font-medium hover:bg-imperio-500/20 transition-colors"><Plus size={14} />Registrar Tentativa</button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-dark-800 overflow-x-auto scrollbar-hide">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                        className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeSection === tab.id ? 'text-imperio-400 border-imperio-500' : 'text-dark-500 border-transparent hover:text-white'}`}>
                        {tab.label}{tab.count !== undefined && <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-dark-800">{tab.count}</span>}
                    </button>
                ))}
            </div>

            {/* Section Content */}
            <div className="space-y-4">
                {activeSection === 'info' && <InfoSection lead={lead} onUpdate={updateField} />}
                {activeSection === 'activities' && (
                    <ActivitiesSection
                        activities={activities}
                        showForm={showActivityForm}
                        form={activityForm}
                        onFormChange={(f: string, v: string) => setActivityForm(p => ({ ...p, [f]: v }))}
                        onSubmit={submitActivity}
                        onToggleForm={() => setShowActivityForm(!showActivityForm)}
                        onShowSnooze={() => setShowSnoozeModal(true)}
                        onShowFollowUp={() => setShowFollowUpModal(true)}
                        lead={lead}
                    />
                )}
                {activeSection === 'notes' && <NotesSection notes={notes} noteText={noteText} onTextChange={setNoteText} onSubmit={submitNote} />}
                {activeSection === 'proposals' && <ProposalSection proposals={proposals} onRequestAdjust={() => setShowProposalRequest(true)} />}
                {activeSection === 'timeline' && <TimelineSection activities={activities} notes={notes} proposals={proposals} lead={lead} />}
            </div>

            {/* Delete request */}
            <div className="bg-dark-900 rounded-xl border border-dark-800 p-4">
                <button onClick={() => setShowDeleteRequest(true)} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 size={14} /> Solicitar Exclusão do Lead
                </button>
            </div>

            {/* ─── Modals ─────────────────────────────────────────── */}
            {showJustifyModal && <Modal title={`Justificativa para alterar ${showJustifyModal.field}`} onClose={() => setShowJustifyModal(null)}>
                <p className="text-sm text-dark-400 mb-3">Este campo é crítico. Informe o motivo da alteração:</p>
                <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm mb-3" placeholder="Motivo da alteração..." />
                <button onClick={submitJustification} className="px-4 py-2 rounded-lg bg-imperio-600 text-white text-sm font-medium">Confirmar</button>
            </Modal>}

            {showSnoozeModal && <Modal title="Adiar Follow-up (Snooze)" onClose={() => setShowSnoozeModal(false)}>
                <input type="datetime-local" value={snoozeForm.until} onChange={e => setSnoozeForm(p => ({ ...p, until: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm mb-3" />
                <textarea value={snoozeForm.motivo} onChange={e => setSnoozeForm(p => ({ ...p, motivo: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm mb-3" placeholder="Motivo do adiamento..." />
                <button onClick={submitSnooze} className="px-4 py-2 rounded-lg bg-imperio-600 text-white text-sm font-medium">Confirmar Snooze</button>
            </Modal>}

            {showFollowUpModal && <Modal title="Marcar Próximo Follow-up" onClose={() => setShowFollowUpModal(false)}>
                <input type="datetime-local" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm mb-3" />
                <button onClick={submitFollowUp} className="px-4 py-2 rounded-lg bg-imperio-600 text-white text-sm font-medium">Salvar</button>
            </Modal>}

            {showDeleteRequest && <Modal title="Solicitar Exclusão" onClose={() => setShowDeleteRequest(false)}>
                <p className="text-sm text-dark-400 mb-3">Representantes não podem excluir leads. Informe o motivo para o Admin avaliar:</p>
                <textarea value={deleteMotivo} onChange={e => setDeleteMotivo(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm mb-3" placeholder="Motivo..." />
                <button onClick={submitDeleteRequest} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium">Enviar Solicitação</button>
            </Modal>}

            {showProposalRequest && <Modal title="Solicitar Ajuste na Proposta" onClose={() => setShowProposalRequest(false)}>
                <textarea value={proposalMsg} onChange={e => setProposalMsg(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm mb-3" placeholder="Descreva o ajuste necessário..." />
                <button onClick={submitProposalRequest} className="px-4 py-2 rounded-lg bg-imperio-600 text-white text-sm font-medium">Enviar</button>
            </Modal>}
        </div>
    );
}

// ─── Modal ───────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-dark-900 rounded-2xl border border-dark-800 p-6 w-full max-w-md mx-4 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="text-dark-500 hover:text-white"><X size={18} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

// ─── Info Section ────────────────────────────────────────────
function InfoSection({ lead, onUpdate }: { lead: Lead; onUpdate: (f: string, v: any, j?: string) => void }) {
    return (
        <div className="bg-dark-900 rounded-xl border border-dark-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider">Informações do Lead</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField label="Nome" value={lead.name} onSave={(v) => onUpdate('name', v)} critical />
                <EditableField label="Telefone" value={lead.phone} onSave={(v) => onUpdate('phone', v)} critical />
                <EditableField label="Cidade" value={lead.cidade || ''} onSave={(v) => onUpdate('cidade', v)} />
                <EditableField label="Email" value={lead.email || ''} onSave={(v) => onUpdate('email', v)} />
                <div>
                    <label className="block text-xs text-dark-500 mb-1">Temperatura</label>
                    <select value={lead.temperature} onChange={e => onUpdate('temperature', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm">
                        <option value="cold">❄️ Frio</option><option value="warm">🌡 Morno</option><option value="hot">🔥 Quente</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-dark-500 mb-1">Status</label>
                    <select value={lead.status} onChange={e => onUpdate('status', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm">
                        <option value="ativo">Ativo</option><option value="fechado">Fechado</option><option value="perdido">Perdido</option>
                    </select>
                </div>
            </div>
            {lead.observacaoInicial && <div><label className="block text-xs text-dark-500 mb-1">Observação Inicial</label><p className="text-sm text-dark-300">{lead.observacaoInicial}</p></div>}
        </div>
    );
}

// ─── Editable Field ──────────────────────────────────────────
function EditableField({ label, value, onSave, critical }: { label: string; value: string; onSave: (v: string) => void; critical?: boolean }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value);
    return (
        <div>
            <label className="flex items-center gap-1 text-xs text-dark-500 mb-1">{label}{critical && <span className="text-amber-500 text-[10px]">⚠</span>}</label>
            {editing ? (
                <div className="flex gap-1">
                    <input value={val} onChange={e => setVal(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm" />
                    <button onClick={() => { onSave(val); setEditing(false); }} className="p-2 text-emerald-400"><Save size={14} /></button>
                    <button onClick={() => { setVal(value); setEditing(false); }} className="p-2 text-dark-500"><X size={14} /></button>
                </div>
            ) : (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 min-h-[38px]">
                    <span className="text-sm text-white">{value || '—'}</span>
                    <button onClick={() => setEditing(true)} className="text-dark-500 hover:text-white"><Edit2 size={12} /></button>
                </div>
            )}
        </div>
    );
}

// ─── Activities Section ──────────────────────────────────────
function ActivitiesSection({ activities, showForm, form, onFormChange, onSubmit, onToggleForm, onShowSnooze, onShowFollowUp, lead }: any) {
    const diasSemContato = lead.lastContactAt ? Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / 86400000) : null;
    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-dark-900 rounded-xl border border-dark-800 p-4 text-center">
                    <p className="text-2xl font-bold text-white">{activities.length}</p>
                    <p className="text-xs text-dark-500">Total tentativas</p>
                </div>
                <div className="bg-dark-900 rounded-xl border border-dark-800 p-4 text-center">
                    <p className={`text-2xl font-bold ${diasSemContato === null ? 'text-dark-500' : diasSemContato >= 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {diasSemContato ?? '—'}
                    </p>
                    <p className="text-xs text-dark-500">Dias s/ contato</p>
                </div>
                <div className="bg-dark-900 rounded-xl border border-dark-800 p-4 text-center">
                    <p className="text-lg font-bold text-white">{lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString('pt-BR') : '—'}</p>
                    <p className="text-xs text-dark-500">Próx. follow-up</p>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
                <button onClick={onToggleForm} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-imperio-500/10 text-imperio-400 text-sm font-medium hover:bg-imperio-500/20"><Plus size={14} />Registrar Tentativa</button>
                <button onClick={onShowFollowUp} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-sm font-medium hover:bg-amber-500/20"><CalendarIcon size={14} />Marcar Follow-up</button>
                <button onClick={onShowSnooze} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-500/10 text-slate-400 text-sm font-medium hover:bg-slate-500/20"><Clock size={14} />Snooze</button>
            </div>

            {/* New activity form */}
            {showForm && (
                <div className="bg-dark-900 rounded-xl border border-dark-800 p-4 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-dark-500 mb-1">Canal</label>
                            <select value={form.canal} onChange={(e: any) => onFormChange('canal', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm">
                                {CANAL_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-dark-500 mb-1">Resultado</label>
                            <select value={form.resultado} onChange={(e: any) => onFormChange('resultado', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm">
                                {RESULT_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                            </select>
                        </div>
                    </div>
                    <textarea value={form.observacao} onChange={(e: any) => onFormChange('observacao', e.target.value)} rows={2} placeholder="Observação da tentativa..." className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm resize-none" />
                    <button onClick={onSubmit} className="px-4 py-2 rounded-lg bg-imperio-600 text-white text-sm font-medium">Salvar Tentativa</button>
                </div>
            )}

            {/* Activity list */}
            <div className="space-y-2">
                {activities.map((a: Activity) => (
                    <div key={a.id} className="bg-dark-900 rounded-lg border border-dark-800 p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-imperio-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Phone size={14} className="text-imperio-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-white capitalize">{a.canal}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-dark-800 text-dark-400">{a.resultado.replace(/_/g, ' ')}</span>
                            </div>
                            {a.observacao && <p className="text-xs text-dark-400 mt-1">{a.observacao}</p>}
                            <p className="text-[10px] text-dark-600 mt-1">{a.userName} · {new Date(a.contactedAt).toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                ))}
                {activities.length === 0 && <p className="text-center text-sm text-dark-600 py-4">Nenhuma tentativa registrada</p>}
            </div>
        </div>
    );
}

// ─── Notes Section ───────────────────────────────────────────
function NotesSection({ notes, noteText, onTextChange, onSubmit }: { notes: Note[]; noteText: string; onTextChange: (v: string) => void; onSubmit: () => void }) {
    return (
        <div className="space-y-4">
            <div className="bg-dark-900 rounded-xl border border-dark-800 p-4 flex gap-2">
                <input value={noteText} onChange={e => onTextChange(e.target.value)} placeholder="Adicionar observação..." className="flex-1 px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm" onKeyDown={e => e.key === 'Enter' && onSubmit()} />
                <button onClick={onSubmit} className="p-2 rounded-lg bg-imperio-600 text-white"><Send size={16} /></button>
            </div>
            <div className="space-y-2">
                {notes.map(n => (
                    <div key={n.id} className="bg-dark-900 rounded-lg border border-dark-800 p-3">
                        <p className="text-sm text-white">{n.texto}</p>
                        <p className="text-[10px] text-dark-600 mt-1">{n.userName} · {new Date(n.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                ))}
                {notes.length === 0 && <p className="text-center text-sm text-dark-600 py-4">Nenhuma observação</p>}
            </div>
        </div>
    );
}

// ─── Proposal Section ────────────────────────────────────────
function ProposalSection({ proposals, onRequestAdjust }: { proposals: Proposal[]; onRequestAdjust: () => void }) {
    return (
        <div className="space-y-4">
            {proposals.length === 0 ? (
                <div className="bg-dark-900 rounded-xl border border-dark-800 p-8 text-center">
                    <FileText size={32} className="text-dark-600 mx-auto mb-2" />
                    <p className="text-sm text-dark-500">Nenhuma proposta cadastrada pelo Admin</p>
                </div>
            ) : proposals.map(p => (
                <div key={p.id} className="bg-dark-900 rounded-xl border border-dark-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        {p.tipo === 'pdf' ? <FileText size={16} className="text-red-400" /> : <LinkIcon size={16} className="text-blue-400" />}
                        <span className="text-sm font-medium text-white">{p.tipo === 'pdf' ? 'PDF' : 'Link'}</span>
                        {p.statusProposta && <span className="text-xs px-2 py-0.5 rounded-full bg-dark-800 text-dark-400">{p.statusProposta}</span>}
                    </div>
                    {p.arquivoPdfUrl && <a href={p.arquivoPdfUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-400 underline block mb-1">Abrir PDF</a>}
                    {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-sm text-blue-400 underline block mb-1">{p.url}</a>}
                    {p.observacaoAdmin && <p className="text-xs text-dark-400 mt-2">{p.observacaoAdmin}</p>}
                    <p className="text-[10px] text-dark-600 mt-1">{new Date(p.createdAt).toLocaleString('pt-BR')}</p>
                </div>
            ))}
            <button onClick={onRequestAdjust} className="flex items-center gap-2 text-sm text-imperio-400 hover:text-imperio-300">
                <Edit2 size={14} /> Solicitar ajuste na proposta
            </button>
        </div>
    );
}

// ─── Timeline Section ────────────────────────────────────────
function TimelineSection({ activities, notes, proposals, lead }: { activities: Activity[]; notes: Note[]; proposals: Proposal[]; lead: Lead }) {
    const events = useMemo(() => {
        const all: { type: string; date: string; text: string; sub: string }[] = [];
        all.push({ type: 'created', date: lead.createdAt, text: 'Lead criado', sub: lead.name || lead.phone });
        activities.forEach(a => all.push({ type: 'activity', date: a.contactedAt, text: `Tentativa: ${a.canal}`, sub: `${a.resultado.replace(/_/g, ' ')} ${a.observacao ? '— ' + a.observacao : ''}` }));
        notes.forEach(n => all.push({ type: 'note', date: n.createdAt, text: 'Nota adicionada', sub: n.texto.substring(0, 80) }));
        proposals.forEach(p => all.push({ type: 'proposal', date: p.createdAt, text: `Proposta (${p.tipo}) cadastrada`, sub: p.observacaoAdmin || '' }));
        return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [activities, notes, proposals, lead]);

    const iconMap: Record<string, React.ReactNode> = {
        created: <User size={14} className="text-purple-400" />,
        activity: <Phone size={14} className="text-imperio-400" />,
        note: <Edit2 size={14} className="text-amber-400" />,
        proposal: <FileText size={14} className="text-emerald-400" />,
    };

    return (
        <div className="space-y-0">
            {events.map((e, i) => (
                <div key={i} className="flex gap-3 pb-4">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center flex-shrink-0">{iconMap[e.type] || <History size={14} />}</div>
                        {i < events.length - 1 && <div className="w-px flex-1 bg-dark-800 mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm font-medium text-white">{e.text}</p>
                        <p className="text-xs text-dark-400 truncate">{e.sub}</p>
                        <p className="text-[10px] text-dark-600 mt-0.5">{new Date(e.date).toLocaleString('pt-BR')}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
