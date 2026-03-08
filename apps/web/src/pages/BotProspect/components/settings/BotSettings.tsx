import { useState, useEffect } from 'react';
import { Settings, Brain, Zap, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { configApi } from '../../services/api';

export function BotSettings() {
    const [activeTab, setActiveTab] = useState<'brain' | 'keys'>('brain');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [models, setModels] = useState<any[]>([]);
    const [aiHealth, setAiHealth] = useState<any[]>([]);
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        loadConfig();
        loadAiHealth();
        const t = setInterval(loadAiHealth, 10000);
        return () => clearInterval(t);
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const [data, availableModels] = await Promise.all([configApi.getBot(), configApi.getModels()]);
            setConfig(data);
            setModels(availableModels);
        } catch (err) { console.error('Config load error:', err); }
        finally { setLoading(false); }
    };

    const loadAiHealth = async () => {
        try { setAiHealth(await configApi.getAiStatus() || []); } catch { /* ignore */ }
    };

    const handleSave = async () => {
        setSaving(true);
        try { await configApi.updateBot(config); alert('✅ Configuração salva!'); }
        catch { alert('Erro ao salvar.'); }
        finally { setSaving(false); }
    };

    const renderModelOptions = (provider: string) => {
        const fallback = [
            { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini' },
            { id: 'llama3-70b-8192', name: 'Llama 3 70B', provider: 'groq' },
            { id: 'llama3-8b-8192', name: 'Llama 3 8B', provider: 'groq' },
        ];
        const src = models.length > 0 ? models : fallback;
        const filtered = provider === 'all' ? src : src.filter(m => m.provider === provider);
        return filtered.map(m => <option key={m.id} value={m.id}>{m.name}</option>);
    };

    if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-imperio-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-dark-800 bg-dark-900 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings size={18} className="text-imperio-400" /> Configurações do Bot</h2>
                    <p className="text-xs text-dark-500 mt-0.5">Modelo, persona e chaves de API</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 font-semibold rounded-lg bg-imperio-600 text-white hover:bg-imperio-500 disabled:opacity-50 transition-all">
                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}Salvar
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-56 shrink-0 p-4 border-r border-dark-800 space-y-2">
                    {[
                        { id: 'brain' as const, label: 'Cérebro', icon: <Brain size={16} /> },
                        { id: 'keys' as const, label: 'API Keys', icon: <Zap size={16} /> },
                    ].map((t) => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-imperio-600/10 text-imperio-400 border-l-2 border-imperio-500' : 'text-dark-400 hover:bg-dark-800'
                                }`}
                        >{t.icon} {t.label}</button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeTab === 'brain' && (
                        <>
                            <div className="rounded-xl bg-dark-900 border border-dark-800 p-5 space-y-4">
                                <h3 className="text-sm font-bold text-white">Persona do Diretor Comercial</h3>
                                <textarea
                                    className="w-full h-28 rounded-lg p-3 bg-dark-800 border border-dark-700 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:ring-1 focus:ring-imperio-600/50 resize-none"
                                    value={config?.commercial?.persona || ''}
                                    onChange={(e) => setConfig({ ...config, commercial: { ...config?.commercial, persona: e.target.value } })}
                                    placeholder="Ex: Você é o Diretor Comercial da Império Lord..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl bg-dark-900 border border-dark-800 p-5">
                                    <label className="block text-xs font-semibold text-dark-400 mb-2">Modelo Principal</label>
                                    <select
                                        className="w-full rounded-lg p-2.5 bg-dark-800 border border-dark-700 text-sm text-white focus:outline-none"
                                        value={config?.commercial?.model || ''}
                                        onChange={(e) => setConfig({ ...config, commercial: { ...config?.commercial, model: e.target.value } })}
                                    >
                                        <option value="">Selecione...</option>
                                        {renderModelOptions('openai')}
                                        {renderModelOptions('groq')}
                                    </select>

                                    <label className="block text-xs font-semibold text-dark-400 mb-2 mt-4">Modelo Analítico (Gemini)</label>
                                    <select
                                        className="w-full rounded-lg p-2.5 bg-dark-800 border border-dark-700 text-sm text-white focus:outline-none"
                                        value={config?.commercial?.analyticModel || ''}
                                        onChange={(e) => setConfig({ ...config, commercial: { ...config?.commercial, analyticModel: e.target.value } })}
                                    >
                                        <option value="">Selecione...</option>
                                        {renderModelOptions('gemini')}
                                    </select>
                                </div>

                                <div className="rounded-xl bg-dark-900 border border-dark-800 p-5">
                                    <label className="block text-xs font-semibold text-dark-400 mb-2">
                                        Confiança de Intenção ({Math.round((config?.commercial?.confidenceThreshold || 0.8) * 100)}%)
                                    </label>
                                    <input type="range" min="0.5" max="0.95" step="0.05" className="w-full accent-imperio-500"
                                        value={config?.commercial?.confidenceThreshold || 0.8}
                                        onChange={(e) => setConfig({ ...config, commercial: { ...config?.commercial, confidenceThreshold: parseFloat(e.target.value) } })}
                                    />
                                    <p className="text-[10px] text-dark-500 mt-2">Valores maiores exigem mais certeza antes de responder.</p>

                                    <div className="mt-4 p-3 rounded-lg bg-purple-500/5 border border-purple-500/15">
                                        <p className="text-[10px] font-bold text-purple-400 mb-1">Arquitetura</p>
                                        <p className="text-[10px] text-dark-400">
                                            <b>Local:</b> FastEmbed (BGE-M3)<br />
                                            <b>LLM:</b> Groq/OpenAI/Gemini como fallback<br />
                                            <b>Memória:</b> Qdrant (RAG)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'keys' && (
                        <div className="rounded-xl bg-dark-900 border border-dark-800 p-5 space-y-5">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Zap size={16} className="text-amber-400" /> Chaves de API</h3>

                            {/* Provider Status */}
                            <div className="grid grid-cols-3 gap-3">
                                {(aiHealth.length > 0 ? aiHealth : [
                                    { id: 'openai', status: 'offline' }, { id: 'groq', status: 'offline' }, { id: 'gemini', status: 'offline' },
                                ]).map((p: any) => (
                                    <div key={p.id} className="rounded-lg p-3 flex items-center gap-2 bg-dark-800 border border-dark-700">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${p.status === 'online' ? 'bg-green-500' : p.status === 'rate_limited' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
                                        <span className="text-xs font-bold text-white uppercase">{p.id}</span>
                                        <span className={`text-[10px] ml-auto ${p.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                                            {p.status === 'online' ? 'Online' : p.status === 'rate_limited' ? 'Rate Limited' : 'Offline'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* API Key inputs */}
                            {[
                                { key: 'openAiKey', label: 'OpenAI API Key', placeholder: 'sk-proj-...' },
                                { key: 'geminiKey', label: 'Gemini API Key', placeholder: 'AI...' },
                                { key: 'groqKey', label: 'Groq API Key', placeholder: 'gsk_...' },
                            ].map(({ key, label, placeholder }) => (
                                <div key={key}>
                                    <label className="block text-xs font-semibold text-dark-400 mb-1.5">{label}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type={showKey ? 'text' : 'password'}
                                            className="flex-1 rounded-lg p-2.5 bg-dark-800 border border-dark-700 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:ring-1 focus:ring-imperio-600/50"
                                            value={(config?.system as any)?.[key] || ''}
                                            onChange={(e) => setConfig({ ...config, system: { ...config?.system, [key]: e.target.value } })}
                                            placeholder={placeholder}
                                        />
                                        <button onClick={() => setShowKey(!showKey)} className="px-3 rounded-lg bg-dark-800 border border-dark-700 text-xs text-dark-400 hover:text-white transition-colors">
                                            {showKey ? 'Ocultar' : 'Ver'}
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className="pt-4 border-t border-dark-700">
                                <label className="block text-xs font-semibold text-dark-400 mb-1.5">Modelo Padrão de Prospecção</label>
                                <select
                                    className="w-full rounded-lg p-2.5 bg-dark-800 border border-dark-700 text-sm text-white focus:outline-none"
                                    value={config?.prospecting?.model || ''}
                                    onChange={(e) => setConfig({ ...config, prospecting: { ...config?.prospecting, model: e.target.value } })}
                                >
                                    <option value="">Selecione...</option>
                                    {renderModelOptions('all')}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
