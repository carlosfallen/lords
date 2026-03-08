// ============================================================
// Team Page -> CRM do Vendedor Externo
// ============================================================
import { useState, useEffect } from 'react';
import {
    Users, Target, DollarSign, Calculator, Search, Plus,
    LayoutGrid, List, CheckCircle, Clock, AlertTriangle, Briefcase
} from 'lucide-react';

const FUNNEL_STEPS = [
    { id: 'new_lead', label: 'Novo Lead', color: 'bg-info' },
    { id: 'contacted', label: 'Contato Iniciado', color: 'bg-warning' },
    { id: 'negotiating', label: 'Em Negociação', color: 'bg-imperio-500' },
    { id: 'diag_offered', label: 'Diagnóstico Ofertado', color: 'bg-purple-500' },
    { id: 'diag_sold', label: 'Diagnóstico Fechado', color: 'bg-success' },
    { id: 'lost', label: 'Perdido', color: 'bg-danger' }
];

const MOCK_LEADS = [
    { id: '1', company: 'Padaria Central', contact: 'João', phone: '11999999999', segment: 'Alimentação', createdAt: '2024-03-20', lastContact: '2024-03-25', status: 'new_lead', obs: 'Interessados em automação de delivery' },
    { id: '2', company: 'Clínica Sorriso', contact: 'Dra. Maria', phone: '11988888888', segment: 'Saúde', createdAt: '2024-03-18', lastContact: '2024-03-24', status: 'negotiating', obs: 'Aguardando proposta do diagnóstico' },
    { id: '3', company: 'Oficina do Zé', contact: 'José', phone: '11977777777', segment: 'Serviços', createdAt: '2024-03-15', lastContact: '2024-03-20', status: 'diag_sold', obs: 'Diagnóstico fechado e pago. Aguardando agendamento.' },
];

const MOCK_COMMISSIONS = [
    { id: '1', client: 'Restaurante Sabor', projectValue: 20000, totalCommission: 3000, paid: 1500, pending: 1500, status: 'aguardando_3_parcela', forecast: '2024-05-10' },
    { id: '2', client: 'Salão Beleza', projectValue: 12000, totalCommission: 1800, paid: 1800, pending: 0, status: 'quitada', forecast: '-' },
    { id: '3', client: 'Petshop CãoFeliz', projectValue: 30000, totalCommission: 4500, paid: 0, pending: 4500, status: 'aguardando_entrada', forecast: '2024-04-05' },
];

