import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../../stores/authStore";

/* ═══════════════════════════════════════════════════════════
   CONFIGURAÇÃO — API Baseada na Env do Monorepo
═══════════════════════════════════════════════════════════ */
const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:8787";

/* ═══════════════════════════════════════════════════════════
   CSS
═══════════════════════════════════════════════════════════ */
const STYLES = `
.pf-wrapper { box-sizing:border-box; font:13px/1.5 system-ui,-apple-system,sans-serif;background:#f1f5f9;color:#1e293b; }
.pf-wrapper * { box-sizing: border-box; }
.pf-wrapper button {cursor:pointer;font-family:inherit;font-size:13px; background:transparent; border:none;}
.pf-wrapper input, .pf-wrapper select, .pf-wrapper textarea {font-family:inherit;font-size:13px}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:2px}

.app{display:flex;height:100%;min-height:calc(100vh - 120px);overflow:hidden;border-radius:12px;box-shadow:0 0 20px rgba(0,0,0,0.1);}
.sb{width:190px;background:#0f172a;color:#94a3b8;flex-shrink:0;display:flex;flex-direction:column;overflow-y:auto}
.sb-logo{padding:14px 16px;font-size:15px;font-weight:700;color:#fff;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:8px}
.sb-sec{padding:6px 0;flex:1}
.nav{display:flex;align-items:center;gap:9px;padding:8px 14px;font-size:12px;cursor:pointer;border-left:2px solid transparent;user-select:none}
.nav:hover{background:rgba(255,255,255,.06);color:#e2e8f0}
.nav.on{background:rgba(59,130,246,.12);color:#60a5fa;border-left-color:#3b82f6}
.nav-ic{width:15px;text-align:center;flex-shrink:0;font-size:14px}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.topbar{background:#fff;border-bottom:1px solid #e2e8f0;padding:9px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:10px}
.tb-title{font-weight:700;font-size:14px}
.page{flex:1;overflow-y:auto;padding:16px}

.card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px}
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}

.f{display:flex}.fc{display:flex;flex-direction:column}
.fr{display:flex;align-items:center}
.frb{display:flex;align-items:center;justify-content:space-between}
.fg1{gap:4px}.fg2{gap:8px}.fg3{gap:12px}.fg4{gap:16px}
.flex1{flex:1}.wrap{flex-wrap:wrap}
.mt2{margin-top:8px}.mt3{margin-top:12px}.mt4{margin-top:16px}
.mb2{margin-bottom:8px}.mb3{margin-bottom:12px}.mb4{margin-bottom:16px}

.txs{font-size:11px}.tsm{font-size:12px}
.tm{color:#64748b}.td{color:#ef4444}.ts{color:#10b981}.tw{color:#f59e0b}
.fw5{font-weight:500}.fw6{font-weight:600}.fw7{font-weight:700}
.trunc{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:6px;border:none;font-weight:500;white-space:nowrap;line-height:1}
.bp{background:#3b82f6;color:#fff}.bp:hover{background:#2563eb}
.bs{background:#10b981;color:#fff}.bs:hover{background:#059669}
.bd{background:#ef4444;color:#fff}.bd:hover{background:#dc2626}
.bg{background:transparent;color:#64748b;border:1px solid #e2e8f0}.bg:hover{background:#f8fafc}
.bsm{padding:4px 9px;font-size:12px}
.bxs{padding:2px 7px;font-size:11px}
.bic{width:28px;height:28px;padding:0;justify-content:center}

.fr-row{margin-bottom:10px}
.fr-row label{display:block;font-size:11px;font-weight:600;color:#475569;margin-bottom:3px}
input[type=text],input[type=date],input[type=number],input[type=email],input[type=password],select,textarea{
  width:100%;padding:7px 9px;border:1px solid #e2e8f0;border-radius:6px;color:#1e293b;background:#fff}
input:focus,select:focus,textarea:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.15)}
textarea{resize:vertical;min-height:70px}

.tbl{width:100%;border-collapse:collapse}
.tbl th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;font-weight:600;padding:7px 10px;text-align:left;border-bottom:2px solid #e2e8f0;white-space:nowrap;background:#f8fafc}
.tbl td{padding:9px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:#f8fafc}

.bdg{display:inline-flex;align-items:center;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:600}
.bdg-b{background:#dbeafe;color:#1d4ed8}.bdg-g{background:#d1fae5;color:#065f46}
.bdg-y{background:#fef3c7;color:#92400e}.bdg-r{background:#fee2e2;color:#991b1b}
.bdg-gr{background:#f1f5f9;color:#475569}.bdg-p{background:#ede9fe;color:#5b21b6}

.prog{height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden}
.pfill{height:100%;border-radius:2px;transition:width .3s}

.av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
.avlg{width:34px;height:34px;font-size:13px}

.ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:990;display:flex;align-items:center;justify-content:center;padding:12px}
.mdl{background:#fff;border-radius:10px;width:100%;max-width:460px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.mdl-lg{max-width:660px}
.mh{padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:1}
.mb_{padding:18px}
.mf{padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px}

.board{display:flex;gap:9px;overflow-x:auto;padding-bottom:8px;align-items:flex-start}
.kol{width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:6px}
.kh{padding:7px 9px;border-radius:6px;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:space-between;text-transform:uppercase;letter-spacing:.05em}
.kb{display:flex;flex-direction:column;gap:5px;min-height:30px}
.kc{background:#fff;border:1px solid #e2e8f0;border-radius:7px;padding:9px;cursor:pointer}
.kc:hover{border-color:#93c5fd}
.kc.sel{border-color:#3b82f6;background:#eff6ff}
.drop-zone{min-height:40px;border-radius:6px;border:2px dashed transparent}
.drop-zone.over{border-color:#3b82f6;background:#eff6ff}

.gantt-wrap{overflow-x:auto}
.gr{display:flex;align-items:center;border-bottom:1px solid #f1f5f9;min-height:34px}
.gl{width:160px;flex-shrink:0;padding:4px 10px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gt{flex:1;position:relative;height:22px;background:#f8fafc;min-width:0}
.gb{position:absolute;height:14px;top:4px;border-radius:3px;min-width:4px}

.timer-num{font-size:40px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:3px}
.wiki-body{white-space:pre-wrap;font-size:13px;line-height:1.8;color:#334155}
.wiki-body h1{font-size:17px;font-weight:700;margin:4px 0 10px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
.wiki-body h2{font-size:14px;font-weight:600;margin:14px 0 6px;color:#1e293b}
.wiki-body h3{font-size:13px;font-weight:600;margin:10px 0 4px}
.wiki-body code{background:#f1f5f9;padding:1px 5px;border-radius:3px;font-size:12px}

.notif-box{position:fixed;top:12px;right:12px;z-index:2000;display:flex;flex-direction:column;gap:5px;max-width:280px;pointer-events:none}
.notif{padding:10px 13px;border-radius:8px;font-size:12px;display:flex;align-items:flex-start;gap:8px;pointer-events:all;border-left:3px solid transparent}
.notif-ok{background:#f0fdf4;border-left-color:#10b981;color:#065f46}
.notif-err{background:#fef2f2;border-left-color:#ef4444;color:#991b1b}
.notif-info{background:#eff6ff;border-left-color:#3b82f6;color:#1d4ed8}

.stat-val{font-size:26px;font-weight:700;line-height:1}
.stat-lbl{font-size:11px;color:#64748b;margin-top:3px}
.tag{display:inline-flex;padding:1px 6px;background:#f1f5f9;border-radius:3px;font-size:11px;color:#64748b}
hr{border:none;border-top:1px solid #e2e8f0;margin:10px 0}

.sk{background:#f1f5f9;border-radius:4px;animation:sk .9s ease infinite alternate}
@keyframes sk{from{opacity:.5}to{opacity:1}}

.spin{display:inline-block;width:16px;height:16px;border:2px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.login-wrap{min-height:calc(100vh - 120px);display:flex;align-items:center;justify-content:center;background:#0f172a;padding:16px;border-radius:12px;}
.login-box{background:#fff;border-radius:12px;padding:32px 28px;width:100%;max-width:360px}

.ham{display:none;background:none;border:none;font-size:18px;padding:4px;color:#64748b}
.mob-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:599}

@media(max-width:680px){
  .sb{display:none;position:fixed;inset-y:0;left:0;z-index:600;width:200px;box-shadow:4px 0 20px rgba(0,0,0,.3)}
  .sb.open{display:flex}
  .ham{display:block}
  .mob-ov.open{display:block}
  .g2,.g3,.g4{grid-template-columns:1fr}
  .page{padding:10px}
  .kol{width:100%}
  .board{flex-direction:column}
  .gl{width:100px}
  .hide-m{display:none}
}
`;

/* ══════════════════════════════════════
   CONSTANTES
══════════════════════════════════════ */
const COLS = ["Backlog", "A Fazer", "Em Andamento", "Revisão", "Concluído"];
const PRIOS = ["baixa", "média", "alta", "urgente"];
const CC = { Backlog: "#94a3b8", "A Fazer": "#3b82f6", "Em Andamento": "#f59e0b", "Revisão": "#8b5cf6", "Concluído": "#10b981" };
const PC = { baixa: "#94a3b8", média: "#3b82f6", alta: "#f59e0b", urgente: "#ef4444" };
const PBDG = { baixa: "bdg-gr", média: "bdg-b", alta: "bdg-y", urgente: "bdg-r" };
const STATUS_OPTS = ["ativo", "pausado", "concluído", "cancelado"];

const AUTO_TRIGGERS = [
  { val: "col_change", lbl: "Quando tarefa mudar de coluna" },
  { val: "prio_set", lbl: "Quando prioridade for definida" },
  { val: "task_created", lbl: "Quando tarefa for criada" },
  { val: "due_today", lbl: "Quando prazo for hoje" },
];
const AUTO_ACTIONS = [
  { val: "notify", lbl: "Enviar notificação" },
  { val: "col_move", lbl: "Mover para coluna" },
  { val: "assign", lbl: "Atribuir a membro" },
  { val: "set_prio", lbl: "Definir prioridade" },
];

