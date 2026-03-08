// ============================================================
// Team Routes — Real Database Queries
// ============================================================
import { db, teamMembers, users, mentorshipSessions, tenants } from 'db';
import { eq, desc, gte, and } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const teamRoutes: RouteEntry[] = [
    ['GET', '/api/team', async () => {
        const members = await db.select({
            id: teamMembers.id,
            name: users.name,
            email: users.email,
            role: users.role,
            position: teamMembers.position,
            department: teamMembers.department,
            clientsManaged: teamMembers.clientsManaged,
            missionsSent: teamMembers.missionsSent,
            sessionsCompleted: teamMembers.sessionsCompleted,
            avgClientScore: teamMembers.avgClientTractionScore,
        }).from(teamMembers)
            .innerJoin(users, eq(teamMembers.userId, users.id))
            .where(eq(users.isActive, true));

        return Response.json({ success: true, data: members.map(m => ({ ...m, avgClientScore: Number(m.avgClientScore || 0) })) });
    }],

    ['GET', '/api/team/calendar', async () => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const sessions = await db.select({
            id: mentorshipSessions.id,
            scheduledAt: mentorshipSessions.scheduledAt,
            duration: mentorshipSessions.duration,
            notes: mentorshipSessions.notes,
            tenantName: tenants.name,
            mentorName: users.name,
        }).from(mentorshipSessions)
            .leftJoin(tenants, eq(mentorshipSessions.tenantId, tenants.id))
            .leftJoin(users, eq(mentorshipSessions.mentorId, users.id))
            .where(gte(mentorshipSessions.scheduledAt, weekStart))
            .orderBy(mentorshipSessions.scheduledAt);

        const events = sessions.map(s => ({
            id: s.id,
            title: `Mentoria — ${s.tenantName}`,
            date: s.scheduledAt,
            duration: s.duration || 60,
            attendee: s.tenantName,
            type: 'mentorship',
        }));

        return Response.json({ success: true, data: events });
    }],
];
