// ============================================================
// Finance Module — Adapted from money/imperio-lord-app.jsx
// Uses CRM's apiFetch for API calls
// ============================================================
import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "../../stores/authStore";

// ─── PALETA ───────────────────────────────────────────────────────────────────
const C = {
    bg: "#07070F",
    surface: "#0E0E1B",
    card: "#121220",
    border: "#1A1A2E",
    gold: "#F5C518",
    goldD: "#C9A010",
    blue: "#3B7EF5",
    green: "#22C55E",
    red: "#EF4444",
    orange: "#F97316",
    yellow: "#EAB308",
    text: "#EEEEF8",
    mid: "#7070A0",
    dim: "#353555",
};

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────
const R$ = v =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v ?? 0);
const pct = (a, b) => b ? Math.min(100, Math.round((a / b) * 100)) : 0;
const dd = s => { if (!s) return ""; const [y, m, d] = s.split("-"); return `${d}/${m}`; };
const hoje = () => new Date().toISOString().slice(0, 10);
const mesAtual = () => new Date().toISOString().slice(0, 7);

const NIVEL_NOME = ["", "Empreendedor", "Construtor", "Executor", "Vendedor", "Estrategista", "Fundador", "Fund. Ativo", "Sócio Sênior", "Dominador", "Império"];
const NIVEL_XP = [0, 0, 500, 1200, 2500, 5000, 10000, 18000, 30000, 50000, 100000];
const nivelAtual = xp => { let n = 1; for (let i = 1; i <= 10; i++) if (xp >= NIVEL_XP[i]) n = i; return n; };
const xpProximo = n => NIVEL_XP[Math.min(n + 1, 10)];

const ST_COR = { vence_hoje: C.orange, inadimplente: C.red, aguardando: C.yellow, recebido: C.green, futuro: C.dim, vencida: C.red };
const ST_LABEL = { vence_hoje: "HOJE", inadimplente: "ATRASO", aguardando: "AGUARD.", recebido: "✓ PAGO", futuro: "FUTURO", vencida: "VENCIDA" };
const EST_COR = { prospeccao: C.mid, proposta: C.blue, negociacao: C.yellow, fechamento: C.green, fechado: C.dim };
const EST_LBL = { prospeccao: "Prospecção", proposta: "Proposta", negociacao: "Negociação", fechamento: "Fechamento", fechado: "Fechado" };

const CATS_ENTRADA = ["Recorrente", "Projeto", "Contrato", "Adiantamento", "Comissão", "Outro"];
const CATS_SAIDA = ["Fixo", "Variável", "Retirada", "Equipe", "Marketing", "Ferramentas", "Pessoal", "Viagem", "Outro"];
const FORMAS = ["PIX", "Dinheiro", "Boleto", "Crédito", "Débito", "TED"];

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useAPI(endpoint, deps = []) {
    const [data, setData] = useState(null);
    const [loading, setLoad] = useState(true);
    const [error, setError] = useState(null);
    const ref = useRef(endpoint);
    ref.current = endpoint;

    const fetch_ = useCallback(async () => {
        setLoad(true); setError(null);
        try {
            const r = await apiFetch(ref.current);
            // apiFetch returns parsed JSON; if it has .data use that, else use raw
            if (r && r.data !== undefined) setData(r.data);
            else setData(r);
        } catch (e) { setError(e.message); }
        finally { setLoad(false); }
    }, deps);

    useEffect(() => { fetch_(); }, [fetch_]);
    return { data, loading, error, refetch: fetch_ };
}

function useDesktop() {
    const [desktop, setDesktop] = useState(() => window.innerWidth >= 1024);
    useEffect(() => {
        const h = () => setDesktop(window.innerWidth >= 1024);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return desktop;
}

// ─── COMPONENTES ATÔMICOS ─────────────────────────────────────────────────────
const Card = ({ children, style = {}, onClick }) => (
    <div onClick={onClick} style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: "14px 16px",
        cursor: onClick ? "pointer" : "default", ...style
    }}>{children}</div>
);

const Badge = ({ label, color }) => (
    <span style={{
        background: `${color}22`, color, border: `1px solid ${color}44`,
        borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700
    }}>{label}</span>
);

