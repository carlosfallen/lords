# ⚡ ProjectFlow — Gestão de Projetos Ultra-Leve PWA

> Stack: React + Cloudflare Workers + D1 (SQLite edge)  
> PWA offline-first · Funciona em celulares antigos · Sem dependências pesadas

---

## 📦 Arquivos

| Arquivo | Descrição |
|---|---|
| `ProjectFlow.jsx` | App React completo (frontend) |
| `worker.ts` | Cloudflare Worker API (backend) |
| `schema.sql` | Schema D1 (banco SQLite edge) |
| `wrangler.toml` | Config do Worker |
| `manifest.json` | PWA manifest |
| `sw.js` | Service Worker (offline) |

---

## 🚀 Deploy Completo

### 1. Banco D1 (SQLite edge)
```bash
# Criar banco
wrangler d1 create projectflow-db

# Anotar o database_id e colocar no wrangler.toml

# Rodar schema
wrangler d1 execute projectflow-db --file=schema.sql
```

### 2. KV (sessões)
```bash
wrangler kv:namespace create SESSIONS
# Anotar o id e colocar no wrangler.toml
```

### 3. Worker API
```bash
# JWT secret seguro
wrangler secret put JWT_SECRET

# Deploy
wrangler deploy
```

### 4. Frontend (Cloudflare Pages)
```bash
# Criar projeto Vite
npm create vite@latest projectflow -- --template react-ts
cd projectflow
npm install

# Substituir src/App.tsx pelo conteúdo do ProjectFlow.jsx
# Ajustar API_BASE_URL no app para o URL do Worker

# Build e deploy
npm run build
wrangler pages deploy dist --project-name=projectflow
```

### 5. PWA
Copiar `manifest.json` e `sw.js` para a pasta `public/`  
No `index.html`:
```html
<link rel="manifest" href="/manifest.json">
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

---

## ✨ Funcionalidades

### 📊 Dashboard
- Métricas em tempo real (projetos ativos, tarefas, atrasadas)
- Progresso por projeto com barras visuais
- Carga por membro da equipe
- Tarefas recentes
- Milestones com toggle de conclusão

### 📁 Projetos
- CRUD completo com cor e status
- Cards com progresso, datas e alertas de atraso
- Filtro por status e busca

### 📋 Kanban
- 5 colunas: Backlog · A Fazer · Em Andamento · Revisão · Concluído
- Drag & drop nativo (HTML5) + tap-to-select para mobile
- Cards com prioridade, prazo, progresso, checklist resumido e tags
- Seleção de tarefa com painel de ação rápida
- Filtro por texto

### ✅ Lista de Tarefas
- Tabela filtrada por projeto, coluna, prioridade e responsável
- Indicador visual de atraso
- Ações inline (editar, excluir)

### 📅 Timeline / Gantt
- Barras horizontais por tarefa com início e prazo
- Eixo de meses proporcional
- Milestones marcados no eixo
- Por projeto

### ⏱ Time Tracker
- Timer com start/stop (salva automaticamente)
- Registro manual de horas
- Histórico de entradas por projeto
- Total do dia e geral

### 📖 Wiki
- Editor de markdown básico (# ## ### **bold** `code`)
- Prévia renderizada
- Por projeto, com histórico de edição

### ⚡ Automações
- Gatilhos: mudança de coluna, prioridade definida, tarefa criada, prazo hoje
- Ações: notificar, mover coluna, atribuir, definir prioridade
- Contador de execuções
- Motor executado a cada ação relevante

### 📈 Relatórios
- Tarefas por status (barra)
- Tarefas por prioridade (barra)
- Desempenho por projeto (tabela)
- Desempenho por membro (tabela)

### ⚙ Configurações
- Gestão de equipe (CRUD)
- Informações do sistema
- Atalhos de teclado

---

## ⌨️ Atalhos

| Tecla | Ação |
|---|---|
| `N` | Nova tarefa |
| `P` | Novo projeto |
| `K` | Ir para Kanban |
| `T` | Ir para Timeline |
| `R` | Ir para Relatórios |

---

## 🏗 Arquitetura

```
Frontend (Cloudflare Pages)
  └── React + TypeScript (zero deps extras)
  └── PWA: manifest + service worker
  └── Persistência: window.storage (artifact) / Cloudflare Workers API

Backend (Cloudflare Workers)
  └── worker.ts — API REST completa
  └── Autenticação JWT (HMAC-SHA256 nativa)
  └── D1 — SQLite edge (sem servidor)
  └── KV — Sessões e cache

Motor de Automações
  └── Roda em cada dispatch relevante (client-side)
  └── Gatilhos: col_change, prio_set, task_created, due_today
  └── Ações: notify, col_move, assign, set_prio
```

---

## 📱 Otimizações para Celulares Antigos

- **Zero dependências** externas além do React
- **CSS puro** com variáveis (sem Tailwind, sem styled-components)
- **Fontes do sistema** (system-ui) — zero download
- **Service Worker** com cache-first para assets
- **Tap-to-select** no Kanban (não depende de drag nativo)
- **Bundle estimado**: ~120KB gzipped (vs 800KB+ apps similares)
- **Sem animações** pesadas (CSS transitions apenas onde necessário)
- **Layout responsivo** adaptado para telas de 320px+

---

## 🔐 Segurança

- JWT com HMAC-SHA256 (Web Crypto API nativa)
- `wrangler secret` para JWT_SECRET em produção
- CORS configurável
- Foreign keys e constraints no D1
- Validação de input no Worker

---

## 📈 Expansões Futuras

- [ ] Notificações push via Web Push API
- [ ] Webhooks de saída (Slack, Discord, WhatsApp)
- [ ] Exportação CSV/PDF de relatórios
- [ ] Comentários com menções (@usuario)
- [ ] Visualização Scrum (sprints)
- [ ] Integração GitHub (commits vinculados a tarefas)
- [ ] API pública documentada (OpenAPI)
