/**
 * ProjectFlow — Cloudflare Worker API v2
 * Todos os endpoints usados pelo frontend.
 * Zero dados fictícios — tudo vem do D1.
 */

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};
const ok  = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ data, error: null }), { status, headers: { "Content-Type": "application/json", ...CORS } });
const err = (msg: string,   status = 400) =>
  new Response(JSON.stringify({ data: null, error: msg }), { status, headers: { "Content-Type": "application/json", ...CORS } });

const uid   = () => crypto.randomUUID().replace(/-/g,"").slice(0,12);
const now   = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0,10);
const COLS  = ["Backlog","A Fazer","Em Andamento","Revisão","Concluído"];

async function sign(payload: object, secret: string) {
  const h = btoa(JSON.stringify({ alg:"HS256",typ:"JWT" }));
  const b = btoa(JSON.stringify({ ...payload, iat:Date.now() }));
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name:"HMAC",hash:"SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${h}.${b}`));
  return `${h}.${b}.${btoa(String.fromCharCode(...new Uint8Array(s)))}`;
}

async function verify(token: string, secret: string): Promise<Record<string,unknown>|null> {
  try {
    const [h,b,s] = token.split(".");
    const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name:"HMAC",hash:"SHA-256" }, false, ["verify"]);
    const v = await crypto.subtle.verify("HMAC", k, Uint8Array.from(atob(s),c=>c.charCodeAt(0)), new TextEncoder().encode(`${h}.${b}`));
    return v ? JSON.parse(atob(b)) : null;
  } catch { return null; }
}

