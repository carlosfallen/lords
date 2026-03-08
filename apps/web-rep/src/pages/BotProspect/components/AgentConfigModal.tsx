import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';

interface AgentConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AgentConfigModal({ isOpen, onClose }: AgentConfigModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-lg p-6 shadow-2xl relative">

                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-dark-800 mb-6">
                    <div className="flex items-center gap-3 text-dark-100">
                        <div className="p-2 bg-dark-800 rounded-lg">
                            <Settings className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-bold">Configuração Geral</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-dark-400 hover:text-dark-200 transition-colors p-1"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content Placeholder */}
                <div className="space-y-4 text-dark-300">
                    <p>Configurações de agentes e automação ficarão aqui.</p>
                    <div className="h-40 bg-dark-800/50 rounded-lg border border-dark-700 flex items-center justify-center border-dashed">
                        <span className="text-sm">Área em Desenvolvimento</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-dark-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-dark-300 hover:bg-dark-800 transition-colors text-sm font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors text-sm font-medium opacity-50 cursor-not-allowed"
                    >
                        Salvar
                    </button>
                </div>

            </div>
        </div>
    );
}
