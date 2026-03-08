// ============================================================
// Follow-up Automation — Cron Service
// Checks for overdue leads and broadcasts alerts via WebSocket
// Also invokes followUpOrchestrator for active prospecting leads
// ============================================================
import { db, leads, users } from 'db';
import { eq, and, lt, isNull, or, not } from 'drizzle-orm';
import { broadcast } from '../websocket';
import { runFollowupOrchestrator } from './followUpOrchestrator.service';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Every 5 minutes
const OVERDUE_THRESHOLD_HOURS = 24; // 1 day

interface OverdueLead {
    id: string;
    name: string | null;
    phone: string;
    temperature: string;
    representativeId: string | null;
    lastContactAt: Date | null;
    nextFollowUpAt: Date | null;
    snoozeUntil: Date | null;
    diasSemContato: number;
}

export function startFollowUpCron() {
    console.log('⏰ Follow-up cron started (interval: 5min)');

    // Run immediately on startup, then every interval
    runFollowUpCheck();
    setInterval(runFollowUpCheck, CHECK_INTERVAL_MS);

    // Also run prospecting follow-up orchestrator every 30 minutes
    // Section 15 of playbook: follow-up orchestration
    const PROSPECT_FOLLOWUP_INTERVAL_MS = 30 * 60 * 1000;
    setTimeout(() => {
        runFollowupOrchestrator().catch(err => console.error('❌ Prospect follow-up cron error:', err));
        setInterval(() => {
            runFollowupOrchestrator().catch(err => console.error('❌ Prospect follow-up cron error:', err));
        }, PROSPECT_FOLLOWUP_INTERVAL_MS);
    }, 2 * 60 * 1000); // Start after 2 min delay on startup
}

async function runFollowUpCheck() {
    try {
        const now = new Date();
        const threshold = new Date(now.getTime() - OVERDUE_THRESHOLD_HOURS * 60 * 60 * 1000);

        // Find active leads that are overdue
        const overdueLeads = await db.select({
            id: leads.id,
            name: leads.name,
            phone: leads.phone,
            temperature: leads.temperature,
            representativeId: leads.representativeId,
            lastContactAt: leads.lastContactAt,
            nextFollowUpAt: leads.nextFollowUpAt,
            snoozeUntil: leads.snoozeUntil,
        }).from(leads).where(
            and(
                eq(leads.status, 'ativo'),
                eq(leads.isConverted, false),
                or(
                    isNull(leads.lastContactAt),
                    lt(leads.lastContactAt, threshold),
                ),
                // Not snoozed
                or(
                    isNull(leads.snoozeUntil),
                    lt(leads.snoozeUntil, now),
                ),
            )
        );

        if (overdueLeads.length === 0) return;

        // Enrich with days-since-contact
        const enriched: OverdueLead[] = overdueLeads.map(l => ({
            ...l,
            diasSemContato: l.lastContactAt
                ? Math.floor((now.getTime() - new Date(l.lastContactAt).getTime()) / 86400000)
                : 999,
        }));

        // Group by rep for targeted alerts
        const byRep = new Map<string, OverdueLead[]>();
        for (const lead of enriched) {
            const repId = lead.representativeId || '__unassigned__';
            if (!byRep.has(repId)) byRep.set(repId, []);
            byRep.get(repId)!.push(lead);
        }

        // Broadcast to each rep their overdue leads
        for (const [repId, repLeads] of byRep) {
            if (repId === '__unassigned__') continue;

            // Sort by priority: hot first, then by days
            const sorted = repLeads.sort((a, b) => {
                const tempOrder: Record<string, number> = { hot: 0, warm: 1, cold: 2, cooled: 3 };
                const diff = (tempOrder[a.temperature] ?? 99) - (tempOrder[b.temperature] ?? 99);
                if (diff !== 0) return diff;
                return b.diasSemContato - a.diasSemContato;
            });

            // Only send top 10 to avoid noise
            const top = sorted.slice(0, 10);

            broadcast('followup.alert', {
                type: 'overdue_leads',
                count: repLeads.length,
                leads: top.map(l => ({
                    id: l.id,
                    name: l.name || l.phone,
                    phone: l.phone,
                    temperature: l.temperature,
                    diasSemContato: l.diasSemContato,
                    nextFollowUpAt: l.nextFollowUpAt,
                })),
            }, { targetRole: undefined }); // Broadcasts to all connected, frontend filters by own leads
        }

        // Also send a summary to admins
        const totalOverdue = enriched.length;
        const hotOverdue = enriched.filter(l => l.temperature === 'hot').length;

        broadcast('followup.admin_summary', {
            type: 'overdue_summary',
            totalOverdue,
            hotOverdue,
            byRep: Array.from(byRep.entries()).map(([repId, leads]) => ({
                repId,
                count: leads.length,
                hotCount: leads.filter(l => l.temperature === 'hot').length,
            })),
        }, { targetRole: 'admin' });

        console.log(`⏰ Follow-up check: ${totalOverdue} overdue leads (${hotOverdue} hot)`);

        // Check for today's follow-ups
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 86400000);

        const todayFollowUps = await db.select({
            id: leads.id,
            name: leads.name,
            phone: leads.phone,
            nextFollowUpAt: leads.nextFollowUpAt,
            representativeId: leads.representativeId,
        }).from(leads).where(
            and(
                eq(leads.status, 'ativo'),
                // nextFollowUpAt between todayStart and todayEnd
                lt(leads.nextFollowUpAt, todayEnd),
            )
        );

        const dueTodayNotPast = todayFollowUps.filter(l =>
            l.nextFollowUpAt && new Date(l.nextFollowUpAt) >= todayStart
        );

        if (dueTodayNotPast.length > 0) {
            broadcast('followup.today', {
                type: 'followup_today',
                count: dueTodayNotPast.length,
                leads: dueTodayNotPast.map(l => ({
                    id: l.id,
                    name: l.name || l.phone,
                    phone: l.phone,
                    scheduledAt: l.nextFollowUpAt,
                })),
            });
        }
    } catch (err) {
        console.error('❌ Follow-up cron error:', err);
    }
}
