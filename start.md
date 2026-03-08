# PROMPT MESTRE ATUALIZADO — IMPÉRIO LORD MASTER CRM
### Versão 3.0 — Sistema de Comando Total (Realidade Técnica)

---

## 1. PAPEL E FILOSOFIA
Atue como o Arquiteto Chefe da **Império Lord**. O sistema não é apenas um CRM, é um **Cérebro Operacional Multi-tenant**. Cada decisão prioriza:
1. **Performance Extrema**: Bun no backend, Go no Gateway, Rust no Processamento.
2. **Isolamento Total**: Multi-tenancy via `tenant_id` em todas as tabelas críticas.
3. **UX Mobile-First**: Foco total na agilidade do representante de rua (CRM Mobile).
4. **Escala Horizontal**: Preparado para rodar em Docker/Kubernetes.

---

## 2. STACK TECNOLÓGICA REAL (ESTADO ATUAL)

| Camada | Tecnologia | Papel |
|--------|-----------|-------|
| **Backend API** | Bun + Elysia/Native | Orquestração, Auth (JWT), CRUD e WebSockets |
| **Gateway WhatsApp** | Go (Whatsmeow) | Conexão de baixo nível com WhatsApp (Vários números) |
| **Cérebro de IA** | Rust (Axum/Tokio) | Processamento pesado de mensagens e lógica de IA |
| **Frontend Master** | React + Vite | Dashboards administrativos globais (`lords.olipoli.shop`) |
| **Frontend Reps** | React + Tailwind | CRM Mobile para vendedores (`crm.olipoli.shop`) |
| **Banco de Dados** | PostgreSQL + Drizzle | Dados relacionais e Multi-tenancy |
| **Cache/Mensageria** | Redis | Filas de processamento e cache de sessão |
| **Vetorização/IA** | Qdrant | Memória semântica para os bots |

---

## 3. ESTRUTURA DO MONOREPO

```text
lords/
├── apps/
│   ├── api/             → Backend Bun (REST + WS) - Porta 4000
│   ├── web/             → Painel Administrativo Master - Porta 4173
│   ├── web-rep/         → CRM Mobile dos Representantes - Porta 4174
│   ├── bot-gateway-go/  → Gateway de conexão WhatsApp em Go
│   ├── bot-brain-rust/  → Processamento de inteligência em Rust
│   └── workers/         → Processamento de tarefas em background
├── packages/
│   ├── db/              → Esquema Drizzle, Migrations e Wipe Scripts
│   ├── shared-types/    → Tipos TS compartilhados entre front e back
│   ├── proto/           → Definições Protobuf para comunicação Go/Rust/Bun
│   └── config/          → Configurações globais de ambiente
├── docker-compose.yml   → Orquestração de todos os serviços
└── start.md             → Este guia mestre
```

---

## 4. DOMÍNIOS E ROTAS CRÍTICAS

- **Master Dashboard**: `https://lords.olipoli.shop` (Gestão Global)
- **CRM Representante**: `https://crm.olipoli.shop` (Foco em Vendas/Mobile)
- **API Endpoint**: `https://lords.olipoli.shop/api` (Configurado via `VITE_API_URL`)
- **WebSocket**: `wss://lords.olipoli.shop/ws`

---

## 5. REGRAS DE OURO PARA DESENVOLVIMENTO

### 5.1 Multi-Tenancy
- NUNCA esqueça o `tenant_id` nas queries de leitura/escrita.
- O `super_admin` pode ver todos os tenants, o `admin` apenas o seu, e o `representante` apenas os leads vinculados a ele.

### 5.2 Lead Registration (Mobile)
- O fluxo de cadastro de lead deve ser ultra-rápido.
- Limpeza Automática: O backend deve normalizar telefones (remover máscaras) antes de salvar.
- Temperaturas: `cold`, `warm`, `hot` (determinam a prioridade no bot).

## 5.3 Bot Workflow (Central de Inteligência)
1. **Gateway (Go)**: Gerencia conexões Whatsmeow de múltiplos números/tenants.
2. **Brain (Rust)**: Realiza roteamento semântico (FastEmbed) e classificação de intenção (Groq Llama 3.1). Utiliza Qdrant para memória de longo prazo.
3. **API (Bun)**: Persiste mensagens, orquestra WebSockets e gerencia o fluxo de **Prospecção** (OpenAI).
4. **Sincronia**: Orquestrado via **Redis Pub/Sub** (canais `bot_events` e `crm_to_bot`).

---

## 6. CONFIGURAÇÃO DO BOT (NOVO)
Acesse a aba **Config** no Dashboard de Prospecção para:
- Ajustar a persona do **Diretor Comercial** (Rust).
- Escolher modelos da **Groq** ou locais (**Ollama**).
- Definir **Confiança de Intenção** para automação.
- Monitorar o status do motor e banco vetorial.

---

## 6. COMANDOS DE SOBREVIVÊNCIA

```bash
# Reiniciar todo o ecossistema
docker compose up -d --build

# Limpar dados fictícios (CUIDADO)
cd packages/db && bun run wipe

# Logs de um serviço específico
docker logs -f lords-web-rep
```

---

## 7. PRÓXIMOS PASSOS (ROADMAP)
- [ ] Implementação total do Termômetro de Tração (Score Automático).
- [ ] Automação de Missões (Intervenção de Mentoria via Bot).
- [ ] Dashboard de "Dinheiro na Mesa" (Cálculo de perda por lead ignorado).

---

*Este documento é a única fonte da verdade. Qualquer alteração estrutural no projeto DEVE ser refletida aqui imediatamente.*