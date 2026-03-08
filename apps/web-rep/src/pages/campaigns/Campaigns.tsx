// ============================================================
// Campaigns Page
// ============================================================
import { useState, useEffect } from 'react';
import { Megaphone, TrendingUp, DollarSign, Users } from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

export default function Campaigns() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalSpent: 0, totalLeads: 0, avgCpl: 0, totalConversions: 0 });

    useEffect(() => {
        apiFetch('/api/campaigns').then(r => {
            if (r.success) {
                setCampaigns(r.data.campaigns);
                setStats(r.data.stats);
            }
        });
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-4 gap-4">
                <div className="kpi-card"><span className="kpi-label">Investimento Total</span><span className="kpi-value">R$ {Number(stats.totalSpent).toLocaleString('pt-BR')}</span></div>
                <div className="kpi-card"><span className="kpi-label">Leads Gerados</span><span className="kpi-value">{stats.totalLeads}</span></div>
                <div className="kpi-card"><span className="kpi-label">CPL Médio</span><span className="kpi-value">R$ {Number(stats.avgCpl).toFixed(2)}</span></div>
                <div className="kpi-card"><span className="kpi-label">Conversões</span><span className="kpi-value text-success">{stats.totalConversions}</span></div>
            </div>
            <div className="space-y-3">
                {campaigns.map(c => (
                    <div key={c.id} className="card flex items-center gap-4">
                        <div className="p-2.5 rounded-lg bg-imperio-600/10"><Megaphone size={18} className="text-imperio-400" /></div>
                        <div className="flex-1"><p className="text-sm font-medium text-dark-200">{c.name}</p><p className="text-xs text-dark-500">{c.source}</p></div>
                        <div className="grid grid-cols-4 gap-6 text-center">
                            <div><p className="text-sm font-bold text-dark-200">R$ {Number(c.spent).toLocaleString('pt-BR')}</p><p className="text-[10px] text-dark-500">Gasto</p></div>
                            <div><p className="text-sm font-bold text-dark-200">{c.leadsGenerated}</p><p className="text-[10px] text-dark-500">Leads</p></div>
                            <div><p className="text-sm font-bold text-dark-200">R$ {Number(c.cpl).toFixed(0)}</p><p className="text-[10px] text-dark-500">CPL</p></div>
                            <div><p className="text-sm font-bold text-success">{(Number(c.roi) || 0)}%</p><p className="text-[10px] text-dark-500">ROI</p></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
