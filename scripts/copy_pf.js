const fs = require('fs');
const src = 'c:/Users/cagus/Downloads/lords/monday/ProjectFlow.jsx';
const destDir = 'c:/Users/cagus/Downloads/lords/apps/web/src/pages/monday';
const dest = destDir + '/ProjectFlow.jsx';

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

let code = fs.readFileSync(src, 'utf8');

// Replace CSS globals
code = code.replace(
    `*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{font:13px/1.5 system-ui,-apple-system,sans-serif;background:#f1f5f9;color:#1e293b;overflow-x:hidden}
button{cursor:pointer;font-family:inherit;font-size:13px}
input,select,textarea{font-family:inherit;font-size:13px}`,
    `.pf-wrapper { box-sizing:border-box; font:13px/1.5 system-ui,-apple-system,sans-serif;background:#f1f5f9;color:#1e293b; }
.pf-wrapper * { box-sizing: border-box; }
.pf-wrapper button {cursor:pointer;font-family:inherit;font-size:13px; background:transparent; border:none;}
.pf-wrapper input, .pf-wrapper select, .pf-wrapper textarea {font-family:inherit;font-size:13px}`
);

code = code.replace(
    `.app{display:flex;height:100vh;overflow:hidden}`,
    `.app{display:flex;height:100%;min-height:calc(100vh - 120px);overflow:hidden;border-radius:12px;box-shadow:0 0 20px rgba(0,0,0,0.1);}`
);

code = code.replace(
    `.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;padding:16px}`,
    `.login-wrap{min-height:calc(100vh - 120px);display:flex;align-items:center;justify-content:center;background:#0f172a;padding:16px;border-radius:12px;}`
);

// Add pf-wrapper to App
code = code.replace(
    `export default function App() {
  return (
    <>
      <style>{STYLES}</style>
      <AuthProvider>
        <NotifProvider>
          <Inner/>
        </NotifProvider>
      </AuthProvider>
    </>
  );
}`,
    `export default function App() {
  return (
    <div className="pf-wrapper h-full w-full">
      <style>{STYLES}</style>
      <AuthProvider>
        <NotifProvider>
          <Inner/>
        </NotifProvider>
      </AuthProvider>
    </div>
  );
}`
);

fs.writeFileSync(dest, code);
console.log('Script done');
