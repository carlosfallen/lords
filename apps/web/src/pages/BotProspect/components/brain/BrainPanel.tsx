import { useState, useEffect, useRef } from 'react';
import { Brain, Zap, Clock, AlertTriangle, Activity, Wifi, Target, Shield } from 'lucide-react';
import type { BrainEvent } from '../../types/index';

interface Props {
    events: BrainEvent[];
}

const MODE_LABELS: Record<string, { label: string; color: string }> = {
    local: { label: 'FastEmbed', color: 'text-green-400 bg-green-400/10 border-green-500/20' },
    groq: { label: 'Groq', color: 'text-purple-400 bg-purple-400/10 border-purple-500/20' },
    openai: { label: 'OpenAI', color: 'text-blue-400 bg-blue-400/10 border-blue-500/20' },
    gemini: { label: 'Gemini', color: 'text-amber-400 bg-amber-400/10 border-amber-500/20' },
    ollama: { label: 'Ollama', color: 'text-dark-400 bg-dark-700 border-dark-600' },
    prospect_engine: { label: '🧠 Pipeline', color: 'text-imperio-400 bg-imperio-400/10 border-imperio-500/20' },
    unknown: { label: '?', color: 'text-dark-400 bg-dark-700 border-dark-600' },
};

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
    opening: { label: 'Abertura', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    reengagement: { label: 'Reengajamento', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    qualification: { label: 'Qualificação', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
    objection_handling: { label: 'Objeção', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
    handoff: { label: 'Handoff', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
    registration: { label: 'Registro', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
};

export function BrainPanel({ events }: Props) {
    const [filter, setFilter] = useState<'all' | 'local' | 'llm' | 'pipeline'>('all');
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = 0;
    }, [events.length]);

    const filtered = events.filter((e) => {
        if (filter === 'all') return true;
        if (filter === 'local') return e.mode === 'local';
        if (filter === 'pipeline') return e.mode === 'prospect_engine';
        return e.mode !== 'local' && e.mode !== 'prospect_engine';
    });

    const totalEvents = events.length;
    const pipelineCount = events.filter(e => e.mode === 'prospect_engine').length;
    const localCount = events.filter(e => e.mode === 'local').length;
    const localRate = totalEvents > 0 ? Math.round((localCount / totalEvents) * 100) : 0;
    const avgLatency = totalEvents > 0 ? Math.round(events.reduce((sum, e) => sum + (e.latencyMs || 0), 0) / totalEvents) : 0;
    const errorCount = events.filter(e => e.error).length;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-dark-800 bg-dark-900 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain size={18} className="text-purple-400" />
                        <h2 className="text-lg font-bold text-white">Cérebro do Bot</h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                            Tempo Real
                        </span>
                    </div>
                    <div className="flex gap-1 bg-dark-800 rounded-lg p-0.5">
                        {(['all', 'pipeline', 'local', 'llm'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`text-xs py-1 px-2.5 rounded-md transition-colors font-medium ${filter === f ? 'bg-imperio-600/20 text-imperio-400' : 'text-dark-400 hover:text-dark-200'
                                    }`}
                            >{f === 'all' ? 'Todos' : f === 'pipeline' ? '🧠 Pipeline' : f === 'local' ? 'Local' : 'LLM'}</button>
                        ))}
                    </div>
                </div>
                <p className="text-xs text-dark-500 mt-1">Pipeline de prospecção controlada + intent engine Dolphin — estratégia, gatilhos, validação.</p>
            </div>

            {/* Stats */}
            <div className="px-6 py-3 border-b border-dark-800 shrink-0">
                <div className="grid grid-cols-5 gap-3">
                    {[
                        { label: 'Eventos', value: totalEvents, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: <Activity size={14} /> },
                        { label: 'Pipeline', value: pipelineCount, color: 'text-imperio-400 bg-imperio-500/10 border-imperio-500/20', icon: <Target size={14} /> },
                        { label: 'Local', value: `${localRate}%`, color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: <Zap size={14} /> },
                        { label: 'Latência', value: `${avgLatency}ms`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: <Clock size={14} /> },
                        { label: 'Erros', value: errorCount, color: errorCount > 0 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-dark-400 bg-dark-800/50 border-dark-700', icon: <AlertTriangle size={14} /> },
                    ].map((s) => (
                        <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
                            <div className="flex items-center gap-1.5 mb-1">{s.icon}<span className="text-[10px] font-medium opacity-70">{s.label}</span></div>
                            <p className="text-xl font-bold">{s.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Events */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-dark-500">
                        <Wifi size={28} className="mb-3 animate-pulse" />
                        <p className="text-sm font-medium">Nenhum evento registrado</p>
                        <p className="text-xs mt-1">Eventos aparecem quando o bot processa mensagens.</p>
                    </div>
                ) : (
                    filtered.map((evt) => {
                        const modeCfg = MODE_LABELS[evt.mode] || MODE_LABELS.unknown;
                        const isError = !!evt.error;
                        const isPipeline = evt.mode === 'prospect_engine';
                        const pipeline = (evt as any).pipeline;

                        return (
                            <div key={evt.id} className={`rounded-xl p-4 border transition-all ${isError ? 'bg-red-500/5 border-red-500/20' :
                                    isPipeline ? 'bg-imperio-500/5 border-imperio-500/20' :
                                        'bg-dark-800/50 border-dark-700'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${modeCfg.color}`}>{modeCfg.label}</span>
                                        <span className="text-xs font-mono font-bold text-white">{evt.intent || '—'}</span>
                                        <span className={`text-[10px] font-mono ${evt.confidence >= 0.85 ? 'text-green-400' : 'text-amber-400'}`}>
                                            {Math.round(evt.confidence * 100)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {evt.contextUsed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">🧠 Qdrant</span>}
                                        <span className="text-[10px] font-mono text-dark-500">{evt.latencyMs}ms</span>
                                        <span className="text-[10px] text-dark-500">{new Date(evt.timestamp).toLocaleTimeString('pt-BR')}</span>
                                    </div>
                                </div>

                                {/* Pipeline Metadata (for prospect_engine events) */}
                                {isPipeline && pipeline && (
                                    <div className="mb-2 flex flex-wrap gap-1.5">
                                        {pipeline.funnelPhase && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${PHASE_LABELS[pipeline.funnelPhase]?.color || 'bg-dark-700 text-dark-400'
                                                }`}>
                                                {PHASE_LABELS[pipeline.funnelPhase]?.label || pipeline.funnelPhase}
                                            </span>
                                        )}
                                        {pipeline.microObjective && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-700 text-dark-300 border border-dark-600">
                                                🎯 {pipeline.microObjective}
                                            </span>
                                        )}
                                        {pipeline.microStrategy && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-700 text-dark-300 border border-dark-600">
                                                ♟ {pipeline.microStrategy}
                                            </span>
                                        )}
                                        {pipeline.triggers?.map((t: string, i: number) => (
                                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                ⚡ {t}
                                            </span>
                                        ))}
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${pipeline.validationPassed
                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            <Shield size={9} className="inline mr-0.5" />
                                            {pipeline.validationPassed ? 'Validado' : 'Falhou'}
                                            {pipeline.validationRetries > 0 && ` (${pipeline.validationRetries}x)`}
                                        </span>
                                    </div>
                                )}

                                {evt.userInput && (
                                    <div className="mb-1.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-dark-500">Lead:</span>
                                        <p className="text-xs mt-0.5 pl-2 border-l-2 border-dark-600 text-dark-300">{evt.userInput}</p>
                                    </div>
                                )}
                                {evt.botResponse && (
                                    <div className="mb-1.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-dark-500">Bot:</span>
                                        <p className={`text-xs mt-0.5 pl-2 border-l-2 ${isPipeline ? 'border-imperio-500 text-imperio-300' : 'border-imperio-600 text-imperio-300'}`}>
                                            {evt.botResponse.length > 200 ? evt.botResponse.slice(0, 200) + '...' : evt.botResponse}
                                        </p>
                                    </div>
                                )}
                                {evt.error && <p className="text-xs text-red-400 mt-1">⚠️ {evt.error}</p>}
                                <p className="text-[10px] font-mono text-dark-500 mt-1">📞 {evt.phone}</p>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
