// ============================================================
// Login Page
// ============================================================
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, apiFetch } from '../../stores/authStore';
import { Crown, Zap, ArrowRight, Lock } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('admin@imperiolord.com');
    const [password, setPassword] = useState('imperio123');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();
    const location = useLocation();

    // Default redirect to / if no previous location is found in state
    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (needsPasswordChange) {
            if (newPassword !== confirmPassword) {
                setError('As senhas não coincidem');
                setLoading(false);
                return;
            }
            if (newPassword.length < 6) {
                setError('A nova senha deve ter pelo menos 6 caracteres');
                setLoading(false);
                return;
            }

            try {
                // Since user is already logged in at this point, we use apiFetch which includes the JWT
                const res = await apiFetch('/api/auth/change-password', {
                    method: 'POST',
                    body: JSON.stringify({ newPassword })
                });

                if (res.success) {
                    navigate(from, { replace: true });
                } else {
                    setError(res.error || 'Erro ao alterar senha');
                }
            } catch (err) {
                setError('Erro de conexão ao alterar senha');
            }
        } else {
            const user = await login(email, password);
            if (user) {
                if (user.mustChangePassword) {
                    setNeedsPasswordChange(true);
                } else {
                    navigate(from, { replace: true });
                }
            } else {
                setError('Credenciais inválidas');
            }
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-imperio-600/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-imperio-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-imperio-500 to-imperio-700 shadow-lg shadow-imperio-600/25 mb-4">
                        <Crown size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">IMPÉRIO LORD</h1>
                    <p className="text-dark-400 text-sm mt-1">Master CRM — Centro de Comando Total</p>
                </div>

                {/* Login Card */}
                <div className="card-glass p-8 animate-slide-in">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!needsPasswordChange ? (
                            <>
                                <div>
                                    <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1.5 block">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input"
                                        placeholder="seu@email.com"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1.5 block">Senha</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="animate-fade-in">
                                <div className="mb-6 text-center">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mb-3">
                                        <Lock size={24} />
                                    </div>
                                    <h2 className="text-lg font-bold text-white mb-2">Primeiro Acesso</h2>
                                    <p className="text-sm text-dark-400">Por segurança, defina uma nova senha para sua conta antes de continuar.</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1.5 block">Nova Senha</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="input"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1.5 block">Confirmar Senha</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="input"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-2.5 text-base"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {needsPasswordChange ? 'Salvar e Entrar' : 'Entrar'} <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Demo Users */}
                    {!needsPasswordChange && (
                        <div className="mt-6 pt-5 border-t border-dark-700">
                            <p className="text-xs text-dark-500 mb-3 text-center">Acesso rápido (demo)</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { email: 'admin@imperiolord.com', label: 'Admin', icon: '👑' },
                                    { email: 'mentor@imperiolord.com', label: 'Mentor', icon: '🎯' },
                                    { email: 'support@imperiolord.com', label: 'Suporte', icon: '🎧' },
                                    { email: 'finance@imperiolord.com', label: 'Financeiro', icon: '💰' },
                                ].map((u) => (
                                    <button
                                        key={u.email}
                                        type="button"
                                        onClick={() => { setEmail(u.email); setPassword('imperio123'); }}
                                        className="btn-ghost text-xs py-1.5"
                                    >
                                        <span>{u.icon}</span> {u.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-dark-600 mt-6 flex items-center justify-center gap-1">
                    <Zap size={12} /> Powered by Bun + React + PostgreSQL
                </p>
            </div>
        </div>
    );
}
