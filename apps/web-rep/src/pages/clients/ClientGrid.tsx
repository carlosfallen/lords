// ============================================================
// Client Grid -> CRM Interno (Gestão Império Norte)
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Filter, Download, Plus, ChevronRight, TrendingUp, TrendingDown,
    Building2, Users, Briefcase, DollarSign, Calendar, CheckCircle, Clock
} from 'lucide-react';

const MOCK_VENDEDORES = [
    { id: 'v1', name: 'João Silva', leads: 45, diagsSold: 12, conversionRate: 26, projectsClosed: 4, totalGenerated: 120000, commissionExpected: 18000, commissionPaid: 9000, commissionPending: 9000 },
    { id: 'v2', name: 'Maria Souza', leads: 38, diagsSold: 15, conversionRate: 39, projectsClosed: 6, totalGenerated: 180000, commissionExpected: 27000, commissionPaid: 15000, commissionPending: 12000 },
];

const MOCK_LEADS_GERAL = [
    { id: '1', company: 'Padaria Central', vendor: 'João Silva', status: 'diag_sold', diagPaid: true, scheduledDate: '2024-04-10 14:00', projectValue: 0, commission: 0 },
    { id: '2', company: 'Clínica Sorriso', vendor: 'Maria Souza', status: 'project_closed', diagPaid: true, scheduledDate: 'Realizado', projectValue: 30000, commission: 4500 },
    { id: '3', company: 'Oficina do Zé', vendor: 'João Silva', status: 'new_lead', diagPaid: false, scheduledDate: '-', projectValue: 0, commission: 0 },
    { id: '4', company: 'Supermercado Vida', vendor: 'Maria Souza', status: 'diag_offered', diagPaid: false, scheduledDate: '-', projectValue: 0, commission: 0 },
];

const MOCK_ATENDIMENTO = [
    { id: '1', company: 'Padaria Central', vendor: 'João Silva', paymentConfirmed: true, scheduledDate: '2024-04-10 14:00', responsible: 'Atendimento A', obs: 'Prioridade alta' },
];

const MOCK_COMISSOES = [
    { id: 't1', client: 'Clínica Sorriso', vendor: 'Maria Souza', projectValue: 30000, percentage: 15, total: 4500, paid: 2250, pending: 2250, status: 'aguardando_3_parcela' },
];

