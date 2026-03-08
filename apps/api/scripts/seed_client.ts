import { db, users, tenants } from 'db';
import { eq } from 'drizzle-orm';

async function seedClientUser() {
    console.log('Seeding fake client user...');

    // Check if we have any tenant
    let [tenant] = await db.select().from(tenants).limit(1);

    if (!tenant) {
        console.log('No tenant found, creating one...');
        [tenant] = await db.insert(tenants).values({
            name: 'Cliente Teste Portal',
            tradeName: 'Portal Teste ME',
            niche: 'Varejo',
            segment: 'stable',
            domain: 'clienteteste.com',
            isActive: true
        }).returning();
    }

    const email = 'cliente@teste.com';
    const passwordHash = await Bun.password.hash('123456', { algorithm: 'argon2id' });

    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (user) {
        // Update to ensure right role and tenant
        await db.update(users).set({
            role: 'client_owner',
            passwordHash,
            tenantId: tenant.id
        }).where(eq(users.id, user.id));
        console.log(`User ${email} updated to client_owner with tenant ${tenant.id}`);
    } else {
        await db.insert(users).values({
            name: 'João Cliente',
            email,
            passwordHash,
            role: 'client_owner',
            tenantId: tenant.id,
            isActive: true
        });
        console.log(`User ${email} created as client_owner for tenant ${tenant.id}`);
    }

    process.exit(0);
}

seedClientUser();
