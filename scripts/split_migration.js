const fs = require('fs');
const path = require('path');

const INPUT = 'apps/cf-api/migrations/data_migration.sql';
const OUTPUT_DIR = 'apps/cf-api/migrations/chunks';
const CHUNK_SIZE = 300;

function split() {
    try {
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        const content = fs.readFileSync(INPUT, 'utf-8');
        const lines = content.split('\n');

        const headers = lines.slice(0, 8); // Preamble
        const inserts = lines.slice(8).filter(l => l.trim().startsWith('INSERT'));
        const footers = lines.slice(-10).filter(l => l.trim().startsWith('PRAGMA') || l.trim().startsWith('--'));

        console.log(`Processing ${inserts.length} insert statements...`);

        for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
            const chunk = inserts.slice(i, i + CHUNK_SIZE);
            const chunkNum = Math.floor(i / CHUNK_SIZE);
            const fileName = `chunk_${chunkNum.toString().padStart(2, '0')}.sql`;
            const chunkContent = [
                ...headers,
                'PRAGMA foreign_keys = OFF;',
                '',
                ...chunk,
                '',
                'PRAGMA foreign_keys = ON;',
                ...footers
            ].join('\n');

            fs.writeFileSync(path.join(OUTPUT_DIR, fileName), chunkContent);
            console.log(`Created ${fileName} with ${chunk.length} rows`);
        }
        console.log('Splitting complete!');
    } catch (err) {
        console.error('Error during split:', err);
        process.exit(1);
    }
}

split();
