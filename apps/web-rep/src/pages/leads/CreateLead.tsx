// ============================================================
// Create Lead — Enhanced Form with CRM Fields
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, Save, Phone, MapPin, Thermometer } from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

export default function CreateLead() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '',
        phone: '',
        cidade: '',
        source: 'whatsapp_direct',
        temperature: 'cold',
        observacaoInicial: '',
        email: '',
        productOfInterest: '',
    });

    const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim() || !form.phone.trim()) {
            setError('Nome e Telefone são obrigatórios');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await apiFetch('/api/leads', {
                method: 'POST',
                body: JSON.stringify(form),
            });
            if (res.success) {
                navigate(`/leads/${res.data.id}`);
            } else {
                setError(res.error || 'Erro ao criar lead');
            }
        } catch (err: any) {
            setError(err.message || 'Erro de conexão');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-white">Cadastrar Novo Lead</h1>
                    <p className="text-sm text-dark-500">Preencha os dados do novo lead</p>
                </div>
            </div>

            {error && (
                <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-dark-900 rounded-xl border border-dark-800 p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-4">Informações Básicas</h2>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-dark-400 mb-1">Nome *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => update('name', e.target.value)}
                            placeholder="Nome completo do lead"
                            className="w-full px-4 py-3 rounded-lg bg-dark-950 border border-dark-800 text-white placeholder-dark-600 focus:outline-none focus:border-imperio-500 transition-colors"
                            required
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-dark-400 mb-1">
                            <Phone size={14} className="inline mr-1" />Telefone / WhatsApp *
                        </label>
                        <input
                            type="tel"
                            value={form.phone}
                            onChange={e => update('phone', e.target.value)}
                            placeholder="5591999999999"
                            className="w-full px-4 py-3 rounded-lg bg-dark-950 border border-dark-800 text-white placeholder-dark-600 focus:outline-none focus:border-imperio-500 transition-colors"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-dark-400 mb-1">Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => update('email', e.target.value)}
                            placeholder="email@exemplo.com"
                            className="w-full px-4 py-3 rounded-lg bg-dark-950 border border-dark-800 text-white placeholder-dark-600 focus:outline-none focus:border-imperio-500 transition-colors"
                        />
                    </div>

                    {/* City */}
                    <div>
                        <label className="block text-sm font-medium text-dark-400 mb-1">
                            <MapPin size={14} className="inline mr-1" />Cidade *
                        </label>
                        <input
                            type="text"
                            value={form.cidade}
                            onChange={e => update('cidade', e.target.value)}
                            placeholder="Ex: Belém, São Paulo, etc."
                            className="w-full px-4 py-3 rounded-lg bg-dark-950 border border-dark-800 text-white placeholder-dark-600 focus:outline-none focus:border-imperio-500 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Temperature */}
                        <div>
                            <label className="block text-sm font-medium text-dark-400 mb-1">
                                <Thermometer size={14} className="inline mr-1" />Temperatura
                            </label>
                            <select
                                value={form.temperature}
                                onChange={e => update('temperature', e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-dark-950 border border-dark-800 text-white focus:outline-none focus:border-imperio-500 transition-colors"
                            >
                                <option value="cold">❄️ Frio</option>
                                <option value="warm">🌡 Morno</option>
                                <option value="hot">🔥 Quente</option>
                            </select>
                        </div>

                        {/* Source */}
                        <div>
                            <label className="block text-sm font-medium text-dark-400 mb-1">Origem</label>
                            <select
                                value={form.source}
                                onChange={e => update('source', e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-dark-950 border border-dark-800 text-white focus:outline-none focus:border-imperio-500 transition-colors"
                            >
                                <option value="whatsapp_direct">WhatsApp Direto</option>
                                <option value="meta_ads">Meta Ads</option>
                                <option value="google_ads">Google Ads</option>
                                <option value="organic_instagram">Instagram Orgânico</option>
                                <option value="referral">Indicação</option>
                                <option value="other">Outro</option>
                            </select>
                        </div>
                    </div>

                    {/* Product */}
                    <div>
                        <label className="block text-sm font-medium text-dark-400 mb-1">Produto de Interesse</label>
                        <input
                            type="text"
                            value={form.productOfInterest}
                            onChange={e => update('productOfInterest', e.target.value)}
                            placeholder="Ex: CRM, Bot WhatsApp, etc."
                            className="w-full px-4 py-3 rounded-lg bg-dark-950 border border-dark-800 text-white placeholder-dark-600 focus:outline-none focus:border-imperio-500 transition-colors"
                        />
                    </div>

                    {/* Initial observation */}
                    <div>
                        <label className="block text-sm font-medium text-dark-400 mb-1">Observação Inicial</label>
                        <textarea
                            value={form.observacaoInicial}
                            onChange={e => update('observacaoInicial', e.target.value)}
                            placeholder="Alguma observação sobre o primeiro contato..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg bg-dark-950 border border-dark-800 text-white placeholder-dark-600 focus:outline-none focus:border-imperio-500 transition-colors resize-none"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 rounded-lg bg-dark-800 text-dark-400 hover:text-white transition-colors">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-imperio-600 to-imperio-700 text-white font-medium hover:from-imperio-500 hover:to-imperio-600 transition-all shadow-lg shadow-imperio-600/20 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        {loading ? 'Salvando...' : 'Cadastrar Lead'}
                    </button>
                </div>
            </form>
        </div>
    );
}
