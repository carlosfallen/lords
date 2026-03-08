import { db, leads, bottleneckAlerts, tenants, funnelStages } from 'db';
import { eq, lt, and, sql, inArray } from 'drizzle-orm';

// Regra de Negócio: Leads sem movimentação ('updated_at') > 72h são considerados "gargalos"
const HOURS_STUCK_THRESHOLD = 72;

export async function runBottleneckAnalysis() {
    console.log(`[WORKER] Iniciando análise de Gargalos Automática (limite: ${HOURS_STUCK_THRESHOLD}h)`);

    try {
        const thresholdDate = new Date(Date.now() - HOURS_STUCK_THRESHOLD * 60 * 60 * 1000);

        // 1. Encontrar todos os leads estagnados com os nomes de Tenant e Stage via JOIN
        const stuckLeadsQuery = await db.select({
            tenantId: leads.tenantId,
            tenantName: tenants.name,
            stageId: leads.currentFunnelStageId,
            stageName: funnelStages.name,
            count: sql<number>`count(${leads.id})::int`,
            totalValue: sql<number>`sum(COALESCE(${leads.estimatedValue}, 0))::numeric`,
            maxStuckDate: sql<Date>`min(${leads.updatedAt})`
        })
            .from(leads)
            .leftJoin(tenants, eq(leads.tenantId, tenants.id))
            .leftJoin(funnelStages, eq(leads.currentFunnelStageId, funnelStages.id))
            .where(
                and(
                    lt(leads.updatedAt, thresholdDate),
                    eq(leads.isConverted, false),
                    sql`${leads.lossReason} IS NULL`
                )
            )
            .groupBy(leads.tenantId, tenants.name, leads.currentFunnelStageId, funnelStages.name);

        if (stuckLeadsQuery.length === 0) {
            console.log('[WORKER] Nenhum gargalo encontrado no sistema.');
            return;
        }

        // 2. Inserir os novos alertas formatados
        const newAlerts = stuckLeadsQuery.map(stuck => {
            const hoursStuck = Math.floor((Date.now() - new Date(stuck.maxStuckDate).getTime()) / (1000 * 60 * 60));
            const stageName = stuck.stageName || 'Sem Etapa';
            const tenantName = stuck.tenantName || 'Desconhecido';

            let severity: 'critical' | 'warning' | 'info' = 'info';
            if (hoursStuck > 120 || stuck.count > 20) severity = 'critical';
            else if (hoursStuck > 72 || stuck.count > 5) severity = 'warning';

            const message = `${tenantName} — ${stuck.count} leads parados em '${stageName}' há mais de ${hoursStuck}h. Ticket médio estimado represado: R$ ${stuck.totalValue}`;

            return {
                tenantId: stuck.tenantId as string,
                funnelStageId: stuck.stageId as string,
                severity,
                leadsStuck: Number(stuck.count),
                estimatedRevenueLost: stuck.totalValue.toString(),
                hoursStuck: hoursStuck.toString(),
                message
            };
        });

        if (newAlerts.length > 0) {
            // Limpar os alertas antigos não reconhecidos para os tenants afetados em lote
            const affectedTenants = [...new Set(newAlerts.map(a => a.tenantId).filter(Boolean))] as string[];
            if (affectedTenants.length > 0) {
                await db.delete(bottleneckAlerts)
                    .where(
                        and(
                            eq(bottleneckAlerts.isAcknowledged, false),
                            inArray(bottleneckAlerts.tenantId, affectedTenants)
                        )
                    );
            }

            await db.insert(bottleneckAlerts).values(newAlerts);
            console.log(`[WORKER] Foram criados ${newAlerts.length} novos alertas de gargalo.`);
        }

    } catch (error) {
        console.error('[WORKER] Erro ao analisar gargalos:', error);
    }
}

// Permite rodar o arquivo diretamente
if (import.meta.main) {
    runBottleneckAnalysis().then(() => process.exit(0));
}
