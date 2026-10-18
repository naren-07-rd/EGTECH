import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const f = path.join(distDir, p);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) {
    const ext = path.extname(f).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 9088;
const DEBUG_PORT = 9277;

server.listen(PORT, '127.0.0.1', async () => {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--window-size=1280,900',
    `http://127.0.0.1:${PORT}/`
  ]);

  let targets = null;
  for (let i = 0; i < 20; i++) {
    try {
      const targetsRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
      targets = await targetsRes.json();
      break;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

  ws.addEventListener('message', evt => {
    const d = JSON.parse(evt.data);
    if (d.method === 'Runtime.consoleAPICalled' || d.method === 'Log.entryAdded') {
      console.log('Browser log:', d.params);
    }
    if (d.method === 'Runtime.exceptionThrown') {
      console.error('Browser Exception:', d.params.exceptionDetails);
    }
  });
  let id = 1;
  function send(method, params = {}) {
    return new Promise(resolve => {
      const cur = id++;
      const h = (evt) => {
        const d = JSON.parse(evt.data);
        if (d.id === cur) {
          ws.removeEventListener('message', h);
          resolve(d.result || d);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id: cur, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const h1 = document.querySelector('.hero h1');
      const cs = window.getComputedStyle(h1);
      const em = h1.querySelector('em');
      const emCs = em ? window.getComputedStyle(em) : null;
      const lines = [...h1.querySelectorAll('.hero-line')].map(l => {
        const lcs = window.getComputedStyle(l);
        const r = l.getBoundingClientRect();
        return { text: l.textContent, display: lcs.display, height: r.height, top: r.top, bottom: r.bottom };
      });
      const rect = h1.getBoundingClientRect();
      const brs = h1.querySelectorAll('br');
      return {
        innerHTML: h1.innerHTML,
        brCount: brs.length,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        color: cs.color,
        h1Height: rect.height,
        emColor: emCs ? emCs.color : null,
        lines
      };
    })()`,
    returnByValue: true
  });

  console.log('Hero Inspection Result (Light):', evalRes.result?.value || evalRes);

  await send('Runtime.evaluate', {
    expression: `document.documentElement.dataset.theme = 'dark'`
  });

  const evalResDark = await send('Runtime.evaluate', {
    expression: `(() => {
      const h1 = document.querySelector('.hero h1');
      const cs = window.getComputedStyle(h1);
      const em = h1.querySelector('em');
      const emCs = em ? window.getComputedStyle(em) : null;
      return {
        color: cs.color,
        emColor: emCs ? emCs.color : null
      };
    })()`,
    returnByValue: true
  });

  console.log('Hero Inspection Result (Dark):', evalResDark.result?.value || evalResDark);

  chrome.kill();
  server.close();
  process.exit(0);
});
