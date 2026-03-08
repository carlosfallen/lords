// ═══════════════════════════════════════════════════════════
// IMPÉRIO LORD — Cloudflare Worker (API)
// wrangler.toml:
//   name = "imperio-lord-api"
//   main = "worker.js"
//   [[d1_databases]]
//   binding = "DB"
//   database_name = "imperio-lord"
//   database_id = "SEU_DATABASE_ID_AQUI"
// ═══════════════════════════════════════════════════════════

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const err = (msg, status = 400) => json({ error: msg }, status);

// ─── ROTEADOR ────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS")
      return new Response(null, { headers: CORS });

    const url    = new URL(request.url);
    const path   = url.pathname.replace(/\/$/, "");
    const method = request.method;
    const DB     = env.DB;

    try {
      // ── DASHBOARD ──────────────────────────────────────────
      if (path === "/api/dashboard" && method === "GET") {
        const hoje = new Date().toISOString().slice(0, 10);
        const mes  = hoje.slice(0, 7);

        const [caixa, mrr, meta, inadimplente, pipeline] = await Promise.all([
          DB.prepare(`SELECT COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE -valor END),0) as saldo FROM movimentacoes`).first(),
          DB.prepare(`SELECT COALESCE(SUM(p.valor),0) as mrr FROM parcelas p JOIN contratos c ON c.id=p.contrato_id WHERE c.tipo='recorrente' AND c.status='ativo'`).first(),
          DB.prepare(`SELECT meta_valor FROM metas_mensais WHERE mes=? ORDER BY id DESC LIMIT 1`).bind(mes).first(),
          DB.prepare(`SELECT COALESCE(SUM(valor),0) as total FROM parcelas WHERE status IN ('inadimplente','vencida') AND substr(vencimento,1,7)=?`).bind(mes).first(),
          DB.prepare(`SELECT COALESCE(SUM(valor),0) as potencial, COUNT(*) as total FROM pipeline WHERE estagio NOT IN ('fechado','perdido')`).first(),
        ]);

        const realizadoMes = await DB.prepare(
          `SELECT COALESCE(SUM(valor),0) as total FROM movimentacoes WHERE tipo='entrada' AND substr(data,1,7)=?`
        ).bind(mes).first();

        const socios = await DB.prepare(`SELECT * FROM socios ORDER BY xp DESC`).all();
        const alertas = await DB.prepare(
          `SELECT COUNT(*) as c FROM parcelas WHERE status IN ('inadimplente','vence_hoje') AND vencimento<=?`
        ).bind(hoje).first();

        return json({
          caixa:         caixa?.saldo     ?? 0,
          mrr:           mrr?.mrr         ?? 0,
          metaMensal:    meta?.meta_valor  ?? 0,
          realizadoMes:  realizadoMes?.total ?? 0,
          inadimplente:  inadimplente?.total ?? 0,
          pipelinePotencial: pipeline?.potencial ?? 0,
          pipelineTotal: pipeline?.total   ?? 0,
          alertasUrgentes: alertas?.c      ?? 0,
          socios:        socios.results    ?? [],
        });
      }

      // ── MOVIMENTAÇÕES ──────────────────────────────────────
      if (path === "/api/movimentacoes" && method === "GET") {
        const limit  = url.searchParams.get("limit")  || 50;
        const offset = url.searchParams.get("offset") || 0;
        const tipo   = url.searchParams.get("tipo");
        const mes    = url.searchParams.get("mes");

        let q = `SELECT * FROM movimentacoes WHERE 1=1`;
        const params = [];
        if (tipo) { q += ` AND tipo=?`;              params.push(tipo); }
        if (mes)  { q += ` AND substr(data,1,7)=?`;  params.push(mes);  }
        q += ` ORDER BY data DESC, criado_em DESC LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(offset));

        const rows = await DB.prepare(q).bind(...params).all();
        return json(rows.results);
      }

      if (path === "/api/movimentacoes" && method === "POST") {
        const body = await request.json();
        const { tipo, descricao, valor, data, categoria, forma, socio_id, observacao } = body;
        if (!tipo || !descricao || !valor || !data || !categoria || !forma)
          return err("Campos obrigatórios ausentes");

        const r = await DB.prepare(
          `INSERT INTO movimentacoes (tipo,descricao,valor,data,categoria,forma,socio_id,observacao)
           VALUES (?,?,?,?,?,?,?,?) RETURNING *`
        ).bind(tipo, descricao, Number(valor), data, categoria, forma, socio_id||"empresa", observacao||null).first();

        return json(r, 201);
      }

      if (path.startsWith("/api/movimentacoes/") && method === "DELETE") {
        const id = path.split("/").pop();
        await DB.prepare(`DELETE FROM movimentacoes WHERE id=?`).bind(id).run();
        return json({ ok: true });
      }

      // ── PARCELAS / RECEBÍVEIS ──────────────────────────────
      if (path === "/api/parcelas" && method === "GET") {
        const status = url.searchParams.get("status");
        const mes    = url.searchParams.get("mes");

        // Atualizar status das parcelas vencidas automaticamente
        const hoje = new Date().toISOString().slice(0, 10);
        await DB.prepare(
          `UPDATE parcelas SET status='vence_hoje' WHERE vencimento=? AND status IN ('futuro','aguardando')`
        ).bind(hoje).run();
        await DB.prepare(
          `UPDATE parcelas SET status='inadimplente',
           dias_atraso=CAST((julianday(?)-julianday(vencimento)) AS INTEGER)
           WHERE vencimento<? AND status IN ('futuro','aguardando','vencida','vence_hoje')`
        ).bind(hoje, hoje).run();

        let q = `SELECT p.*, c.nome as cliente_nome FROM parcelas p
                 LEFT JOIN clientes c ON c.id=p.cliente_id WHERE 1=1`;
        const params = [];
        if (status) { q += ` AND p.status=?`;            params.push(status); }
        if (mes)    { q += ` AND substr(p.vencimento,1,7)=?`; params.push(mes); }
        q += ` ORDER BY CASE p.status
                WHEN 'inadimplente' THEN 1 WHEN 'vence_hoje' THEN 2
                WHEN 'aguardando' THEN 3 WHEN 'futuro' THEN 4 ELSE 5 END,
               p.vencimento ASC`;

        const rows = await DB.prepare(q).bind(...params).all();
        return json(rows.results);
      }

      if (path.startsWith("/api/parcelas/") && method === "PATCH") {
        const id   = path.split("/").pop();
        const body = await request.json();
        const { status, recebido_em, observacao } = body;

        const parcela = await DB.prepare(`SELECT * FROM parcelas WHERE id=?`).bind(id).first();
        if (!parcela) return err("Parcela não encontrada", 404);

        await DB.prepare(
          `UPDATE parcelas SET status=?, recebido_em=?, observacao=COALESCE(?,observacao) WHERE id=?`
        ).bind(status, recebido_em || null, observacao || null, id).run();

        // Se recebido → lançar entrada automática
        if (status === "recebido") {
          const hoje = new Date().toISOString().slice(0, 10);
          await DB.prepare(
            `INSERT INTO movimentacoes (tipo,descricao,valor,data,categoria,forma,socio_id)
             VALUES ('entrada',?,?,?,'Contrato',?,?)`
          ).bind(
            parcela.descricao,
            parcela.valor,
            recebido_em || hoje,
            parcela.forma,
            "empresa"
          ).run();
        }

        return json({ ok: true });
      }

      // ── PIPELINE ───────────────────────────────────────────
      if (path === "/api/pipeline" && method === "GET") {
        const rows = await DB.prepare(
          `SELECT * FROM pipeline WHERE estagio NOT IN ('perdido')
           ORDER BY CASE estagio
             WHEN 'fechamento' THEN 1 WHEN 'negociacao' THEN 2
             WHEN 'proposta' THEN 3 WHEN 'prospeccao' THEN 4 ELSE 5 END, valor DESC`
        ).all();
        return json(rows.results);
      }

      if (path === "/api/pipeline" && method === "POST") {
        const body = await request.json();
        const r = await DB.prepare(
          `INSERT INTO pipeline (cliente,servico,valor,estagio,socio_id,observacao)
           VALUES (?,?,?,?,?,?) RETURNING *`
        ).bind(
          body.cliente, body.servico, Number(body.valor),
          body.estagio || "prospeccao", body.socio_id || null, body.observacao || null
        ).first();
        return json(r, 201);
      }

      if (path.startsWith("/api/pipeline/") && method === "PATCH") {
        const id   = path.split("/").pop();
        const body = await request.json();
        await DB.prepare(
          `UPDATE pipeline SET estagio=COALESCE(?,estagio), valor=COALESCE(?,valor),
           observacao=COALESCE(?,observacao), atualizado_em=datetime('now') WHERE id=?`
        ).bind(body.estagio||null, body.valor||null, body.observacao||null, id).run();
        return json({ ok: true });
      }

      // ── MISSÕES ────────────────────────────────────────────
      if (path === "/api/missoes" && method === "GET") {
        const hoje = new Date().toISOString().slice(0, 10);

        // Gerar missões automáticas do dia se não existirem
        const existing = await DB.prepare(
          `SELECT COUNT(*) as c FROM missoes WHERE data=?`
        ).bind(hoje).first();

        if (!existing?.c) {
          // Missões de gestão baseadas em dados reais
          const inadimp = await DB.prepare(
            `SELECT p.id, c.nome as cliente, p.valor, p.dias_atraso
             FROM parcelas p LEFT JOIN clientes c ON c.id=p.cliente_id
             WHERE p.status IN ('inadimplente','vence_hoje') LIMIT 5`
          ).all();

          const stmts = [
            DB.prepare(
              `INSERT INTO missoes (data,tipo,descricao,xp,urgente) VALUES (?,'gestao','Lançar todos os gastos até 22h',20,0)`
            ).bind(hoje),
            DB.prepare(
              `INSERT INTO missoes (data,tipo,descricao,xp,urgente) VALUES (?,'bonus','Cadastrar 1 novo lead no pipeline',10,0)`
            ).bind(hoje),
            DB.prepare(
              `INSERT INTO missoes (data,tipo,descricao,xp,urgente) VALUES (?,'bonus','Enviar 1 proposta nova',25,0)`
            ).bind(hoje),
            DB.prepare(
              `INSERT INTO missoes (data,tipo,descricao,xp,urgente) VALUES (?,'bonus','Fechar 1 venda',100,0)`
            ).bind(hoje),
          ];

          for (const p of inadimp.results) {
            stmts.push(DB.prepare(
              `INSERT INTO missoes (data,tipo,descricao,xp,urgente,ref_tipo,ref_id)
               VALUES (?,'gestao',?,50,1,'parcela',?)`
            ).bind(hoje, `Cobrar ${p.cliente} — ${p.dias_atraso}d em atraso`, p.id));
          }

          await DB.batch(stmts);
        }

        const rows = await DB.prepare(
          `SELECT * FROM missoes WHERE data=? ORDER BY urgente DESC, tipo ASC, id ASC`
        ).bind(hoje).all();
        return json(rows.results);
      }

      if (path.startsWith("/api/missoes/") && method === "PATCH") {
        const id   = path.split("/").pop();
        const body = await request.json();
        const missao = await DB.prepare(`SELECT * FROM missoes WHERE id=?`).bind(id).first();
        if (!missao) return err("Missão não encontrada", 404);

        await DB.prepare(`UPDATE missoes SET concluida=? WHERE id=?`)
          .bind(body.concluida ? 1 : 0, id).run();

        // XP ao concluir
        if (body.concluida && body.socio_id) {
          const xpDelta = missao.xp;
          await DB.prepare(`UPDATE socios SET xp=xp+? WHERE id=?`)
            .bind(xpDelta, body.socio_id).run();
          await DB.prepare(
            `INSERT INTO xp_historico (socio_id,xp,acao,ref_id) VALUES (?,?,?,?)`
          ).bind(body.socio_id, xpDelta, missao.descricao, id).run();
        }
        return json({ ok: true });
      }

      // ── OBJETIVOS ──────────────────────────────────────────
      if (path === "/api/objetivos" && method === "GET") {
        const rows = await DB.prepare(
          `SELECT * FROM objetivos WHERE status='ativo' ORDER BY prazo ASC`
        ).all();
        return json(rows.results);
      }

      if (path === "/api/objetivos" && method === "POST") {
        const body = await request.json();
        const r = await DB.prepare(
          `INSERT INTO objetivos (nome,tipo,valor_total,reservado,prazo) VALUES (?,?,?,?,?) RETURNING *`
        ).bind(body.nome, body.tipo, Number(body.valor_total), Number(body.reservado)||0, body.prazo).first();
        return json(r, 201);
      }

      if (path.startsWith("/api/objetivos/") && method === "PATCH") {
        const id   = path.split("/").pop();
        const body = await request.json();
        await DB.prepare(
          `UPDATE objetivos SET reservado=COALESCE(?,reservado), status=COALESCE(?,status) WHERE id=?`
        ).bind(body.reservado||null, body.status||null, id).run();
        return json({ ok: true });
      }

      // ── SÓCIOS / XP ────────────────────────────────────────
      if (path === "/api/socios" && method === "GET") {
        const rows = await DB.prepare(`SELECT * FROM socios ORDER BY xp DESC`).all();
        return json(rows.results);
      }

      // ── CUSTOS FIXOS ───────────────────────────────────────
      if (path === "/api/custos-fixos" && method === "GET") {
        const rows = await DB.prepare(
          `SELECT * FROM custos_fixos WHERE status='ativo' ORDER BY dia_venc ASC`
        ).all();
        return json(rows.results);
      }

      // ── CLIENTES ───────────────────────────────────────────
      if (path === "/api/clientes" && method === "GET") {
        const rows = await DB.prepare(
          `SELECT c.*, COUNT(ct.id) as total_contratos,
           COALESCE(SUM(ct.valor_total),0) as valor_total
           FROM clientes c LEFT JOIN contratos ct ON ct.cliente_id=c.id
           GROUP BY c.id ORDER BY c.nome ASC`
        ).all();
        return json(rows.results);
      }

      if (path === "/api/clientes" && method === "POST") {
        const body = await request.json();
        const r = await DB.prepare(
          `INSERT INTO clientes (nome,whatsapp,email,cidade) VALUES (?,?,?,?) RETURNING *`
        ).bind(body.nome, body.whatsapp||null, body.email||null, body.cidade||null).first();
        return json(r, 201);
      }

      return err("Rota não encontrada", 404);

    } catch (e) {
      console.error(e);
      return err("Erro interno: " + e.message, 500);
    }
  },
};
