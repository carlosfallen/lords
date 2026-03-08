import fs from 'fs';
import path from 'path';

const schemaPath = 'c:/Users/cagus/Downloads/lords/packages/db/src/schema.ts';
let code = fs.readFileSync(schemaPath, 'utf8');

// 1. Replace imports
code = code.replace(/import \{([\s\S]*?)\} from 'drizzle-orm\/pg-core';/g, `import {\n    sqliteTable,\n    text,\n    integer,\n    real,\n    index,\n    uniqueIndex,\n    AnySQLiteColumn\n} from 'drizzle-orm/sqlite-core';`);

code = code.replace(/AnyPgColumn/g, 'AnySQLiteColumn');
code = code.replace(/pgTable/g, 'sqliteTable');

// 2. Maps for Enums
const enums = {};
const enumRegex = /export const (\w+)Enum = pgEnum\('[\w_]+', \[(.*?)\]\);/gs;
let match;
while ((match = enumRegex.exec(code)) !== null) {
    enums[match[1]] = match[2];
}

// Remove pgEnum definitions
code = code.replace(enumRegex, '');

// Replace enum usages: userRoleEnum('role') -> text('role', { enum: [...] })
for (const [enumName, enumValues] of Object.entries(enums)) {
    const usageRegex = new RegExp(`${enumName}Enum\\(('[\\w_]+')\\)`, 'g');
    code = code.replace(usageRegex, `text($1, { enum: [${enumValues}] })`);
}

// 3. Replace Data Types
// uuid('id') -> text('id')
code = code.replace(/uuid\(/g, 'text(');

// varchar('x', { length: 255 }) -> text('x')
code = code.replace(/varchar\(([^,]+)(,\s*\{[^}]+\})?\)/g, 'text($1)');

// boolean('x') -> integer('x', { mode: 'boolean' })
code = code.replace(/boolean\(([^)]+)\)/g, 'integer($1, { mode: \'boolean\' })');

// timestamp('x') -> integer('x', { mode: 'timestamp' })
// wait, if there are defaultNow(), sqlite uses sql`(unixepoch())` or `CURRENT_TIMESTAMP`
code = code.replace(/timestamp\(([^)]+)\)/g, 'integer($1, { mode: \'timestamp\' })');
code = code.replace(/\.defaultNow\(\)/g, `.default(sql\`(cast(strftime('%s', 'now') as integer))\`)`);
code = code.replace(/\.defaultRandom\(\)/g, `$0`); // sqlite doesn't have a defaultRandom for uuid directly unless supported by driver. Let's leave for now, or use `sql\`(lower(hex(randomblob(16))))\``

// decimal('x', {...}) -> real('x')
code = code.replace(/decimal\(([^,]+)(,\s*\{[^}]+\})?\)/g, 'real($1)');

// jsonb('x') -> text('x', { mode: 'json' })
code = code.replace(/jsonb\(([^)]+)\)/g, 'text($1, { mode: \'json\' })');

// serial('id') -> integer('id', { mode: 'number' })
code = code.replace(/serial\(([^)]+)\)/g, 'integer($1, { mode: \'number\' })');

// smallint('col') -> integer('col')
code = code.replace(/smallint\(/g, 'integer(');

// 4. Postgres text arrays aren't supported. Luckily we use JSONb
// Any `.defaultRandom()` with `text` needs to be mapped to random id for sqlite
code = code.replace(/\.defaultRandom\(\)/g, `.default(sql\`(lower(hex(randomblob(16))))\`)`);

// write back
fs.writeFileSync(schemaPath, code, 'utf8');
console.log('Schema converted successfully');
