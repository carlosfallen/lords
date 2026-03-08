import { useState } from 'react';
import { useAuthStore, apiFetch } from '../../stores/authStore';
import { Rocket, Save, Building, Phone, Send } from 'lucide-react';

export default function PortalOnboarding() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        companyName: '',
        cnpj: '',
        brandColor: '#F5A623',
        mainContactName: '',
        mainContactPhone: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await apiFetch('/api/onboarding/client-submit', {
                method: 'POST',
                body: JSON.stringify({
                    tenantId: user?.tenantId,
                    config: formData
                })
            });

            if (response.success) {
                setSuccess(true);
            } else {
                alert('Erro ao processar. Tente novamente.');
            }
        } catch (error) {
            console.error(error);
            alert('Erro de conexão ao salvar onboarding.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in text-center max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
                    <Save size={32} className="text-success" />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-white">Tudo Pronto!</h2>
                <p className="text-dark-300 mb-8 leading-relaxed">
                    Recebemos seus dados estruturais. Nossa equipe está configurando sua instância oficial. Você receberá um aviso assim que o sistema for liberado.
                </p>
                <button onClick={() => window.location.href = '/portal'} className="btn-primary w-full justify-center">
                    Voltar ao Início
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-imperio-500/20 to-imperio-600/5 text-imperio-400 mb-4 ring-1 ring-imperio-500/30">
                    <Rocket size={24} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Configure seu CRM</h1>
                <p className="text-sm text-dark-300">Precisamos de alguns detalhes base para parametrizar sua instância.</p>
            </div>

            <form onSubmit={handleSubmit} className="card space-y-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 border-b border-dark-800 pb-2">
                        <Building size={16} className="text-imperio-400" /> Dados da Empresa
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-dark-300">Nome Fantasia / Marca</label>
                            <input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                required
                                className="input-field"
                                placeholder="Ex: Império Lord Master"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-dark-300">CNPJ</label>
                            <input
                                type="text"
                                name="cnpj"
                                value={formData.cnpj}
                                onChange={handleChange}
                                required
                                className="input-field font-mono"
                                placeholder="00.000.000/0001-00"
                            />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-medium text-dark-300">Cor Principal da Marca (Hex)</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    name="brandColor"
                                    value={formData.brandColor}
                                    onChange={handleChange}
                                    className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer p-0"
                                />
                                <input
                                    type="text"
                                    name="brandColor"
                                    value={formData.brandColor}
                                    onChange={handleChange}
                                    className="input-field font-mono flex-1 uppercase"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 border-b border-dark-800 pb-2">
                        <Phone size={16} className="text-imperio-400" /> Contato de Relacionamento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-dark-300">Nome do Contato Principal</label>
                            <input
                                type="text"
                                name="mainContactName"
                                value={formData.mainContactName}
                                onChange={handleChange}
                                required
                                className="input-field"
                                placeholder="Quem vai pilotar a ferramenta?"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-dark-300">WhatsApp do Contato</label>
                            <input
                                type="text"
                                name="mainContactPhone"
                                value={formData.mainContactPhone}
                                onChange={handleChange}
                                required
                                className="input-field"
                                placeholder="(11) 90000-0000"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-6 flex justify-end border-t border-dark-800">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full md:w-auto"
                    >
                        {loading ? 'Processando Setup...' : (
                            <>Confirmar Setup Base <Send size={16} /></>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
