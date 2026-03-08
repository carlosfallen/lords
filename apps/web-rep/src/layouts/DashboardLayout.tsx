// ============================================================
// Dashboard Layout — Sidebar + Header + Content
// ============================================================
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { NavLink } from 'react-router-dom';
import { Target, UserPlus, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function DashboardLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 768);

    const { logout } = useAuthStore();

    return (
        <div className="flex h-screen overflow-hidden bg-dark-950">
            {/* Mobile Overlay */}
            {!sidebarCollapsed && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                    onClick={() => setSidebarCollapsed(true)}
                />
            )}

            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header onMenuClick={() => setSidebarCollapsed(false)} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
                    <Outlet />
                </main>

                {/* Mobile Bottom Navigation */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-dark-900/80 backdrop-blur-xl border-t border-dark-800 flex items-center justify-around px-4 pb-safe z-30">
                    <NavLink
                        to="/"
                        className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-imperio-400' : 'text-dark-500'}`}
                    >
                        <Target size={20} />
                        <span className="text-[10px] font-medium uppercase tracking-tighter">Dashboard</span>
                    </NavLink>

                    <NavLink
                        to="/leads/create"
                        className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-imperio-400' : 'text-dark-500'}`}
                    >
                        <div className="w-10 h-10 -mt-8 rounded-full bg-gradient-to-br from-imperio-500 to-imperio-700 flex items-center justify-center shadow-lg shadow-imperio-600/40 border-4 border-dark-950">
                            <UserPlus size={20} className="text-white" />
                        </div>
                        <span className="text-[10px] font-medium uppercase tracking-tighter">Novo Lead</span>
                    </NavLink>

                    <button
                        onClick={logout}
                        className="flex flex-col items-center gap-1 text-danger/80"
                    >
                        <LogOut size={20} />
                        <span className="text-[10px] font-medium uppercase tracking-tighter">Sair</span>
                    </button>
                </nav>
            </div>
        </div>
    );
}
