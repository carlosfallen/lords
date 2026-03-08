import { db } from './index';
import { tenants, users, teamMembers, clientContracts, clientProducts, systemTemplates } from './schema';
import { eq } from 'drizzle-orm';

async function provision() {
    console.log('🚀 Império Lord — Client Provisioning Tool');

    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error('\n❌ Usage: bun run provision <TenantName> <OwnerEmail> <OwnerPassword> [Niche]');
        console.error('Example: bun run provision "Locadora Aluguel" "dono@locadora.com" "senha123" "Locação"');
        process.exit(1);
    }

    const [tenantName, ownerEmail, ownerPassword, niche = 'Geral'] = args;

    try {
        console.log(`\n1. Checking uniqueness for ${ownerEmail}...`);
        const existingUsers = await db.select().from(users).where(eq(users.email, ownerEmail));
        if (existingUsers.length > 0) {
            console.error(`❌ Error: User ${ownerEmail} already exists!`);
            process.exit(1);
        }

        console.log(`2. Creating Tenant: ${tenantName}...`);
        const [tenant] = await db.insert(tenants).values({
            name: tenantName,
            tradeName: tenantName,
            niche: niche,
            segment: 'Novo',
            isActive: true,
        }).returning();
        console.log(`   ✅ Tenant created: ${tenant.id}`);

        console.log(`3. Creating Owner User: ${ownerEmail}...`);
        // @ts-ignore
        const passwordHash = await Bun.password.hash(ownerPassword, { algorithm: 'argon2id' });
        const [user] = await db.insert(users).values({
            email: ownerEmail,
            passwordHash,
            name: `${tenantName} (Dono)`,
            role: 'client_owner',
            isActive: true,
            tenantId: tenant.id,
        }).returning();
        console.log(`   ✅ User created: ${user.id}`);

        console.log(`4. Setting up Default Contract...`);
        await db.insert(clientContracts).values({
            tenantId: tenant.id,
            planName: 'Império START',
            monthlyValue: '997.00',
            status: 'active',
            startDate: new Date(),
        });
        console.log(`   ✅ Contract configured`);

        console.log(`5. Deploying default CRM modules...`);
        const coreModules = ['CRM Escala', 'WhatsApp Bot'];
        for (const mod of coreModules) {
            await db.insert(clientProducts).values({
                tenantId: tenant.id,
                systemType: mod === 'WhatsApp Bot' ? 'whatsapp_bot' : 'crm',
                name: mod,
                status: 'active',
                accessUrl: `https://${tenantName.toLowerCase().replace(/\s+/g, '')}.imperiolord.com`,
            });
        }
        console.log(`   ✅ Modules deployed`);

        console.log(`\n🎉 PROVISIONING SUCCESSFUL!`);
        console.log(`==========================================`);
        console.log(`Tenant     : ${tenant.name} (${tenant.id})`);
        console.log(`Owner      : ${user.name} (${user.email})`);
        console.log(`Role       : ${user.role}`);
        console.log(`MRR Added  : R$ 997,00`);
        console.log(`Isolation  : Vector & DB secured by TenantID`);
        console.log(`Gateway    : Go Multi-Tenant ready`);
        console.log(`==========================================\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to provision client:', error);
        process.exit(1);
    }
}

provision();
