-- ═══════════════════════════════════════════════════════════
-- IMPÉRIO LORD — Cloudflare D1 Schema
-- Execute via: wrangler d1 execute imperio-lord --file=schema.sql
-- ═══════════════════════════════════════════════════════════

PRAGMA foreign_keys = ON;

-- SÓCIOS
CREATE TABLE IF NOT EXISTS socios (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  xp          INTEGER DEFAULT 0,
  nivel       INTEGER DEFAULT 1,
  streak      INTEGER DEFAULT 0,
  last_active TEXT,
  criado_em   TEXT DEFAULT (datetime('now'))
);

-- METAS MENSAIS
CREATE TABLE IF NOT EXISTS metas_mensais (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  mes         TEXT NOT NULL,   -- "2026-03"
  meta_valor  REAL NOT NULL,
  criado_em   TEXT DEFAULT (datetime('now'))
);

-- MOVIMENTAÇÕES (entradas e saídas do caixa)
CREATE TABLE IF NOT EXISTS movimentacoes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo        TEXT NOT NULL CHECK(tipo IN ('entrada','saida')),
  descricao   TEXT NOT NULL,
  valor       REAL NOT NULL,
  data        TEXT NOT NULL,
  categoria   TEXT NOT NULL,
  forma       TEXT NOT NULL,
  socio_id    TEXT NOT NULL DEFAULT 'empresa',
  observacao  TEXT,
  criado_em   TEXT DEFAULT (datetime('now'))
);

-- CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL,
  whatsapp    TEXT,
  email       TEXT,
  cidade      TEXT,
  criado_em   TEXT DEFAULT (datetime('now'))
);

-- CONTRATOS
CREATE TABLE IF NOT EXISTS contratos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id      INTEGER NOT NULL REFERENCES clientes(id),
  servico         TEXT NOT NULL,
  categoria       TEXT NOT NULL,
  valor_total     REAL NOT NULL,
  data_fechamento TEXT NOT NULL,
  socio_id        TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK(tipo IN ('recorrente','projeto','avulso')),
  status          TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo','cancelado','concluido')),
  observacao      TEXT,
  criado_em       TEXT DEFAULT (datetime('now'))
);

-- PARCELAS / RECEBÍVEIS
CREATE TABLE IF NOT EXISTS parcelas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  contrato_id     INTEGER REFERENCES contratos(id),
  cliente_id      INTEGER REFERENCES clientes(id),
  descricao       TEXT NOT NULL,
  valor           REAL NOT NULL,
  vencimento      TEXT NOT NULL,
  forma           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'futuro'
                  CHECK(status IN ('futuro','aguardando','vence_hoje','vencida','inadimplente','negociacao','recebido','cancelado')),
  dias_atraso     INTEGER DEFAULT 0,
  multa           REAL DEFAULT 0,
  juros           REAL DEFAULT 0,
  recebido_em     TEXT,
  observacao      TEXT,
  criado_em       TEXT DEFAULT (datetime('now'))
);

-- PIPELINE DE VENDAS
CREATE TABLE IF NOT EXISTS pipeline (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente     TEXT NOT NULL,
  servico     TEXT NOT NULL,
  valor       REAL NOT NULL,
  estagio     TEXT NOT NULL DEFAULT 'prospeccao'
              CHECK(estagio IN ('prospeccao','proposta','negociacao','fechamento','fechado','perdido')),
  socio_id    TEXT,
  observacao  TEXT,
  criado_em   TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now'))
);

-- OBJETIVOS ESTRATÉGICOS
CREATE TABLE IF NOT EXISTS objetivos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL,
  tipo        TEXT NOT NULL,
  valor_total REAL NOT NULL,
  reservado   REAL DEFAULT 0,
  prazo       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo','concluido','cancelado')),
  criado_em   TEXT DEFAULT (datetime('now'))
);

-- CUSTOS FIXOS
CREATE TABLE IF NOT EXISTS custos_fixos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao   TEXT NOT NULL,
  valor       REAL NOT NULL,
  dia_venc    INTEGER NOT NULL,
  forma       TEXT NOT NULL,
  categoria   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo','pausado','cancelado')),
  criado_em   TEXT DEFAULT (datetime('now'))
);

-- MISSÕES DIÁRIAS
CREATE TABLE IF NOT EXISTS missoes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  data        TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK(tipo IN ('gestao','bonus')),
  descricao   TEXT NOT NULL,
  xp          INTEGER NOT NULL DEFAULT 10,
  urgente     INTEGER DEFAULT 0,
  concluida   INTEGER DEFAULT 0,
  socio_id    TEXT,
  ref_tipo    TEXT,
  ref_id      INTEGER,
  criado_em   TEXT DEFAULT (datetime('now'))
);

-- PLANOS DE VIAGEM
CREATE TABLE IF NOT EXISTS planos_viagem (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL,
  destino     TEXT NOT NULL,
  saida       TEXT NOT NULL,
  retorno     TEXT NOT NULL,
  tipo        TEXT NOT NULL,
  meta_contratos INTEGER DEFAULT 0,
  meta_receita   REAL DEFAULT 0,
  meta_leads     INTEGER DEFAULT 0,
  orcamento_total REAL DEFAULT 0,
  gasto_real     REAL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'planejando'
              CHECK(status IN ('planejando','aprovado','em_andamento','concluido','cancelado')),
  criado_em   TEXT DEFAULT (datetime('now'))
);

-- XP HISTÓRICO
CREATE TABLE IF NOT EXISTS xp_historico (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id    TEXT NOT NULL,
  xp          INTEGER NOT NULL,
  acao        TEXT NOT NULL,
  ref_id      INTEGER,
  criado_em   TEXT DEFAULT (datetime('now'))
);

-- ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_mov_data     ON movimentacoes(data DESC);
CREATE INDEX IF NOT EXISTS idx_mov_tipo     ON movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_parcelas_venc ON parcelas(vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status);
CREATE INDEX IF NOT EXISTS idx_missoes_data ON missoes(data DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_est ON pipeline(estagio);
