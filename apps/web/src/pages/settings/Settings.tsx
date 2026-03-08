// ============================================================
// Settings Page
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Settings as SettingsIcon, Shield, Bell, Database, Wifi, WifiOff,
    Loader2, QrCode, Unplug, PlugZap, RefreshCw, Smartphone, Activity
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { waApi } from '../BotProspect/services/api';
import { useSocket } from '../BotProspect/hooks/useSocket';
import { SocketEvent } from '../BotProspect/services/socket';
import { QRCodeDisplay } from '../BotProspect/components/ui/QRCodeDisplay';
import type { WhatsAppStatus } from '../BotProspect/types/index';
import Monitoring from './Monitoring';

export default function Settings() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'connection' | 'profile' | 'monitoring' | 'notifications'>('connection');

    // ── WhatsApp Connection State ───────────────────────────────
    const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
    const [qr, setQr] = useState<string | null>(null);
    const [waLoading, setWaLoading] = useState(false);
    const [qrLoading, setQrLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [waError, setWaError] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const refreshWaStatus = useCallback(async () => {
        setWaLoading(true);
        try {
            const s = await waApi.status();
            setWaStatus(s);
            if (s.connected) {
                setQr(null);
                setWaError(null);
                setConnecting(false);
                stopPolling();
            }
        } catch (err: any) {
            setWaError(err?.response?.data?.error || 'Erro ao verificar status');
        } finally {
            setWaLoading(false);
        }
    }, [stopPolling]);

    // Poll for QR code updates and connection status (like WhatsApp Web)
    const startQRPolling = useCallback(() => {
        stopPolling();
        setConnecting(true);

        pollRef.current = setInterval(async () => {
            try {
                // Check status first — if connected, stop polling
                const status = await waApi.status();
                if (status.connected) {
                    setWaStatus(status);
                    setQr(null);
                    setWaError(null);
                    setConnecting(false);
                    stopPolling();
                    return;
                }

                // Fetch latest QR code
                const data = await waApi.qrCode();
                if (data.value) {
                    setQr(data.value);
                    setWaError(null);
                }
            } catch {
                // Silently retry — QR might not be ready yet
            }
        }, 3000); // Poll every 3 seconds like WhatsApp Web
    }, [stopPolling]);

    // "Gerar QR Code" flow: reconnect → start polling
    const handleGenerateQR = useCallback(async () => {
        setQrLoading(true);
        setWaError(null);
        setQr(null);

        try {
            // Step 1: Tell gateway to start QR generation flow
            await waApi.reconnect();

            // Step 2: Wait a moment for gateway to generate first QR
            await new Promise(r => setTimeout(r, 1500));

            // Step 3: Fetch initial QR
            try {
                const data = await waApi.qrCode();
                if (data.value) {
                    setQr(data.value);
                }
            } catch {
                // QR might not be ready yet, polling will catch it
            }

            // Step 4: Start polling for QR updates and connection status
            startQRPolling();
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Erro ao iniciar conexão.';
            if (msg.includes('conectado')) {
                await refreshWaStatus();
            } else {
                setWaError(msg);
            }
        } finally {
            setQrLoading(false);
        }
    }, [refreshWaStatus, startQRPolling]);

    const handleDisconnect = useCallback(async () => {
        setActionLoading(true);
        stopPolling();
        setConnecting(false);
        try {
            await waApi.disconnect();
            setWaStatus(prev => prev ? { ...prev, connected: false } : null);
            setQr(null);
            setWaError(null);
        } catch (err: any) {
            setWaError(err?.response?.data?.error || 'Erro ao desconectar');
        } finally {
            setActionLoading(false);
        }
    }, [stopPolling]);

    // Initial load + periodic status check
    useEffect(() => {
        refreshWaStatus();
        const interval = setInterval(refreshWaStatus, 30000);
        return () => {
            clearInterval(interval);
            stopPolling();
        };
    }, [refreshWaStatus, stopPolling]);

    // WebSocket real-time updates
    useSocket(SocketEvent.WA_STATUS, (s: WhatsAppStatus) => {
        setWaStatus(s);
        if (s.connected) {
            setQr(null);
            setConnecting(false);
            stopPolling();
        }
    });

    useSocket(SocketEvent.WA_DISCONNECTED, () => {
        setWaStatus(prev => prev ? { ...prev, connected: false } : null);
    });

    // Listen for QR code via WebSocket
    useSocket(SocketEvent.WA_QR, (data: any) => {
        if (data?.value || data?.code) {
            setQr(data.value || data.code);
        }
    });

    const isConnected = waStatus?.connected;

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl">
            {/* ── Tabs Navigation ────────────────────────── */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-dark-900/50 border border-dark-800 w-fit">
                {[
                    { id: 'connection', label: 'Conexão', icon: <Wifi size={14} /> },
                    { id: 'profile', label: 'Perfil', icon: <Shield size={14} /> },
                    { id: 'notifications', label: 'Notificações', icon: <Bell size={14} /> },
                    { id: 'monitoring', label: 'Monitoramento', icon: <Activity size={14} /> },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id
                            ? 'bg-imperio-600 text-white shadow-lg shadow-imperio-600/20'
                            : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'connection' && (
                <div className="card">
                    <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
                        {isConnected
                            ? <Wifi size={14} className="text-green-400" />
                            : <WifiOff size={14} className="text-red-400" />
                        }
                        Conexão WhatsApp
                        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${isConnected
                            ? 'bg-green-950 text-green-400 border border-green-900'
                            : connecting
                                ? 'bg-yellow-950 text-yellow-400 border border-yellow-900'
                                : 'bg-red-950 text-red-400 border border-red-900'
                            }`}>
                            {isConnected ? 'Conectado' : connecting ? 'Aguardando scan...' : 'Offline'}
                        </span>
                    </h3>

                    <div className="space-y-4">
                        {/* Phone number */}
                        {isConnected && waStatus?.phoneNumber && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-dark-800/50">
                                <Smartphone size={14} className="text-imperio-400" />
                                <span className="text-sm text-dark-300 font-mono">{waStatus.phoneNumber}</span>
                            </div>
                        )}

                        {/* QR Code */}
                        {qr && !isConnected && (
                            <div className="flex flex-col items-center gap-3 py-4">
                                <QRCodeDisplay value={qr} size={260} />
                                <p className="text-xs text-dark-400">
                                    Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo
                                </p>
                                {connecting && (
                                    <div className="flex items-center gap-2 text-xs text-yellow-400">
                                        <Loader2 size={12} className="animate-spin" />
                                        Aguardando leitura do QR Code...
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Connecting but no QR yet */}
                        {connecting && !qr && !isConnected && (
                            <div className="flex flex-col items-center gap-2 py-6">
                                <Loader2 size={24} className="animate-spin text-imperio-400" />
                                <p className="text-xs text-dark-400">Gerando QR Code...</p>
                            </div>
                        )}

                        {/* Error */}
                        {waError && (
                            <p className="text-xs text-red-400 bg-red-950/30 px-3 py-2 rounded-lg border border-red-900/30">
                                {waError}
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                            {isConnected ? (
                                <button
                                    onClick={handleDisconnect}
                                    disabled={actionLoading}
                                    className="flex items-center gap-2 text-xs py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 bg-red-950/30 text-red-400 border border-red-900/30 hover:bg-red-950/50"
                                >
                                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                                    Desconectar
                                </button>
                            ) : (
                                <button
                                    onClick={handleGenerateQR}
                                    disabled={qrLoading || connecting}
                                    className="flex items-center gap-2 text-xs py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 bg-imperio-600/20 text-imperio-400 border border-imperio-600/30 hover:bg-imperio-600/30"
                                >
                                    {qrLoading ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                                    {connecting ? 'Gerando...' : qr ? 'Gerar Novo QR' : 'Conectar WhatsApp'}
                                </button>
                            )}
                            <button
                                onClick={refreshWaStatus}
                                disabled={waLoading}
                                className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg transition-colors text-dark-400 bg-dark-700/50 hover:bg-dark-700"
                            >
                                {waLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                Verificar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'profile' && (
                <div className="space-y-6">
                    {/* ── Profile & Security ─────────────────────────────────── */}
                    <div className="card">
                        <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2"><Shield size={14} className="text-imperio-400" /> Perfil e Segurança</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-imperio-500 to-imperio-700 flex items-center justify-center text-xl font-bold text-white">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <p className="text-base font-medium text-white">{user?.name}</p>
                                    <p className="text-sm text-dark-400">{user?.email}</p>
                                    <span className="badge badge-info mt-1 capitalize">{user?.role?.replace('_', ' ')}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dark-800">
                                <div><label className="text-xs text-dark-400 mb-1 block">Nome</label><input className="input" defaultValue={user?.name} /></div>
                                <div><label className="text-xs text-dark-400 mb-1 block">Email</label><input className="input" defaultValue={user?.email} /></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'notifications' && (
                <div className="space-y-6">
                    <div className="card">
                        <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2"><Bell size={14} className="text-imperio-400" /> Notificações</h3>
                        <div className="space-y-3">
                            {['Novos leads', 'Alertas de gargalo', 'Missões concluídas', 'Tickets urgentes', 'Bot desconectado'].map(n => (
                                <label key={n} className="flex items-center justify-between p-3 rounded-lg bg-dark-800/50 cursor-pointer hover:bg-dark-800 transition">
                                    <span className="text-sm text-dark-300">{n}</span>
                                    <div className="w-10 h-5 bg-imperio-600 rounded-full relative"><div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5" /></div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'monitoring' && <Monitoring />}

            {/* ── System Summary (Always at bottom) ───────────────────── */}
            <div className="card">
                <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2"><Database size={14} className="text-imperio-400" /> Resumo do Sistema</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 rounded-lg bg-dark-800/50"><span className="text-dark-500">Versão</span><p className="text-dark-200 font-mono mt-1">v1.2.0-saas</p></div>
                    <div className="p-3 rounded-lg bg-dark-800/50"><span className="text-dark-500">Node</span><p className="text-dark-200 font-mono mt-1">Bun v1.1.x</p></div>
                    <div className="p-3 rounded-lg bg-dark-800/50"><span className="text-dark-500">Core</span><p className="text-dark-200 font-mono mt-1">Go + Rust</p></div>
                    <div className="p-3 rounded-lg bg-dark-800/50"><span className="text-dark-500">Isolation</span><p className="text-dark-200 font-mono mt-1">TenantID Locked</p></div>
                </div>
            </div>
        </div>
    );
}
