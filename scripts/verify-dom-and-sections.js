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

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0].split('#')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(distDir, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = 9000;
const DEBUG_PORT = 9222;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);

  // Launch Chrome with remote debugging
  const chromeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--window-size=1440,900',
    `http://127.0.0.1:${PORT}/`
  ];

  const chromeProc = spawn(CHROME_PATH, chromeArgs);

  // Wait for Chrome CDP port to be open
  await new Promise(r => setTimeout(r, 1500));

  try {
    const versionRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const tabs = await versionRes.json();
    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
    if (!pageTab || !pageTab.webSocketDebuggerUrl) {
      throw new Error('No page tab found on Chrome remote debugging port');
    }

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise(res => ws.onopen = res);

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === msgId) {
            ws.removeEventListener('message', handler);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result ? res.result.value : null;
    }

    async function setViewport(width, height) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width <= 768
      });
    }

    async function capturePageScreenshot(filename) {
      const res = await send('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(res.data, 'base64');
      const outPath = path.join(screenshotsDir, filename);
      fs.writeFileSync(outPath, buffer);
      console.log(`Saved screenshot: ${outPath}`);
    }

    // Enable Page and Runtime
    await send('Page.enable');
    await send('Runtime.enable');

    console.log('\n--- 1. Testing Contact Form Vertical Alignment ---');
    await setViewport(1440, 900);
    const formAlignment = await evaluate(`(() => {
      const fieldCompany = document.getElementById('field-company');
      const fieldPackage = document.getElementById('field-package');
      const labelCompany = document.querySelector('label[for="field-company"]');
      const labelPackage = document.querySelector('label[for="field-package"]');
      if (!fieldCompany || !fieldPackage) return { error: 'Fields not found' };

      const rectComp = fieldCompany.getBoundingClientRect();
      const rectPkg = fieldPackage.getBoundingClientRect();
      const labelCompRect = labelCompany.getBoundingClientRect();
      const labelPkgRect = labelPackage.getBoundingClientRect();

      return {
        fieldCompanyTop: rectComp.top,
        fieldPackageTop: rectPkg.top,
        fieldDiff: Math.abs(rectComp.top - rectPkg.top),
        labelCompanyTop: labelCompRect.top,
        labelPackageTop: labelPkgRect.top,
        labelDiff: Math.abs(labelCompRect.top - labelPkgRect.top),
        aligned: Math.abs(rectComp.top - rectPkg.top) < 3
      };
    })()`);
    console.log('Form field alignment result:', formAlignment);

    console.log('\n--- 2. Testing Contact Heading Styling ---');
    const contactHeadingStyle = await evaluate(`(() => {
      const h2 = document.querySelector('.brief h2');
      const accent = document.querySelector('.brief h2 .contact-accent');
      if (!h2 || !accent) return { error: 'Heading or accent not found' };
      const h2Style = window.getComputedStyle(h2);
      const accentStyle = window.getComputedStyle(accent);
      return {
        h2Color: h2Style.color,
        accentColor: accentStyle.color,
        h2FontWeight: h2Style.fontWeight,
        accentFontWeight: accentStyle.fontWeight,
        colorsDiffer: h2Style.color !== accentStyle.color
      };
    })()`);
    console.log('Contact heading styles:', contactHeadingStyle);

    console.log('\n--- 3. Testing Services Accordion Grid ---');
    const servicesGridDesktop = await evaluate(`(() => {
      const summary = document.querySelector('.service summary');
      const num = summary.querySelector('.service-number');
      const title = summary.querySelector('h3');
      const hint = summary.querySelector('.service-hint');
      const expand = summary.querySelector('.expand');

      const numRect = num.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const hintRect = hint.getBoundingClientRect();
      const expandRect = expand.getBoundingClientRect();
      const summaryRect = summary.getBoundingClientRect();

      return {
        numTop: numRect.top,
        titleTop: titleRect.top,
        hintTop: hintRect.top,
        expandTop: expandRect.top,
        expandRight: summaryRect.right - expandRect.right,
        sameRow: Math.abs(numRect.top - titleRect.top) < 15 && Math.abs(titleRect.top - expandRect.top) < 15,
        hasExtraAnchor: Boolean(summary.querySelector('span[id^="service-"]:empty'))
      };
    })()`);
    console.log('Services accordion desktop alignment:', servicesGridDesktop);

    // Mobile services check
    await setViewport(390, 844);
    const servicesGridMobile = await evaluate(`(() => {
      const summary = document.querySelector('.service summary');
      const num = summary.querySelector('.service-number');
      const title = summary.querySelector('h3');
      const hint = summary.querySelector('.service-hint');
      const expand = summary.querySelector('.expand');

      const numRect = num.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const expandRect = expand.getBoundingClientRect();
      const hintDisplay = window.getComputedStyle(hint).display;

      return {
        hintDisplay,
        numTop: numRect.top,
        titleTop: titleRect.top,
        expandTop: expandRect.top,
        sameRow: Math.abs(numRect.top - titleRect.top) < 15 && Math.abs(titleRect.top - expandRect.top) < 15,
        hintHidden: hintDisplay === 'none'
      };
    })()`);
    console.log('Services accordion mobile alignment (390px):', servicesGridMobile);

    console.log('\n--- 4. Testing Contact Section Gutters & Overflow ---');
    const guttersMobile390 = await evaluate(`(() => {
      const brief = document.getElementById('brief');
      const comp = window.getComputedStyle(brief);
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      return {
        paddingLeft: comp.paddingLeft,
        paddingRight: comp.paddingRight,
        scrollWidth,
        clientWidth,
        hasHorizontalOverflow: scrollWidth > clientWidth
      };
    })()`);
    console.log('Mobile gutters (390px):', guttersMobile390);

    await setViewport(320, 650);
    const guttersMobile320 = await evaluate(`(() => {
      const brief = document.getElementById('brief');
      const comp = window.getComputedStyle(brief);
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      return {
        paddingLeft: comp.paddingLeft,
        paddingRight: comp.paddingRight,
        scrollWidth,
        clientWidth,
        hasHorizontalOverflow: scrollWidth > clientWidth
      };
    })()`);
    console.log('Narrow mobile gutters (320px):', guttersMobile320);

    console.log('\n--- 5. Testing Navbar Active Tracking Across Sections ---');
    await setViewport(1440, 900);

    // Scroll to various sections and verify active navbar link
    const sectionsToTest = [
      { id: 'home', expectedActive: null },
      { id: 'work', expectedActive: '#work' },
      { id: 'services', expectedActive: '#services' },
      { id: 'visibility', expectedActive: null }, // Untracked SEO
      { id: 'process', expectedActive: '#process' },
      { id: 'about', expectedActive: '#about' },
      { id: 'feedback', expectedActive: null }, // Untracked Packages
      { id: 'philosophy', expectedActive: null }, // Untracked Manifesto
      { id: 'faq', expectedActive: '#faq' },
      { id: 'brief', expectedActive: null } // Untracked Contact
    ];

    for (const item of sectionsToTest) {
      const result = await evaluate(`(async () => {
        const sec = document.getElementById('${item.id}');
        if (!sec) return { error: 'Section not found' };
        sec.scrollIntoView({ behavior: 'instant', block: 'start' });
        // small delay for RAF scroll handling
        await new Promise(r => setTimeout(r, 60));
        const activeLink = document.querySelector('.eg-navbar [aria-current="location"]');
        return {
          href: activeLink ? activeLink.getAttribute('href') : null
        };
      })()`);
      const matched = result.href === item.expectedActive;
      console.log(`Scroll to #${item.id} -> Active Link: ${result.href} (Expected: ${item.expectedActive}) -> ${matched ? 'PASS' : 'FAIL'}`);
    }

    console.log('\n--- 6. Capturing Themed & Paused Motion Visuals ---');
    // Scroll to Contact
    await evaluate(`document.getElementById('brief').scrollIntoView({ behavior: 'instant', block: 'start' });`);
    await capturePageScreenshot('contact-dark-1440.png');

    // Switch to Light Theme
    await evaluate(`document.documentElement.dataset.theme = 'light';`);
    await capturePageScreenshot('contact-light-1440.png');

    // Scroll to Services on Desktop
    await evaluate(`document.getElementById('services').scrollIntoView({ behavior: 'instant', block: 'start' });`);
    await capturePageScreenshot('services-desktop-1440.png');

    // Scroll to Services on Mobile 390
    await setViewport(390, 844);
    await evaluate(`document.getElementById('services').scrollIntoView({ behavior: 'instant', block: 'start' });`);
    await capturePageScreenshot('services-mobile-390.png');

    // Mobile contact form
    await evaluate(`document.getElementById('brief').scrollIntoView({ behavior: 'instant', block: 'start' });`);
    await capturePageScreenshot('contact-mobile-390.png');

    ws.close();
  } catch (err) {
    console.error('CDP verification error:', err);
  } finally {
    chromeProc.kill();
    server.close();
    console.log('\nVerification complete.');
  }
});
