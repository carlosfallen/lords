import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SERVICE_NAMES = [
    'lords-api',
    'lords-bot-gateway',
    'lords-bot-brain',
    'lords-web',
    'lords-workers',
    'lords-qdrant',
    'lords-postgres',
    'lords-redis'
];

export const healthRoutes: any[] = [
    ['GET', '/api/health/services', async () => {
        try {
            const { stdout } = await execAsync('docker ps -a --format "json"');
            const containers = stdout.trim().split('\n').filter(Boolean).map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            }).filter(Boolean);

            const health = SERVICE_NAMES.map(name => {
                const container = containers.find(c => c.Names === name);
                return {
                    name,
                    status: container ? container.Status : 'Not Found',
                    state: container ? container.State : 'unknown',
                    image: container ? container.Image : 'unknown',
                    up: container ? (container.State === 'running' || container.Status.includes('Up')) : false
                };
            });

            return Response.json({ success: true, services: health });
        } catch (err: any) {
            console.error('[Health] Services error:', err);
            return Response.json({ success: false, error: err.message }, { status: 500 });
        }
    }],

    ['GET', '/api/health/logs/:name', async (_req: any, params: any) => {
        const name = params?.name;
        if (!SERVICE_NAMES.includes(name)) {
            return Response.json({ success: false, error: 'Invalid service name' }, { status: 400 });
        }

        try {
            const { stdout } = await execAsync(`docker logs --tail 100 ${name}`);
            return Response.json({ success: true, logs: stdout });
        } catch (err: any) {
            console.error(`[Health] Logs error for ${name}:`, err);
            return Response.json({ success: true, logs: `Error fetching logs: ${err.message}` });
        }
    }]
];
