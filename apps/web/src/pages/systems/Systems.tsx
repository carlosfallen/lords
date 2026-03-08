// ============================================================
// Systems Page — Em Desenvolvimento
// ============================================================
import { PackageOpen, Construction } from 'lucide-react';

export default function Systems() {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6">
                <PackageOpen size={36} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Sistemas & Templates</h1>
            <p className="text-dark-400 max-w-md">
                Gerenciador de templates e integrações em desenvolvimento.
                Em breve você poderá configurar e customizar sistemas diretamente.
            </p>
            <div className="flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-dark-900 border border-dark-800 text-dark-500 text-sm">
                <Construction size={16} /> Em desenvolvimento
            </div>
        </div>
    );
}
