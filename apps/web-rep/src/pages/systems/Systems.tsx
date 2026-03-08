// ============================================================
// Systems Page — Template Manager
// ============================================================
import { useState, useEffect } from 'react';
import { PackageOpen, Plus, Settings } from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

export default function Systems() {
    const [systems, setSystems] = useState<any[]>([]);

    useEffect(() => {
        apiFetch('/api/systems').then(r => r.success && setSystems(r.data));
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div><p className="text-sm text-dark-400">Total de sistemas</p><p className="text-2xl font-bold text-white">{systems.length} <span className="text-sm text-dark-500">produtos</span></p></div>
                <button className="btn-primary btn-sm"><Plus size={14} /> Novo Sistema</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systems.map(s => (
                    <div key={s.id} className="card hover:border-imperio-600/30 transition group">
                        <div className="flex items-start justify-between mb-3">
                            <div className="p-2 rounded-lg bg-imperio-600/10"><PackageOpen size={18} className="text-imperio-400" /></div>
                            <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{s.status === 'active' ? 'Ativo' : 'Em Dev'}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-dark-200 group-hover:text-white transition mb-1">{s.name}</h4>
                        <p className="text-xs text-dark-400 leading-relaxed mb-3">{s.description}</p>
                        <div className="flex items-center justify-between pt-3 border-t border-dark-700">
                            <span className="text-xs text-dark-500">v{s.version}</span>
                            <span className="text-sm font-bold text-imperio-400">R$ {Number(s.basePriceMonthly).toFixed(2)}/mês</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