async function requireAuth(req: Request, env: Env): Promise<{userId:string;role:string}|Response> {
  const h = req.headers.get("Authorization");
  if (!h?.startsWith("Bearer ")) return err("Unauthorized",401);
  const p = await verify(h.slice(7), env.JWT_SECRET);
  if (!p) return err("Token inválido",401);
  return { userId:p.userId as string, role:p.role as string };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url  = new URL(req.url);
    const path = url.pathname.replace(/\/$/,"");
    const m    = req.method;

    if (m === "OPTIONS") return new Response(null,{headers:CORS});

    // ── AUTH ────────────────────────────────────────────────────────
    if (path === "/api/auth/login" && m === "POST") {
      const { email, password } = await req.json() as any;
      if (!email||!password) return err("Email e senha obrigatórios");
      const u = await env.DB.prepare("SELECT * FROM users WHERE email=? LIMIT 1").bind(email).first() as any;
      if (!u)                      return err("Usuário não encontrado",404);
      if (u.password_hash !== password) return err("Senha incorreta",401);
      const token = await sign({userId:u.id,email:u.email,role:u.role},env.JWT_SECRET);
      return ok({token,user:{id:u.id,name:u.name,email:u.email,role:u.role,color:u.color}});
    }

    if (path === "/api/auth/register" && m === "POST") {
      const {name,email,password,role,color} = await req.json() as any;
      if (!name||!email||!password) return err("Nome, email e senha obrigatórios");
      if (await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first()) return err("Email já cadastrado",409);
      const id = uid();
      await env.DB.prepare("INSERT INTO users (id,name,email,password_hash,role,color,created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(id,name,email,password,role||"membro",color||"#3b82f6",today()).run();
      const token = await sign({userId:id,email,role:role||"membro"},env.JWT_SECRET);
      return ok({token,user:{id,name,email,role:role||"membro",color:color||"#3b82f6"}},201);
    }

    // ── PROTECTED ──────────────────────────────────────────────────
    const session = await requireAuth(req,env);
    if (session instanceof Response) return session;
    const {userId} = session;

    // ── PROJECTS ────────────────────────────────────────────────────
    if (path === "/api/projects" && m === "GET") {
      const r = await env.DB.prepare(`
        SELECT p.*,
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id) AS task_count,
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id AND t.col='Concluído') AS done_count
        FROM projects p ORDER BY p.created_at DESC`).all();
      return ok(r.results);
    }
    if (path === "/api/projects" && m === "POST") {
      const b = await req.json() as any;
      if (!b.name?.trim()) return err("Nome obrigatório");
      const id = uid();
      await env.DB.prepare("INSERT INTO projects (id,name,description,color,status,start_date,end_date,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
        .bind(id,b.name.trim(),b.description||"",b.color||"#3b82f6",b.status||"ativo",b.start_date||today(),b.end_date||null,userId,today()).run();
      return ok({id},201);
    }
    {
      const mp = path.match(/^\/api\/projects\/([^/]+)$/);
      if (mp) {
        const pid = mp[1];
        if (m === "GET") {
          const p = await env.DB.prepare("SELECT * FROM projects WHERE id=?").bind(pid).first();
          return p ? ok(p) : err("Não encontrado",404);
        }
        if (m === "PUT") {
          const b = await req.json() as any;
          await env.DB.prepare("UPDATE projects SET name=?,description=?,color=?,status=?,start_date=?,end_date=?,updated_at=? WHERE id=?")
            .bind(b.name,b.description||"",b.color,b.status,b.start_date||null,b.end_date||null,today(),pid).run();
          return ok({ok:true});
        }
        if (m === "DELETE") {
          await env.DB.batch([
            env.DB.prepare("DELETE FROM time_entries WHERE project_id=?").bind(pid),
            env.DB.prepare("DELETE FROM comments WHERE task_id IN (SELECT id FROM tasks WHERE project_id=?)").bind(pid),
            env.DB.prepare("DELETE FROM checklists WHERE task_id IN (SELECT id FROM tasks WHERE project_id=?)").bind(pid),
            env.DB.prepare("DELETE FROM tasks WHERE project_id=?").bind(pid),
            env.DB.prepare("DELETE FROM wiki_pages WHERE project_id=?").bind(pid),
            env.DB.prepare("DELETE FROM milestones WHERE project_id=?").bind(pid),
            env.DB.prepare("DELETE FROM projects WHERE id=?").bind(pid),
          ]);
          return ok({ok:true});
        }
      }
    }

    // ── TASKS ────────────────────────────────────────────────────────
    if (path === "/api/tasks" && m === "GET") {
      const pid = url.searchParams.get("project_id");
      const q = `SELECT t.*, u.name AS assignee_name, u.color AS assignee_color
                 FROM tasks t LEFT JOIN users u ON u.id=t.assignee
                 ${pid?"WHERE t.project_id=?":""} ORDER BY t.created_at DESC LIMIT 500`;
      const r = pid ? await env.DB.prepare(q).bind(pid).all() : await env.DB.prepare(q).all();
      return ok(r.results);
    }
    if (path === "/api/tasks" && m === "POST") {
      const b = await req.json() as any;
      if (!b.title?.trim()) return err("Título obrigatório");
      if (!b.project_id)    return err("Projeto obrigatório");
      const id = uid();
      await env.DB.prepare(`INSERT INTO tasks (id,project_id,title,description,col,priority,assignee,due_date,tags,estimate_min,spent_min,created_by,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?)`)
        .bind(id,b.project_id,b.title.trim(),b.description||"",b.col||"A Fazer",b.priority||"média",
              b.assignee||null,b.due_date||null,b.tags||"",+b.estimate_min||60,userId,today()).run();
      return ok({id},201);
    }
    {
      const mt = path.match(/^\/api\/tasks\/([^/]+)$/);
      if (mt) {
        const tid = mt[1];
        if (m === "GET") {
          const t = await env.DB.prepare("SELECT * FROM tasks WHERE id=?").bind(tid).first();
          if (!t) return err("Não encontrado",404);
          const [chk,cmt] = await Promise.all([
            env.DB.prepare("SELECT * FROM checklists WHERE task_id=? ORDER BY position").bind(tid).all(),
            env.DB.prepare("SELECT c.*,u.name AS user_name FROM comments c LEFT JOIN users u ON u.id=c.user_id WHERE c.task_id=? ORDER BY c.created_at").bind(tid).all(),
          ]);
          return ok({...t,checklists:chk.results,comments:cmt.results});
        }
        if (m === "PUT") {
          const b = await req.json() as any;
          await env.DB.prepare("UPDATE tasks SET title=?,description=?,col=?,priority=?,assignee=?,due_date=?,tags=?,estimate_min=?,spent_min=?,updated_at=? WHERE id=?")
            .bind(b.title,b.description||"",b.col,b.priority,b.assignee||null,b.due_date||null,b.tags||"",+b.estimate_min||60,+b.spent_min||0,today(),tid).run();
          return ok({ok:true});
        }
        if (m === "DELETE") {
          await env.DB.batch([
            env.DB.prepare("DELETE FROM comments   WHERE task_id=?").bind(tid),
            env.DB.prepare("DELETE FROM checklists WHERE task_id=?").bind(tid),
            env.DB.prepare("DELETE FROM time_entries WHERE task_id=?").bind(tid),
            env.DB.prepare("DELETE FROM tasks WHERE id=?").bind(tid),
          ]);
          return ok({ok:true});
        }
      }
    }
    {
      const mm = path.match(/^\/api\/tasks\/([^/]+)\/move$/);
      if (mm && m === "POST") {
        const {col} = await req.json() as any;
        if (!COLS.includes(col)) return err("Coluna inválida");
        await env.DB.prepare("UPDATE tasks SET col=?,updated_at=? WHERE id=?").bind(col,today(),mm[1]).run();
        return ok({ok:true});
      }
    }

    // ── CHECKLISTS ──────────────────────────────────────────────────
    {
      const mc = path.match(/^\/api\/tasks\/([^/]+)\/checklists$/);
      if (mc) {
        if (m === "GET") {
          const r = await env.DB.prepare("SELECT * FROM checklists WHERE task_id=? ORDER BY position").bind(mc[1]).all();
          return ok(r.results);
        }
        if (m === "POST") {
          const {text} = await req.json() as any;
          if (!text?.trim()) return err("Texto obrigatório");
          const id = uid();
          const cnt = await env.DB.prepare("SELECT COUNT(*) AS n FROM checklists WHERE task_id=?").bind(mc[1]).first() as any;
          await env.DB.prepare("INSERT INTO checklists (id,task_id,text,done,position) VALUES (?,?,?,0,?)").bind(id,mc[1],text.trim(),cnt?.n||0).run();
          return ok({id},201);
        }
      }
    }
    {
      const mc = path.match(/^\/api\/checklists\/([^/]+)$/);
      if (mc) {
        if (m === "PUT") {
          const b = await req.json() as any;
          if (b.text  !== undefined) await env.DB.prepare("UPDATE checklists SET text=? WHERE id=?").bind(b.text,mc[1]).run();
          if (b.done  !== undefined) await env.DB.prepare("UPDATE checklists SET done=? WHERE id=?").bind(b.done?1:0,mc[1]).run();
          return ok({ok:true});
        }
        if (m === "DELETE") {
          await env.DB.prepare("DELETE FROM checklists WHERE id=?").bind(mc[1]).run();
          return ok({ok:true});
        }
      }
    }

    // ── COMMENTS ───────────────────────────────────────────────────
    {
      const mc = path.match(/^\/api\/tasks\/([^/]+)\/comments$/);
      if (mc && m === "POST") {
        const {text} = await req.json() as any;
        if (!text?.trim()) return err("Comentário vazio");
        const id = uid();
        await env.DB.prepare("INSERT INTO comments (id,task_id,text,user_id,created_at) VALUES (?,?,?,?,?)").bind(id,mc[1],text.trim(),userId,now()).run();
        return ok({id},201);
      }
    }

    // ── TIME ENTRIES ────────────────────────────────────────────────
    if (path === "/api/entries" && m === "GET") {
      const pid = url.searchParams.get("project_id");
      const q = `SELECT e.*, t.title AS task_title, p.name AS project_name, u.name AS user_name
                 FROM time_entries e
                 LEFT JOIN tasks    t ON t.id=e.task_id
                 LEFT JOIN projects p ON p.id=e.project_id
                 LEFT JOIN users    u ON u.id=e.user_id
                 ${pid?"WHERE e.project_id=?":""} ORDER BY e.date DESC, e.created_at DESC LIMIT 500`;
      const r = pid ? await env.DB.prepare(q).bind(pid).all() : await env.DB.prepare(q).all();
      return ok(r.results);
    }
    if (path === "/api/entries" && m === "POST") {
      const b = await req.json() as any;
      if (!b.task_id||!b.project_id)           return err("task_id e project_id obrigatórios");
      if (!b.duration_min||b.duration_min < 1) return err("Duração inválida");
      const id = uid();
      await env.DB.prepare("INSERT INTO time_entries (id,task_id,project_id,description,duration_min,date,user_id,created_at) VALUES (?,?,?,?,?,?,?,?)")
        .bind(id,b.task_id,b.project_id,b.description||"",+b.duration_min,b.date||today(),userId,now()).run();
      await env.DB.prepare("UPDATE tasks SET spent_min = spent_min + ? WHERE id=?").bind(+b.duration_min,b.task_id).run();
      return ok({id},201);
    }
    {
      const me = path.match(/^\/api\/entries\/([^/]+)$/);
      if (me && m === "DELETE") {
        const e = await env.DB.prepare("SELECT * FROM time_entries WHERE id=?").bind(me[1]).first() as any;
        if (e) await env.DB.prepare("UPDATE tasks SET spent_min = MAX(0, spent_min - ?) WHERE id=?").bind(e.duration_min,e.task_id).run();
        await env.DB.prepare("DELETE FROM time_entries WHERE id=?").bind(me[1]).run();
        return ok({ok:true});
      }
    }

    // ── WIKI ────────────────────────────────────────────────────────
    if (path === "/api/wiki" && m === "GET") {
      const pid = url.searchParams.get("project_id");
      const q = `SELECT w.*, u.name AS author_name FROM wiki_pages w LEFT JOIN users u ON u.id=w.author_id ${pid?"WHERE w.project_id=?":""} ORDER BY w.updated_at DESC`;
      const r = pid ? await env.DB.prepare(q).bind(pid).all() : await env.DB.prepare(q).all();
      return ok(r.results);
    }
    if (path === "/api/wiki" && m === "POST") {
      const b = await req.json() as any;
      if (!b.title?.trim()||!b.project_id) return err("Título e projeto obrigatórios");
      const id = uid();
      await env.DB.prepare("INSERT INTO wiki_pages (id,project_id,title,body,author_id,updated_at) VALUES (?,?,?,?,?,?)").bind(id,b.project_id,b.title.trim(),b.body||"",userId,today()).run();
      return ok({id},201);
    }
    {
      const mw = path.match(/^\/api\/wiki\/([^/]+)$/);
      if (mw) {
        if (m === "PUT") {
          const b = await req.json() as any;
          await env.DB.prepare("UPDATE wiki_pages SET title=?,body=?,author_id=?,updated_at=? WHERE id=?").bind(b.title,b.body||"",userId,today(),mw[1]).run();
          return ok({ok:true});
        }
        if (m === "DELETE") {
          await env.DB.prepare("DELETE FROM wiki_pages WHERE id=?").bind(mw[1]).run();
          return ok({ok:true});
        }
      }
    }

    // ── MILESTONES ──────────────────────────────────────────────────
    if (path === "/api/milestones" && m === "GET") {
      const pid = url.searchParams.get("project_id");
      const q = `SELECT * FROM milestones ${pid?"WHERE project_id=?":""} ORDER BY date ASC`;
      const r = pid ? await env.DB.prepare(q).bind(pid).all() : await env.DB.prepare(q).all();
      return ok(r.results);
    }
    if (path === "/api/milestones" && m === "POST") {
      const b = await req.json() as any;
      if (!b.title?.trim()||!b.project_id) return err("Título e projeto obrigatórios");
      const id = uid();
      await env.DB.prepare("INSERT INTO milestones (id,project_id,title,date,done) VALUES (?,?,?,?,0)").bind(id,b.project_id,b.title.trim(),b.date||today()).run();
      return ok({id},201);
    }
    {
      const mm = path.match(/^\/api\/milestones\/([^/]+)\/toggle$/);
      if (mm && m === "POST") {
        await env.DB.prepare("UPDATE milestones SET done = CASE WHEN done=1 THEN 0 ELSE 1 END WHERE id=?").bind(mm[1]).run();
        return ok({ok:true});
      }
    }
    {
      const mm = path.match(/^\/api\/milestones\/([^/]+)$/);
      if (mm && m === "DELETE") {
        await env.DB.prepare("DELETE FROM milestones WHERE id=?").bind(mm[1]).run();
        return ok({ok:true});
      }
    }

    // ── AUTOMATIONS ─────────────────────────────────────────────────
    if (path === "/api/automations" && m === "GET") {
      const r = await env.DB.prepare("SELECT * FROM automations ORDER BY created_at DESC").all();
      return ok((r.results as any[]).map(row=>({
        ...row,
        trigger: typeof row.trigger_json==="string" ? JSON.parse(row.trigger_json) : row.trigger_json,
        action:  typeof row.action_json ==="string" ? JSON.parse(row.action_json)  : row.action_json,
      })));
    }
    if (path === "/api/automations" && m === "POST") {
      const b = await req.json() as any;
      if (!b.name?.trim()) return err("Nome obrigatório");
      const id = uid();
      await env.DB.prepare("INSERT INTO automations (id,name,active,trigger_json,action_json,runs,created_at) VALUES (?,?,1,?,?,0,?)").bind(id,b.name.trim(),JSON.stringify(b.trigger),JSON.stringify(b.action),today()).run();
      return ok({id},201);
    }
    {
      const ma = path.match(/^\/api\/automations\/([^/]+)\/toggle$/);
      if (ma && m === "POST") {
        await env.DB.prepare("UPDATE automations SET active = CASE WHEN active=1 THEN 0 ELSE 1 END WHERE id=?").bind(ma[1]).run();
        return ok({ok:true});
      }
    }
    {
      const ma = path.match(/^\/api\/automations\/([^/]+)$/);
      if (ma && m === "DELETE") {
        await env.DB.prepare("DELETE FROM automations WHERE id=?").bind(ma[1]).run();
        return ok({ok:true});
      }
    }

    // ── TEAM ────────────────────────────────────────────────────────
    if (path === "/api/team" && m === "GET") {
      const r = await env.DB.prepare("SELECT id,name,email,role,color FROM users ORDER BY name ASC").all();
      return ok(r.results);
    }
    {
      const mt = path.match(/^\/api\/team\/([^/]+)$/);
      if (mt && m === "DELETE") {
        await env.DB.prepare("DELETE FROM users WHERE id=?").bind(mt[1]).run();
        return ok({ok:true});
      }
    }

    // ── REPORTS SUMMARY ─────────────────────────────────────────────
    if (path === "/api/reports/summary" && m === "GET") {
      const [ap,tt,dt,ov] = await Promise.all([
        env.DB.prepare("SELECT COUNT(*) AS n FROM projects WHERE status='ativo'").first(),
        env.DB.prepare("SELECT COUNT(*) AS n FROM tasks").first(),
        env.DB.prepare("SELECT COUNT(*) AS n FROM tasks WHERE col='Concluído'").first(),
        env.DB.prepare("SELECT COUNT(*) AS n FROM tasks WHERE due_date < ? AND col != 'Concluído'").bind(today()).first(),
      ]);
      return ok({activeProjects:ap,totalTasks:tt,doneTasks:dt,overdue:ov});
    }

    return err("Rota não encontrada",404);
  }
};