export default function Team() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
    const [leads, setLeads] = useState(MOCK_LEADS);
    const [search, setSearch] = useState('');

    // Simulator State
    const [simProjectValue, setSimProjectValue] = useState(20000);
    const [simEntryValue, setSimEntryValue] = useState(5000);
    const [simInstallments, setSimInstallments] = useState(6);

    // Simulator Calculations
    const simRemaining = Math.max(0, simProjectValue - simEntryValue);
    const simInstallmentValue = simInstallments > 0 ? simRemaining / simInstallments : 0;
    const simTotalCommission = simProjectValue * 0.15;
    const simEntryCommission = simTotalCommission * 0.5;
    const simThirdInstallmentCommission = simTotalCommission * 0.5;

    const tabs = [
        { id: 'dashboard', label: 'Resumo', icon: Target },
        { id: 'crm', label: 'Meu CRM', icon: Users },
        { id: 'simulator', label: 'Simulador', icon: Calculator },
        { id: 'commissions', label: 'Minhas Comissões', icon: DollarSign },
    ];

    const stats = [
        { label: 'Leads no Mês', value: '24', color: 'text-dark-200' },
        { label: 'Diags. Vendidos', value: '8', color: 'text-info' },
        { label: 'Diags. Pagos', value: '5', color: 'text-success' },
        { label: 'Projetos Fechados', value: '3', color: 'text-imperio-400' },
        { label: 'Total Vendido', value: 'R$ 62.000', color: 'text-white' },
        { label: 'Comissão Prevista', value: 'R$ 9.300', color: 'text-warning' },
        { label: 'Comissão Paga', value: 'R$ 3.300', color: 'text-success' },
        { label: 'Comissão Pendente', value: 'R$ 6.000', color: 'text-danger' },
    ];

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('leadId', leadId);
    };

    const handleDrop = (e: React.DragEvent, statusId: string) => {
        const leadId = e.dataTransfer.getData('leadId');
        setLeads(leads.map(l => l.id === leadId ? { ...l, status: statusId } : l));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-800 pb-4">
                <div>
                    <h1 className="text-xl font-bold text-white">Portal do Representante</h1>
                    <p className="text-sm text-dark-400">Gerencie suas prospecções, diagnósticos e comissões.</p>
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

            {/* Content area */}
            <div className="mt-4">

                {/* 1. DASHBOARD */}
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

                {/* 2. MEU CRM */}
                {activeTab === 'crm' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 bg-dark-800 rounded-lg px-3 py-2 w-full max-w-sm">
                                <Search size={14} className="text-dark-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar lead, empresa ou contato..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="bg-transparent text-sm text-dark-200 placeholder:text-dark-500 outline-none w-full"
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="bg-dark-800 rounded-lg p-1 flex gap-1">
                                    <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded ${viewMode === 'kanban' ? 'bg-dark-700 text-white' : 'text-dark-500'}`}><LayoutGrid size={16} /></button>
                                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-dark-700 text-white' : 'text-dark-500'}`}><List size={16} /></button>
                                </div>
                                <button className="btn-primary btn-sm"><Plus size={14} /> Novo Lead</button>
                            </div>
                        </div>

                        {viewMode === 'list' ? (
                            <div className="table-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Empresa</th>
                                            <th>Contato</th>
                                            <th>Telefone</th>
                                            <th>Segmento</th>
                                            <th>Criado em</th>
                                            <th>Últ. Contato</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leads.filter(l => l.company.toLowerCase().includes(search.toLowerCase())).map(lead => (
                                            <tr key={lead.id} className="cursor-pointer hover:bg-dark-800/50">
                                                <td className="font-medium text-dark-200">{lead.company}</td>
                                                <td className="text-dark-300">{lead.contact}</td>
                                                <td className="text-dark-400">{lead.phone}</td>
                                                <td className="text-dark-400">{lead.segment}</td>
                                                <td className="text-dark-400">{lead.createdAt}</td>
                                                <td className="text-dark-400">{lead.lastContact}</td>
                                                <td>
                                                    <span className="badge badge-neutral bg-dark-800">
                                                        {FUNNEL_STEPS.find(s => s.id === lead.status)?.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
                                {FUNNEL_STEPS.map(step => (
                                    <div
                                        key={step.id}
                                        className="flex-shrink-0 w-72 bg-dark-900 rounded-xl border border-dark-800 flex flex-col"
                                        onDrop={(e) => handleDrop(e, step.id)}
                                        onDragOver={handleDragOver}
                                    >
                                        <div className="p-3 border-b border-dark-800 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${step.color}`}></span>
                                                <h3 className="text-sm font-semibold text-dark-200">{step.label}</h3>
                                            </div>
                                            <span className="text-xs text-dark-500 font-medium">
                                                {leads.filter(l => l.status === step.id).length}
                                            </span>
                                        </div>
                                        <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                                            {leads.filter(l => l.status === step.id).map(lead => (
                                                <div
                                                    key={lead.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, lead.id)}
                                                    className="bg-dark-800 p-3 rounded-lg border border-dark-700 cursor-grab active:cursor-grabbing hover:border-imperio-500/50 transition"
                                                >
                                                    <p className="text-sm font-bold text-dark-200">{lead.company}</p>
                                                    <p className="text-xs text-dark-400 mb-2">{lead.contact} • {lead.segment}</p>
                                                    <p className="text-[11px] text-dark-500 bg-dark-900 p-1.5 rounded line-clamp-2">{lead.obs}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. SIMULADOR */}
                {activeTab === 'simulator' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="card">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Calculator size={18} className="text-imperio-400" />
                                Simulador Comercial
                            </h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-dark-400 mb-1">Valor do Projeto (R$)</label>
                                        <input
                                            type="number"
                                            value={simProjectValue || ''}
                                            onChange={e => setSimProjectValue(Number(e.target.value))}
                                            className="input w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-dark-400 mb-1">Valor de Entrada (R$)</label>
                                        <input
                                            type="number"
                                            value={simEntryValue || ''}
                                            onChange={e => setSimEntryValue(Number(e.target.value))}
                                            className="input w-full"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-dark-400 mb-1">Saldo Restante (R$)</label>
                                        <input type="text" value={simRemaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} disabled className="input w-full opacity-70 bg-dark-900" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-dark-400 mb-1">Quantidade de Parcelas</label>
                                        <input
                                            type="number"
                                            value={simInstallments || ''}
                                            onChange={e => setSimInstallments(Number(e.target.value))}
                                            className="input w-full"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700 mt-6 space-y-3">
                                    <div className="flex justify-between items-center pb-3 border-b border-dark-700/50">
                                        <span className="text-sm text-dark-300">Valor das Parcelas ({simInstallments}x):</span>
                                        <span className="text-lg font-bold text-white">{simInstallmentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-dark-300 font-medium">Comissão Total Prevista (15%):</span>
                                        <span className="text-xl font-bold text-imperio-400">{simTotalCommission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="bg-dark-900 p-3 rounded-lg flex flex-col items-center justify-center border border-success/20">
                                            <span className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">50% na Entrada</span>
                                            <span className="text-sm font-bold text-success">{simEntryCommission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                        <div className="bg-dark-900 p-3 rounded-lg flex flex-col items-center justify-center border border-warning/20">
                                            <span className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">50% na 3ª Parcela</span>
                                            <span className="text-sm font-bold text-warning">{simThirdInstallmentCommission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. MINHAS COMISSÕES */}
                {activeTab === 'commissions' && (
                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
                                <DollarSign size={16} className="text-imperio-400" />
                                Histórico de Comissões
                            </h3>
                            <button className="btn-secondary btn-sm">Exportar</button>
                        </div>
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>Valor do Projeto</th>
                                        <th>Comissão Total</th>
                                        <th>Já Pago</th>
                                        <th>Pendente</th>
                                        <th>Previsão</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_COMMISSIONS.map(c => (
                                        <tr key={c.id}>
                                            <td className="font-medium text-dark-200">{c.client}</td>
                                            <td className="text-dark-300">R$ {c.projectValue.toLocaleString('pt-BR')}</td>
                                            <td className="font-medium text-imperio-400">R$ {c.totalCommission.toLocaleString('pt-BR')}</td>
                                            <td className="text-success">R$ {c.paid.toLocaleString('pt-BR')}</td>
                                            <td className="text-danger">R$ {c.pending.toLocaleString('pt-BR')}</td>
                                            <td className="text-dark-400">{c.forecast}</td>
                                            <td>
                                                <span className={`badge ${c.status === 'quitada' ? 'badge-success' :
                                                        c.status === 'aguardando_entrada' ? 'badge-warning' :
                                                            'badge-info'
                                                    }`}>
                                                    {c.status.replace(/_/g, ' ').toUpperCase()}
                                                </span>
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
