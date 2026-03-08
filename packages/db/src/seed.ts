// ============================================================
// Império Lord Master CRM — Database Seed Script
// ============================================================
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as s from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://imperio:imperio_secret@localhost:5432/imperio_lord';
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema: s });

async function seed() {
    console.log('🌱 Seeding Império Lord database...\n');

    // ─── 1. USERS ────────────────────────────────────────────
    console.log('👤 Creating users...');
    const passwordHash = await Bun.password.hash('imperio123', { algorithm: 'argon2id' });

    const [adminUser] = await db.insert(s.users).values({
        email: 'admin@imperiolord.com',
        passwordHash,
        name: 'Lord Admin',
        role: 'super_admin',
        phone: '(11) 99999-0001',
    }).returning();

    const [mentorCarlos] = await db.insert(s.users).values({
        email: 'carlos@imperiolord.com',
        passwordHash,
        name: 'Carlos Mentor',
        role: 'mentor',
        phone: '(11) 99999-0002',
    }).returning();

    const [anaSuporte] = await db.insert(s.users).values({
        email: 'ana@imperiolord.com',
        passwordHash,
        name: 'Ana Suporte',
        role: 'support',
        phone: '(11) 99999-0003',
    }).returning();

    const [financeiro] = await db.insert(s.users).values({
        email: 'finance@imperiolord.com',
        passwordHash,
        name: 'Paulo Financeiro',
        role: 'finance',
        phone: '(11) 99999-0004',
    }).returning();

    console.log(`  ✓ 4 users created`);

    // ─── 2. TENANTS (Clients) ────────────────────────────────
    console.log('🏢 Creating tenants...');
    const tenantsData = [
        { name: 'Clínica Bella Vita', niche: 'Saúde', city: 'São Paulo', state: 'SP', segment: 'Em Risco', mentorId: mentorCarlos.id, tags: ['VIP'], email: 'contato@bellavita.com', phone: '(11) 3456-7890' },
        { name: 'Restaurante Sabor & Arte', niche: 'Alimentação', city: 'Rio de Janeiro', state: 'RJ', segment: 'Campeão', mentorId: mentorCarlos.id, tags: ['VIP', 'Indicação'], email: 'contato@saborarte.com', phone: '(21) 2345-6789' },
        { name: 'Academia PowerFit', niche: 'Fitness', city: 'Belo Horizonte', state: 'MG', segment: 'Crescendo', mentorId: anaSuporte.id, tags: ['Novo'], email: 'contato@powerfit.com', phone: '(31) 3456-7890' },
        { name: 'Pet Shop Amor Animal', niche: 'Pet', city: 'Curitiba', state: 'PR', segment: 'Crescendo', mentorId: mentorCarlos.id, tags: ['Novo'], email: 'contato@amoranimal.com', phone: '(41) 3456-7890' },
        { name: 'Barbearia Classic', niche: 'Beleza', city: 'São Paulo', state: 'SP', segment: 'Crítico', mentorId: anaSuporte.id, tags: [], email: 'contato@barbearia.com', phone: '(11) 4567-8901' },
        { name: 'Ótica Visão Clara', niche: 'Saúde', city: 'Campinas', state: 'SP', segment: 'Campeão', mentorId: mentorCarlos.id, tags: ['VIP'], email: 'contato@visaoclara.com', phone: '(19) 3456-7890' },
        { name: 'Auto Peças Central', niche: 'Automotivo', city: 'Goiânia', state: 'GO', segment: 'Crítico', mentorId: anaSuporte.id, tags: [], email: 'contato@autocentral.com', phone: '(62) 3456-7890' },
        { name: 'Padaria Pão de Ouro', niche: 'Alimentação', city: 'Fortaleza', state: 'CE', segment: 'Campeão', mentorId: mentorCarlos.id, tags: [], email: 'contato@paodeouro.com', phone: '(85) 3456-7890' },
        { name: 'Studio Beleza Pura', niche: 'Beleza', city: 'Salvador', state: 'BA', segment: 'Estagnado', mentorId: anaSuporte.id, tags: [], email: 'contato@belezapura.com', phone: '(71) 3456-7890' },
        { name: 'Pizzaria Napoli', niche: 'Alimentação', city: 'Recife', state: 'PE', segment: 'Crescendo', mentorId: mentorCarlos.id, tags: [], email: 'contato@napoli.com', phone: '(81) 3456-7890' },
        { name: 'Escola TechKids', niche: 'Educação', city: 'Brasília', state: 'DF', segment: 'Campeão', mentorId: anaSuporte.id, tags: [], email: 'contato@techkids.com', phone: '(61) 3456-7890' },
        { name: 'Loja TechBit', niche: 'Tecnologia', city: 'Porto Alegre', state: 'RS', segment: 'Crescendo', mentorId: mentorCarlos.id, tags: ['Novo'], email: 'contato@techbit.com', phone: '(51) 3456-7890' },
    ];

    const insertedTenants = await db.insert(s.tenants).values(tenantsData).returning();
    console.log(`  ✓ ${insertedTenants.length} tenants created`);

    // ─── 3. CLIENT CONTRACTS ─────────────────────────────────
    console.log('📄 Creating contracts...');
    const mrrValues = [2200, 1500, 1800, 1200, 800, 890, 1600, 650, 1100, 950, 1400, 750];
    const contractsData = insertedTenants.map((t, i) => ({
        tenantId: t.id,
        planName: i < 4 ? 'Profissional' : i < 8 ? 'Essencial' : 'Starter',
        monthlyValue: mrrValues[i].toString(),
        status: 'active' as const,
        startDate: new Date(2025, 6 + Math.floor(i / 3), 1),
        paymentDay: [5, 10, 15, 20][i % 4] as 5 | 10 | 15 | 20,
    }));
    await db.insert(s.clientContracts).values(contractsData);
    console.log(`  ✓ ${contractsData.length} contracts created`);

    // ─── 4. CLIENT PRODUCTS ──────────────────────────────────
    console.log('📦 Creating client products...');
    const productEntries: any[] = [];
    const sysTypes: any[] = ['scheduling', 'orders_delivery', 'crm', 'whatsapp_bot', 'landing_page', 'pos', 'inventory'];
    insertedTenants.forEach((t, i) => {
        const count = [3, 2, 2, 1, 1, 2, 2, 1, 1, 2, 2, 1][i];
        for (let j = 0; j < count; j++) {
            productEntries.push({
                tenantId: t.id,
                systemType: sysTypes[(i + j) % sysTypes.length],
                name: `Sistema ${sysTypes[(i + j) % sysTypes.length]}`,
                version: '2.0',
                status: 'active' as const,
                deliveredAt: new Date(2025, 7, 1),
            });
        }
    });
    await db.insert(s.clientProducts).values(productEntries);
    console.log(`  ✓ ${productEntries.length} client products created`);

    // ─── 5. TRACTION SCORES ──────────────────────────────────
    console.log('📊 Creating traction scores...');
    const scores = [42, 78, 65, 55, 18, 71, 28, 82, 44, 61, 73, 50];
    const tractionData: any[] = [];
    insertedTenants.forEach((t, i) => {
        // Create 30 days of history
        for (let d = 29; d >= 0; d--) {
            const date = new Date();
            date.setDate(date.getDate() - d);
            const jitter = Math.floor(Math.random() * 12) - 6;
            tractionData.push({
                tenantId: t.id,
                score: Math.max(5, Math.min(100, scores[i] + jitter)),
                newLeadsScore: (Math.random() * 25).toFixed(2),
                funnelConversionScore: (Math.random() * 25).toFixed(2),
                responseTimeScore: (Math.random() * 25).toFixed(2),
                missionExecutionScore: (Math.random() * 25).toFixed(2),
                revenueGrowthScore: (Math.random() * 25).toFixed(2),
                calculatedAt: date,
            });
        }
    });
    // Batch insert in chunks of 100
    for (let i = 0; i < tractionData.length; i += 100) {
        await db.insert(s.tractionScores).values(tractionData.slice(i, i + 100));
    }
    console.log(`  ✓ ${tractionData.length} traction scores created`);

    // ─── 6. MONEY ON TABLE SNAPSHOTS ─────────────────────────
    console.log('💰 Creating money-on-table snapshots...');
    const motData = insertedTenants.map((t, i) => {
        const unanswered = [1407, 800, 1200, 600, 2100, 500, 1800, 400, 900, 700, 300, 1100][i];
        const noShow = [529, 300, 700, 200, 900, 150, 800, 100, 400, 300, 150, 500][i];
        const stuck = [7880, 3200, 4500, 1800, 5600, 2100, 6200, 1200, 2800, 2400, 1500, 3100][i];
        const lowConv = [933, 400, 600, 300, 1200, 200, 1000, 150, 500, 350, 200, 700][i];
        return {
            tenantId: t.id,
            totalLost: (unanswered + noShow + stuck + lowConv).toString(),
            unansweredLeadsLoss: unanswered.toString(),
            noShowLoss: noShow.toString(),
            stuckLeadsLoss: stuck.toString(),
            lowConversionLoss: lowConv.toString(),
            periodStart: new Date(2026, 1, 1),
            periodEnd: new Date(2026, 1, 28),
        };
    });
    await db.insert(s.moneyOnTableSnapshots).values(motData);
    console.log(`  ✓ ${motData.length} money-on-table snapshots created`);

    // ─── 7. LEADS ────────────────────────────────────────────
    console.log('🎯 Creating leads...');
    const leadsData = [
        { name: 'Pedro Oliveira', phone: '(11) 98765-0001', niche: 'Restaurante', temperature: 'hot' as const, source: 'meta_ads' as const, productOfInterest: 'Sistema de Pedidos', estimatedValue: '1200' },
        { name: 'Fernanda Costa', phone: '(21) 98765-0002', niche: 'Clínica', temperature: 'warm' as const, source: 'google_ads' as const, productOfInterest: 'Sistema de Agendamento', estimatedValue: '890' },
        { name: 'Ricardo Santos', phone: '(31) 98765-0003', niche: 'Academia', temperature: 'cold' as const, source: 'organic_instagram' as const, productOfInterest: 'CRM de Vendas', estimatedValue: '1500' },
        { name: 'Camila Rocha', phone: '(41) 98765-0004', niche: 'Loja', temperature: 'hot' as const, source: 'referral' as const, productOfInterest: 'PDV/Caixa', estimatedValue: '600' },
        { name: 'Bruno Almeida', phone: '(51) 98765-0005', niche: 'Pet Shop', temperature: 'warm' as const, source: 'whatsapp_direct' as const, productOfInterest: 'Bot WhatsApp', estimatedValue: '800' },
        { name: 'Juliana Lima', phone: '(61) 98765-0006', niche: 'Beleza', temperature: 'cooled' as const, source: 'meta_ads' as const, productOfInterest: 'Landing Page', estimatedValue: '400' },
    ];
    const insertedLeads = await db.insert(s.leads).values(
        leadsData.map(l => ({ ...l, assignedToId: mentorCarlos.id }))
    ).returning();
    console.log(`  ✓ ${insertedLeads.length} leads created`);

    // ─── 8. LEAD CONVERSATIONS (WhatsApp Messages) ───────────
    console.log('💬 Creating lead conversations...');
    const conversationMessages: any[] = [];
    const messageTemplates = [
        [
            { direction: 'inbound', senderType: 'lead', content: 'Oi, vi o anúncio no Instagram. Quanto custa o sistema de pedidos?' },
            { direction: 'outbound', senderType: 'bot', content: 'Olá Pedro! 😊 Que bom que se interessou! Nosso sistema de pedidos é top. Me conta, você tem um restaurante?' },
            { direction: 'inbound', senderType: 'lead', content: 'Sim, tenho uma pizzaria em SP. Faço delivery também.' },
            { direction: 'outbound', senderType: 'bot', content: 'Show! Pizzaria com delivery é exatamente o perfil que mais se beneficia. Posso te mostrar mais detalhes?' },
            { direction: 'inbound', senderType: 'lead', content: 'Claro, me manda!' },
        ],
        [
            { direction: 'inbound', senderType: 'lead', content: 'Tenho uma clínica e preciso organizar meu agendamento online' },
            { direction: 'outbound', senderType: 'bot', content: 'Oi Fernanda! Organizar agendamento é fundamental pra clínicas. Quantos profissionais atendem aí?' },
            { direction: 'inbound', senderType: 'lead', content: 'Somos 5 profissionais, uns 40 atendimentos por dia' },
        ],
        [
            { direction: 'inbound', senderType: 'lead', content: 'Boa tarde, vim pela propaganda do Instagram sobre CRM' },
            { direction: 'outbound', senderType: 'bot', content: 'Olá Ricardo! Legal que nos encontrou. Conta pra mim sobre sua academia 💪' },
        ],
        [
            { direction: 'inbound', senderType: 'lead', content: 'Vou fechar! Me manda o contrato' },
            { direction: 'outbound', senderType: 'human', content: 'Boa Camila! 🎉 Vou preparar o contrato e envio em instantes.' },
        ],
    ];

    insertedLeads.slice(0, 4).forEach((lead, i) => {
        messageTemplates[i].forEach((msg, j) => {
            const d = new Date();
            d.setMinutes(d.getMinutes() - (messageTemplates[i].length - j) * 15);
            conversationMessages.push({
                leadId: lead.id,
                direction: msg.direction,
                senderType: msg.senderType,
                messageType: 'text',
                content: msg.content,
                isRead: msg.direction === 'outbound',
                createdAt: d,
            });
        });
    });
    await db.insert(s.leadConversations).values(conversationMessages);
    console.log(`  ✓ ${conversationMessages.length} messages created`);

    // ─── 9. DEALS PIPELINE ───────────────────────────────────
    console.log('🔥 Creating pipeline deals...');
    const dealsData = [
        { title: 'Sistema completo para Pizzaria', contactName: 'Pedro Oliveira', contactPhone: '(11) 98765-0001', stage: 'proposal', temperature: 'hot' as const, proposedValue: '1200', assignedToId: mentorCarlos.id, nextStep: 'Enviar proposta', nextStepDate: new Date(2026, 1, 26) },
        { title: 'Agendamento para Clínica', contactName: 'Fernanda Costa', contactPhone: '(21) 98765-0002', stage: 'qualification', temperature: 'warm' as const, proposedValue: '890', assignedToId: mentorCarlos.id, nextStep: 'Agendar demo', nextStepDate: new Date(2026, 1, 25) },
        { title: 'CRM Academia PowerFit', contactName: 'Ricardo Santos', contactPhone: '(31) 98765-0003', stage: 'lead', temperature: 'cold' as const, proposedValue: '1500', assignedToId: mentorCarlos.id, nextStep: 'Primeiro contato', nextStepDate: new Date(2026, 1, 24) },
        { title: 'PDV Loja TechBit', contactName: 'Camila Rocha', contactPhone: '(41) 98765-0004', stage: 'negotiation', temperature: 'hot' as const, proposedValue: '600', assignedToId: mentorCarlos.id, nextStep: 'Enviar contrato', nextStepDate: new Date(2026, 1, 23) },
        { title: 'Bot WhatsApp Pet Shop', contactName: 'Bruno Almeida', contactPhone: '(51) 98765-0005', stage: 'demo', temperature: 'warm' as const, proposedValue: '800', assignedToId: mentorCarlos.id, nextStep: 'Demo ao vivo', nextStepDate: new Date(2026, 1, 27) },
        { title: 'Landing Page Studio Beleza', contactName: 'Juliana Lima', contactPhone: '(61) 98765-0006', stage: 'lead', temperature: 'cooled' as const, proposedValue: '400', assignedToId: anaSuporte.id, nextStep: 'Recontacto', nextStepDate: new Date(2026, 1, 28) },
    ];
    await db.insert(s.dealsPipeline).values(dealsData);
    console.log(`  ✓ ${dealsData.length} deals created`);

    // ─── 10. SUPPORT TICKETS ─────────────────────────────────
    console.log('🎫 Creating support tickets...');
    const ticketsData = [
        { tenantId: insertedTenants[0].id, title: 'Erro ao gerar relatório mensal', description: 'Relatório não carrega, dá erro 500', priority: 'high' as const, status: 'open' as const, assignedToId: anaSuporte.id, createdByUserId: adminUser.id, systemType: 'crm' as const, slaFirstResponseHours: 4, slaResolutionHours: 24, messages: [{ userId: adminUser.id, content: 'Cliente reportou via WhatsApp', createdAt: new Date().toISOString() }] },
        { tenantId: insertedTenants[1].id, title: 'Cardápio não atualiza em tempo real', description: 'Mudanças nos preços demoram 30min pra aparecer', priority: 'medium' as const, status: 'in_progress' as const, assignedToId: anaSuporte.id, createdByUserId: adminUser.id, systemType: 'orders_delivery' as const, slaFirstResponseHours: 8, slaResolutionHours: 48 },
        { tenantId: insertedTenants[2].id, title: 'Integração WhatsApp desconectou', description: 'Bot parou de responder há 2 horas', priority: 'urgent' as const, status: 'open' as const, assignedToId: anaSuporte.id, createdByUserId: adminUser.id, systemType: 'whatsapp_bot' as const, slaFirstResponseHours: 1, slaResolutionHours: 4 },
        { tenantId: insertedTenants[3].id, title: 'Dúvida sobre relatórios de vendas', description: 'Não entendeu o gráfico de conversão', priority: 'low' as const, status: 'waiting_client' as const, assignedToId: anaSuporte.id, createdByUserId: adminUser.id, systemType: 'crm' as const, slaFirstResponseHours: 24, slaResolutionHours: 72 },
        { tenantId: insertedTenants[4].id, title: 'Solicitar nova funcionalidade de fidelidade', description: 'Cliente quer cartão fidelidade digital', priority: 'medium' as const, status: 'resolved' as const, assignedToId: anaSuporte.id, createdByUserId: adminUser.id, systemType: 'pos' as const, slaFirstResponseHours: 8, slaResolutionHours: 48, resolvedAt: new Date() },
    ];
    await db.insert(s.supportTickets).values(ticketsData);
    console.log(`  ✓ ${ticketsData.length} tickets created`);

    // ─── 11. MENTORSHIP TASKS (Missions) ─────────────────────
    console.log('🎯 Creating mentorship missions...');
    const missionsData = [
        { tenantId: insertedTenants[0].id, title: 'Implementar script de vendas', priority: 'high' as const, status: 'completed' as const, createdByUserId: mentorCarlos.id, dueDate: new Date(2026, 1, 20), completedAt: new Date(2026, 1, 19), checklist: [{ item: 'Criar script de abordagem', done: true }, { item: 'Treinar equipe', done: true }, { item: 'Testar em 10 leads', done: true }] },
        { tenantId: insertedTenants[0].id, title: 'Configurar funil de captação', priority: 'urgent' as const, status: 'pending' as const, createdByUserId: mentorCarlos.id, dueDate: new Date(2026, 1, 25), checklist: [{ item: 'Definir etapas do funil', done: false }, { item: 'Configurar automações', done: false }, { item: 'Testar fluxo completo', done: false }] },
        { tenantId: insertedTenants[0].id, title: 'Treinar equipe no CRM', priority: 'normal' as const, status: 'pending' as const, createdByUserId: mentorCarlos.id, dueDate: new Date(2026, 2, 1), checklist: [{ item: 'Agendar treinamento', done: false }, { item: 'Preparar material', done: false }] },
        { tenantId: insertedTenants[1].id, title: 'Otimizar cardápio digital', priority: 'high' as const, status: 'in_progress' as const, createdByUserId: mentorCarlos.id, dueDate: new Date(2026, 1, 24), checklist: [{ item: 'Tirar fotos profissionais', done: true }, { item: 'Reorganizar categorias', done: false }, { item: 'Adicionar combos', done: false }] },
        { tenantId: insertedTenants[4].id, title: 'Reativar base de clientes inativos', priority: 'urgent' as const, status: 'overdue' as const, createdByUserId: anaSuporte.id, dueDate: new Date(2026, 1, 15), checklist: [{ item: 'Listar clientes inativos > 30 dias', done: true }, { item: 'Criar campanha de reativação', done: false }, { item: 'Disparar mensagens', done: false }] },
    ];
    await db.insert(s.mentorshipTasks).values(missionsData);
    console.log(`  ✓ ${missionsData.length} missions created`);

    // ─── 12. PLAYBOOKS ───────────────────────────────────────
    console.log('📖 Creating playbooks...');
    const playbooksData = [
        { title: 'Script de Vendas — Primeiro Contato', slug: 'script-vendas-primeiro-contato', description: 'Passo a passo para abordar leads pela primeira vez', category: 'Vendas', content: 'Abordagem inicial com perguntas abertas...' },
        { title: 'Onboarding Novo Cliente', slug: 'onboarding-novo-cliente', description: 'Checklist para integrar novo cliente na plataforma', category: 'Processos', content: 'Coleta de dados, configuração, treinamento...' },
        { title: 'Diagnóstico Técnico Nível 1', slug: 'diagnostico-tecnico-1', description: 'SOP para suporte técnico inicial', category: 'Suporte', content: 'Passo a passo para diagnóstico...' },
        { title: 'Argumentário de Objeções', slug: 'argumentario-objecoes', description: 'Respostas para as principais objeções de vendas', category: 'Vendas', content: 'Objeções e respostas...' },
        { title: 'Mentoria por Nicho: Restaurantes', slug: 'mentoria-nicho-restaurantes', description: 'Métricas-chave e estratégias para restaurantes', category: 'Mentoria', niche: 'Alimentação', content: 'Métricas e estratégias...' },
    ];
    const insertedPlaybooks = await db.insert(s.playbooks).values(playbooksData).returning();
    console.log(`  ✓ ${insertedPlaybooks.length} playbooks created`);

    // ─── 13. MENTORSHIP SESSIONS ─────────────────────────────
    console.log('📅 Creating mentorship sessions...');
    const sessionsData = [
        { tenantId: insertedTenants[0].id, mentorId: mentorCarlos.id, scheduledAt: new Date(2026, 1, 24, 10, 0), duration: 60, notes: 'Revisar métricas e ajustar script de vendas', tractionScoreBefore: 38, tractionScoreAfter: 42 },
        { tenantId: insertedTenants[1].id, mentorId: mentorCarlos.id, scheduledAt: new Date(2026, 1, 25, 14, 0), duration: 45, notes: 'Analisar cardápio e otimizar combos' },
        { tenantId: insertedTenants[4].id, mentorId: anaSuporte.id, scheduledAt: new Date(2026, 1, 26, 9, 0), duration: 30, notes: 'Urgente: reativar base inativos' },
    ];
    await db.insert(s.mentorshipSessions).values(sessionsData);
    console.log(`  ✓ ${sessionsData.length} sessions created`);

    // ─── 14. TEAM MEMBERS ────────────────────────────────────
    console.log('👥 Creating team members...');
    await db.insert(s.teamMembers).values([
        { userId: adminUser.id, position: 'CEO / Fundador', department: 'Diretoria', clientsManaged: 12, missionsSent: 45, sessionsCompleted: 32, avgClientTractionScore: '58.00' },
        { userId: mentorCarlos.id, position: 'Mentor de Vendas', department: 'Mentoria', clientsManaged: 8, missionsSent: 28, sessionsCompleted: 18, avgClientTractionScore: '62.00' },
        { userId: anaSuporte.id, position: 'Analista de Suporte', department: 'Suporte', clientsManaged: 6, missionsSent: 12, sessionsCompleted: 8, avgClientTractionScore: '45.00' },
        { userId: financeiro.id, position: 'Analista Financeiro', department: 'Financeiro', clientsManaged: 0, missionsSent: 0, sessionsCompleted: 0, avgClientTractionScore: '0.00' },
    ]);
    console.log(`  ✓ 4 team members created`);

    // ─── 15. PAYMENTS ────────────────────────────────────────
    console.log('💳 Creating payments...');
    const paymentsData = insertedTenants.map((t, i) => ({
        tenantId: t.id,
        amount: mrrValues[i].toString(),
        dueDate: new Date(2026, 1, [5, 10, 15, 20][i % 4]),
        isPaid: i < 7,
        paidAt: i < 7 ? new Date(2026, 1, [5, 10, 15, 20][i % 4]) : null,
        method: i < 7 ? 'PIX' : null,
    }));
    await db.insert(s.payments).values(paymentsData);
    console.log(`  ✓ ${paymentsData.length} payments created`);

    // ─── 16. INTERNAL CAMPAIGNS ──────────────────────────────
    console.log('📢 Creating campaigns...');
    await db.insert(s.internalCampaigns).values([
        { name: 'Meta Ads — Captação Geral', source: 'meta_ads' as const, budget: '5000', spent: '3200', leadsGenerated: 45, conversions: 8, cpl: '71.11', roi: '380', isActive: true, startDate: new Date(2026, 1, 1) },
        { name: 'Google Ads — Busca CRM', source: 'google_ads' as const, budget: '3000', spent: '2100', leadsGenerated: 28, conversions: 5, cpl: '75.00', roi: '290', isActive: true, startDate: new Date(2026, 1, 1) },
        { name: 'Instagram Orgânico', source: 'organic_instagram' as const, budget: '0', spent: '0', leadsGenerated: 15, conversions: 3, isActive: true, startDate: new Date(2026, 0, 1) },
    ]);
    console.log(`  ✓ 3 campaigns created`);

    // ─── 17. WIKI ARTICLES ───────────────────────────────────
    console.log('📝 Creating wiki articles...');
    await db.insert(s.wikiArticles).values([
        { title: 'Script de Vendas — Primeiro Contato', slug: 'script-vendas', category: 'Vendas', content: 'Abordagem inicial...', tags: ['script', 'vendas'], authorId: mentorCarlos.id },
        { title: 'Playbook: Onboarding Novo Cliente', slug: 'playbook-onboarding', category: 'Processos', content: 'Checklist completo...', tags: ['onboarding', 'processo'], authorId: adminUser.id },
        { title: 'SOP: Suporte Técnico Nível 1', slug: 'sop-suporte-1', category: 'Suporte', content: 'Passo a passo...', tags: ['sop', 'suporte'], authorId: anaSuporte.id },
        { title: 'Argumentário de Objeções', slug: 'argumentario-objecoes', category: 'Vendas', content: 'Respostas...', tags: ['objeções', 'vendas'], authorId: mentorCarlos.id },
        { title: 'Mentoria por Nicho: Restaurantes', slug: 'mentoria-restaurantes', category: 'Mentoria', content: 'Métricas-chave...', tags: ['nicho', 'restaurante'], authorId: mentorCarlos.id },
    ]);
    console.log(`  ✓ 5 wiki articles created`);

    // ─── 18. IDEAS ───────────────────────────────────────────
    console.log('💡 Creating ideas...');
    await db.insert(s.ideas).values([
        { title: 'App mobile para clientes', description: 'Versão mobile do painel do cliente', status: 'planned' as const, upvotes: 12, downvotes: 1, linkedClientRequests: 5, submittedByUserId: adminUser.id },
        { title: 'Integração com NF-e', description: 'Emissão automática de nota fiscal', status: 'backlog' as const, upvotes: 8, downvotes: 2, linkedClientRequests: 3, submittedByUserId: financeiro.id },
        { title: 'Dashboard white-label', description: 'Permitir customização de cores e logo', status: 'in_development' as const, upvotes: 15, downvotes: 0, linkedClientRequests: 7, submittedByUserId: adminUser.id },
        { title: 'Chatbot com IA generativa', description: 'IA para respostas personalizadas', status: 'planned' as const, upvotes: 20, downvotes: 3, linkedClientRequests: 4, submittedByUserId: mentorCarlos.id },
        { title: 'Relatório automático via email', description: 'Envio semanal de performance', status: 'completed' as const, upvotes: 10, downvotes: 0, linkedClientRequests: 6, submittedByUserId: adminUser.id },
    ]);
    console.log(`  ✓ 5 ideas created`);

    // ─── 19. SYSTEM TEMPLATES ────────────────────────────────
    console.log('🧱 Creating system templates...');
    await db.insert(s.systemTemplates).values([
        { name: 'Sistema de Agendamento', systemType: 'scheduling' as const, description: 'Agenda online com confirmação automática', version: '3.2', price: '890', features: ['agenda', 'confirmação WhatsApp', 'lembretes', 'no-show'] },
        { name: 'Sistema de Pedidos/Delivery', systemType: 'orders_delivery' as const, description: 'Cardápio digital com pedidos via WhatsApp', version: '2.8', price: '1200', features: ['cardápio', 'pedidos', 'delivery', 'relatórios'] },
        { name: 'CRM de Vendas', systemType: 'crm' as const, description: 'Funil de vendas e gestão de leads', version: '4.1', price: '1500', features: ['funil', 'leads', 'automações', 'relatórios'] },
        { name: 'Controle de Estoque', systemType: 'inventory' as const, description: 'Gestão de estoque com alertas', version: '2.0', price: '700', features: ['entrada/saída', 'estoque mínimo', 'alertas', 'categorias'] },
        { name: 'PDV / Caixa', systemType: 'pos' as const, description: 'Frente de caixa com múltiplos pagamentos', version: '1.5', price: '600', features: ['caixa', 'pagamentos', 'fluxo'] },
        { name: 'Bot WhatsApp', systemType: 'whatsapp_bot' as const, description: 'Atendimento automatizado por WhatsApp', version: '2.3', price: '800', features: ['atendimento', 'qualificação', 'agendamento'] },
        { name: 'Landing Pages', systemType: 'landing_page' as const, description: 'Páginas de captura otimizadas', version: '1.0', price: '400', isActive: false, features: ['captura', 'A/B testing', 'analytics'] },
    ]);
    console.log(`  ✓ 7 system templates created`);

    // ─── 20. ONBOARDING PROCESSES ────────────────────────────
    console.log('🚀 Creating onboarding processes...');
    await db.insert(s.onboardingProcesses).values([
        {
            tenantId: insertedTenants[3].id, status: 'training' as const, assignedToId: mentorCarlos.id, checklist: [
                { step: 'Coleta de dados', completed: true, completedAt: '2026-02-15' },
                { step: 'Configuração do sistema', completed: true, completedAt: '2026-02-17' },
                { step: 'Treinamento', completed: false },
                { step: 'Teste e validação', completed: false },
                { step: 'Go-live', completed: false },
                { step: 'Primeira mentoria', completed: false },
            ]
        },
        {
            tenantId: insertedTenants[11].id, status: 'system_config' as const, assignedToId: anaSuporte.id, checklist: [
                { step: 'Coleta de dados', completed: true, completedAt: '2026-02-20' },
                { step: 'Configuração do sistema', completed: false },
                { step: 'Treinamento', completed: false },
                { step: 'Teste e validação', completed: false },
                { step: 'Go-live', completed: false },
                { step: 'Primeira mentoria', completed: false },
            ]
        },
    ]);
    console.log(`  ✓ 2 onboarding processes created`);

    // ─── 21. DOCUMENTS ───────────────────────────────────────
    console.log('📎 Creating documents...');
    await db.insert(s.documents).values([
        { tenantId: insertedTenants[0].id, name: 'Contrato - Clínica Bella Vita.pdf', category: 'Contratos', mimeType: 'application/pdf', fileUrl: '/files/contracts/bellavita.pdf', fileSize: 245000, uploadedByUserId: adminUser.id },
        { tenantId: insertedTenants[1].id, name: 'Logo Sabor & Arte.png', category: 'Branding', mimeType: 'image/png', fileUrl: '/files/branding/saborarte.png', fileSize: 89000, uploadedByUserId: adminUser.id },
        { tenantId: insertedTenants[0].id, name: 'Relatório Mensal - Janeiro.pdf', category: 'Relatórios', mimeType: 'application/pdf', fileUrl: '/files/reports/bellavita-jan.pdf', fileSize: 512000, uploadedByUserId: mentorCarlos.id },
        { tenantId: insertedTenants[2].id, name: 'Manual do Sistema.pdf', category: 'Manuais', mimeType: 'application/pdf', fileUrl: '/files/manuals/powerfit.pdf', fileSize: 1200000, uploadedByUserId: anaSuporte.id },
    ]);
    console.log(`  ✓ 4 documents created`);

    // ─── 22. BOT SESSIONS ────────────────────────────────────
    console.log('🤖 Creating bot sessions...');
    await db.insert(s.botSessions).values([
        { instanceName: 'imperio-main', status: 'connected' as const, phoneNumber: '(11) 99999-9999', connectedAt: new Date(Date.now() - 86400000), uptimeSeconds: 86400 },
    ]);
    console.log(`  ✓ 1 bot session created`);

    // ─── 23. AUDIT LOGS ──────────────────────────────────────
    console.log('📋 Creating audit logs...');
    const auditData = [
        { userId: adminUser.id, action: 'login', entityType: 'user', entityId: adminUser.id },
        { userId: mentorCarlos.id, action: 'create', entityType: 'mentorship_task', entityId: 'mission-1' },
        { userId: anaSuporte.id, action: 'update', entityType: 'support_ticket', entityId: 'ticket-1', changes: { status: { old: 'open', new: 'in_progress' } } },
        { userId: adminUser.id, action: 'create', entityType: 'tenant', entityId: insertedTenants[0].id },
        { userId: mentorCarlos.id, action: 'update', entityType: 'lead', entityId: insertedLeads[0].id, changes: { temperature: { old: 'warm', new: 'hot' } } },
    ];
    await db.insert(s.auditLogs).values(auditData);
    console.log(`  ✓ ${auditData.length} audit logs created`);

    // ─── 24. OPERATIONAL COSTS ───────────────────────────────
    console.log('💸 Creating operational costs...');
    await db.insert(s.operationalCosts).values([
        { category: 'Infraestrutura', description: 'Servidor VPS (Hetzner)', amount: '350', isRecurring: true, periodMonth: 2, periodYear: 2026 },
        { category: 'Infraestrutura', description: 'Domínios e SSL', amount: '150', isRecurring: true, periodMonth: 2, periodYear: 2026 },
        { category: 'Marketing', description: 'Meta Ads budget', amount: '5000', isRecurring: true, periodMonth: 2, periodYear: 2026 },
        { category: 'Marketing', description: 'Google Ads budget', amount: '3000', isRecurring: true, periodMonth: 2, periodYear: 2026 },
        { category: 'Pessoal', description: 'Salários e comissões', amount: '12000', isRecurring: true, periodMonth: 2, periodYear: 2026 },
    ]);
    console.log(`  ✓ 5 operational costs created`);

    // ─── 25. NPS RESPONSES ───────────────────────────────────
    console.log('⭐ Creating NPS responses...');
    const npsData = insertedTenants.map((t, i) => ({
        tenantId: t.id,
        score: [8, 9, 7, 8, 5, 10, 4, 9, 7, 8, 9, 7][i],
        comment: i % 3 === 0 ? 'Ótimo serviço!' : i % 3 === 1 ? 'Bom, mas pode melhorar o suporte' : null,
        trigger: 'quarterly',
    }));
    await db.insert(s.npsResponses).values(npsData);
    console.log(`  ✓ ${npsData.length} NPS responses created`);

    console.log('\n✅ Seed complete! Database populated with realistic data.\n');

    // Summary
    console.log('📊 Summary:');
    console.log('  Users:          4');
    console.log('  Tenants:       12');
    console.log('  Contracts:     12');
    console.log('  Products:      20+');
    console.log('  Traction:     360 (30 days × 12 tenants)');
    console.log('  Leads:          6');
    console.log('  Messages:      14+');
    console.log('  Deals:          6');
    console.log('  Tickets:        5');
    console.log('  Missions:       5');
    console.log('  Playbooks:      5');
    console.log('  Payments:      12');

    await client.end();
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