/* ══════════════════════════════════════
   UTILS
══════════════════════════════════════ */
const tod = () => new Date().toISOString().slice(0, 10);
const fDate = d => d ? new Date(d + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "–";
const fDtLg = d => d ? new Date(d + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "–";
const fMin = m => { if (!m) return "0m"; const h = Math.floor(m / 60), r = m % 60; return h > 0 ? (r > 0 ? `${h}h ${r}m` : `${h}h`) : r + "m"; };
const daysDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / (864e5));
const isOverdue = d => d && new Date(d + "T23:59") < new Date();

/* ══════════════════════════════════════
   CLIENTE API — usa apiFetch do CRM
══════════════════════════════════════ */
function useApi() {
  const call = useCallback(async (method, path, body) => {
    const res = await apiFetch(path, {
      method,
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (res.data !== undefined) return res.data;
    return res;
  }, []);

  return {
    get: (path) => call("GET", path),
    post: (path, body) => call("POST", path, body),
    put: (path, body) => call("PUT", path, body),
    delete: (path) => call("DELETE", path),
  };
}

/* ══════════════════════════════════════
   HOOK GENÉRICO DE FETCH
══════════════════════════════════════ */
function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await fn()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

/* ══════════════════════════════════════
   NOTIFICAÇÕES
══════════════════════════════════════ */
const NotifCtx = createContext(null);
function useNotif() { return useContext(NotifCtx); }
function NotifProvider({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((msg, type = "info") => {
    const id = Date.now();
    setList(l => [{ id, msg, type }, ...l].slice(0, 5));
    setTimeout(() => setList(l => l.filter(n => n.id !== id)), 4000);
  }, []);
  return (
    <NotifCtx.Provider value={push}>
      {children}
      <div className="notif-box">
        {list.map(n => (
          <div key={n.id} className={`notif notif-${n.type}`}>
            <span style={{ flex: 1 }}>{n.msg}</span>
            <button onClick={() => setList(l => l.filter(x => x.id !== n.id))} style={{ background: "none", border: "none", cursor: "pointer", opacity: .6, fontSize: 13 }}>✕</button>
          </div>
        ))}
      </div>
    </NotifCtx.Provider>
  );
}

/* ══════════════════════════════════════
   COMPONENTES BASE
══════════════════════════════════════ */
function Av({ name, color = "#64748b", size = "" }) {
  return <div className={`av ${size}`} style={{ background: color }}>{(name || "?")[0].toUpperCase()}</div>;
}
function Bdg({ prio }) {
  const L = { baixa: "Baixa", média: "Média", alta: "Alta", urgente: "Urgente" };
  return <span className={`bdg ${PBDG[prio] || "bdg-gr"}`}>{L[prio] || prio}</span>;
}
function ColBadge({ col }) {
  const C = { Backlog: "bdg-gr", "A Fazer": "bdg-b", "Em Andamento": "bdg-y", "Revisão": "bdg-p", "Concluído": "bdg-g" };
  return <span className={`bdg ${C[col] || "bdg-gr"}`}>{col}</span>;
}
function StatusBdg({ status }) {
  const C = { ativo: "bdg-g", pausado: "bdg-y", "concluído": "bdg-b", cancelado: "bdg-r" };
  return <span className={`bdg ${C[status] || "bdg-gr"}`}>{status}</span>;
}
function Prog({ val, color = "#3b82f6" }) {
  return <div className="prog"><div className="pfill" style={{ width: `${Math.min(100, Math.max(0, val || 0))}%`, background: color }} /></div>;
}
function Spin() { return <div className="spin" />; }
function Field({ label, children }) {
  return <div className="fr-row"><label>{label}</label>{children}</div>;
}
function Empty({ msg = "Nenhum dado encontrado." }) {
  return <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontSize: "13px" }}>{msg}</div>;
}
function Skeleton({ h = 14, w = "100%" }) {
  return <div className="sk" style={{ height: h, width: w, borderRadius: 4 }} />;
}
function LoadPage() {
  return (
    <div style={{ padding: 16 }}>
      {[1, 2, 3].map(i => <div key={i} className="card mb3"><Skeleton h={12} w="60%" /><div style={{ height: 8 }} /><Skeleton h={12} w="80%" /></div>)}
    </div>
  );
}
function ErrMsg({ msg, onRetry }) {
  return (
    <div className="card" style={{ borderColor: "#fecaca", background: "#fff5f5", textAlign: "center", padding: 24 }}>
      <p className="tsm td mb2">⚠ {msg}</p>
      {onRetry && <button className="btn bsm bp" onClick={onRetry}>Tentar novamente</button>}
    </div>
  );
}
function Modal({ title, onClose, children, wide, footer }) {
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`mdl ${wide ? "mdl-lg" : ""}`}>
        <div className="mh">
          <span className="fw6">{title}</span>
          <button className="btn bic bg" onClick={onClose}>✕</button>
        </div>
        <div className="mb_">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  );
}

/* Login removido — autenticação gerenciada pelo CRM principal */

