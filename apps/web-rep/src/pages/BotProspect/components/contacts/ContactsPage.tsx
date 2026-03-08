import { useState, useEffect, useCallback } from 'react';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, XCircle, Search, RefreshCw, Loader2, Trash2 } from 'lucide-react';
import type { Contact } from '../../types/index';
import { contactsApi } from '../../services/api';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: '#888' },
  queued: { label: 'Na fila', color: '#3b82f6' },
  in_progress: { label: 'Em andamento', color: '#f59e0b' },
  scheduled: { label: '📅 Agendado', color: '#22c55e' },
  no_interest: { label: 'Sem interesse', color: '#ef4444' },
  no_response: { label: 'Sem resposta', color: '#888' },
  callback: { label: 'Callback', color: '#a78bfa' },
  done: { label: 'Concluído', color: '#555' },
};

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOptIn, setFilterOptIn] = useState<'all' | '1' | '0'>('all');
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 300 };
      if (search) params.search = search;
      if (filterOptIn !== 'all') params.opt_in = filterOptIn;
      if (filterStatus) params.status = filterStatus;

      const res = await contactsApi.list(params);
      setContacts(res.contacts);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [search, filterOptIn, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleOptIn = async (id: string, current: number) => {
    await contactsApi.setOptIn(id, !current);
    setContacts((prev) =>
      prev.map((c) => c.id === id ? { ...c, opt_in: current ? 0 : 1 } : c)
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover contato?')) return;
    await contactsApi.delete(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl">Contatos</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{total} registros</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--surface-3)' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mt-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Buscar nome, empresa, telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg focus:outline-none"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>
          <select
            value={filterOptIn}
            onChange={(e) => setFilterOptIn(e.target.value as any)}
            className="text-xs py-2 px-2 rounded-lg focus:outline-none"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="all">Todos opt-in</option>
            <option value="1">Com opt-in</option>
            <option value="0">Sem opt-in</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs py-2 px-2 rounded-lg focus:outline-none"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="">Todos status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="sticky top-0" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              {['Nome', 'Empresa', 'Telefone', 'Status', 'Opt-in', 'Cadastro', ''].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Loader2 size={20} className="animate-spin mx-auto" style={{ color: 'var(--text-dim)' }} />
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Nenhum contato encontrado
                </td>
              </tr>
            ) : contacts.map((c) => {
              const statusCfg = STATUS_LABELS[c.status] || { label: c.status, color: '#888' };
              return (
                <tr
                  key={c.id}
                  className="transition-colors hover:bg-white/3"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-sm">{c.name}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.company || '—'}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono-il text-xs">{c.phone}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleOptIn(c.id, c.opt_in)}
                      title={c.opt_in ? `Opt-in em ${c.opt_in_at && isValid(new Date(c.opt_in_at)) ? format(new Date(c.opt_in_at), 'dd/MM/yyyy') : '?'}` : 'Sem opt-in'}
                      className="transition-colors"
                    >
                      {c.opt_in
                        ? <CheckCircle size={15} className="text-green-500" />
                        : <XCircle size={15} style={{ color: 'var(--text-dim)' }} />
                      }
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                      {c.created_at && isValid(new Date(c.created_at)) ? format(new Date(c.created_at), 'dd/MM/yy', { locale: ptBR }) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1 rounded transition-colors hover:bg-red-950/50"
                      style={{ color: 'var(--text-dim)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
