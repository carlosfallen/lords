// ============================================================
// Reports Page
// ============================================================
import { useState, useEffect } from 'react';
import { BarChart3, Download, FileText, TrendingUp, Users, DollarSign } from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

export default function Reports() {
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        apiFetch('/api/reports').then(r => {
            if (r.success) {
                // Map the data to a friendly format
                const mapped = [
                    ...r.data.tractionReports.map((t: any) => ({
                        id: t.tenantName + '_traction',
                        title: `Termômetro de Tração: ${t.tenantName}`,
                        type: 'Performance',
                        date: new Date(t.calculatedAt).toLocaleDateString(),
                        status: 'ready'
                    })),
                    ...r.data.financialLostReports.map((f: any) => ({
                        id: f.tenantName + '_finance',
                        title: `Dinheiro na Mesa: ${f.tenantName}`,
                        type: 'Financeiro',
                        date: new Date(f.periodEnd).toLocaleDateString(),
                        status: 'ready'
                    }))
                ];
                setReports(mapped);
            }
        });
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-4 gap-4">
                <div className="kpi-card"><span className="kpi-label">MRR Atual</span><span className="kpi-value">R$ 47.850</span><span className="kpi-change positive"><TrendingUp size={12} className="inline" /> 12.5%</span></div>
                <div className="kpi-card"><span className="kpi-label">Base de Clientes</span><span className="kpi-value">34</span></div>
                <div className="kpi-card"><span className="kpi-label">Score Médio</span><span className="kpi-value text-imperio-400">58</span></div>
                <div className="kpi-card"><span className="kpi-label">Oportunidades Upsell</span><span className="kpi-value text-success">7</span></div>
            </div>

            <div className="card">
                <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2"><BarChart3 size={14} className="text-imperio-400" /> Relatórios Disponíveis</h3>
                <div className="space-y-2">
                    {reports.length === 0 && <p className="text-xs text-dark-500 italic p-4">Nenhum snapshot de relatório gerado pelos workers ainda.</p>}
                    {reports.map((r, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-dark-800/50 border border-dark-700/50 hover:border-dark-600 transition">
                            <div className="p-2 rounded-lg bg-dark-800"><FileText size={16} className="text-imperio-400" /></div>
                            <div className="flex-1">
                                <p className="text-sm text-dark-200">{r.title}</p>
                                <p className="text-xs text-dark-500">{r.type} • {r.date}</p>
                            </div>
                            {r.status === 'ready' ?
                                <button className="btn-secondary btn-xs"><Download size={12} /> PDF</button> :
                                <span className="badge badge-warning">Gerando...</span>
                            }
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
