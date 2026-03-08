-- ═══════════════════════════════════════════════════════════
-- ProjectFlow — Cloudflare D1 Schema (produção)
-- wrangler d1 execute projectflow-db --file=schema.sql
-- ═══════════════════════════════════════════════════════════

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'membro',
  color         TEXT NOT NULL DEFAULT '#3b82f6',
  created_at    TEXT NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '#3b82f6',
  status      TEXT NOT NULL DEFAULT 'ativo',
  start_date  TEXT,
  end_date    TEXT,
  created_by  TEXT REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (date('now')),
  updated_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_proj_status ON projects(status);

CREATE TABLE IF NOT EXISTS tasks (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  col           TEXT NOT NULL DEFAULT 'A Fazer',
  priority      TEXT NOT NULL DEFAULT 'média',
  assignee      TEXT REFERENCES users(id),
  due_date      TEXT,
  tags          TEXT NOT NULL DEFAULT '',
  estimate_min  INTEGER NOT NULL DEFAULT 60,
  spent_min     INTEGER NOT NULL DEFAULT 0,
  created_by    TEXT REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (date('now')),
  updated_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_project  ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_col      ON tasks(col);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_due      ON tasks(due_date);

CREATE TABLE IF NOT EXISTS checklists (
  id       TEXT PRIMARY KEY,
  task_id  TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text     TEXT NOT NULL,
  done     INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chk_task ON checklists(task_id);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  user_id    TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cmt_task ON comments(task_id);

CREATE TABLE IF NOT EXISTS time_entries (
  id            TEXT PRIMARY KEY,
  task_id       TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description   TEXT NOT NULL DEFAULT '',
  duration_min  INTEGER NOT NULL DEFAULT 0,
  date          TEXT NOT NULL,
  user_id       TEXT REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_entry_task    ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_entry_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_entry_date    ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_entry_user    ON time_entries(user_id);

CREATE TABLE IF NOT EXISTS wiki_pages (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  author_id  TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT (date('now'))
);
CREATE INDEX IF NOT EXISTS idx_wiki_project ON wiki_pages(project_id);

CREATE TABLE IF NOT EXISTS milestones (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  date       TEXT NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ms_project ON milestones(project_id);

CREATE TABLE IF NOT EXISTS automations (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  active       INTEGER NOT NULL DEFAULT 1,
  trigger_json TEXT NOT NULL,
  action_json  TEXT NOT NULL,
  runs         INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (date('now'))
);

-- Primeiro usuário admin (TROQUE a senha antes de subir em produção)
-- Rode: wrangler d1 execute projectflow-db --command "INSERT OR IGNORE INTO users (id,name,email,password_hash,role,color) VALUES ('admin01','Admin','admin@empresa.com','TROQUE_ESSA_SENHA','admin','#ef4444');"