const Bar = ({ value, max, color = C.gold, h = 6, style = {} }) => (
    <div style={{ background: C.dim, borderRadius: 99, height: h, overflow: "hidden", ...style }}>
        <div style={{ width: `${pct(value, max)}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.4s" }} />
    </div>
);

const Chip = ({ label, active, onClick, color = C.gold }) => (
    <button onClick={onClick} style={{
        background: active ? color : C.border,
        color: active ? "#000" : C.mid, border: "none", borderRadius: 8,
        padding: "8px 14px", fontSize: 13, fontWeight: active ? 700 : 500,
        cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s"
    }}>{label}</button>
);

const Loader = ({ label = "Carregando..." }) => (
    <div style={{ padding: 40, textAlign: "center", color: C.mid, fontSize: 14 }}>
        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5, animation: "spin 1s linear infinite" }}>⟳</div>
        {label}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
);

const Empty = ({ icon = "📭", label }) => (
    <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
        <div style={{ color: C.mid, fontSize: 14 }}>{label}</div>
    </div>
);

const ErrBox = ({ msg, onRetry }) => (
    <div style={{
        margin: 16, padding: "14px 16px", borderRadius: 12,
        background: "#1A0808", border: `1px solid ${C.red}44`, color: C.red, fontSize: 13
    }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ Erro ao carregar dados</div>
        <div style={{ opacity: 0.8, marginBottom: 10 }}>{msg}</div>
        {onRetry && <button onClick={onRetry} style={{
            background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`,
            borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer"
        }}>Tentar novamente</button>}
    </div>
);

// ─── MODAL: LANÇAR MOVIMENTAÇÃO ───────────────────────────────────────────────
function AddModal({ onClose, onSaved }) {
    const [tipo, setTipo] = useState("entrada");
    const [valor, setVal] = useState("");
    const [cat, setCat] = useState("");
    const [desc, setDesc] = useState("");
    const [forma, setForma] = useState("PIX");
    const [socio, setSocio] = useState("empresa");
    const [saving, setSave] = useState(false);
    const [errmsg, setErr] = useState("");

    const { data: socios } = useAPI("/api/socios");

    const cats = tipo === "entrada" ? CATS_ENTRADA : CATS_SAIDA;
    const rawNum = valor.replace(/\D/g, "");
    const numVal = rawNum ? Number(rawNum) / 100 : 0;
    const dispVal = numVal ? numVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";

    const valid = numVal > 0 && cat;

    const save = async () => {
        if (!valid || saving) return;
        setSave(true); setErr("");
        try {
            await apiFetch("/api/movimentacoes", {
                method: "POST",
                body: JSON.stringify({
                    tipo, valor: numVal, cat, descricao: desc || cat,
                    forma, socio_id: socio, data: hoje(), categoria: cat
                })
            });
            onSaved();
            onClose();
        } catch (e) { setErr(e.message); setSave(false); }
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center"
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                width: "100%", maxWidth: 520, background: C.surface,
                borderRadius: "20px 20px 0 0", padding: "0 0 32px",
                border: `1px solid ${C.border}`, borderBottom: "none",
                animation: "slideUp 0.22s cubic-bezier(.22,1,.36,1)"
            }}>
                <div style={{ padding: "12px 0 0", display: "flex", justifyContent: "center" }}>
                    <div style={{ width: 44, height: 4, background: C.border, borderRadius: 99 }} />
                </div>
                <div style={{ padding: "12px 20px 0" }}>
                    <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: C.text }}>Nova Movimentação</div>

                    {/* Tipo */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: C.bg, borderRadius: 12, padding: 4, marginBottom: 18, gap: 4 }}>
                        {["entrada", "saida"].map(t => (
                            <button key={t} onClick={() => { setTipo(t); setCat(""); }} style={{
                                padding: "11px 0", borderRadius: 9, border: "none", fontWeight: 800,
                                fontSize: 14, cursor: "pointer", transition: "all 0.15s",
                                background: tipo === t ? (t === "entrada" ? C.green : C.red) : "transparent",
                                color: tipo === t ? "#fff" : C.mid,
                            }}>{t === "entrada" ? "⬆ ENTRADA" : "⬇ SAÍDA"}</button>
                        ))}
                    </div>

                    {/* Valor */}
                    <div style={{
                        background: C.bg, borderRadius: 12, padding: "13px 16px", marginBottom: 16,
                        border: `2px solid ${numVal ? (tipo === "entrada" ? C.green : C.red) : C.border}`
                    }}>
                        <div style={{ color: C.mid, fontSize: 11, marginBottom: 4 }}>VALOR</div>
                        <input autoFocus inputMode="numeric"
                            value={dispVal} onChange={e => setVal(e.target.value.replace(/\D/g, ""))}
                            placeholder="R$ 0"
                            style={{
                                background: "transparent", border: "none", outline: "none",
                                fontSize: 28, fontWeight: 900, color: C.text, width: "100%",
                                fontFamily: "inherit"
                            }}
                        />
                    </div>

                    {/* Categoria */}
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ color: C.mid, fontSize: 11, marginBottom: 7 }}>CATEGORIA</div>
                        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                            {cats.map(c => <Chip key={c} label={c} active={cat === c} onClick={() => setCat(c)} />)}
                        </div>
                    </div>

                    {/* Forma */}
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ color: C.mid, fontSize: 11, marginBottom: 7 }}>FORMA</div>
                        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                            {FORMAS.map(f => <Chip key={f} label={f} active={forma === f} onClick={() => setForma(f)} color={C.blue} />)}
                        </div>
                    </div>

                    {/* Origem */}
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ color: C.mid, fontSize: 11, marginBottom: 7 }}>ORIGEM</div>
                        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                            <Chip label="🏢 Empresa" active={socio === "empresa"} onClick={() => setSocio("empresa")} color={C.goldD} />
                            {(socios || []).map(s => (
                                <Chip key={s.id} label={`👤 ${s.nome}`} active={socio === s.id} onClick={() => setSocio(s.id)} color={C.goldD} />
                            ))}
                        </div>
                    </div>

                    {/* Descrição */}
                    <input value={desc} onChange={e => setDesc(e.target.value)}
                        placeholder="Descrição (opcional)"
                        style={{
                            width: "100%", background: C.bg, border: `1px solid ${C.border}`,
                            borderRadius: 10, padding: "11px 14px", color: C.text,
                            fontSize: 14, outline: "none", boxSizing: "border-box",
                            marginBottom: 14, fontFamily: "inherit"
                        }}
                    />

                    {errmsg && <div style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>⚠ {errmsg}</div>}

                    <button onClick={save} disabled={!valid} style={{
                        width: "100%", padding: "16px 0", borderRadius: 13, border: "none",
                        background: !valid ? C.border : (tipo === "entrada" ? C.green : C.red),
                        color: !valid ? C.dim : "#fff", fontSize: 16, fontWeight: 800,
                        cursor: valid ? "pointer" : "not-allowed", transition: "all 0.15s"
                    }}>
                        {saving ? "Salvando..." : `CONFIRMAR ${tipo === "entrada" ? "ENTRADA" : "SAÍDA"}`}
                    </button>
                </div>
            </div>
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        </div>
    );
}

