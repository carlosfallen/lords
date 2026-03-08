// ============================================================
// Wiki Page — Base de Conhecimento
// ============================================================
import { BookOpen, Search, Plus, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../stores/authStore';

const categories = ['Todas', 'Vendas', 'Processos', 'Suporte', 'Mentoria'];

export default function Wiki() {
    const [articles, setArticles] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('Todas');

    useEffect(() => {
        const fetchWiki = setTimeout(() => {
            apiFetch(`/api/wiki${search ? `?q=${search}` : ''}`).then(r => r.success && setArticles(r.data));
        }, 300);
        return () => clearTimeout(fetchWiki);
    }, [search]);

    const filtered = articles.filter(a =>
        (category === 'Todas' || a.category === category)
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-dark-800 rounded-lg px-3 py-2 flex-1 max-w-md">
                    <Search size={14} className="text-dark-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar artigo..."
                        className="bg-transparent text-sm text-dark-200 outline-none w-full placeholder:text-dark-500"
                    />
                </div>
                <div className="flex gap-1">
                    {categories.map(c => (
                        <button key={c} onClick={() => setCategory(c)} className={`btn-sm ${category === c ? 'btn-primary' : 'btn-secondary'}`}>{c}</button>
                    ))}
                </div>
                <button className="btn-primary btn-sm ml-auto"><Plus size={14} /> Novo Artigo</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(a => (
                    <div key={a.id} className="card hover:border-imperio-600/30 cursor-pointer group">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-dark-800"><FileText size={18} className="text-imperio-400" /></div>
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-dark-200 group-hover:text-white transition">{a.title}</h4>
                                <div className="flex items-center gap-2 mt-1 mb-2">
                                    <span className="badge badge-neutral">{a.category}</span>
                                    <span className="text-[10px] text-dark-500">{new Date(a.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex gap-1 mt-2 flex-wrap">
                                    {a.tags?.map((t: string) => <span key={t} className="tag">{t}</span>)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
