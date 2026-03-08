// ============================================================
// Documents Page
// ============================================================
import { useState, useEffect } from 'react';
import { apiFetch } from '../../stores/authStore';
import { FolderOpen, FileText, Upload, Search, Download } from 'lucide-react';

export default function Documents() {
    const [docs, setDocs] = useState<any[]>([]);
    useEffect(() => { apiFetch('/api/documents').then(r => r.success && setDocs(r.data)); }, []);

    const iconByType = (mime: string) => mime?.includes('pdf') ? '📄' : mime?.includes('image') ? '🖼️' : '📎';
    const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-dark-800 rounded-lg px-3 py-2 flex-1 max-w-md">
                    <Search size={14} className="text-dark-500" />
                    <input placeholder="Buscar documento..." className="bg-transparent text-sm text-dark-200 outline-none w-full placeholder:text-dark-500" />
                </div>
                <button className="btn-primary btn-sm ml-auto"><Upload size={14} /> Upload</button>
            </div>

            <div className="table-wrapper">
                <table className="table">
                    <thead><tr><th>Documento</th><th>Cliente</th><th>Categoria</th><th>Tamanho</th><th>Versão</th><th>Data</th><th></th></tr></thead>
                    <tbody>
                        {docs.map(d => (
                            <tr key={d.id}>
                                <td className="flex items-center gap-2"><span className="text-lg">{iconByType(d.mimeType)}</span><span className="text-sm text-dark-200">{d.name}</span></td>
                                <td className="text-dark-400 text-xs">{d.tenantName}</td>
                                <td><span className="badge badge-neutral">{d.category}</span></td>
                                <td className="text-dark-400 text-xs">{formatSize(d.fileSize)}</td>
                                <td className="text-dark-400 text-xs">v{d.version}</td>
                                <td className="text-dark-400 text-xs">{d.createdAt}</td>
                                <td><button className="btn-ghost btn-xs"><Download size={12} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
