// ============================================================
// Client Portal Layout
// ============================================================
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogOut, Rocket, HeadphonesIcon } from 'lucide-react';
import { MissionLockOverlay } from '../components/portal/MissionLockOverlay';

export default function ClientPortalLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-dark-900 flex flex-col font-sans text-dark-100">
            <MissionLockOverlay />
            {/* Minimal Header */}
            <header className="h-16 border-b border-dark-800 bg-dark-900/50 backdrop-blur sticky top-0 z-40 flex items-center justify-between px-6">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/portal')}>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-imperio-500 to-imperio-600 flex items-center justify-center shadow-lg shadow-imperio-500/20">
                        <span className="text-white font-bold text-lg leading-none mt-[-2px]">Í</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-dark-300 bg-clip-text text-transparent">
                        Área do Cliente
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
                        <button onClick={() => navigate('/portal')} className="text-dark-300 hover:text-white transition">Início</button>
                        <button onClick={() => navigate('/portal/onboarding')} className="flex items-center gap-1.5 text-imperio-400 hover:text-imperio-300 transition">
                            <Rocket size={14} /> Onboarding
                        </button>
                    </nav>

                    <div className="flex items-center gap-3 pl-6 border-l border-dark-700">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-white leading-tight">{user?.name}</p>
                            <p className="text-[10px] text-dark-400 uppercase tracking-wider">Acesso Cliente</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg text-dark-400 hover:bg-dark-800 hover:text-danger transition"
                            title="Sair"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Portal Content Area */}
            <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8">
                <Outlet />
            </main>
        </div>
    );
}
