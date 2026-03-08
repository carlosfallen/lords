// ============================================================
// Finance Page
// ============================================================
import { useState, useEffect } from 'react';
import { apiFetch } from '../../stores/authStore';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function Finance() {
    const [overview, setOverview] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);

    useEffect(() => {
        apiFetch('/api/finance/overview').then(r => r.success && setOverview(r.data));
        apiFetch('/api/finance/payments').then(r => r.success && setPayments(r.data));
    }, []);

    if (!overview) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-imperio-500/30 border-t-imperio-500 rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="kpi-card"><span className="kpi-label">MRR</span><span className="kpi-value">R$ {overview.mrr.toLocaleString('pt-BR')}</span><span className="kpi-change positive"><TrendingUp size={12} className="inline" /> {overview.mrrGrowth}%</span></div>
                <div className="kpi-card"><span className="kpi-label">ARR</span><span className="kpi-value">R$ {overview.arr.toLocaleString('pt-BR')}</span></div>
                <div className="kpi-card"><span className="kpi-label">NRR</span><span className="kpi-value text-success">{overview.nrr}%</span><span className="kpi-change positive">Saudável</span></div>
                <div className="kpi-card"><span className="kpi-label">Margem</span><span className="kpi-value text-imperio-400">{((overview.mrr - 8500) / overview.mrr * 100).toFixed(1)}%</span></div>
            </div>

            {/* MRR History */}
            <div className="card">
                <h3 className="text-sm font-semibold text-dark-200 mb-4">Evolução MRR (12 meses)</h3>
                <div className="flex items-end gap-2 h-40">
                    {overview.mrrHistory?.map((m: any, i: number) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full bg-imperio-600/40 rounded-t hover:bg-imperio-500/60 transition"
                                style={{ height: `${(m.value / 55000) * 100}%` }}
                                title={`R$ ${m.value.toLocaleString('pt-BR')}`} />
                            <span className="text-[9px] text-dark-500 -rotate-45 origin-left">{m.month}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payments */}
            <div className="card">
                <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
                    <DollarSign size={14} className="text-imperio-400" /> Pagamentos do Mês
                </h3>
                <div className="table-wrapper">
                    <table className="table">
                        <thead><tr><th>Cliente</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Atraso</th></tr></thead>
                        <tbody>
                            {payments.map((p: any) => (
                                <tr key={p.id}>
                                    <td className="font-medium text-dark-200">{p.tenant}</td>
                                    <td className="text-dark-300">R$ {p.amount.toLocaleString('pt-BR')}</td>
                                    <td className="text-dark-400 text-xs">{p.dueDate}</td>
                                    <td>
                                        {p.isPaid ?
                                            <span className="badge badge-success"><CheckCircle size={10} /> Pago</span> :
                                            <span className="badge badge-danger"><Clock size={10} /> Pendente</span>
                                        }
                                    </td>
                                    <td className={p.daysOverdue > 0 ? 'text-danger font-medium' : 'text-dark-500'}>
                                        {p.daysOverdue > 0 ? `${p.daysOverdue} dias` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Projection */}
            <div className="card">
                <h3 className="text-sm font-semibold text-dark-200 mb-4">Projeção de Receita</h3>
                <div className="grid grid-cols-3 gap-4">
                    {overview.projection?.map((p: any) => (
                        <div key={p.month} className="text-center p-4 rounded-lg bg-dark-800/50 border border-dark-700/50">
                            <p className="text-xs text-dark-400 mb-1">{p.month}</p>
                            <p className="text-lg font-bold text-imperio-400">R$ {p.projected.toLocaleString('pt-BR')}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
