import { useState, useEffect } from 'react';
import {
    Activity, Terminal, CheckCircle2, XCircle, AlertTriangle,
    RefreshCw, Loader2, Database, Zap, Brain, Globe, MessageSquare, Cpu
} from 'lucide-react';
import { healthApi } from '../BotProspect/services/api';

interface ServiceHealth {
    name: string;
    status: string;
    state: string;
    image: string;
    up: boolean;
}

export default function Monitoring() {
    const [services, setServices] = useState<ServiceHealth[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [logs, setLogs] = useState<string>('');
    const [logsLoading, setLogsLoading] = useState(false);

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const data = await healthApi.services();
            setServices(data);
        } catch (err) {
            console.error('Failed to fetch health:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async (name: string) => {
        setSelectedService(name);
        setLogsLoading(true);
        setLogs('');
        try {
            const data = await healthApi.logs(name);
            setLogs(data);
        } catch (err) {
            setLogs('Erro ao carregar logs.');
        } finally {
            setLogsLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 10000);
        return () => clearInterval(interval);
    }, []);

    const getIcon = (name: string) => {
        if (name.includes('api')) return <Globe size={18} />;
        if (name.includes('gateway')) return <Zap size={18} />;
        if (name.includes('brain')) return <Brain size={18} />;
        if (name.includes('workers')) return <Cpu size={18} />;
        if (name.includes('postgres')) return <Database size={18} />;
        if (name.includes('redis') || name.includes('qdrant')) return <Activity size={18} />;
        return <MessageSquare size={18} />;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ── Header ────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-imperio-400" /> Monitoramento de Infraestrutura
                    </h2>
                    <p className="text-sm text-dark-400">Status em tempo real dos containers Docker</p>
                </div>
                <button
                    onClick={fetchHealth}
                    disabled={loading}
                    className="btn-secondary btn-sm gap-2"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Atualizar Agora
                </button>
            </div>

            {/* ── Service Grid ────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {services.map((s) => (
                    <div
                        key={s.name}
                        onClick={() => fetchLogs(s.name)}
                        className={`card cursor-pointer border-transparent hover:border-dark-600 transition group ${selectedService === s.name ? 'border-imperio-600/50 bg-imperio-600/5' : ''
                            }`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className={`p-2 rounded-lg ${s.up ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                                {getIcon(s.name)}
                            </div>
                            <div className="flex flex-col items-end">
                                {s.up ? (
                                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-400">
                                        <CheckCircle2 size={10} /> Online
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-400">
                                        <XCircle size={10} /> Offline
                                    </span>
                                )}
                            </div>
                        </div>
                        <h4 className="text-sm font-semibold text-dark-200 mb-1 truncate">{s.name.replace('lords-', '')}</h4>
                        <p className="text-[10px] text-dark-500 font-mono truncate">{s.status}</p>

                        {!s.up && s.state !== 'unknown' && (
                            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-yellow-500 bg-yellow-500/10 p-1.5 rounded-md border border-yellow-500/20">
                                <AlertTriangle size={12} /> Status: {s.state}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ── Log Viewer ─────────────────────────── */}
            <div className="card bg-black/40 border-dark-800">
                <div className="flex items-center justify-between mb-4 border-b border-dark-800 pb-3">
                    <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-imperio-400" />
                        <h3 className="text-sm font-semibold text-white">
                            Logs do Terminal: <span className="text-imperio-400 ml-1">{selectedService?.replace('lords-', '') || 'Selecione um serviço'}</span>
                        </h3>
                    </div>
                    {selectedService && (
                        <button
                            onClick={() => fetchLogs(selectedService)}
                            disabled={logsLoading}
                            className="text-[10px] text-dark-400 hover:text-white transition flex items-center gap-1"
                        >
                            <RefreshCw size={10} className={logsLoading ? 'animate-spin' : ''} /> Recarregar
                        </button>
                    )}
                </div>

                <div className="min-h-[300px] max-h-[500px] overflow-auto rounded bg-[#0a0a0a] p-4 font-mono text-xs leading-relaxed text-dark-300">
                    {logsLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 py-20 text-dark-500">
                            <Loader2 size={20} className="animate-spin text-imperio-400" />
                            Carregando logs do container...
                        </div>
                    ) : logs ? (
                        <pre className="whitespace-pre-wrap">{logs}</pre>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2 py-20 text-dark-500">
                            <Terminal size={32} strokeWidth={1} />
                            Selecione um serviço acima para visualizar os logs em tempo real.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
