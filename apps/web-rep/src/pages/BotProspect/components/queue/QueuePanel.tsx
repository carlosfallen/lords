import { useState, useRef } from 'react';
import { Play, Square, Upload, UserPlus, Trash2, Loader2, CheckSquare } from 'lucide-react';
import type { QueueStats } from '../../types/index';
import { contactsApi, conversationsApi } from '../../services/api';

interface Props {
  stats: QueueStats | null;
  onRefresh: () => void;
}

export function QueuePanel({ stats, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [grantOptIn, setGrantOptIn] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', opt_in: true });
  const fileRef = useRef<HTMLInputElement>(null);

  const wrap = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); } finally { setLoading(false); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await wrap(async () => {
      const res = await contactsApi.import(file, grantOptIn);
      alert(`✅ ${res.inserted} contatos importados!\n⏭ ${res.skipped} duplicados/inválidos ignorados.`);
      onRefresh();
    });
    e.target.value = '';
  };

  const handleAddManual = async () => {
    if (!form.name || !form.phone) return;
    await wrap(async () => {
      await contactsApi.create({ ...form });
      setForm({ name: '', company: '', phone: '', email: '', opt_in: true });
      setShowAdd(false);
      onRefresh();
    });
  };

  const handleEnqueue = async () => {
    await wrap(async () => {
      const res = await contactsApi.enqueue();
      alert(`📤 ${res.queued} contatos enfileirados! (somente com opt-in)`);
      onRefresh();
    });
  };

  const handleToggle = async () => {
    await wrap(async () => {
      if (stats?.isRunning) {
        await conversationsApi.stopQueue();
      } else {
        await conversationsApi.startQueue();
      }
      onRefresh();
    });
  };

  const statGrid = [
    { label: 'Pendentes', value: stats?.pending ?? 0, color: '#888' },
    { label: 'Em andamento', value: stats?.inProgress ?? 0, color: '#3b82f6' },
    { label: 'Agendados', value: stats?.scheduled ?? 0, color: '#22c55e' },
    { label: 'Sem interesse', value: stats?.noInterest ?? 0, color: '#ef4444' },
  ];

  return (
    <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      {/* Header + toggle */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Fila de Prospecção</span>
        <button
          onClick={handleToggle}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg font-medium transition-all disabled:opacity-50"
          style={stats?.isRunning
            ? { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }
            : { background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }
          }
        >
          {loading
            ? <Loader2 size={12} className="animate-spin" />
            : stats?.isRunning ? <><Square size={12} /> Pausar</> : <><Play size={12} /> Iniciar</>
          }
        </button>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-2">
        {statGrid.map((s) => (
          <div key={s.label} className="rounded-lg p-2.5" style={{ background: 'var(--surface-3)' }}>
            <div className="text-lg font-semibold font-mono-il" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Opt-in note */}
      {(stats?.optInRequired ?? 0) > 0 && (
        <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#d97706' }}>
          <span>⚠️</span>
          <span>{stats!.optInRequired} contatos sem opt-in — não serão enviados.</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <label
          className="flex items-center justify-center gap-1.5 text-xs py-2 px-2 rounded-lg cursor-pointer transition-colors"
          style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          <Upload size={13} />
          Importar CSV
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </label>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center justify-center gap-1.5 text-xs py-2 px-2 rounded-lg transition-colors"
          style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          <UserPlus size={13} />
          Adicionar
        </button>
      </div>

      {/* Import opt-in toggle */}
      <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
        <input
          type="checkbox"
          checked={grantOptIn}
          onChange={(e) => setGrantOptIn(e.target.checked)}
          className="accent-yellow-500"
        />
        Marcar opt-in na importação
      </label>

      {/* Manual add form */}
      {showAdd && (
        <div className="space-y-2 rounded-lg p-3 animate-slide-up" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
          {[
            { key: 'name', placeholder: 'Nome *', required: true },
            { key: 'company', placeholder: 'Empresa', required: false },
            { key: 'phone', placeholder: 'Telefone * (11999999999)', required: true },
            { key: 'email', placeholder: 'E-mail', required: false },
          ].map(({ key, placeholder }) => (
            <input
              key={key}
              type="text"
              placeholder={placeholder}
              value={(form as any)[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          ))}
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              checked={form.opt_in}
              onChange={(e) => setForm({ ...form, opt_in: e.target.checked })}
              className="accent-yellow-500"
            />
            Opt-in confirmado
          </label>
          <button
            onClick={handleAddManual}
            disabled={!form.name || !form.phone || loading}
            className="w-full text-xs py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--gold)', color: '#000' }}
          >
            Adicionar contato
          </button>
        </div>
      )}

      {/* Enqueue all */}
      {(stats?.pending ?? 0) > 0 && (
        <button
          onClick={handleEnqueue}
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--gold)', border: '1px solid var(--border-accent)' }}
        >
          <CheckSquare size={13} />
          Enfileirar {stats!.pending} pendentes
        </button>
      )}
    </div>
  );
}
