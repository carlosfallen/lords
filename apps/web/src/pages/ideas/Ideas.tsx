// ============================================================
// Ideas Page — Em Desenvolvimento
// ============================================================
import { Lightbulb, Construction } from 'lucide-react';

export default function Ideas() {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
                <Lightbulb size={36} className="text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Banco de Ideias</h1>
            <p className="text-dark-400 max-w-md">
                Roadmap board para sugestões e ideias em desenvolvimento.
                Em breve você poderá votar e propor novas funcionalidades.
            </p>
            <div className="flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-dark-900 border border-dark-800 text-dark-500 text-sm">
                <Construction size={16} /> Em desenvolvimento
            </div>
        </div>
    );
}
