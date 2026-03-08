import fs from 'fs';
const file = 'c:/Users/cagus/Downloads/lords/packages/db/src/schema.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/\$0/g, ".default(sql`(lower(hex(randomblob(16))))`)");
fs.writeFileSync(file, code);
console.log('Fixed');
