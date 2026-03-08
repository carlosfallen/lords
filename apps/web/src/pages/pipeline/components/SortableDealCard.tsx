import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DollarSign, Calendar, User, GripVertical } from 'lucide-react';

export function SortableDealCard({ deal }: { deal: any }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: deal.id, data: { ...deal } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : 1,
    };

    const tempBadge = (t: string) => {
        const map: Record<string, string> = { cold: 'badge-cold', warm: 'badge-warm', hot: 'badge-hot' };
        const label: Record<string, string> = { cold: '🔵 Frio', warm: '🟡 Morno', hot: '🔴 Quente' };
        return <span className={`badge ${map[t] || 'badge-neutral'}`}>{label[t] || t}</span>;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`kanban-card group relative cursor-grab active:cursor-grabbing ${isDragging ? 'ring-2 ring-imperio-500 shadow-xl' : ''}`}
        >
            <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-medium text-dark-200 leading-snug pr-2 truncate" title={deal.title}>{deal.title}</p>
                <div className="text-dark-600 opacity-0 group-hover:opacity-100 transition shrink-0 p-1 -mr-1">
                    <GripVertical size={14} />
                </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
                {tempBadge(deal.temperature)}
            </div>

            <div className="space-y-1.5 text-xs text-dark-400">
                <div className="flex items-center gap-1.5 truncate" title={deal.contactName}>
                    <User size={11} className="shrink-0" /> {deal.contactName}
                </div>
                <div className="flex items-center gap-1.5">
                    <DollarSign size={11} className="shrink-0" /> R$ {deal.proposedValue?.toLocaleString('pt-BR')}/mês
                </div>
                <div className="flex items-center gap-1.5 truncate" title={deal.nextStep}>
                    <Calendar size={11} className="shrink-0" /> {deal.nextStep}
                </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-dark-700">
                <span className="text-[10px] text-dark-500 truncate max-w-[50%]">{deal.assignedTo}</span>
                <span className="text-[10px] text-dark-600 bg-dark-800 px-1.5 py-0.5 rounded">{deal.nextStepDate}</span>
            </div>
        </div>
    );
}