/* ══════════════════════════════════════
   DASHBOARD
══════════════════════════════════════ */
function Dashboard() {
  const navigate = useNavigate();
  const api = useApi();
  const { data: summary, loading: ls, error: es, reload: rs } = useFetch(() => api.get("/api/reports/summary"), []);
  const { data: projects, loading: lp, error: ep, reload: rp } = useFetch(() => api.get("/api/projects"), []);
  const { data: milestones, loading: lm, reload: rm } = useFetch(() => api.get("/api/milestones"), []);
  const { data: tasks, loading: lt } = useFetch(() => api.get("/api/tasks"), []);
  const notif = useNotif();

  const toggleMs = async (id) => {
    try { await api.post(`/api/milestones/${id}/toggle`); rm(); }
    catch (e) { notif(e.message, "err"); }
  };
  const delMs = async (id) => {
    if (!confirm("Excluir milestone?")) return;
    try { await api.delete(`/api/milestones/${id}`); rm(); notif("Milestone removido", "ok"); }
    catch (e) { notif(e.message, "err"); }
  };

  if (ls || lp) return <LoadPage />;
  if (es || ep) return <ErrMsg msg={es || ep} onRetry={() => { rs(); rp(); }} />;

  const projs = projects || [];
  const s = summary || {};

  return (
    <div>
      <div className="frb mb4">
        <div><h2 className="fw7" style={{ fontSize: 16 }}>Dashboard</h2><p className="tsm tm">Visão geral</p></div>
        <button className="btn bp bsm" onClick={() => navigate("/monday/projects")}>+ Novo Projeto</button>
      </div>

      <div className="g4 mb4">
        {[
          { v: s.activeProjects?.n ?? 0, l: "Projetos Ativos", c: "#3b82f6" },
          { v: s.totalTasks?.n ?? 0, l: "Total de Tarefas", c: "#64748b" },
          { v: s.doneTasks?.n ?? 0, l: "Concluídas", c: "#10b981" },
          { v: s.overdue?.n ?? 0, l: "Atrasadas", c: "#ef4444" },
        ].map(x => (
          <div key={x.l} className="card" style={{ borderLeft: `3px solid ${x.c}` }}>
            <div className="stat-val" style={{ color: x.c }}>{x.v}</div>
            <div className="stat-lbl">{x.l}</div>
          </div>
        ))}
      </div>

      <div className="g2 mb4">
        <div className="card">
          <p className="fw6 tsm mb3">Progresso dos Projetos</p>
          <div className="fc fg3">
            {projs.length === 0 && <Empty msg="Nenhum projeto" />}
            {projs.map(p => {
              const total = p.task_count || 0;
              const done = p.done_count || 0;
              const pct = total ? Math.round(done / total * 100) : 0;
              return (
                <div key={p.id} onClick={() => navigate(`/monday/kanban/${p.id}`)} style={{ cursor: "pointer" }}>
                  <div className="frb mb1">
                    <div className="fr fg2">
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.color || "#3b82f6", flexShrink: 0 }} />
                      <span className="tsm fw5 trunc" style={{ maxWidth: 140 }}>{p.name}</span>
                    </div>
                    <span className="txs fw6" style={{ color: p.color || "#3b82f6" }}>{pct}%</span>
                  </div>
                  <Prog val={pct} color={p.color || "#3b82f6"} />
                  <div className="frb mt1">
                    <span className="txs tm">{done}/{total} tarefas</span>
                    <StatusBdg status={p.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="frb mb3">
            <span className="fw6 tsm">Milestones</span>
            <button className="btn bxs bg" onClick={() => navigate("/monday/milestones")}>Ver todos →</button>
          </div>
          {lm ? <Skeleton /> :
            (milestones || []).length === 0 ? <Empty msg="Sem milestones" /> :
              (milestones || []).slice(0, 8).map(m => {
                const proj = projs.find(p => p.id === m.project_id);
                return (
                  <div key={m.id} className="frb" style={{ padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div className="fr fg2">
                      <input type="checkbox" checked={!!m.done} onChange={() => toggleMs(m.id)} style={{ width: 15, height: 15, accentColor: "#3b82f6" }} />
                      <div>
                        <div className="tsm" style={{ textDecoration: m.done ? "line-through" : "none", color: m.done ? "#94a3b8" : "inherit" }}>{m.title}</div>
                        <div className="txs tm">{proj?.name} · {fDate(m.date)}</div>
                      </div>
                    </div>
                    <button className="btn bxs bd" onClick={() => delMs(m.id)}>✕</button>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Tarefas recentes */}
      <div className="card">
        <div className="frb mb3">
          <span className="fw6 tsm">Tarefas Recentes</span>
          <button className="btn bxs bg" onClick={() => navigate("/monday/tasks")}>Ver todas →</button>
        </div>
        {lt ? <Skeleton /> :
          (tasks || []).slice(0, 8).map(t => {
            const proj = projs.find(p => p.id === t.project_id);
            return (
              <div key={t.id} className="frb" style={{ padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div className="fr fg2" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ width: 3, height: 22, borderRadius: 2, background: proj?.color || "#94a3b8", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="tsm trunc" style={{ maxWidth: 200 }}>{t.title}</div>
                    <div className="txs tm">{proj?.name}</div>
                  </div>
                </div>
                <div className="fr fg2">
                  <Bdg prio={t.priority} />
                  <ColBadge col={t.col} />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PROJETOS
══════════════════════════════════════ */
function ProjectFormModal({ proj, onClose, onSaved }) {
  const api = useApi();
  const notif = useNotif();
  const isEdit = !!proj?.id;
  const [form, setForm] = useState({ name: "", description: "", color: "#3b82f6", status: "ativo", start_date: tod(), end_date: "", ...(proj || {}) });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"];

  const save = async () => {
    if (!form.name.trim()) return notif("Nome obrigatório", "err");
    setSaving(true);
    try {
      if (isEdit) await api.put(`/api/projects/${proj.id}`, form);
      else await api.post("/api/projects", form);
      notif(isEdit ? "Projeto atualizado" : "Projeto criado", "ok");
      onSaved();
    } catch (e) { notif(e.message, "err"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? "Editar Projeto" : "Novo Projeto"} onClose={onClose}
      footer={<><button className="btn bg" onClick={onClose}>Cancelar</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? <><Spin />Salvando...</> : isEdit ? "Salvar" : "Criar"}</button></>}>
      <Field label="Nome *"><input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nome do projeto" /></Field>
      <Field label="Descrição"><textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} placeholder="Descrição opcional" /></Field>
      <div className="g2">
        <Field label="Status">
          <select value={form.status} onChange={e => set("status", e.target.value)}>
            {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Cor">
          <div className="fr fg2 wrap" style={{ marginTop: 4 }}>
            {COLORS.map(c => (
              <div key={c} onClick={() => set("color", c)}
                style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "3px solid #1e293b" : "2px solid transparent" }} />
            ))}
          </div>
        </Field>
        <Field label="Início"><input type="date" value={form.start_date || ""} onChange={e => set("start_date", e.target.value)} /></Field>
        <Field label="Término"><input type="date" value={form.end_date || ""} onChange={e => set("end_date", e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function Projects() {
  const navigate = useNavigate();
  const api = useApi();
  const notif = useNotif();
  const { data, loading, error, reload } = useFetch(() => api.get("/api/projects"), []);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");

  const del = async (p) => {
    if (!confirm(`Excluir "${p.name}" e todas as suas tarefas?`)) return;
    try { await api.delete(`/api/projects/${p.id}`); reload(); notif("Projeto excluído", "ok"); }
    catch (e) { notif(e.message, "err"); }
  };

  if (loading) return <LoadPage />;
  if (error) return <ErrMsg msg={error} onRetry={reload} />;

  const projs = (data || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (filterStatus === "todos" || p.status === filterStatus)
  );

  return (
    <div>
      <div className="frb mb4">
        <div><h2 className="fw7" style={{ fontSize: 16 }}>Projetos</h2><p className="tsm tm">{(data || []).length} projetos</p></div>
        <button className="btn bp bsm" onClick={() => setModal({ type: "add" })}>+ Novo Projeto</button>
      </div>
      <div className="fr fg2 mb4 wrap">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar..." style={{ maxWidth: 200 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 140 }}>
          <option value="todos">Todos status</option>
          {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {projs.length === 0 ? <Empty msg="Nenhum projeto encontrado" /> :
        <div className="g3">
          {projs.map(p => {
            const total = p.task_count || 0;
            const done = p.done_count || 0;
            const pct = total ? Math.round(done / total * 100) : 0;
            return (
              <div key={p.id} className="card" style={{ borderTop: `3px solid ${p.color || "#3b82f6"}`, cursor: "pointer" }} onClick={() => navigate(`/monday/kanban/${p.id}`)}>
                <div className="frb mb2">
                  <span className="fw7 tsm trunc" style={{ maxWidth: 160 }}>{p.name}</span>
                  <StatusBdg status={p.status} />
                </div>
                <p className="txs tm mb3 trunc">{p.description}</p>
                <div className="frb tsm mb2">
                  <span className="tm">{done}/{total} tarefas</span>
                  <span className="fw6" style={{ color: p.color || "#3b82f6" }}>{pct}%</span>
                </div>
                <Prog val={pct} color={p.color || "#3b82f6"} />
                <div className="frb mt2 txs tm">
                  <span>📅 {fDate(p.start_date)} → {fDate(p.end_date)}</span>
                </div>
                <div className="fr fg2 mt3" onClick={e => e.stopPropagation()}>
                  <button className="btn bxs bg" onClick={() => setModal({ type: "edit", proj: p })}>✏ Editar</button>
                  <button className="btn bxs bd" onClick={() => del(p)}>🗑 Excluir</button>
                </div>
              </div>
            );
          })}
        </div>}

      {(modal?.type === "add" || modal?.type === "edit") &&
        <ProjectFormModal proj={modal.proj} onClose={() => setModal(null)} onSaved={() => { reload(); setModal(null); }} />}
    </div>
  );
}

/* ══════════════════════════════════════
   MODAL TAREFA
══════════════════════════════════════ */
function TaskModal({ task, projects, team, onClose, onSaved }) {
  const api = useApi();
  const notif = useNotif();
  const isEdit = !!task?.id;
  const [form, setForm] = useState({
    project_id: projects[0]?.id || "", title: "", description: "", col: "A Fazer",
    priority: "média", assignee: "", due_date: "", tags: "", estimate_min: 60,
    ...(task ? {
      project_id: task.project_id, title: task.title, description: task.description || "",
      col: task.col, priority: task.priority, assignee: task.assignee || "",
      due_date: task.due_date || "", tags: task.tags || "", estimate_min: task.estimate_min || 60
    } : {})
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("info");
  const [comment, setComment] = useState("");
  const [checklists, setChecklists] = useState(task?.checklists || []);
  const [checkText, setCheckText] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) return notif("Título obrigatório", "err");
    setSaving(true);
    try {
      if (isEdit) await api.put(`/api/tasks/${task.id}`, { ...form, estimate_min: +form.estimate_min || 60 });
      else await api.post("/api/tasks", { ...form, estimate_min: +form.estimate_min || 60 });
      notif(isEdit ? "Tarefa atualizada" : "Tarefa criada", "ok");
      onSaved();
    } catch (e) { notif(e.message, "err"); }
    finally { setSaving(false); }
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.post(`/api/tasks/${task.id}/comments`, { text: comment.trim() });
      setComment("");
      notif("Comentário adicionado", "ok");
    } catch (e) { notif(e.message, "err"); }
  };

  const addCheck = async () => {
    if (!checkText.trim()) return;
    try {
      await api.post(`/api/tasks/${task.id}/checklists`, { text: checkText.trim() });
      setCheckText("");
      // Reload checklists
      const data = await api.get(`/api/tasks/${task.id}/checklists`);
      setChecklists(data || []);
    } catch (e) { notif(e.message, "err"); }
  };

  const toggleCheck = async (cid, done) => {
    try {
      await api.put(`/api/checklists/${cid}`, { done: !done });
      setChecklists(l => l.map(c => c.id === cid ? { ...c, done: !done } : c));
    } catch (e) { notif(e.message, "err"); }
  };

  const tabs = isEdit ? ["info", "checklist", "comentários"] : ["info"];

  return (
    <Modal title={isEdit ? "Editar Tarefa" : "Nova Tarefa"} onClose={onClose} wide
      footer={<><button className="btn bg" onClick={onClose}>Cancelar</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? <><Spin />Salvando...</> : isEdit ? "Salvar" : "Criar"}</button></>}>
      {isEdit && (
        <div className="fr fg2 mb3" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
          {tabs.map(t => <button key={t} className={`btn bsm ${tab === t ? "bp" : "bg"}`} onClick={() => setTab(t)}>{t}</button>)}
        </div>
      )}

      {tab === "info" && <>
        <Field label="Título *"><input type="text" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Título da tarefa" /></Field>
        <Field label="Descrição"><textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="Descreva a tarefa..." /></Field>
        <div className="g2">
          <Field label="Projeto">
            <select value={form.project_id} onChange={e => set("project_id", e.target.value)}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Coluna">
            <select value={form.col} onChange={e => set("col", e.target.value)}>
              {COLS.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Prioridade">
            <select value={form.priority} onChange={e => set("priority", e.target.value)}>
              {PRIOS.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Responsável">
            <select value={form.assignee || ""} onChange={e => set("assignee", e.target.value)}>
              <option value="">— sem atribuição —</option>
              {(team || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Prazo"><input type="date" value={form.due_date || ""} onChange={e => set("due_date", e.target.value)} /></Field>
          <Field label="Estimativa (min)"><input type="number" value={form.estimate_min} min={0} onChange={e => set("estimate_min", e.target.value)} /></Field>
        </div>
        <Field label="Tags (separar por vírgula)"><input type="text" value={form.tags || ""} onChange={e => set("tags", e.target.value)} placeholder="frontend, api, bug" /></Field>
      </>}

      {tab === "checklist" && <>
        {checklists.map(c => (
          <div key={c.id} className="fr frb" style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
            <label className="fr fg2" style={{ cursor: "pointer", flex: 1 }}>
              <input type="checkbox" checked={!!c.done} onChange={() => toggleCheck(c.id, c.done)} />
              <span style={{ textDecoration: c.done ? "line-through" : "none", color: c.done ? "#94a3b8" : "inherit" }}>{c.text}</span>
            </label>
          </div>
        ))}
        <div className="fr fg2 mt3">
          <input type="text" value={checkText} onChange={e => setCheckText(e.target.value)} onKeyDown={e => e.key === "Enter" && addCheck()} placeholder="Novo item..." style={{ flex: 1 }} />
          <button className="btn bsm bp" onClick={addCheck}>+ Adicionar</button>
        </div>
      </>}

      {tab === "comentários" && <>
        <div id="cmt-list" className="fc fg2 mb3">
          {(task?.comments || []).length === 0 && <span className="tsm tm">Nenhum comentário.</span>}
          {(task?.comments || []).map(c => (
            <div key={c.id} className="card" style={{ padding: 10 }}>
              <div className="frb mb1">
                <span className="fw6 tsm">{c.user_name || c.user_id}</span>
                <span className="txs tm">{fDate(c.created_at?.slice(0, 10))}</span>
              </div>
              <p className="tsm">{c.text}</p>
            </div>
          ))}
        </div>
        <div className="fr fg2">
          <input type="text" value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && sendComment()} placeholder="Escreva um comentário..." style={{ flex: 1 }} />
          <button className="btn bsm bp" onClick={sendComment}>Enviar</button>
        </div>
      </>}
    </Modal>
  );
}

/* ══════════════════════════════════════
   KANBAN
══════════════════════════════════════ */
function Kanban({ pid: pidProp }) {
  const params = useParams();
  const pid = pidProp || params.projectId || null;
  const api = useApi();
  const notif = useNotif();
  const { data: projects } = useFetch(() => api.get("/api/projects"), []);
  const { data: team } = useFetch(() => api.get("/api/team"), []);
  const { data: tasks, loading, error, reload } = useFetch(
    () => pid ? api.get(`/api/tasks?project_id=${pid}`) : api.get("/api/tasks"),
    [pid]
  );

  const [activePid, setActivePid] = useState(pid || "");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [dragTask, setDragTask] = useState(null);
  const [overCol, setOverCol] = useState(null);

  useEffect(() => { if (pid) setActivePid(pid); }, [pid]);

  const proj = (projects || []).find(p => p.id === activePid);

  const moveTask = async (tid, col) => {
    try {
      await api.post(`/api/tasks/${tid}/move`, { col });
      reload();
      setSelected(null);
    } catch (e) { notif(e.message, "err"); }
  };

  const delTask = async (tid) => {
    if (!confirm("Excluir tarefa?")) return;
    try { await api.delete(`/api/tasks/${tid}`); reload(); setSelected(null); }
    catch (e) { notif(e.message, "err"); }
  };

  const ptasks = (tasks || []).filter(t =>
    (!activePid || t.project_id === activePid) &&
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadPage />;
  if (error) return <ErrMsg msg={error} onRetry={reload} />;

  return (
    <div>
      <div className="frb mb3">
        <div className="fr fg2">
          {proj && <div style={{ width: 10, height: 10, borderRadius: "50%", background: proj.color || "#3b82f6" }} />}
          <span className="fw7" style={{ fontSize: 15 }}>{proj?.name || "Kanban"}</span>
          {proj && <StatusBdg status={proj.status} />}
        </div>
        <button className="btn bsm bp" onClick={() => setModal({ type: "add" })}>+ Tarefa</button>
      </div>
      <div className="fr fg2 mb3 wrap">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Filtrar..." style={{ maxWidth: 200 }} />
        <select value={activePid} onChange={e => setActivePid(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">Todos projetos</option>
          {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {selected && <span className="tsm tw">1 selecionada — clique coluna para mover</span>}
      </div>

      <div className="board">
        {COLS.map(col => {
          const colTasks = ptasks.filter(t => t.col === col);
          return (
            <div key={col} className="kol">
              <div className="kh" style={{ background: CC[col] + "22", color: CC[col] }}>
                <span>{col}</span>
                <span style={{ background: CC[col], color: "#fff", borderRadius: 10, padding: "1px 8px", fontSize: 11 }}>{colTasks.length}</span>
              </div>
              <div className={`kb drop-zone ${overCol === col ? "over" : ""}`}
                onDragOver={e => { e.preventDefault(); setOverCol(col) }}
                onDragLeave={() => setOverCol(null)}
                onDrop={e => { e.preventDefault(); if (dragTask) { moveTask(dragTask, col); setDragTask(null); setOverCol(null); } }}
                onClick={() => selected && moveTask(selected, col)}>
                {colTasks.map(t => {
                  const member = (team || []).find(u => u.id === t.assignee || u.name === t.assignee);
                  const spent = t.spent_min || 0;
                  const est = t.estimate_min || 0;
                  const pct = est > 0 ? Math.min(100, Math.round(spent / est * 100)) : 0;
                  return (
                    <div key={t.id} className={`kc ${selected === t.id ? "sel" : ""}`}
                      draggable onDragStart={() => setDragTask(t.id)} onDragEnd={() => { setDragTask(null); setOverCol(null); }}
                      onClick={e => { e.stopPropagation(); setSelected(s => s === t.id ? null : t.id) }}>
                      <div className="frb mb1">
                        <Bdg prio={t.priority} />
                        {t.due_date && <span className={`txs ${isOverdue(t.due_date) && col !== "Concluído" ? "td" : "tm"}`}>{fDate(t.due_date)}</span>}
                      </div>
                      <p className="tsm fw5 mb1" style={{ lineHeight: 1.4 }}>{t.title}</p>
                      {t.description && <p className="txs tm mb2 trunc">{t.description}</p>}
                      {est > 0 && <div className="mb2"><Prog val={pct} color={CC[col]} /></div>}
                      <div className="frb">
                        {member ? <Av name={member.name} color={member.color} /> : <span />}
                        <div className="fr fg1 txs tm">
                          {(t.tags || "").split(",").filter(Boolean).slice(0, 2).map(tg => (
                            <span key={tg} className="tag">{tg.trim()}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {colTasks.length === 0 && <div style={{ height: 30, borderRadius: 6, border: "1px dashed #e2e8f0", fontSize: 11, color: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center" }}>vazio</div>}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (() => {
        const t = ptasks.find(x => x.id === selected);
        if (!t) return null;
        return (
          <div className="card mt3" style={{ border: "1px solid #3b82f6" }}>
            <div className="frb">
              <span className="tsm fw6 trunc" style={{ flex: 1, marginRight: 8 }}>📌 {t.title}</span>
              <div className="fr fg2 wrap">
                {COLS.filter(c => c !== t.col).map(c => (
                  <button key={c} className="btn bxs bg" onClick={() => moveTask(t.id, c)} style={{ borderColor: CC[c], color: CC[c] }}>→ {c}</button>
                ))}
                <button className="btn bxs bp" onClick={() => setModal({ type: "edit", task: t })}>✏</button>
                <button className="btn bxs bd" onClick={() => delTask(t.id)}>🗑</button>
                <button className="btn bxs bg" onClick={() => setSelected(null)}>✕</button>
              </div>
            </div>
          </div>
        );
      })()}

      {modal?.type === "add" && <TaskModal projects={projects || []} team={team || []} onClose={() => setModal(null)} onSaved={() => { reload(); setModal(null); }} />}
      {modal?.type === "edit" && <TaskModal task={modal.task} projects={projects || []} team={team || []} onClose={() => setModal(null)} onSaved={() => { reload(); setModal(null); }} />}
    </div>
  );
}

/* ══════════════════════════════════════
   LISTA DE TAREFAS
══════════════════════════════════════ */
function TaskList() {
  const api = useApi();
  const notif = useNotif();
  const { data: projects } = useFetch(() => api.get("/api/projects"), []);
  const { data: team } = useFetch(() => api.get("/api/team"), []);
  const { data: tasks, loading, error, reload } = useFetch(() => api.get("/api/tasks"), []);
  const [filters, setFilters] = useState({ project_id: "", col: "", priority: "", assignee: "", search: "" });
  const [modal, setModal] = useState(null);
  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const del = async (id) => {
    if (!confirm("Excluir tarefa?")) return;
    try { await api.delete(`/api/tasks/${id}`); reload(); notif("Tarefa excluída", "ok"); }
    catch (e) { notif(e.message, "err"); }
  };

  const filtered = (tasks || []).filter(t =>
    (!filters.project_id || t.project_id === filters.project_id) &&
    (!filters.col || t.col === filters.col) &&
    (!filters.priority || t.priority === filters.priority) &&
    (!filters.assignee || t.assignee === filters.assignee) &&
    (!filters.search || t.title.toLowerCase().includes(filters.search.toLowerCase()))
  );

  if (loading) return <LoadPage />;
  if (error) return <ErrMsg msg={error} onRetry={reload} />;

  return (
    <div>
      <div className="frb mb3">
        <div><h2 className="fw7" style={{ fontSize: 16 }}>Tarefas</h2><p className="tsm tm">{filtered.length} de {(tasks || []).length}</p></div>
        <button className="btn bp bsm" onClick={() => setModal({ type: "add" })}>+ Nova Tarefa</button>
      </div>
      <div className="fr fg2 mb3 wrap">
        <input type="text" value={filters.search} onChange={e => setF("search", e.target.value)} placeholder="🔍 Buscar..." style={{ minWidth: 150, flex: 1, maxWidth: 200 }} />
        <select value={filters.project_id} onChange={e => setF("project_id", e.target.value)} style={{ maxWidth: 150 }}>
          <option value="">Todos projetos</option>
          {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filters.col} onChange={e => setF("col", e.target.value)} style={{ maxWidth: 130 }}>
          <option value="">Todas colunas</option>
          {COLS.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setF("priority", e.target.value)} style={{ maxWidth: 110 }}>
          <option value="">Todas prios.</option>
          {PRIOS.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={filters.assignee} onChange={e => setF("assignee", e.target.value)} style={{ maxWidth: 120 }}>
          <option value="">Todos membros</option>
          {(team || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr><th>Tarefa</th><th className="hide-m">Projeto</th><th>Status</th><th>Prio.</th><th className="hide-m">Responsável</th><th>Prazo</th><th className="hide-m">Progresso</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={8}><Empty /></td></tr>
              : filtered.map(t => {
                const proj = (projects || []).find(p => p.id === t.project_id);
                const mem = (team || []).find(u => u.id === t.assignee || u.name === t.assignee);
                const pct = t.estimate_min > 0 ? Math.min(100, Math.round((t.spent_min || 0) / t.estimate_min * 100)) : 0;
                const od = isOverdue(t.due_date) && t.col !== "Concluído";
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="fr fg2">
                        {proj && <div style={{ width: 3, height: 20, borderRadius: 2, background: proj.color || "#94a3b8", flexShrink: 0 }} />}
                        <div style={{ minWidth: 0 }}>
                          <div className="tsm fw5 trunc" style={{ maxWidth: 160, cursor: "pointer" }} onClick={() => setModal({ type: "edit", task: t })}>{t.title}</div>
                          {t.tags && <div>{t.tags.split(",").filter(Boolean).slice(0, 2).map(tg => <span key={tg} className="tag">{tg.trim()}</span>)}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="hide-m tsm tm trunc" style={{ maxWidth: 120 }}>{proj?.name}</td>
                    <td><ColBadge col={t.col} /></td>
                    <td><Bdg prio={t.priority} /></td>
                    <td className="hide-m">{mem ? <div className="fr fg1"><Av name={mem.name} color={mem.color} /><span className="tsm">{mem.name}</span></div> : <span className="txs tm">—</span>}</td>
                    <td><span className={`tsm ${od ? "td fw6" : ""}`}>{od ? "⚠ " : ""}{fDate(t.due_date)}</span></td>
                    <td className="hide-m" style={{ minWidth: 80 }}>
                      <div className="frb txs tm mb1"><span>{pct}%</span><span>{fMin(t.spent_min || 0)}</span></div>
                      <Prog val={pct} color={proj?.color || "#3b82f6"} />
                    </td>
                    <td>
                      <div className="fr fg1">
                        <button className="btn bxs bg" onClick={() => setModal({ type: "edit", task: t })}>✏</button>
                        <button className="btn bxs bd" onClick={() => del(t.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>

      {modal?.type === "add" && <TaskModal projects={projects || []} team={team || []} onClose={() => setModal(null)} onSaved={() => { reload(); setModal(null); }} />}
      {modal?.type === "edit" && <TaskModal task={modal.task} projects={projects || []} team={team || []} onClose={() => setModal(null)} onSaved={() => { reload(); setModal(null); }} />}
    </div>
  );
}

/* ══════════════════════════════════════
   TIMELINE / GANTT
══════════════════════════════════════ */
function Timeline() {
  const api = useApi();
  const { data: projects } = useFetch(() => api.get("/api/projects"), []);
  const [activePid, setActivePid] = useState("");

  useEffect(() => { if (!activePid && projects?.length) setActivePid(projects[0].id); }, [projects]);

  const { data: tasks, loading, error, reload } = useFetch(
    () => activePid ? api.get(`/api/tasks?project_id=${activePid}`) : Promise.resolve([]),
    [activePid]
  );
  const { data: milestones } = useFetch(
    () => activePid ? api.get(`/api/milestones?project_id=${activePid}`) : Promise.resolve([]),
    [activePid]
  );

  const proj = (projects || []).find(p => p.id === activePid);

  if (loading) return <LoadPage />;
  if (error) return <ErrMsg msg={error} onRetry={reload} />;
  if (!proj) return <Empty msg="Selecione um projeto com datas definidas" />;

  const start = proj.start_date || tod();
  const end = proj.end_date || tod();
  const totalDays = Math.max(1, daysDiff(start, end));
  const toX = d => Math.max(0, Math.min(100, daysDiff(start, d) / totalDays * 100));

  const months = [];
  const cur = new Date(start + "T12:00");
  const endD = new Date(end + "T12:00");
  while (cur <= endD) {
    months.push(cur.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }));
    cur.setMonth(cur.getMonth() + 1);
  }

  const ptasks = (tasks || []).filter(t => t.due_date);

  return (
    <div>
      <div className="frb mb3">
        <div><h2 className="fw7" style={{ fontSize: 16 }}>Timeline / Gantt</h2><p className="tsm tm">{fDtLg(start)} → {fDtLg(end)}</p></div>
        <select value={activePid} onChange={e => setActivePid(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">Selecione</option>
          {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div className="gr" style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
          <div className="gl" style={{ fontWeight: 700, fontSize: 11, color: "#475569" }}>Tarefa</div>
          <div className="gt" style={{ height: 30 }}>
            {months.map((m, i) => (
              <div key={i} style={{ position: "absolute", left: `${i / months.length * 100}%`, width: `${1 / months.length * 100}%`, top: 0, height: "100%", borderRight: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#64748b" }}>{m}</div>
            ))}
          </div>
        </div>

        <div className="gr" style={{ background: "#f0f9ff" }}>
          <div className="gl" style={{ fontWeight: 700, fontSize: 12, color: proj.color || "#3b82f6" }}>{proj.name}</div>
          <div className="gt">
            <div className="gb" style={{ left: `${toX(start)}%`, width: `${toX(end) - toX(start)}%`, background: (proj.color || "#3b82f6") + "44", border: `1px solid ${proj.color || "#3b82f6"}` }} />
          </div>
        </div>

        {(milestones || []).map(m => (
          <div key={m.id} className="gr">
            <div className="gl" style={{ fontSize: 11, color: "#64748b" }}>◆ {m.title}</div>
            <div className="gt">
              <div style={{ position: "absolute", left: `${toX(m.date)}%`, transform: "translateX(-50%)", top: 2, fontSize: 14, color: m.done ? "#10b981" : "#f59e0b" }}>◆</div>
            </div>
          </div>
        ))}

        {ptasks.length === 0
          ? <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Nenhuma tarefa com prazo</div>
          : ptasks.map(t => {
            const x1 = toX(t.created_at?.slice(0, 10) || start);
            const x2 = toX(t.due_date);
            const w = Math.max(1, x2 - x1);
            return (
              <div key={t.id} className="gr">
                <div className="gl">
                  <div className="fr fg1">
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: PC[t.priority] || "#94a3b8", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                  </div>
                </div>
                <div className="gt">
                  <div className="gb" style={{ left: `${x1}%`, width: `${w}%`, background: CC[t.col] || "#94a3b8", opacity: t.col === "Concluído" ? 1 : .6 }} title={`${t.title} → ${fDate(t.due_date)}`} />
                </div>
              </div>
            );
          })
        }
      </div>
      <div className="fr fg3 mt3 wrap">
        {Object.entries(CC).map(([k, v]) => (
          <div key={k} className="fr fg1 tsm tm"><div style={{ width: 12, height: 12, borderRadius: 2, background: v }} />{k}</div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   TIME TRACKER
══════════════════════════════════════ */
function Tracker() {
  const api = useApi();
  const notif = useNotif();
  const { data: projects } = useFetch(() => api.get("/api/projects"), []);
  const { data: entries, loading, error, reload } = useFetch(() => api.get("/api/entries"), []);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ project_id: "", task_id: "", description: "", duration_min: 60 });
  const [timer, setTimer] = useState({ on: false, task_id: null, start: null });
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [filterPid, setFilterPid] = useState("");
  const ivRef = useRef(null);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.project_id) api.get(`/api/tasks?project_id=${form.project_id}`).then(setTasks).catch(() => setTasks([]));
    else setTasks([]);
  }, [form.project_id]);

  useEffect(() => {
    if (timer.on) ivRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - timer.start) / 1000)), 1000);
    else { clearInterval(ivRef.current); setElapsed(0); }
    return () => clearInterval(ivRef.current);
  }, [timer.on, timer.start]);

  const fmtT = s => [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(x => x.toString().padStart(2, "0")).join(":");

  const startTimer = () => {
    if (!form.task_id) return notif("Selecione uma tarefa", "err");
    setTimer({ on: true, task_id: form.task_id, start: Date.now() });
  };
  const stopTimer = async () => {
    const mins = Math.max(1, Math.floor((Date.now() - timer.start) / 60000));
    setTimer({ on: false, task_id: null, start: null });
    try {
      await api.post("/api/entries", { task_id: timer.task_id, project_id: form.project_id, description: "Sessão de timer", duration_min: mins, date: tod() });
      reload(); notif(`${fMin(mins)} registrado","ok`);
    } catch (e) { notif(e.message, "err"); }
  };

  const addEntry = async () => {
    if (!form.task_id) return notif("Selecione a tarefa", "err");
    if (!form.duration_min || form.duration_min < 1) return notif("Duração inválida", "err");
    setSaving(true);
    try {
      await api.post("/api/entries", { task_id: form.task_id, project_id: form.project_id, description: form.description || "Sem descrição", duration_min: +form.duration_min, date: tod() });
      reload(); notif("Horas registradas", "ok"); setF("description", ""); setF("duration_min", 60);
    } catch (e) { notif(e.message, "err"); }
    finally { setSaving(false); }
  };

  const delEntry = async (id) => {
    try { await api.delete(`/api/entries/${id}`); reload(); }
    catch (e) { notif(e.message, "err"); }
  };

  const totalToday = (entries || []).filter(e => e.date === tod()).reduce((s, e) => s + (e.duration_min || 0), 0);
  const totalAll = (entries || []).reduce((s, e) => s + (e.duration_min || 0), 0);
  const filtered = (entries || []).filter(e => !filterPid || e.project_id === filterPid);

  if (loading) return <LoadPage />;
  if (error) return <ErrMsg msg={error} onRetry={reload} />;

  const timerTask = tasks.find(t => t.id === timer.task_id);

  return (
    <div>
      <div className="frb mb4">
        <div><h2 className="fw7" style={{ fontSize: 16 }}>Time Tracking</h2><p className="tsm tm">{fMin(totalToday)} hoje · {fMin(totalAll)} total</p></div>
      </div>

      <div className="card mb4" style={{ textAlign: "center", padding: "24px 16px" }}>
        <div className="timer-num mb2">{fmtT(elapsed)}</div>
        {timer.on && timerTask && <div className="tsm tm mb3">⏱ {timerTask.title}</div>}
        {!timer.on ? (
          <div>
            <div className="fr fg2 mb3" style={{ justifyContent: "center", flexWrap: "wrap" }}>
              <select value={form.project_id} onChange={e => setF("project_id", e.target.value)} style={{ maxWidth: 170 }}>
                <option value="">— projeto —</option>
                {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={form.task_id} onChange={e => setF("task_id", e.target.value)} style={{ maxWidth: 200 }}>
                <option value="">— tarefa —</option>
                {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <button className="btn bs" style={{ padding: "10px 32px", fontSize: 15 }} onClick={startTimer}>▶ Iniciar Timer</button>
          </div>
        ) : (
          <button className="btn bd" style={{ padding: "10px 32px", fontSize: 15 }} onClick={stopTimer}>⏹ Parar e Salvar</button>
        )}
      </div>

      <div className="card mb4">
        <p className="fw6 tsm mb3">+ Registro Manual</p>
        <div className="g2">
          <Field label="Projeto">
            <select value={form.project_id} onChange={e => setF("project_id", e.target.value)}>
              <option value="">— selecione —</option>
              {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Tarefa">
            <select value={form.task_id} onChange={e => setF("task_id", e.target.value)}>
              <option value="">— selecione —</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </Field>
          <Field label="Descrição"><input type="text" value={form.description} onChange={e => setF("description", e.target.value)} placeholder="O que foi feito?" /></Field>
          <Field label="Duração (min)"><input type="number" value={form.duration_min} min={1} onChange={e => setF("duration_min", e.target.value)} /></Field>
        </div>
        <button className="btn bp bsm" onClick={addEntry} disabled={saving}>{saving ? <Spin /> : "Registrar"}</button>
      </div>

      <div className="frb mb2">
        <span className="fw6 tsm">Histórico</span>
        <select value={filterPid} onChange={e => setFilterPid(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">Todos projetos</option>
          {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="tbl">
          <thead><tr><th>Tarefa</th><th className="hide-m">Projeto</th><th>Descrição</th><th>Duração</th><th>Data</th><th></th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={6}><Empty msg="Sem registros" /></td></tr> :
              [...filtered].reverse().map(e => (
                <tr key={e.id}>
                  <td className="tsm">{e.task_title || e.task_id}</td>
                  <td className="hide-m tsm tm">{e.project_name || e.project_id}</td>
                  <td className="tsm tm">{e.description}</td>
                  <td><span className="tsm fw6" style={{ color: "#3b82f6" }}>{fMin(e.duration_min)}</span></td>
                  <td className="tsm">{fDate(e.date)}</td>
                  <td><button className="btn bxs bd" onClick={() => delEntry(e.id)}>✕</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   WIKI
══════════════════════════════════════ */
function WikiPageModal({ page, projects, onClose, onSaved }) {
  const api = useApi();
  const notif = useNotif();
  const isEdit = !!page?.id;
  const [form, setForm] = useState({ project_id: projects[0]?.id || "", title: "", body: "", ...(page || { project_id: page?.project_id }) });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) return notif("Título obrigatório", "err");
    setSaving(true);
    try {
      if (isEdit) await api.put(`/api/wiki/${page.id}`, form);
      else await api.post("/api/wiki", form);
      notif(isEdit ? "Página atualizada" : "Página criada", "ok");
      onSaved();
    } catch (e) { notif(e.message, "err"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? "Editar Página" : "Nova Página"} onClose={onClose} wide
      footer={<><button className="btn bg" onClick={onClose}>Cancelar</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? <Spin /> : isEdit ? "Salvar" : "Criar"}</button></>}>
      <div className="g2">
        <Field label="Projeto">
          <select value={form.project_id} onChange={e => set("project_id", e.target.value)}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Título *"><input type="text" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Título da página" /></Field>
      </div>
      <Field label="Conteúdo (suporta #, ##, **negrito**, `código`)">
        <textarea value={form.body} onChange={e => set("body", e.target.value)} rows={14} style={{ fontFamily: "monospace", fontSize: 12 }} placeholder="Escreva aqui..." />
      </Field>
    </Modal>
  );
}

function Wiki() {
  const api = useApi();
  const notif = useNotif();
  const { data: projects } = useFetch(() => api.get("/api/projects"), []);
  const { data: pages, loading, error, reload } = useFetch(() => api.get("/api/wiki"), []);
  const [selected, setSelected] = useState(null);
  const [filterPid, setFilterPid] = useState("");
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [modal, setModal] = useState(null);

  const del = async (id) => {
    if (!confirm("Excluir página?")) return;
    try { await api.delete(`/api/wiki/${id}`); reload(); setSelected(null); notif("Página excluída", "ok"); }
    catch (e) { notif(e.message, "err"); }
  };

  const saveBody = async () => {
    const p = (pages || []).find(x => x.id === selected);
    if (!p) return;
    try { await api.put(`/api/wiki/${selected}`, { ...p, body: editBody }); reload(); setEditing(false); notif("Salvo", "ok"); }
    catch (e) { notif(e.message, "err"); }
  };

  const renderMd = txt => !txt ? "" : txt
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

  const filtered = (pages || []).filter(p => !filterPid || p.project_id === filterPid);
  const selectedPage = (pages || []).find(p => p.id === selected);

  if (loading) return <LoadPage />;
  if (error) return <ErrMsg msg={error} onRetry={reload} />;

  return (
    <div>
      <div className="frb mb3">
        <div><h2 className="fw7" style={{ fontSize: 16 }}>Wiki / Documentação</h2><p className="tsm tm">{(pages || []).length} páginas</p></div>
        <button className="btn bp bsm" onClick={() => setModal({ type: "add" })}>+ Nova Página</button>
      </div>

      <div className="g3" style={{ alignItems: "start" }}>
        <div className="card fc fg2">
          <select value={filterPid} onChange={e => setFilterPid(e.target.value)}>
            <option value="">Todos projetos</option>
            {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <hr />
          {filtered.length === 0 ? <Empty msg="Nenhuma página" /> :
            filtered.map(p => {
              const proj = (projects || []).find(x => x.id === p.project_id);
              return (
                <div key={p.id} onClick={() => { setSelected(p.id); setEditing(false); }}
                  style={{
                    padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                    background: selected === p.id ? "#eff6ff" : "transparent",
                    borderLeft: selected === p.id ? "3px solid #3b82f6" : "3px solid transparent"
                  }}>
                  <div className="tsm fw5">{p.title}</div>
                  <div className="txs tm">{proj?.name} · {fDate(p.updated_at?.slice(0, 10))}</div>
                </div>
              );
            })}
        </div>

        <div className="card" style={{ gridColumn: "span 2", minHeight: 300 }}>
          {!selectedPage ? <Empty msg="Selecione uma página" /> : <>
            <div className="frb mb3">
              <div>
                <h3 className="fw7" style={{ fontSize: 15 }}>{selectedPage.title}</h3>
                <span className="txs tm">Atualizado {fDate(selectedPage.updated_at?.slice(0, 10))}</span>
              </div>
              <div className="fr fg2">
                <button className="btn bsm bg" onClick={() => { setEditing(!editing); setEditBody(selectedPage.body) }}>{editing ? "Pré-visualizar" : "✏ Editar"}</button>
                <button className="btn bsm bd" onClick={() => del(selected)}>🗑</button>
              </div>
            </div>
            {editing ? (
              <>
                <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={18} style={{ fontFamily: "monospace", fontSize: 12 }} />
                <div className="fr fg2 mt2">
                  <button className="btn bp bsm" onClick={saveBody}>Salvar</button>
                  <button className="btn bg bsm" onClick={() => setEditing(false)}>Cancelar</button>
                </div>
              </>
            ) : (
              <div className="wiki-body" dangerouslySetInnerHTML={{ __html: renderMd(selectedPage.body) }} />
            )}
          </>}
        </div>
      </div>

      {modal?.type === "add" && <WikiPageModal projects={projects || []} onClose={() => setModal(null)} onSaved={() => { reload(); setModal(null); }} />}
    </div>
  );
}

/* ══════════════════════════════════════
   AUTOMAÇÕES
══════════════════════════════════════ */
function AutoModal({ team, onClose, onSaved }) {
  const api = useApi();
  const notif = useNotif();
  const [form, setForm] = useState({ name: "", on: true, trigger: { evt: "col_change", to: "Concluído", val: "urgente" }, action: { type: "notify", msg: "", col: "Em Andamento", who: (team || [])[0]?.id || "" } });
  const [saving, setSaving] = useState(false);
  const setT = (k, v) => setForm(f => ({ ...f, trigger: { ...f.trigger, [k]: v } }));
  const setA = (k, v) => setForm(f => ({ ...f, action: { ...f.action, [k]: v } }));

  const save = async () => {
    if (!form.name.trim()) return notif("Nome obrigatório", "err");
    setSaving(true);
    try { await api.post("/api/automations", form); notif("Regra criada", "ok"); onSaved(); }
    catch (e) { notif(e.message, "err"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Nova Regra de Automação" onClose={onClose}
      footer={<><button className="btn bg" onClick={onClose}>Cancelar</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? <Spin /> : "Criar Regra"}</button></>}>
      <Field label="Nome *"><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Notificar ao concluir" /></Field>
      <hr />
      <p className="tsm fw6 mb2" style={{ color: "#f59e0b" }}>⚡ QUANDO (gatilho)</p>
      <Field label="Evento">
        <select value={form.trigger.evt} onChange={e => setT("evt", e.target.value)}>
          {AUTO_TRIGGERS.map(t => <option key={t.val} value={t.val}>{t.lbl}</option>)}
        </select>
      </Field>
      {form.trigger.evt === "col_change" && <Field label="Para coluna"><select value={form.trigger.to} onChange={e => setT("to", e.target.value)}>{COLS.map(c => <option key={c}>{c}</option>)}</select></Field>}
      {form.trigger.evt === "prio_set" && <Field label="Prioridade"><select value={form.trigger.val} onChange={e => setT("val", e.target.value)}>{PRIOS.map(p => <option key={p}>{p}</option>)}</select></Field>}
      <hr />
      <p className="tsm fw6 mb2" style={{ color: "#10b981" }}>✅ ENTÃO (ação)</p>
      <Field label="Ação">
        <select value={form.action.type} onChange={e => setA("type", e.target.value)}>
          {AUTO_ACTIONS.map(a => <option key={a.val} value={a.val}>{a.lbl}</option>)}
        </select>
      </Field>
      {form.action.type === "notify" && <Field label="Mensagem"><input type="text" value={form.action.msg} onChange={e => setA("msg", e.target.value)} placeholder="Mensagem da notificação" /></Field>}
      {form.action.type === "col_move" && <Field label="Mover para"><select value={form.action.col} onChange={e => setA("col", e.target.value)}>{COLS.map(c => <option key={c}>{c}</option>)}</select></Field>}
      {form.action.type === "assign" && <Field label="Atribuir a"><select value={form.action.who} onChange={e => setA("who", e.target.value)}>{(team || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>}
      {form.action.type === "set_prio" && <Field label="Prioridade"><select value={form.action.prio || "alta"} onChange={e => setA("prio", e.target.value)}>{PRIOS.map(p => <option key={p}>{p}</option>)}</select></Field>}
    </Modal>
  );
}

function Automations() {
  const api = useApi();
  const notif = useNotif();
  const { data: team } = useFetch(() => api.get("/api/team"), []);
  const { data: autos, loading, error, reload } = useFetch(() => api.get("/api/automations"), []);
  const [modal, setModal] = useState(null);

  const toggle = async (id) => {
    try { await api.post(`/api/automations/${id}/toggle`); reload(); }
    catch (e) { notif(e.message, "err"); }
  };

  const del = async (id) => {
    if (!confirm("Excluir regra?")) return;
    try { await api.delete(`/api/automations/${id}`); reload(); notif("Regra excluída", "ok"); }
    catch (e) { notif(e.message, "err"); }
  };

  const triggerLabel = t => {
    const m = AUTO_TRIGGERS.find(x => x.val === t?.evt);
    return (m?.lbl || t?.evt || "") + (t?.to ? ` → "${t.to}"` : t?.val ? ` = "${t.val}"` : "");
  };
  const actionLabel = a => {
    if (!a) return "";
    if (a.type === "notify") return `📢 Notificar: "${a.msg}"`;
    if (a.type === "col_move") return `📌 Mover para "${a.col}"`;
    if (a.type === "assign") return `👤 Atribuir`;
    if (a.type === "set_prio") return `⚡ Prioridade = ${a.prio}`;
    return a.type;
  };

  if (loading) return <LoadPage />;
  if (error) return <ErrMsg msg={error} onRetry={reload} />;

  const list = autos || [];
  const totalRuns = list.reduce((s, a) => s + (a.runs || 0), 0);
  const activeCount = list.filter(a => a.active || a.on).length;

  return (
    <div>
      <div className="frb mb4">
        <div><h2 className="fw7" style={{ fontSize: 16 }}>Automações</h2><p className="tsm tm">{activeCount} ativas · {totalRuns} execuções</p></div>
        <button className="btn bp bsm" onClick={() => setModal({ type: "add" })}>+ Nova Regra</button>
      </div>

      <div className="g4 mb4">
        {[
          { v: list.length, l: "Regras criadas" },
          { v: activeCount, l: "Ativas" },
          { v: totalRuns, l: "Total execuções" },
          { v: list.filter(a => a.active && a.runs > 0).length, l: "Disparadas" },
        ].map(s => (
          <div key={s.l} className="card"><div className="stat-val">{s.v}</div><div className="stat-lbl">{s.l}</div></div>
        ))}
      </div>

      <div className="fc fg3">
        {list.length === 0 ? <Empty msg="Nenhuma regra criada" /> :
          list.map(rule => {
            const active = rule.active === 1 || rule.active === true || rule.on === true;
            const trigger = typeof rule.trigger === "string" ? JSON.parse(rule.trigger) : rule.trigger;
            const action = typeof rule.action === "string" ? JSON.parse(rule.action) : rule.action;
            return (
              <div key={rule.id} className="card" style={{ borderLeft: `3px solid ${active ? "#10b981" : "#e2e8f0"}` }}>
                <div className="frb mb2">
                  <div className="fr fg2">
                    <span className={`txs fw7 ${active ? "ts" : "tm"}`}>{active ? "● ATIVA" : "○ INATIVA"}</span>
                    <span className="tsm fw6">{rule.name}</span>
                  </div>
                  <div className="fr fg2">
                    <span className="txs tm">{rule.runs || 0} runs</span>
                    <button className={`btn bsm ${active ? "bg" : "bs"}`} onClick={() => toggle(rule.id)}>{active ? "Desativar" : "Ativar"}</button>
                    <button className="btn bsm bd" onClick={() => del(rule.id)}>🗑</button>
                  </div>
                </div>
                <div className="fr fg3 wrap tsm">
                  <div className="card" style={{ padding: "6px 10px", background: "#fff7ed", flex: 1, minWidth: 150 }}>
                    <div className="txs fw6 tw mb1">⚡ QUANDO</div>
                    <div>{triggerLabel(trigger)}</div>
                  </div>
                  <div style={{ fontSize: 16, color: "#94a3b8", alignSelf: "center" }}>→</div>
                  <div className="card" style={{ padding: "6px 10px", background: "#f0fdf4", flex: 1, minWidth: 150 }}>
                    <div className="txs fw6 ts mb1">✅ ENTÃO</div>
                    <div>{actionLabel(action)}</div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {modal?.type === "add" && <AutoModal team={team || []} onClose={() => setModal(null)} onSaved={() => { reload(); setModal(null); }} />}
    </div>
  );
}

/* ══════════════════════════════════════
   RELATÓRIOS
══════════════════════════════════════ */
function Reports() {
  const api = useApi();
  const { data: projects } = useFetch(() => api.get("/api/projects"), []);
  const { data: tasks, loading: lt, error: et, reload: rt } = useFetch(() => api.get("/api/tasks"), []);
  const { data: entries, loading: le } = useFetch(() => api.get("/api/entries"), []);
  const { data: team } = useFetch(() => api.get("/api/team"), []);

  if (lt || le) return <LoadPage />;
  if (et) return <ErrMsg msg={et} onRetry={rt} />;

  const projs = projects || [];
  const tList = tasks || [];
  const eList = entries || [];
  const members = team || [];

  const projStats = projs.map(p => {
    const pt = tList.filter(t => t.project_id === p.id);
    const pd = pt.filter(t => t.col === "Concluído");
    const ph = eList.filter(e => e.project_id === p.id).reduce((s, e) => s + (e.duration_min || 0), 0);
    return { ...p, total: pt.length, done: pd.length, pct: pt.length ? Math.round(pd.length / pt.length * 100) : 0, hours: Math.round(ph / 60 * 10) / 10 };
  });

  const memberStats = members.map(u => {
    const ut = tList.filter(t => t.assignee === u.id || t.assignee === u.name);
    const ud = ut.filter(t => t.col === "Concluído");
    const uh = eList.filter(e => e.user_id === u.id).reduce((s, e) => s + (e.duration_min || 0), 0);
    return { ...u, total: ut.length, done: ud.length, hours: Math.round(uh / 60 * 10) / 10 };
  });

  const colStats = COLS.map(c => ({ col: c, count: tList.filter(t => t.col === c).length, color: CC[c] }));
  const maxCol = Math.max(...colStats.map(c => c.count), 1);
  const prioStats = PRIOS.map(p => ({ prio: p, count: tList.filter(t => t.priority === p).length, color: PC[p] }));
  const maxPrio = Math.max(...prioStats.map(p => p.count), 1);

  return (
    <div>
      <div className="mb4"><h2 className="fw7" style={{ fontSize: 16 }}>Relatórios</h2><p className="tsm tm">Dados em tempo real do banco</p></div>

      <div className="g2 mb4">
        <div className="card">
          <p className="fw6 tsm mb3">Tarefas por Status</p>
          <div className="fc fg2">
            {colStats.map(c => (
              <div key={c.col}>
                <div className="frb tsm mb1"><span>{c.col}</span><span className="fw6">{c.count}</span></div>
                <div className="prog" style={{ height: 10 }}><div className="pfill" style={{ width: `${c.count / maxCol * 100}%`, background: c.color }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <p className="fw6 tsm mb3">Tarefas por Prioridade</p>
          <div className="fc fg2">
            {prioStats.map(p => (
              <div key={p.prio}>
                <div className="frb tsm mb1"><span style={{ textTransform: "capitalize" }}>{p.prio}</span><span className="fw6">{p.count}</span></div>
                <div className="prog" style={{ height: 10 }}><div className="pfill" style={{ width: `${p.count / maxPrio * 100}%`, background: p.color }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mb4" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "12px 14px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid #e2e8f0" }}>Desempenho por Projeto</div>
        <table className="tbl">
          <thead><tr><th>Projeto</th><th>Status</th><th>Tarefas</th><th>Concluídas</th><th>Progresso</th><th>Horas</th></tr></thead>
          <tbody>
            {projStats.length === 0 ? <tr><td colSpan={6}><Empty /></td></tr> :
              projStats.map(p => (
                <tr key={p.id}>
                  <td><div className="fr fg2"><div style={{ width: 10, height: 10, borderRadius: "50%", background: p.color || "#94a3b8" }} /><span className="tsm fw5">{p.name}</span></div></td>
                  <td><StatusBdg status={p.status} /></td>
                  <td className="tsm">{p.total}</td>
                  <td><span className="tsm ts fw6">{p.done}</span></td>
                  <td style={{ minWidth: 80 }}><div className="frb txs mb1"><span>{p.pct}%</span></div><Prog val={p.pct} color={p.color || "#3b82f6"} /></td>
                  <td><span className="tsm fw6" style={{ color: "#3b82f6" }}>{p.hours}h</span></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "12px 14px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid #e2e8f0" }}>Desempenho por Membro</div>
        <table className="tbl">
          <thead><tr><th>Membro</th><th>Função</th><th>Tarefas</th><th>Concluídas</th><th>Taxa</th><th>Horas</th></tr></thead>
          <tbody>
            {memberStats.length === 0 ? <tr><td colSpan={6}><Empty /></td></tr> :
              memberStats.map(u => (
                <tr key={u.id}>
                  <td><div className="fr fg2"><Av name={u.name} color={u.color} /><span className="tsm fw5">{u.name}</span></div></td>
                  <td className="tsm tm">{u.role}</td>
                  <td className="tsm">{u.total}</td>
                  <td><span className="tsm ts fw6">{u.done}</span></td>
                  <td className="tsm fw6">{u.total > 0 ? Math.round(u.done / u.total * 100) : 0}%</td>
                  <td><span className="tsm fw6" style={{ color: "#3b82f6" }}>{u.hours}h</span></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MILESTONES
══════════════════════════════════════ */
function Milestones() {
  const api = useApi();
  const notif = useNotif();
  const { data: projects } = useFetch(() => api.get("/api/projects"), []);
  const { data: ms, loading, error, reload } = useFetch(() => api.get("/api/milestones"), []);
  const [form, setForm] = useState({ project_id: "", title: "", date: tod(), done: false });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { if (!form.project_id && projects?.length) setForm(f => ({ ...f, project_id: projects[0].id })); }, [projects]);

  const add = async () => {
    if (!form.title.trim()) return notif("Título obrigatório", "err");
    setSaving(true);
    try { await api.post("/api/milestones", form); reload(); notif("Milestone criado", "ok"); setForm(f => ({ ...f, title: "", date: tod() })); }
    catch (e) { notif(e.message, "err"); }
    finally { setSaving(false); }
  };
  const toggle = async (id) => {
    try { await api.post(`/api/milestones/${id}/toggle`); reload(); }
    catch (e) { notif(e.message, "err"); }
  };
  const del = async (id) => {
    if (!confirm("Excluir milestone?")) return;
    try { await api.delete(`/api/milestones/${id}`); reload(); }
    catch (e) { notif(e.message, "err"); }
  };

  if (loading) return <LoadPage />;
  if (error) return <ErrMsg msg={error} onRetry={reload} />;

  return (
    <div>
      <div className="frb mb4"><h2 className="fw7" style={{ fontSize: 16 }}>Milestones</h2></div>
      <div className="g2" style={{ alignItems: "start" }}>
        <div className="card">
          <p className="fw6 tsm mb3">Novo Milestone</p>
          <Field label="Projeto">
            <select value={form.project_id} onChange={e => set("project_id", e.target.value)}>
              <option value="">— selecione —</option>
              {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Título *"><input type="text" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Nome do milestone" /></Field>
          <Field label="Data"><input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></Field>
          <button className="btn bp bsm mt2" onClick={add} disabled={saving}>{saving ? <Spin /> : "Criar"}</button>
        </div>
        <div className="card">
          <p className="fw6 tsm mb3">Lista ({(ms || []).length})</p>
          {(ms || []).length === 0 ? <Empty msg="Nenhum milestone" /> :
            [...(ms || [])].sort((a, b) => a.date.localeCompare(b.date)).map(m => {
              const proj = (projects || []).find(p => p.id === m.project_id);
              return (
                <div key={m.id} className="frb" style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div className="fr fg2">
                    <input type="checkbox" checked={!!m.done} onChange={() => toggle(m.id)} style={{ width: 15, height: 15, accentColor: "#3b82f6" }} />
                    <div>
                      <div className="tsm" style={{ textDecoration: m.done ? "line-through" : "none", color: m.done ? "#94a3b8" : "inherit" }}>{m.title}</div>
                      <div className="txs tm">{proj?.name} · {fDate(m.date)}</div>
                    </div>
                  </div>
                  <button className="btn bxs bd" onClick={() => del(m.id)}>🗑</button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   CONFIGURAÇÕES
══════════════════════════════════════ */
function Settings() {
  const api = useApi();
  const notif = useNotif();
  const { data: team, loading, error, reload } = useFetch(() => api.get("/api/team"), []);
  const [form, setForm] = useState({ name: "", role: "", color: "#3b82f6", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"];

  const add = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return notif("Nome, email e senha são obrigatórios", "err");
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      reload(); notif("Membro adicionado", "ok"); setForm({ name: "", role: "", color: "#3b82f6", email: "", password: "" });
    } catch (e) { notif(e.message, "err"); }
    finally { setSaving(false); }
  };
  const del = async (id) => {
    if (!confirm("Remover membro?")) return;
    try { await api.delete(`/api/team/${id}`); reload(); notif("Membro removido", "ok"); }
    catch (e) { notif(e.message, "err"); }
  };

  if (loading) return <LoadPage />;
  if (error) return <ErrMsg msg={error} onRetry={reload} />;

  return (
    <div>
      <div className="mb4"><h2 className="fw7" style={{ fontSize: 16 }}>Configurações</h2><p className="tsm tm">Equipe e sistema</p></div>
      <div className="g2" style={{ alignItems: "start" }}>
        <div className="card">
          <p className="fw6 tsm mb3">Equipe ({(team || []).length} membros)</p>
          <div className="fc fg2 mb3">
            {(team || []).map(u => (
              <div key={u.id} className="frb" style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div className="fr fg2">
                  <Av name={u.name} color={u.color} size="avlg" />
                  <div>
                    <div className="tsm fw6">{u.name}</div>
                    <div className="txs tm">{u.role}</div>
                    <div className="txs tm">{u.email}</div>
                  </div>
                </div>
                <button className="btn bxs bd" onClick={() => del(u.id)}>🗑</button>
              </div>
            ))}
          </div>
          <hr />
          <p className="fw6 tsm mb2">Adicionar Membro</p>
          <Field label="Nome *"><input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nome completo" /></Field>
          <Field label="Função"><input type="text" value={form.role} onChange={e => set("role", e.target.value)} placeholder="Ex: Frontend Dev" /></Field>
          <Field label="Email *"><input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@empresa.com" /></Field>
          <Field label="Senha *"><input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Senha inicial" /></Field>
          <Field label="Cor">
            <div className="fr fg2 mt1 wrap">
              {COLORS.map(c => <div key={c} onClick={() => set("color", c)} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "3px solid #1e293b" : "2px solid transparent" }} />)}
            </div>
          </Field>
          <button className="btn bp bsm mt2" onClick={add} disabled={saving}>{saving ? <Spin /> : "Adicionar"}</button>
        </div>

        <div>
          <div className="card mb3">
            <p className="fw6 tsm mb2">Sobre o ProjectFlow</p>
            <div className="tsm tm fc fg1">
              <span>Versão 2.0.0 — Produção / Sem dados demo</span>
              <span>Stack: React + Cloudflare Workers + D1</span>
              <span>PWA offline-first · Autenticação JWT</span>
            </div>
            <hr />
            <p className="txs tm">
              API: <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>{API_BASE}</code>
            </p>
          </div>
          <div className="card">
            <p className="fw6 tsm mb2">Atalhos de teclado</p>
            {[["N", "Nova tarefa"], ["P", "Novo projeto"], ["K", "Kanban"], ["T", "Timeline"], ["R", "Relatórios"]].map(([k, v]) => (
              <div key={k} className="frb tsm mb1">
                <span className="tm">{v}</span>
                <kbd style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, fontSize: 11, border: "1px solid #e2e8f0" }}>{k}</kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   WRAPPER — injects styles + notif
══════════════════════════════════════ */
function PFWrapper({ children }) {
  return (
    <div className="pf-wrapper">
      <style>{STYLES}</style>
      <NotifProvider>
        {children}
      </NotifProvider>
    </div>
  );
}

/* ══════════════════════════════════════
   EXPORTED PAGE COMPONENTS
══════════════════════════════════════ */
export function PFDashboard() { return <PFWrapper><Dashboard /></PFWrapper>; }
export function PFProjects() { return <PFWrapper><Projects /></PFWrapper>; }
export function PFKanban() { return <PFWrapper><Kanban /></PFWrapper>; }
export function PFTaskList() { return <PFWrapper><TaskList /></PFWrapper>; }
export function PFTimeline() { return <PFWrapper><Timeline /></PFWrapper>; }
export function PFTracker() { return <PFWrapper><Tracker /></PFWrapper>; }
export function PFWiki() { return <PFWrapper><Wiki /></PFWrapper>; }
export function PFMilestones() { return <PFWrapper><Milestones /></PFWrapper>; }
export function PFAutomations() { return <PFWrapper><Automations /></PFWrapper>; }
export function PFReports() { return <PFWrapper><Reports /></PFWrapper>; }
export function PFSettings() { return <PFWrapper><Settings /></PFWrapper>; }

// Default export for backwards compatibility
export default PFDashboard;
