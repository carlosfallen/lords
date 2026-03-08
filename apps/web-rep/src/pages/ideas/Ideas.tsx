// ============================================================
// Ideas Page — Roadmap Board
// ============================================================
import { useState, useEffect } from 'react';
import { Lightbulb, ThumbsUp, ThumbsDown, Plus, ArrowRight } from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

const statusCols: Record<string, { label: string; color: string }> = {
    backlog: { label: 'Backlog', color: 'text-dark-500' },
    planned: { label: 'Planejado', color: 'text-info' },
    in_development: { label: 'Em Progresso', color: 'text-warning' },
    completed: { label: 'Concluído', color: 'text-success' },
};

export default function Ideas() {
    const [ideas, setIdeas] = useState<any[]>([]);

    const fetchIdeas = () => {
        apiFetch('/api/ideas').then(r => r.success && setIdeas(r.data));
    };

    useEffect(() => {
        fetchIdeas();
    }, []);

    const handleUpvote = async (id: string | number) => {
        await apiFetch(`/api/ideas/${id}/upvote`, { method: 'POST' });
        fetchIdeas();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <p className="text-sm text-dark-400">{ideas.length} ideias registradas</p>
                <button className="btn-primary btn-sm"><Plus size={14} /> Nova Ideia</button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4">
                {Object.entries(statusCols).map(([key, { label, color }]) => (
                    <div key={key} className="kanban-column shrink-0">
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-3 px-1 ${color}`}>{label}</p>
                        <div className="space-y-2 min-h-[200px]">
                            {ideas.filter(i => i.status === key).map(idea => (
                                <div key={idea.id} className="kanban-card group">
                                    <h4 className="text-sm font-medium text-dark-200 mb-2">{idea.title}</h4>
                                    <p className="text-xs text-dark-400 leading-relaxed mb-3">{idea.description}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-xs">
                                            <button
                                                onClick={() => handleUpvote(idea.id)}
                                                className="flex items-center gap-1 text-dark-400 hover:text-success transition-colors"
                                            >
                                                <ThumbsUp size={11} /> {idea.upvotes || 0}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-dark-500 mt-2">Por: {idea.authorName || 'Cliente'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
