import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const screenshotsDir = path.join(projectRoot, 'screenshots');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
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

const PORT = 9077;
const DEBUG_PORT = 9288;

server.listen(PORT, '127.0.0.1', async () => {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--window-size=1440,900',
    `http://127.0.0.1:${PORT}/`
  ]);

  await new Promise(r => setTimeout(r, 1200));
  const targetsRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

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

  // Wait for initial animation/loading
  await new Promise(r => setTimeout(r, 2000));

  // Desktop Light
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 300));
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotsDir, 'hero-desktop-light.png'), Buffer.from(shot1.data, 'base64'));

  // Desktop Dark
  await send('Runtime.evaluate', {
    expression: `document.documentElement.dataset.theme = 'dark'`
  });
  await new Promise(r => setTimeout(r, 300));
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotsDir, 'hero-desktop-dark.png'), Buffer.from(shot2.data, 'base64'));

  // Mobile 390
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await send('Runtime.evaluate', {
    expression: `document.documentElement.dataset.theme = 'light'`
  });
  await new Promise(r => setTimeout(r, 300));
  const shot3 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotsDir, 'hero-mobile-390.png'), Buffer.from(shot3.data, 'base64'));

  // Mobile 320
  await send('Emulation.setDeviceMetricsOverride', {
    width: 320,
    height: 568,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 300));
  const shot4 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotsDir, 'hero-mobile-320.png'), Buffer.from(shot4.data, 'base64'));

  // Tablet 768
  await send('Emulation.setDeviceMetricsOverride', {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 300));
  const shot5 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotsDir, 'hero-tablet-768.png'), Buffer.from(shot5.data, 'base64'));

  console.log('Screenshots taken successfully!');
  chrome.kill();
  server.close();
  process.exit(0);
});
