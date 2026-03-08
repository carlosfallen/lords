import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, Loader2, QrCode, Unplug, PlugZap } from 'lucide-react';
import { waApi } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { SocketEvent } from '../../services/socket';
import type { WhatsAppStatus } from '../../types/index';

export function WhatsAppPanel() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await waApi.status();
      setStatus(s);
      if (s.connected) { setQr(null); setError(null); }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao verificar status');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQr = useCallback(async () => {
    setQrLoading(true);
    setError(null);
    try {
      const data = await waApi.qrCode();
      const qrValue = data.value;
      if (qrValue) {
        setQr(qrValue);
      } else {
        setError('QR Code não disponível. Aguarde e tente novamente.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao carregar QR Code.';
      // If gateway says already connected, refresh status to update UI
      if (msg.includes('conectado')) {
        await refresh();
      }
      setError(msg);
    } finally {
      setQrLoading(false);
    }
  }, [refresh]);

  const handleDisconnect = useCallback(async () => {
    setActionLoading(true);
    try {
      await waApi.disconnect();
      setStatus(prev => prev ? { ...prev, connected: false } : null);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao desconectar');
    } finally {
      setActionLoading(false);
    }
  }, []);

  const handleReconnect = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    try {
      await waApi.reconnect();
      // Poll for connection
      setTimeout(refresh, 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao reconectar');
    } finally {
      setActionLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  useSocket(SocketEvent.WA_STATUS, (s: WhatsAppStatus) => {
    setStatus(s);
    if (s.connected) setQr(null);
  });

  useSocket(SocketEvent.WA_DISCONNECTED, () => {
    setStatus((prev) => prev ? { ...prev, connected: false } : null);
  });

  const isConnected = status?.connected;

  return (
    <div className="rounded-xl p-4 space-y-3 bg-dark-800 border border-dark-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnected
            ? <Wifi size={16} className="text-green-500" />
            : <WifiOff size={16} className="text-red-500" />
          }
          <span className="font-medium text-sm text-dark-100">WhatsApp</span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${isConnected
            ? 'bg-green-950 text-green-400 border border-green-900'
            : 'bg-red-950 text-red-400 border border-red-900'
            }`}
        >
          {isConnected ? 'Conectado' : 'Offline'}
        </span>
      </div>

      {/* Connected state */}
      {isConnected && status?.phoneNumber && (
        <p className="text-xs text-dark-400">
          📱 {status.phoneNumber}
        </p>
      )}

      {/* Connected actions */}
      {isConnected && (
        <button
          onClick={handleDisconnect}
          disabled={actionLoading}
          className="w-full flex items-center justify-center gap-2 text-xs py-2 px-3 rounded-lg font-medium transition-colors disabled:opacity-50 bg-red-950/30 text-red-400 border border-red-900/30 hover:bg-red-950/50"
        >
          {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
          Desconectar
        </button>
      )}

      {/* Disconnected: QR Code flow */}
      {!isConnected && (
        <div className="space-y-3">
          <p className="text-xs text-dark-400">
            Escaneie o QR com o WhatsApp para conectar.
          </p>

          {qr && (
            <div className="flex flex-col items-center gap-2">
              <div className="bg-white p-3 rounded-lg">
                {/* QR is a raw string, render as text code for now */}
                <div className="text-center text-xs text-dark-800 break-all font-mono p-2 max-w-[180px] max-h-40 overflow-auto">
                  Escaneie o QR no terminal do Gateway Go ou aguarde implementação do renderizador.
                </div>
              </div>
              <p className="text-xs text-amber-400">
                ⚠ QR gerado no terminal do container <code className="text-amber-300">lords-bot-gateway</code>
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 px-3 py-2 rounded-lg border border-red-900/30">
              {error}
            </p>
          )}

          <button
            onClick={loadQr}
            disabled={qrLoading}
            className="w-full flex items-center justify-center gap-2 text-xs py-2 px-3 rounded-lg font-medium transition-colors disabled:opacity-50 bg-imperio-600/20 text-imperio-400 border border-imperio-600/30 hover:bg-imperio-600/30"
          >
            {qrLoading ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
            {qr ? 'Gerar Novo QR' : 'Gerar QR Code'}
          </button>

          <button
            onClick={handleReconnect}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 text-xs py-2 px-3 rounded-lg font-medium transition-colors disabled:opacity-50 bg-green-950/30 text-green-400 border border-green-900/30 hover:bg-green-950/50"
          >
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}
            Reconectar Sessão Existente
          </button>
        </div>
      )}

      <button
        onClick={refresh}
        disabled={loading}
        className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg transition-colors text-dark-400 bg-dark-700/50 hover:bg-dark-700"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        Verificar status
      </button>
    </div>
  );
}
