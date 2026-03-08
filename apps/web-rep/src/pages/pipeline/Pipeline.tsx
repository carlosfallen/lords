import { useState, useEffect } from 'react';
import { apiFetch } from '../../stores/authStore';
import { Plus } from 'lucide-react';
import { SortableDealCard } from './components/SortableDealCard';

import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    useDroppable,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface Deal {
    id: string; title: string; contactName: string; stage: string; temperature: string;
    proposedValue: number; assignedTo: string; nextStep: string; nextStepDate: string; createdAt: string;
}
interface Stage { id: string; name: string; order: number; color: string; }

function DroppableColumn({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={className} id={id}>
            {children}
        </div>
    );
}

export default function Pipeline() {
    const [stages, setStages] = useState<Stage[]>([]);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

    useEffect(() => {
        apiFetch('/api/pipeline').then(r => {
            if (r.success) { setStages(r.data.stages); setDeals(r.data.deals); }
        });
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const totalPipeline = deals.reduce((acc, d) => acc + (d.proposedValue || 0), 0);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const deal = deals.find(d => d.id === active.id);
        setActiveDeal(deal || null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDeal(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeDeal = deals.find(d => d.id === activeId);
        if (!activeDeal) return;

        // Is the over element another deal, or a column itself?
        const overDeal = deals.find(d => d.id === overId);
        const overStageId = overDeal ? overDeal.stage : overId;

        // Verify if it's a valid stage
        if (!stages.find(s => s.id === overStageId)) return;

        // If stage changed, update it optimistically
        if (activeDeal.stage !== overStageId) {
            setDeals((items) => {
                return items.map(d => {
                    if (d.id === activeId) {
                        return { ...d, stage: overStageId };
                    }
                    return d;
                });
            });

            // Persist
            try {
                await apiFetch(`/api/pipeline/${activeId}/move`, {
                    method: 'PUT',
                    body: JSON.stringify({ stage: overStageId })
                });
            } catch (err) {
                console.error('Failed to save move:', err);
                // Revert optimistic update handling goes here if needed.
            }
        } else if (overDeal && activeId !== overId) {
            // Same column sort (if we care about priority inside the column)
            setDeals(items => {
                const oldIndex = items.findIndex(d => d.id === activeId);
                const newIndex = items.findIndex(d => d.id === overId);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    return (
        <div className="space-y-4 animate-fade-in flex flex-col h-[calc(100vh-80px)]">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        Pipeline de Vendas
                    </h1>
                    <p className="text-sm text-dark-400 mt-0.5">
                        Potencial Mensal: <span className="font-semibold text-success">R$ {totalPipeline.toLocaleString('pt-BR')}</span>
                    </p>
                </div>
                <button className="btn-primary btn-sm"><Plus size={14} /> Nova Negociação</button>
            </div>

            {/* Kanban Board Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2 -mx-2 px-2">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-4 h-full items-start">
                        {stages.map((stage) => {
                            const stageDeals = deals.filter(d => d.stage === stage.id);
                            const stageTotal = stageDeals.reduce((acc, d) => acc + (d.proposedValue || 0), 0);
                            const dealIds = stageDeals.map(d => d.id);

                            return (
                                <div key={stage.id} className="kanban-column shrink-0 flex flex-col h-full max-h-full">
                                    <div className="flex items-center justify-between mb-3 px-1 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                                            <span className="text-xs font-semibold text-dark-300 uppercase tracking-wider">{stage.name}</span>
                                            <span className="text-[10px] font-bold text-dark-500 bg-dark-800/80 px-1.5 py-0.5 rounded">{stageDeals.length}</span>
                                        </div>
                                        <span className="text-[10px] text-dark-500 font-mono font-medium">R$ {stageTotal.toLocaleString('pt-BR')}</span>
                                    </div>

                                    <DroppableColumn id={stage.id} className="flex-1 overflow-y-auto min-h-[150px] p-1 -m-1 space-y-2 pb-6 custom-scrollbar">
                                        <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
                                            {stageDeals.map((deal) => (
                                                <SortableDealCard key={deal.id} deal={deal} />
                                            ))}
                                            {/* Empty Drop Zone helper */}
                                            {stageDeals.length === 0 && (
                                                <div className="h-20 border-2 border-dashed border-dark-700/50 rounded-lg flex items-center justify-center pointer-events-none">
                                                    <span className="text-xs text-dark-500">Soltar aqui</span>
                                                </div>
                                            )}
                                        </SortableContext>
                                    </DroppableColumn>
                                </div>
                            );
                        })}
                    </div>

                    {/* Ghost dragged item */}
                    <DragOverlay>
                        {activeDeal ? (
                            <SortableDealCard deal={activeDeal} />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}
