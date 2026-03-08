// ============================================================
// City Presentations Manager — Admin CRUD
// ============================================================
import { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Save, X, Link as LinkIcon, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

interface CityPres { id: string; cidade: string; link: string; ativo: boolean; updatedAt: string; }

export default function CityPresentations() {
    const [items, setItems] = useState<CityPres[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ cidade: '', link: '' });
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        const res = await apiFetch('/api/city-presentations');
        if (res.success) setItems(res.data);
        setLoading(false);
    }

    async function submit() {
        if (!form.cidade || !form.link) return;
        if (editingId) {
            await apiFetch(`/api/city-presentations/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
        } else {
            await apiFetch('/api/city-presentations', { method: 'POST', body: JSON.stringify(form) });
        }
        setShowForm(false); setForm({ cidade: '', link: '' }); setEditingId(null); load();
    }

    async function toggleActive(item: CityPres) {
        await apiFetch(`/api/city-presentations/${item.id}`, { method: 'PUT', body: JSON.stringify({ ativo: !item.ativo }) });
        load();
    }

    function startEdit(item: CityPres) {
        setForm({ cidade: item.cidade, link: item.link }); setEditingId(item.id); setShowForm(true);
    }

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-imperio-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2"><MapPin size={22} />Apresentações por Cidade</h1>
                    <p className="text-sm text-dark-500">Gerenciar links de apresentação para cada cidade</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={load} className="p-2 rounded-lg hover:bg-dark-800 text-dark-400"><RefreshCw size={16} /></button>
                    <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ cidade: '', link: '' }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-imperio-600 text-white text-sm"><Plus size={14} />Nova Cidade</button>
                </div>
            </div>

            {showForm && (
                <div className="bg-dark-900 rounded-xl border border-dark-800 p-4 space-y-3 animate-fade-in">
                    <input value={form.cidade} onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))} placeholder="Nome da cidade" className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm" />
                    <input value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} placeholder="URL da apresentação" className="w-full px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-white text-sm" />
                    <div className="flex gap-2">
                        <button onClick={submit} className="px-4 py-2 rounded-lg bg-imperio-600 text-white text-sm">{editingId ? 'Salvar' : 'Criar'}</button>
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-dark-800 text-dark-400 text-sm">Cancelar</button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {items.length === 0 ? (
                    <p className="text-center text-sm text-dark-500 py-8">Nenhuma apresentação cadastrada</p>
                ) : items.map(item => (
                    <div key={item.id} className="bg-dark-900 rounded-xl border border-dark-800 p-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white flex items-center gap-2"><MapPin size={14} className="text-imperio-400" />{item.cidade}</p>
                            <a href={item.link} target="_blank" rel="noreferrer" className="text-xs text-blue-400 underline truncate block mt-1">{item.link}</a>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => toggleActive(item)} className={item.ativo ? 'text-emerald-400' : 'text-dark-500'}>
                                {item.ativo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                            </button>
                            <button onClick={() => startEdit(item)} className="p-2 text-dark-400 hover:text-white"><Edit2 size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
