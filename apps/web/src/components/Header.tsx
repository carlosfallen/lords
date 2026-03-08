// ============================================================
// Header — Contextual Header with search, user menu
// ============================================================
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Search, Bell, Zap, LogOut, User } from 'lucide-react';
import { useState } from 'react';

const pageTitles: Record<string, string> = {
    '/': 'Centro de Comando',
    '/clients': 'Controle de Leads',
    '/pipeline': 'Pipeline de Vendas',
    '/whatsapp': 'Central WhatsApp',
    '/finance': 'Financeiro',
    '/tickets': 'Suporte & Tickets',
    '/users': 'Usuários & Permissões',
    '/team': 'Representantes',
    '/mentorship': 'Mentoria & Alavancagem',
    '/campaigns': 'Campanhas',
    '/systems': 'Fábrica de Sistemas',
    '/ideas': 'Banco de Ideias',
    '/wiki': 'Base de Conhecimento',
    '/reports': 'Relatórios & BI',
    '/onboarding': 'Onboarding',
    '/documents': 'Documentos',
    '/settings': 'Configurações',
};

export default function Header() {
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const [showUserMenu, setShowUserMenu] = useState(false);

    const pathBase = '/' + (location.pathname.split('/')[1] || '');
    const title = pageTitles[pathBase] || 'Império Lord';

    return (
        <header className="h-14 border-b border-dark-800 bg-dark-900/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
                <h2 className="text-base font-semibold text-dark-100">{title}</h2>
                <div className="hidden md:flex items-center">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 border border-success/20">
                        <span className="status-dot online" />
                        <span className="text-xs text-success font-medium">Sistema Online</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="hidden lg:flex items-center gap-2 bg-dark-800 rounded-lg px-3 py-1.5 w-64">
                    <Search size={14} className="text-dark-500" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="bg-transparent text-sm text-dark-200 placeholder:text-dark-500 outline-none w-full"
                    />
                    <kbd className="text-[10px] text-dark-500 bg-dark-700 px-1.5 py-0.5 rounded">⌘K</kbd>
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-dark-800 transition">
                    <Bell size={18} className="text-dark-400" />
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-[9px] font-bold text-white flex items-center justify-center">
                        3
                    </span>
                </button>

                {/* Bot Status */}
                <button className="p-2 rounded-lg hover:bg-dark-800 transition">
                    <Zap size={18} className="text-success" />
                </button>

                {/* User Menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-dark-800 transition"
                    >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-imperio-500 to-imperio-700 flex items-center justify-center">
                            <User size={14} className="text-white" />
                        </div>
                        {user && (
                            <div className="hidden md:block text-left">
                                <p className="text-xs font-medium text-dark-200 leading-none">{user.name}</p>
                                <p className="text-[10px] text-dark-500 capitalize">{user.role.replace('_', ' ')}</p>
                            </div>
                        )}
                    </button>

                    {showUserMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl py-1 z-50 animate-fade-in">
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-300 hover:bg-dark-700 hover:text-danger transition"
                            >
                                <LogOut size={14} /> Sair
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
