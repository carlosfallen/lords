// ============================================================
// Sidebar — Module Navigation with Expandable Sub-menus
// ============================================================
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, GitBranch, MessageSquare, DollarSign,
    HeadphonesIcon, UserCog, Target, Megaphone, PackageOpen,
    Lightbulb, BookOpen, BarChart3, UserPlus, FolderOpen, Settings,
    ChevronLeft, ChevronRight, ChevronDown, Crown, Briefcase, ShieldAlert,
    Wallet, Receipt, TrendingUp, Zap, KanbanSquare, ListChecks,
    CalendarRange, Timer, Milestone, Cog
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

interface NavItem {
    to: string;
    icon: any;
    label: string;
    children?: { to: string; icon: any; label: string }[];
}

interface NavGroupDef {
    label: string;
    items: NavItem[];
}

function ExpandableItem({ item, collapsed, isActive }: { item: NavItem; collapsed: boolean; isActive: boolean }) {
    const location = useLocation();
    const [expanded, setExpanded] = useState(() =>
        location.pathname.startsWith(item.to)
    );

    const anyChildActive = item.children?.some(
        child => location.pathname === child.to || location.pathname.startsWith(child.to + '/')
    );

    const parentActive = isActive || anyChildActive;

    if (!item.children || collapsed) {
        return (
            <NavLink
                to={item.to}
                className={`sidebar-link ${parentActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? item.label : undefined}
            >
                <item.icon size={18} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
            </NavLink>
        );
    }

    return (
        <div>
            <button
                onClick={() => setExpanded(e => !e)}
                className={`sidebar-link w-full ${parentActive ? 'active' : ''}`}
            >
                <item.icon size={18} className="shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                    size={14}
                    className={`shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                />
            </button>
            {expanded && (
                <div className="ml-4 border-l border-dark-800 pl-1 space-y-0.5">
                    {item.children.map(child => {
                        const childActive = location.pathname === child.to ||
                            location.pathname.startsWith(child.to + '/');
                        return (
                            <NavLink
                                key={child.to}
                                to={child.to}
                                className={`sidebar-link text-xs py-1.5 ${childActive ? 'active' : ''}`}
                            >
                                <child.icon size={14} className="shrink-0" />
                                <span>{child.label}</span>
                            </NavLink>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const location = useLocation();
    const { user } = useAuthStore();
    const isClient = user?.role === 'client_owner' || user?.role === 'client_staff';

    const navGroups: NavGroupDef[] = isClient ? [
        {
            label: 'MEU NEGÓCIO',
            items: [
                { to: '/', icon: LayoutDashboard, label: 'Resumo' },
                { to: '/whatsapp', icon: MessageSquare, label: 'Atendimento' },
                { to: '/mentorship', icon: Target, label: 'Missões Pendentes' },
                { to: '/tickets', icon: HeadphonesIcon, label: 'Suporte Técnico' },
            ],
        },
        {
            label: 'CONTRATO',
            items: [
                { to: '/finance', icon: DollarSign, label: 'Faturas' },
                { to: '/documents', icon: FolderOpen, label: 'Documentos' },
            ],
        }
    ] : [
        {
            label: 'COMANDO',
            items: [
                { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
                { to: '/clients', icon: Users, label: 'Controle de Leads' },
                { to: '/pipeline', icon: GitBranch, label: 'Pipeline' },
                { to: '/prospector', icon: Target, label: 'Prospecção' },
                { to: '/clients/city-presentations', icon: ShieldAlert, label: 'Apresentações' },
            ],
        },
        {
            label: 'GESTÃO',
            items: [
                {
                    to: '/finance', icon: DollarSign, label: 'Financeiro',
                    children: [
                        { to: '/finance', icon: LayoutDashboard, label: 'Dashboard' },
                        { to: '/finance/caixa', icon: Wallet, label: 'Caixa' },
                        { to: '/finance/recebiveis', icon: Receipt, label: 'Recebíveis' },
                        { to: '/finance/pipeline', icon: TrendingUp, label: 'Pipeline Vendas' },
                        { to: '/finance/missoes', icon: Zap, label: 'Missões' },
                    ]
                },
                { to: '/tickets', icon: HeadphonesIcon, label: 'Suporte' },
                { to: '/users', icon: UserCog, label: 'Usuários' },
                { to: '/mentorship', icon: Target, label: 'Mentoria' },
                {
                    to: '/monday', icon: Briefcase, label: 'Projetos',
                    children: [
                        { to: '/monday', icon: LayoutDashboard, label: 'Dashboard' },
                        { to: '/monday/projects', icon: FolderOpen, label: 'Projetos' },
                        { to: '/monday/kanban', icon: KanbanSquare, label: 'Kanban' },
                        { to: '/monday/tasks', icon: ListChecks, label: 'Tarefas' },
                        { to: '/monday/timeline', icon: CalendarRange, label: 'Timeline' },
                        { to: '/monday/tracker', icon: Timer, label: 'Time Tracker' },
                        { to: '/monday/milestones', icon: Milestone, label: 'Milestones' },
                        { to: '/monday/automations', icon: Zap, label: 'Automações' },
                    ]
                },
            ],
        },
        {
            label: 'ESTRATÉGIA',
            items: [
                { to: '/campaigns', icon: Megaphone, label: 'Campanhas' },
                { to: '/systems', icon: PackageOpen, label: 'Sistemas' },
                { to: '/ideas', icon: Lightbulb, label: 'Ideias' },
                { to: '/wiki', icon: BookOpen, label: 'Wiki' },
            ],
        },
        {
            label: 'ANÁLISE',
            items: [
                { to: '/reports', icon: BarChart3, label: 'Relatórios' },
                { to: '/onboarding', icon: UserPlus, label: 'Onboarding' },
                { to: '/documents', icon: FolderOpen, label: 'Documentos' },
            ],
        },

    ];

    return (
        <aside
            className={`
        flex flex-col h-screen bg-dark-900 border-r border-dark-800 transition-all duration-300
        ${collapsed ? 'w-[68px]' : 'w-[240px]'}
      `}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 h-16 border-b border-dark-800 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-imperio-500 to-imperio-700 flex items-center justify-center shrink-0">
                    <Crown size={18} className="text-white" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <h1 className="text-sm font-bold text-white tracking-tight leading-none">IMPÉRIO LORD</h1>
                        <span className="text-[10px] text-dark-500 font-medium uppercase tracking-widest">Master CRM</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
                {navGroups.map((group) => (
                    <div key={group.label}>
                        {!collapsed && (
                            <p className="px-3 mb-1.5 text-[10px] font-bold text-dark-600 uppercase tracking-[0.15em]">
                                {group.label}
                            </p>
                        )}
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = item.to === '/'
                                    ? location.pathname === '/'
                                    : location.pathname === item.to || (
                                        !item.children && location.pathname.startsWith(item.to)
                                    );
                                return (
                                    <ExpandableItem
                                        key={item.to + item.label}
                                        item={item}
                                        collapsed={collapsed}
                                        isActive={isActive}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bottom */}
            <div className="border-t border-dark-800 p-2 space-y-1">
                <NavLink
                    to="/settings"
                    className={`sidebar-link ${location.pathname === '/settings' ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
                >
                    <Settings size={18} className="shrink-0" />
                    {!collapsed && <span>Configurações</span>}
                </NavLink>
                <button
                    onClick={onToggle}
                    className="sidebar-link w-full justify-center"
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>
        </aside>
    );
}
