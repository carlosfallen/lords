import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Rocket, CheckCircle, Clock } from 'lucide-react';

export default function PortalHome() {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold tracking-tight">
                Bem-vindo(a), <span className="text-imperio-400">{user?.name?.split(' ')[0] || 'Cliente'}</span>
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Onboarding Status Card */}
                <div className="card lg:col-span-2 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-imperio-600/10 to-transparent pointer-events-none" />
                    <div className="flex flex-col md:flex-row gap-6 relative z-10">
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold flex items-center gap-2 mb-2 text-white">
                                <Rocket size={20} className="text-imperio-400" />
                                Onboarding da Empresa
                            </h2>
                            <p className="text-sm text-dark-300 leading-relaxed max-w-md mb-6">
                                Para acelerar a implantação do seu CRM, conclua nosso preenchimento rápido de 3 etapas com os dados de sua marca e operações.
                            </p>
                            <button
                                onClick={() => navigate('/portal/onboarding')}
                                className="btn-primary"
                            >
                                Iniciar Onboarding
                            </button>
                        </div>
                        <div className="w-full md:w-48 bg-dark-900/50 rounded-xl p-4 border border-dark-700/50 flex flex-col justify-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center flex-shrink-0">
                                    <Clock size={14} className="text-dark-400" />
                                </div>
                                <div className="text-sm">
                                    <p className="font-semibold text-white">Etapa 1/4</p>
                                    <p className="text-xs text-dark-400">Pendente</p>
                                </div>
                            </div>
                            <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
                                <div className="h-full bg-imperio-500 rounded-full" style={{ width: '25%' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Provisionamento do Sistema */}
                <div className="card flex flex-col">
                    <h3 className="text-sm font-semibold text-dark-200 mb-4">Módulos Contratados</h3>
                    <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                        <div className="w-12 h-12 rounded-2xl bg-dark-800 flex items-center justify-center mb-3">
                            <div className="w-6 h-6 border-2 border-dark-600 border-t-imperio-400 rounded-full animate-spin" />
                        </div>
                        <p className="text-sm font-bold text-white mb-1">Preparando Instância</p>
                        <p className="text-xs text-dark-400 leading-relaxed">
                            Aguardando a conclusão do seu onboarding para liberar o acesso ao sistema.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
