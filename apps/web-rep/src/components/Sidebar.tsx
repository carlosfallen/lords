import { NavLink } from 'react-router-dom';
import { Target, Users, Calculator, DollarSign, UserCog, LogOut, UserPlus } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const { logout, user } = useAuthStore();

    const sections = [
        {
            label: 'MEU PAINEL',
            items: [
                { to: '/', icon: Target, label: 'Dashboard Resumo' },
                { to: '/leads/create', icon: UserPlus, label: 'Novo Lead' },
            ],
        }
    ];

    return (
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-dark-800 bg-dark-950 flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${collapsed ? '-translate-x-full' : 'translate-x-0'} md:flex shrink-0`}>
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-dark-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-imperio-500 to-imperio-700 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">i</span>
                    </div>
                    <span className="text-lg font-bold text-white tracking-tight">Império<span className="text-imperio-500">Norte</span> Base</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                {sections.map((section, idx) => (
                    <div key={idx}>
                        <p className="px-3 text-xs font-semibold text-dark-500 mb-2 tracking-wider">
                            {section.label}
                        </p>
                        <div className="space-y-1">
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                            ? 'bg-imperio-500/10 text-imperio-400'
                                            : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/50'
                                        }`
                                    }
                                >
                                    <item.icon size={18} />
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer / User */}
            <div className="p-4 border-t border-dark-800">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-dark-900 border border-dark-800 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-dark-700 to-dark-800 flex items-center justify-center">
                        <UserCog size={14} className="text-dark-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.name || 'Representante'}</p>
                        <p className="text-xs text-dark-500 truncate">{user?.role || 'Autônomo'}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
                >
                    <LogOut size={18} />
                    Sair
                </button>
            </div>
        </aside>
    );
}
