// ============================================================
// Onboarding Page — Em Desenvolvimento
// ============================================================
import { UserPlus, Construction } from 'lucide-react';

export default function Onboarding() {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                <UserPlus size={36} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Onboarding</h1>
            <p className="text-dark-400 max-w-md">
                Fluxo de onboarding de novos clientes em desenvolvimento.
                Em breve você poderá acompanhar e gerenciar cada etapa de integração.
            </p>
            <div className="flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-dark-900 border border-dark-800 text-dark-500 text-sm">
                <Construction size={16} /> Em desenvolvimento
            </div>
        </div>
    );
}