export default function ClientGrid() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [search, setSearch] = useState('');
    const [vendorFilter, setVendorFilter] = useState('');

    const tabs = [
        { id: 'dashboard', label: 'Dashboard Geral', icon: Building2 },
        { id: 'vendedores', label: 'Desempenho (Vendedores)', icon: Users },
        { id: 'leads', label: 'Todos os Leads', icon: Search },
        { id: 'atendimento', label: 'Atendimento & Diag.', icon: Calendar },
        { id: 'comissoes', label: 'Financeiro (Comissões)', icon: DollarSign },
    ];

    const stats = [
        { label: 'Total de Leads', value: '83', color: 'text-dark-200' },
        { label: 'Diags. Fechados', value: '27', color: 'text-info' },
        { label: 'Diags. Pagos', value: '25', color: 'text-success' },
        { label: 'Diags. Agendados', value: '18', color: 'text-warning' },
        { label: 'Projetos Fechados', value: '10', color: 'text-imperio-400' },
        { label: 'Valor Vendido', value: 'R$ 300.000', color: 'text-white' },
        { label: 'Comissão Gerada', value: 'R$ 45.000', color: 'text-warning' },
        { label: 'Comissão Pendente', value: 'R$ 21.000', color: 'text-danger' },
    ];

    const getStatusBadge = (status: string) => {
        const map: Record<string, string> = {
            'new_lead': 'Novo Lead',
            'contacted': 'Contatado',
            'negotiating': 'Em Negociação',
            'diag_offered': 'Diag. Ofertado',
            'diag_sold': 'Diag. Fechado',
            'project_closed': 'Projeto Fechado',
            'lost': 'Perdido',
            'aguardando_entrada': 'Aguard. Entrada',
            'aguardando_3_parcela': 'Aguard. 3ª Parc.',
            'quitada': 'Quitada'
        };
        const colorMap: Record<string, string> = {
            'new_lead': 'badge-neutral bg-dark-800',
            'diag_sold': 'badge-info',
            'project_closed': 'badge-success',
            'lost': 'badge-danger',
            'aguardando_entrada': 'badge-warning',
            'aguardando_3_parcela': 'badge-info',
            'quitada': 'badge-success'
        };
        return <span className={`badge ${colorMap[status] || 'badge-neutral bg-dark-800'}`}>{map[status] || status}</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-800 pb-4">
                <div>
                    <h1 className="text-xl font-bold text-white">Gestão Central (Império Norte)</h1>
                    <p className="text-sm text-dark-400">Controle completo da operação de vendas, diagnósticos e financeiro.</p>
                </div>
                <div className="flex gap-2 bg-dark-800 p-1 rounded-lg overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === tab.id ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-dark-200'
                                }`}
                        >
                            <tab.icon size={14} className={activeTab === tab.id ? 'text-imperio-400' : ''} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Tabs */}
            <div className="mt-4">

                {/* 1. DASHBOARD GERAL */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {stats.map((s, i) => (
                                <div key={i} className="card text-center p-4">
                                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                    <p className="text-xs text-dark-400 mt-1">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. VENDEDORES (DESEMPENHO) */}
                {activeTab === 'vendedores' && (
                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-semibold text-dark-200">Desempenho da Equipe Comercial</h3>
                        </div>
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Vendedor</th>
                                        <th>Leads (Mês)</th>
                                        <th>Diags. Vend.</th>
                                        <th>Conversão (%)</th>
                                        <th>Proj. Fechados</th>
                                        <th>Valor Gerado</th>
                                        <th>Comis. Total</th>
                                        <th>Comis. Paga</th>
                                        <th>Pendência</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_VENDEDORES.map(v => (
                                        <tr key={v.id}>
                                            <td className="font-medium text-dark-200">{v.name}</td>
                                            <td className="text-dark-300">{v.leads}</td>
                                            <td className="text-info font-medium">{v.diagsSold}</td>
                                            <td className="text-success">{v.conversionRate}%</td>
                                            <td className="text-imperio-400 font-bold">{v.projectsClosed}</td>
                                            <td className="font-medium text-white">R$ {v.totalGenerated.toLocaleString('pt-BR')}</td>
                                            <td className="text-warning">R$ {v.commissionExpected.toLocaleString('pt-BR')}</td>
                                            <td className="text-success">R$ {v.commissionPaid.toLocaleString('pt-BR')}</td>
                                            <td className="text-danger">R$ {v.commissionPending.toLocaleString('pt-BR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. TODOS OS LEADS */}
                {activeTab === 'leads' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-dark-800 rounded-lg px-3 py-2 flex-1 max-w-md">
                                <Search size={14} className="text-dark-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar lead ou empresa..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="bg-transparent text-sm text-dark-200 placeholder:text-dark-500 outline-none w-full"
                                />
                            </div>
                            <select
                                value={vendorFilter}
                                onChange={e => setVendorFilter(e.target.value)}
                                className="input w-48"
                            >
                                <option value="">Todos os Vendedores</option>
                                <option value="João Silva">João Silva</option>
                                <option value="Maria Souza">Maria Souza</option>
                            </select>
                            <button className="btn-secondary btn-sm"><Download size={14} /> Exportar</button>
                        </div>

                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Empresa</th>
                                        <th>Vendedor Resp.</th>
                                        <th>Status Atual</th>
                                        <th>Diag. Pago?</th>
                                        <th>Agendamento</th>
                                        <th>Valor Projeto</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_LEADS_GERAL.filter(l => (vendorFilter ? l.vendor === vendorFilter : true) && l.company.toLowerCase().includes(search.toLowerCase())).map(lead => (
                                        <tr key={lead.id} className="cursor-pointer hover:bg-dark-800/50" onClick={() => navigate(`/clients/${lead.id}`)}>
                                            <td className="font-medium text-dark-200">{lead.company}</td>
                                            <td className="text-dark-300">{lead.vendor}</td>
                                            <td>{getStatusBadge(lead.status)}</td>
                                            <td>
                                                {lead.diagPaid ? <CheckCircle size={16} className="text-success" /> : <Clock size={16} className="text-dark-500" />}
                                            </td>
                                            <td className="text-dark-300 text-sm">{lead.scheduledDate}</td>
                                            <td className="font-medium text-white">R$ {lead.projectValue.toLocaleString('pt-BR')}</td>
                                            <td><button className="btn-ghost btn-xs"><ChevronRight size={14} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 4. ATENDIMENTO E DIAGNÓSTICO */}
                {activeTab === 'atendimento' && (
                    <div className="space-y-4">
                        <div className="bg-dark-850 p-4 rounded-xl border border-dark-700 flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-dark-200">Fila de Diagnósticos</h3>
                                <p className="text-xs text-dark-400">Verifique pagamentos e agende reuniões para a equipe de atendimento.</p>
                            </div>
                        </div>

                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Empresa (Lead)</th>
                                        <th>Vendedor Responsável</th>
                                        <th>Pgto. Confirmado?</th>
                                        <th>Data Agendada</th>
                                        <th>Atendente Interno</th>
                                        <th>Ações Rápidas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_ATENDIMENTO.map(item => (
                                        <tr key={item.id}>
                                            <td className="font-medium text-dark-200">{item.company}</td>
                                            <td className="text-dark-300">{item.vendor}</td>
                                            <td>
                                                <span className={`badge ${item.paymentConfirmed ? 'badge-success' : 'badge-warning'}`}>
                                                    {item.paymentConfirmed ? 'Confirmado' : 'Aguardando'}
                                                </span>
                                            </td>
                                            <td className="text-dark-200">{item.scheduledDate || 'Não agendado'}</td>
                                            <td className="text-dark-300">{item.responsible || 'Não definido'}</td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button className="btn-secondary btn-xs">Agendar</button>
                                                    <button className="btn-primary btn-xs" onClick={() => navigate(`/clients/${item.id}`)}>Ver Lead</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 5. FINANCEIRO E COMISSÕES */}
                {activeTab === 'comissoes' && (
                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-semibold text-dark-200">Contas a Pagar (Comissões)</h3>
                        </div>
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Vendedor</th>
                                        <th>Cliente / Projeto</th>
                                        <th>Valor Projeto</th>
                                        <th>Comissão Total (15%)</th>
                                        <th>Valor Pago (1ª Parc)</th>
                                        <th>Valor Pendente (3ª Parc)</th>
                                        <th>Status do Pgto</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_COMISSOES.map(c => (
                                        <tr key={c.id}>
                                            <td className="font-medium text-imperio-400">{c.vendor}</td>
                                            <td className="text-dark-200">{c.client}</td>
                                            <td className="text-dark-300">R$ {c.projectValue.toLocaleString('pt-BR')}</td>
                                            <td className="font-medium text-white">R$ {c.total.toLocaleString('pt-BR')}</td>
                                            <td className="text-success">R$ {c.paid.toLocaleString('pt-BR')}</td>
                                            <td className="text-warning">R$ {c.pending.toLocaleString('pt-BR')}</td>
                                            <td>{getStatusBadge(c.status)}</td>
                                            <td>
                                                <button className="btn-secondary btn-xs whitespace-nowrap">Baixar Pgto</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