// ─── TELA: DASHBOARD ──────────────────────────────────────────────────────────
function Dashboard({ desktop }) {
    const { data, loading, error, refetch } = useAPI("/api/dashboard");
    const { data: obj } = useAPI("/api/objetivos");
    const { data: recebiveis } = useAPI(`/api/parcelas?mes=${mesAtual()}`);

    if (loading) return <Loader />;
    if (error) return <ErrBox msg={error} onRetry={refetch} />;
    if (!data) return null;

    const d = data;
    const pMeta = pct(d.realizadoMes, d.metaMensal);
    const socios = d.socios || [];
    const urgentes = (recebiveis || []).filter(r => ["inadimplente", "vence_hoje"].includes(r.status));

    return (
        <div style={{ padding: desktop ? "28px 32px" : "16px 16px 0" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                    <div style={{ color: C.mid, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>Império Lord · Financeiro</div>
                    <div style={{ fontSize: desktop ? 26 : 20, fontWeight: 900, color: C.gold, letterSpacing: -0.5 }}>
                        {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                    </div>
                </div>
                <div style={{
                    background: "#1C1810", border: `1px solid ${C.gold}44`,
                    borderRadius: 12, padding: "10px 18px", textAlign: "center"
                }}>
                    <div style={{ fontSize: 20 }}>🔥</div>
                    <div style={{ color: C.gold, fontWeight: 900, fontSize: 14 }}>{socios[0]?.streak ?? 0}d</div>
                    <div style={{ color: C.mid, fontSize: 9, letterSpacing: 1 }}>STREAK</div>
                </div>
            </div>

            {/* KPIs principais */}
            <div style={{
                display: "grid", gap: 12, marginBottom: 16,
                gridTemplateColumns: desktop ? "repeat(4,1fr)" : "1fr 1fr"
            }}>
                {[
                    { label: "CAIXA ATUAL", value: R$(d.caixa), color: C.gold },
                    { label: "MRR", value: R$(d.mrr), color: C.green },
                    { label: "INADIMPLÊNCIA", value: R$(d.inadimplente), color: d.inadimplente > 0 ? C.red : C.green },
                    { label: "PIPELINE", value: R$(d.pipelinePotencial), color: C.blue },
                ].map(k => (
                    <Card key={k.label} style={{ padding: "14px 16px" }}>
                        <div style={{ color: C.mid, fontSize: 10, letterSpacing: 1, marginBottom: 5 }}>{k.label}</div>
                        <div style={{ fontSize: desktop ? 22 : 18, fontWeight: 900, color: k.color }}>{k.value}</div>
                    </Card>
                ))}
            </div>

            {/* Meta do mês */}
            <Card style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ color: C.mid, fontSize: 11, letterSpacing: 1 }}>META DO MÊS</div>
                    <div style={{ fontWeight: 800, color: C.gold }}>{pMeta}%</div>
                </div>
                <Bar value={d.realizadoMes} max={d.metaMensal}
                    color={pMeta >= 80 ? C.green : pMeta >= 50 ? C.yellow : C.orange} h={9}
                    style={{ marginBottom: 10 }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, color: C.text }}>{R$(d.realizadoMes)}</span>
                    <span style={{ color: C.mid }}>{R$(d.metaMensal)}</span>
                </div>
                {d.metaMensal > 0 && (
                    <div style={{ color: C.mid, fontSize: 12, marginTop: 8 }}>
                        Falta <span style={{ color: C.orange, fontWeight: 700 }}>{R$(Math.max(0, d.metaMensal - d.realizadoMes))}</span>
                    </div>
                )}
            </Card>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: desktop ? "1fr 1fr" : "1fr" }}>
                {/* Alertas urgentes */}
                {urgentes.length > 0 && (
                    <Card style={{ border: `1px solid ${C.red}44`, background: "#150808" }}>
                        <div style={{ color: C.red, fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 10 }}>
                            🚨 COBRANÇAS URGENTES ({urgentes.length})
                        </div>
                        {urgentes.map((r, i) => (
                            <div key={r.id} style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: "9px 0", borderTop: i > 0 ? `1px solid ${C.border}` : "none"
                            }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.cliente_nome || "—"}</div>
                                    <div style={{ fontSize: 11, color: C.mid }}>{r.descricao}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ color: C.red, fontWeight: 800 }}>{R$(r.valor)}</div>
                                    <Badge label={ST_LABEL[r.status] + (r.dias_atraso > 0 ? ` ${r.dias_atraso}d` : "")} color={ST_COR[r.status]} />
                                </div>
                            </div>
                        ))}
                    </Card>
                )}

                {/* Sócios XP */}
                {socios.length > 0 && (
                    <Card>
                        <div style={{ color: C.mid, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>SÓCIOS</div>
                        {socios.map((s, i) => {
                            const nv = nivelAtual(s.xp);
                            const nxt = xpProximo(nv);
                            return (
                                <div key={s.id} style={{ marginBottom: i < socios.length - 1 ? 16 : 0 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <div>
                                            <span style={{ fontWeight: 800, color: C.gold }}>{s.nome}</span>
                                            <span style={{ color: C.mid, fontSize: 11, marginLeft: 8 }}>Nv.{nv} · {NIVEL_NOME[nv]}</span>
                                        </div>
                                        <span style={{ color: C.orange, fontSize: 12 }}>🔥 {s.streak}d</span>
                                    </div>
                                    <Bar value={s.xp - NIVEL_XP[nv]} max={nxt - NIVEL_XP[nv]} color={C.blue} h={5} />
                                    <div style={{ color: C.mid, fontSize: 10, marginTop: 3 }}>{s.xp.toLocaleString()} / {nxt.toLocaleString()} XP</div>
                                </div>
                            );
                        })}
                    </Card>
                )}

                {/* Objetivos */}
                {obj && obj.length > 0 && (
                    <Card style={{ gridColumn: desktop && urgentes.length === 0 ? "span 2" : "auto" }}>
                        <div style={{ color: C.mid, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>OBJETIVOS</div>
                        {obj.map((o, i) => {
                            const p = pct(o.reservado, o.valor_total);
                            return (
                                <div key={o.id} style={{ marginBottom: i < obj.length - 1 ? 14 : 0 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{o.nome}</div>
                                        <div style={{ fontSize: 11, color: C.mid }}>{p}% · {o.prazo}</div>
                                    </div>
                                    <Bar value={o.reservado} max={o.valor_total} color={p >= 80 ? C.green : C.blue} h={5} />
                                    <div style={{ fontSize: 11, color: C.mid, marginTop: 3 }}>
                                        {R$(o.reservado)} de {R$(o.valor_total)}
                                    </div>
                                </div>
                            );
                        })}
                    </Card>
                )}

                {obj && obj.length === 0 && (
                    <Empty icon="🎯" label="Nenhum objetivo cadastrado. Adicione pelo menu." />
                )}
            </div>

            <div style={{ height: 24 }} />
        </div>
    );
}

// ─── TELA: CAIXA ──────────────────────────────────────────────────────────────
function Caixa({ desktop, refreshKey }) {
    const [filtro, setFiltro] = useState("tudo");
    const mes = mesAtual();
    const endpoint = `/api/movimentacoes?mes=${mes}${filtro !== "tudo" ? `&tipo=${filtro}` : ""}`;
    const { data: movs, loading, error, refetch } = useAPI(endpoint, [filtro, refreshKey]);

    if (loading) return <Loader />;
    if (error) return <ErrBox msg={error} onRetry={refetch} />;

    const lista = movs || [];
    const entradas = lista.filter(m => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0);
    const saidas = lista.filter(m => m.tipo === "saida").reduce((s, m) => s + m.valor, 0);

    // Agrupa por data
    const grupos = {};
    lista.forEach(m => { if (!grupos[m.data]) grupos[m.data] = []; grupos[m.data].push(m); });

    return (
        <div style={{ padding: desktop ? "28px 32px" : "16px 16px 0" }}>
            <div style={{ fontSize: desktop ? 24 : 18, fontWeight: 800, marginBottom: 8, color: C.text }}>Caixa & Movimentações</div>
            <div style={{ color: C.mid, fontSize: 13, marginBottom: 20 }}>{mes}</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
                <Card style={{ padding: "12px 14px" }}>
                    <div style={{ color: C.mid, fontSize: 10 }}>ENTRADAS</div>
                    <div style={{ color: C.green, fontWeight: 800, fontSize: desktop ? 20 : 16 }}>{R$(entradas)}</div>
                </Card>
                <Card style={{ padding: "12px 14px" }}>
                    <div style={{ color: C.mid, fontSize: 10 }}>SAÍDAS</div>
                    <div style={{ color: C.red, fontWeight: 800, fontSize: desktop ? 20 : 16 }}>{R$(saidas)}</div>
                </Card>
                <Card style={{ padding: "12px 14px" }}>
                    <div style={{ color: C.mid, fontSize: 10 }}>SALDO</div>
                    <div style={{ color: (entradas - saidas) >= 0 ? C.gold : C.red, fontWeight: 800, fontSize: desktop ? 20 : 16 }}>
                        {R$(entradas - saidas)}
                    </div>
                </Card>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                {[["tudo", "Tudo"], ["entrada", "Entradas"], ["saida", "Saídas"]].map(([v, l]) => (
                    <Chip key={v} label={l} active={filtro === v} onClick={() => setFiltro(v)} />
                ))}
            </div>

            {lista.length === 0 ? (
                <Empty icon="💸" label="Nenhuma movimentação neste mês. Use o botão + para lançar." />
            ) : (
                Object.entries(grupos)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([data, items]) => (
                        <div key={data} style={{ marginBottom: 18 }}>
                            <div style={{ color: C.mid, fontSize: 11, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
                                {data === hoje() ? "Hoje" : dd(data)}
                            </div>
                            <Card style={{ padding: "4px 0" }}>
                                {items.map((m, i) => (
                                    <div key={m.id} style={{
                                        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                                        borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : "none"
                                    }}>
                                        <div style={{
                                            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                            background: m.tipo === "entrada" ? `${C.green}20` : `${C.red}20`,
                                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17
                                        }}>
                                            {m.tipo === "entrada" ? "⬆" : "⬇"}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.text }}>
                                                {m.descricao}
                                            </div>
                                            <div style={{ fontSize: 11, color: C.mid }}>{m.categoria} · {m.forma}</div>
                                        </div>
                                        <div style={{ color: m.tipo === "entrada" ? C.green : C.red, fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                                            {m.tipo === "entrada" ? "+" : "-"}{R$(m.valor)}
                                        </div>
                                    </div>
                                ))}
                            </Card>
                        </div>
                    ))
            )}
            <div style={{ height: 24 }} />
        </div>
    );
}

// ─── TELA: RECEBÍVEIS ─────────────────────────────────────────────────────────
function Recebiveis({ desktop }) {
    const [filtro, setFiltro] = useState("todos");
    const [saving, setSav] = useState(null);
    const { data, loading, error, refetch } = useAPI(`/api/parcelas?mes=${mesAtual()}`);

    const lista = (data || [])
        .filter(r => filtro === "todos" ? true : r.status === filtro);

    const totalPrev = (data || []).filter(r => r.status !== "recebido").reduce((s, r) => s + r.valor, 0);
    const totalVenc = (data || []).filter(r => ["inadimplente", "vence_hoje"].includes(r.status)).reduce((s, r) => s + r.valor, 0);

    const marcar = async (id, status) => {
        setSav(id);
        try {
            await apiFetch(`/api/parcelas/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ status, recebido_em: status === "recebido" ? hoje() : undefined })
            });
            refetch();
        } finally { setSav(null); }
    };

    if (loading) return <Loader />;
    if (error) return <ErrBox msg={error} onRetry={refetch} />;

    return (
        <div style={{ padding: desktop ? "28px 32px" : "16px 16px 0" }}>
            <div style={{ fontSize: desktop ? 24 : 18, fontWeight: 800, marginBottom: 18, color: C.text }}>Recebíveis</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                <Card style={{ padding: "12px 14px" }}>
                    <div style={{ color: C.mid, fontSize: 10 }}>PREVISTO MÊS</div>
                    <div style={{ color: C.gold, fontWeight: 800, fontSize: desktop ? 22 : 18 }}>{R$(totalPrev)}</div>
                </Card>
                <Card style={{ padding: "12px 14px", border: `1px solid ${totalVenc > 0 ? C.red + "44" : C.border}` }}>
                    <div style={{ color: C.mid, fontSize: 10 }}>VENCIDO / HOJE</div>
                    <div style={{ color: totalVenc > 0 ? C.red : C.green, fontWeight: 800, fontSize: desktop ? 22 : 18 }}>
                        {totalVenc > 0 ? R$(totalVenc) : "✓ Zero"}
                    </div>
                </Card>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 18, overflowX: "auto", paddingBottom: 4 }}>
                {[["todos", "Todos"], ["inadimplente", "Inadimp."], ["vence_hoje", "Hoje"], ["aguardando", "Aguard."], ["futuro", "Futuro"], ["recebido", "Recebidos"]].map(([v, l]) => (
                    <Chip key={v} label={l} active={filtro === v} onClick={() => setFiltro(v)}
                        color={v === "inadimplente" ? C.red : v === "vence_hoje" ? C.orange : C.gold} />
                ))}
            </div>

            {lista.length === 0 ? (
                <Empty icon="📋" label="Nenhuma parcela encontrada para este filtro." />
            ) : (
                <div style={{
                    display: desktop ? "grid" : "flex",
                    gridTemplateColumns: desktop ? "repeat(2,1fr)" : undefined,
                    flexDirection: "column",
                    gap: 10
                }}>
                    {lista.map(r => (
                        <Card key={r.id} style={{
                            border: r.status === "inadimplente" ? `1px solid ${C.red}44`
                                : r.status === "vence_hoje" ? `1px solid ${C.orange}44` : `1px solid ${C.border}`
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{r.cliente_nome || "—"}</div>
                                    <div style={{ color: C.mid, fontSize: 12 }}>{r.descricao} · {r.forma}</div>
                                </div>
                                <Badge label={ST_LABEL[r.status] + (r.dias_atraso > 0 ? ` ${r.dias_atraso}d` : "")} color={ST_COR[r.status] || C.mid} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: r.status === "inadimplente" ? C.red : r.status === "vence_hoje" ? C.orange : C.text }}>
                                        {R$(r.valor)}
                                    </div>
                                    <div style={{ color: C.mid, fontSize: 11 }}>Vence {dd(r.vencimento)}</div>
                                </div>
                                {r.status !== "recebido" && r.status !== "futuro" && (
                                    <button
                                        disabled={saving === r.id}
                                        onClick={() => marcar(r.id, "recebido")}
                                        style={{
                                            background: `${C.green}22`, color: C.green, border: `1px solid ${C.green}44`,
                                            borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700,
                                            cursor: "pointer", opacity: saving === r.id ? 0.6 : 1
                                        }}>
                                        {saving === r.id ? "..." : "✓ Recebido"}
                                    </button>
                                )}
                            </div>
                            {r.status === "inadimplente" && (
                                <div style={{ marginTop: 10, padding: "9px 12px", background: "#1A0808", borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 600 }}>
                                    ⚠ {r.dias_atraso} dias em atraso
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
            <div style={{ height: 24 }} />
        </div>
    );
}

// ─── TELA: MISSÕES ────────────────────────────────────────────────────────────
function Missoes({ desktop }) {
    const [saving, setSav] = useState(null);
    const { data: socios } = useAPI("/api/socios");
    const { data, loading, error, refetch } = useAPI("/api/missoes");

    const toggle = async (m) => {
        setSav(m.id);
        try {
            await apiFetch(`/api/missoes/${m.id}`, {
                method: "PATCH",
                body: JSON.stringify({ concluida: !m.concluida, socio_id: socios?.[0]?.id })
            });
            refetch();
        } finally { setSav(null); }
    };

    if (loading) return <Loader />;
    if (error) return <ErrBox msg={error} onRetry={refetch} />;

    const lista = data || [];
    const gestao = lista.filter(m => m.tipo === "gestao");
    const bonus = lista.filter(m => m.tipo === "bonus");
    const xpGanho = lista.filter(m => m.concluida).reduce((s, m) => s + m.xp, 0);
    const xpTotal = lista.reduce((s, m) => s + m.xp, 0);

    return (
        <div style={{ padding: desktop ? "28px 32px" : "16px 16px 0" }}>
            <div style={{ fontSize: desktop ? 24 : 18, fontWeight: 800, marginBottom: 4, color: C.text }}>Missões do Dia</div>
            <div style={{ color: C.mid, fontSize: 13, marginBottom: 20 }}>
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </div>

            {/* XP do dia */}
            <Card style={{ marginBottom: 18, border: `1px solid ${C.gold}33` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ color: C.gold, fontWeight: 800 }}>⚡ XP DO DIA</div>
                    <div style={{ color: C.gold, fontWeight: 800 }}>{xpGanho} / {xpTotal} XP</div>
                </div>
                <Bar value={xpGanho} max={xpTotal || 1} color={C.gold} h={7} />
            </Card>

            <div style={{ display: desktop ? "grid" : "block", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Gestão */}
                <div style={{ marginBottom: desktop ? 0 : 18 }}>
                    <div style={{ color: C.mid, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>GESTÃO (obrigatórias)</div>
                    <Card style={{ padding: "4px 0" }}>
                        {gestao.length === 0 && <Empty icon="✅" label="Sem missões de gestão hoje" />}
                        {gestao.map((m, i) => (
                            <div key={m.id} onClick={() => !saving && toggle(m)} style={{
                                display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
                                borderBottom: i < gestao.length - 1 ? `1px solid ${C.border}` : "none",
                                cursor: "pointer", opacity: saving === m.id ? 0.5 : m.concluida ? 0.55 : 1,
                                transition: "opacity 0.15s"
                            }}>
                                <div style={{
                                    width: 24, height: 24, borderRadius: 7, flexShrink: 0, transition: "all 0.15s",
                                    border: `2px solid ${m.concluida ? C.green : m.urgente ? C.red : C.border}`,
                                    background: m.concluida ? C.green : "transparent",
                                    display: "flex", alignItems: "center", justifyContent: "center"
                                }}>
                                    {m.concluida && <span style={{ color: "#fff", fontSize: 14 }}>✓</span>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: 13, fontWeight: 600,
                                        textDecoration: m.concluida ? "line-through" : "none",
                                        color: m.concluida ? C.mid : C.text
                                    }}>{m.descricao}</div>
                                    {m.urgente === 1 && !m.concluida && (
                                        <div style={{ color: C.red, fontSize: 11, fontWeight: 700 }}>🔴 URGENTE</div>
                                    )}
                                </div>
                                <Badge label={`+${m.xp}XP`} color={m.concluida ? C.dim : C.gold} />
                            </div>
                        ))}
                    </Card>
                </div>

                {/* Bônus */}
                <div style={{ marginBottom: desktop ? 0 : 18 }}>
                    <div style={{ color: C.mid, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>BÔNUS (XP extra)</div>
                    <Card style={{ padding: "4px 0" }}>
                        {bonus.length === 0 && <Empty icon="🎯" label="Nenhuma missão bônus" />}
                        {bonus.map((m, i) => (
                            <div key={m.id} onClick={() => !saving && toggle(m)} style={{
                                display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
                                borderBottom: i < bonus.length - 1 ? `1px solid ${C.border}` : "none",
                                cursor: "pointer", opacity: saving === m.id ? 0.5 : m.concluida ? 0.55 : 1
                            }}>
                                <div style={{
                                    width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                                    border: `2px solid ${m.concluida ? C.green : C.blue}`,
                                    background: m.concluida ? C.green : "transparent",
                                    display: "flex", alignItems: "center", justifyContent: "center"
                                }}>
                                    {m.concluida && <span style={{ color: "#fff", fontSize: 14 }}>✓</span>}
                                </div>
                                <div style={{
                                    flex: 1, fontSize: 13, fontWeight: 600,
                                    textDecoration: m.concluida ? "line-through" : "none",
                                    color: m.concluida ? C.mid : C.text
                                }}>{m.descricao}</div>
                                <Badge label={`+${m.xp}XP`} color={m.concluida ? C.dim : C.blue} />
                            </div>
                        ))}
                    </Card>
                </div>
            </div>

            {/* Sócios */}
            {socios && socios.length > 0 && (
                <div style={{ marginTop: 20 }}>
                    <div style={{ color: C.mid, fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>SÓCIOS</div>
                    <div style={{ display: "grid", gridTemplateColumns: desktop ? "repeat(auto-fill,minmax(240px,1fr))" : "1fr 1fr", gap: 10 }}>
                        {socios.map(s => {
                            const nv = nivelAtual(s.xp);
                            const nxt = xpProximo(nv);
                            return (
                                <Card key={s.id} style={{ border: `1px solid ${C.gold}22` }}>
                                    <div style={{ color: C.gold, fontWeight: 800, fontSize: 15 }}>{s.nome}</div>
                                    <div style={{ color: C.mid, fontSize: 10, marginBottom: 8 }}>Nv.{nv} · {NIVEL_NOME[nv]}</div>
                                    <Bar value={s.xp - NIVEL_XP[nv]} max={nxt - NIVEL_XP[nv]} color={C.blue} h={5} style={{ marginBottom: 6 }} />
                                    <div style={{ color: C.mid, fontSize: 10 }}>{s.xp.toLocaleString()} XP</div>
                                    <div style={{ color: C.orange, fontSize: 13, marginTop: 4, fontWeight: 700 }}>🔥 {s.streak}d</div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
            <div style={{ height: 24 }} />
        </div>
    );
}

// ─── TELA: PIPELINE ───────────────────────────────────────────────────────────
function FinPipelineInner({ desktop }) {
    const { data, loading, error, refetch } = useAPI("/api/pipeline");
    const [moving, setMov] = useState(null);

    const avancar = async (id, est) => {
        const ordem = ["prospeccao", "proposta", "negociacao", "fechamento", "fechado"];
        const idx = ordem.indexOf(est);
        if (idx >= ordem.length - 1) return;
        setMov(id);
        try {
            await apiFetch(`/api/pipeline/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ estagio: ordem[idx + 1] })
            });
            refetch();
        } finally { setMov(null); }
    };

    if (loading) return <Loader />;
    if (error) return <ErrBox msg={error} onRetry={refetch} />;

    const lista = data || [];
    const estagios = ["prospeccao", "proposta", "negociacao", "fechamento"];
    const total = lista.reduce((s, p) => s + p.valor, 0);

    return (
        <div style={{ padding: desktop ? "28px 32px" : "16px 16px 0" }}>
            <div style={{ fontSize: desktop ? 24 : 18, fontWeight: 800, marginBottom: 4, color: C.text }}>Pipeline de Vendas</div>
            <div style={{ color: C.mid, fontSize: 13, marginBottom: 20 }}>
                {lista.length} negociações · <span style={{ color: C.gold, fontWeight: 700 }}>{R$(total)}</span> potencial
            </div>

            {lista.length === 0 ? (
                <Empty icon="📈" label="Nenhuma negociação no pipeline. Adicione leads pelo sistema." />
            ) : (
                <div style={{
                    display: desktop ? "grid" : "flex", flexDirection: "column",
                    gridTemplateColumns: desktop ? "repeat(4,1fr)" : undefined,
                    gap: 12
                }}>
                    {estagios.map(est => {
                        const grup = lista.filter(p => p.estagio === est);
                        const gtot = grup.reduce((s, p) => s + p.valor, 0);
                        return (
                            <div key={est}>
                                <div style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    marginBottom: 10, padding: "8px 12px", borderRadius: 10,
                                    background: `${EST_COR[est]}15`, border: `1px solid ${EST_COR[est]}30`
                                }}>
                                    <span style={{ fontWeight: 700, fontSize: 12, color: EST_COR[est] }}>{EST_LBL[est]}</span>
                                    <span style={{ fontSize: 11, color: C.mid }}>{grup.length} · {R$(gtot)}</span>
                                </div>
                                {grup.map(p => (
                                    <Card key={p.id} style={{ marginBottom: 8, border: `1px solid ${EST_COR[est]}30` }}>
                                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: C.text }}>{p.nome}</div>
                                        <div style={{ color: C.mid, fontSize: 11, marginBottom: 6 }}>{p.empresa || "—"}</div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div style={{ color: EST_COR[est], fontWeight: 800, fontSize: 16 }}>{R$(p.valor)}</div>
                                            {est !== "fechado" && (
                                                <button
                                                    disabled={moving === p.id}
                                                    onClick={() => avancar(p.id, est)}
                                                    style={{
                                                        background: `${EST_COR[est]}22`, color: EST_COR[est],
                                                        border: `1px solid ${EST_COR[est]}44`,
                                                        borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700,
                                                        cursor: "pointer", opacity: moving === p.id ? 0.5 : 1
                                                    }}>
                                                    {moving === p.id ? "..." : "Avançar →"}
                                                </button>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                                {grup.length === 0 && (
                                    <div style={{ padding: 20, textAlign: "center", color: C.dim, fontSize: 12 }}>Vazio</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            <div style={{ height: 24 }} />
        </div>
    );
}

// ─── WRAPPER + FAB ────────────────────────────────────────────────────────────
function FinWrapper({ children }) {
    const desktop = useDesktop();
    const [modal, setModal] = useState(false);
    const [refresh, setRef] = useState(0);
    const onSaved = useCallback(() => setRef(r => r + 1), []);

    return (
        <div style={{
            background: C.bg, minHeight: "calc(100vh - 120px)", color: C.text,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            borderRadius: 12, overflow: "hidden"
        }}>
            {typeof children === 'function' ? children({ desktop, refreshKey: refresh }) : children}

            {/* FAB */}
            <button onClick={() => setModal(true)} style={{
                position: "fixed", zIndex: 900,
                bottom: desktop ? 28 : 80, right: desktop ? 28 : 16,
                width: desktop ? 56 : 52, height: desktop ? 56 : 52,
                borderRadius: 16, border: "none",
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldD})`,
                color: "#000", fontSize: 24, fontWeight: 900,
                cursor: "pointer", boxShadow: `0 4px 20px ${C.gold}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "transform 0.15s"
            }}>+</button>

            {modal && (
                <AddModal onClose={() => setModal(false)} onSaved={onSaved} />
            )}
        </div>
    );
}

// ─── EXPORTED PAGE COMPONENTS ─────────────────────────────────────────────────
export function FinDashboard() {
    return <FinWrapper>{({ desktop, refreshKey }) => <Dashboard desktop={desktop} />}</FinWrapper>;
}

export function FinCaixa() {
    return <FinWrapper>{({ desktop, refreshKey }) => <Caixa desktop={desktop} refreshKey={refreshKey} />}</FinWrapper>;
}

export function FinRecebiveis() {
    return <FinWrapper>{({ desktop }) => <Recebiveis desktop={desktop} />}</FinWrapper>;
}

export function FinPipeline() {
    return <FinWrapper>{({ desktop }) => <FinPipelineInner desktop={desktop} />}</FinWrapper>;
}

export function FinMissoes() {
    return <FinWrapper>{({ desktop }) => <Missoes desktop={desktop} />}</FinWrapper>;
}
