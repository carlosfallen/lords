import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const INPUT = 'apps/cf-api/migrations/data_migration.sql';
const OUTPUT_DIR = 'apps/cf-api/migrations/chunks';
const CHUNK_SIZE = 300;

function split() {
    if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR);

    const content = readFileSync(INPUT, 'utf-8');
    const lines = content.split('\n');

    const headers = lines.slice(0, 8); // Preamble
    const inserts = lines.slice(8).filter(l => l.startsWith('INSERT'));
    const footers = lines.slice(-5).filter(l => l.startsWith('PRAGMA') || l.startsWith('--'));

    for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
        const chunk = inserts.slice(i, i + CHUNK_SIZE);
        const fileName = `chunk_${Math.floor(i / CHUNK_SIZE)}.sql`;
        const chunkContent = [
            ...headers,
            'PRAGMA foreign_keys = OFF;',
            '',
            ...chunk,
            '',
            'PRAGMA foreign_keys = ON;',
            ...footers
        ].join('\n');

        writeFileSync(join(OUTPUT_DIR, fileName), chunkContent);
        console.log(`Created ${fileName} with ${chunk.length} rows`);
    }
}

split();
