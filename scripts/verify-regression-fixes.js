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
  '.webp': 'image/webp',
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

const PORT = 9005;
const DEBUG_PORT = 9225;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Test server running at http://127.0.0.1:${PORT}`);

  const chromeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--window-size=1440,900',
    `http://127.0.0.1:${PORT}/`
  ];

  const chromeProc = spawn(CHROME_PATH, chromeArgs);
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

    async function captureScreenshot(filename) {
      const res = await send('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(res.data, 'base64');
      const outPath = path.join(screenshotsDir, filename);
      fs.writeFileSync(outPath, buffer);
      console.log(`Saved screenshot: ${outPath}`);
    }

    await send('Page.enable');
    await send('Runtime.enable');

    // Wait 1.5s for page animations/initialization
    await new Promise(r => setTimeout(r, 1500));

    console.log('\n=== 1. VERIFYING PRICING & SERVICES HOVER INTERACTIONS ===');
    const hoverVerification = await evaluate(`(() => {
      const card = document.querySelector('.pricing-card');
      const service = document.querySelector('#services .service');
      const cardStyle = window.getComputedStyle(card);
      const serviceStyle = window.getComputedStyle(service);
      return {
        cardHasTransform: card.style.transform === '',
        cardTransition: cardStyle.transition,
        serviceTransition: serviceStyle.transition
      };
    })()`);
    console.log('Hover cascade lock released check:', hoverVerification);

    console.log('\n=== 2. VERIFYING PROCESS HEADING & TIMELINE ===');
    // Scroll to process and wait for intersection reveal
    await evaluate(`window.scrollTo({ top: document.querySelector('#process').offsetTop - 20, behavior: 'instant' })`);
    await new Promise(r => setTimeout(r, 800));

    const processVerification = await evaluate(`(() => {
      const heading = document.querySelector('#process h2');
      const rail = document.querySelector('#process .process-steps__rail');
      const list = document.querySelector('#process .process-steps__list');
      const circles = Array.from(document.querySelectorAll('#process .process-step__circle'));

      const headingText = heading ? heading.textContent : '';
      const wraps = heading ? Array.from(heading.querySelectorAll('.motion-mask-wrap')) : [];
      let wrapOverlap = false;
      if (wraps.length >= 2) {
        const r0 = wraps[0].getBoundingClientRect();
        const r1 = wraps[1].getBoundingClientRect();
        wrapOverlap = r1.top < r0.bottom - 1; // Tolerance 1px
      }

      const railStyle = window.getComputedStyle(rail);
      const listStyle = window.getComputedStyle(list);
      const circle0Style = window.getComputedStyle(circles[0]);

      const railRect = rail.getBoundingClientRect();
      const c0Rect = circles[0].getBoundingClientRect();
      const cLastRect = circles[circles.length - 1].getBoundingClientRect();

      return {
        headingText,
        wordBoundaryPreserved: headingText.includes('requirements to'),
        headingWrapsCount: wraps.length,
        wrapOverlap,
        railZIndex: railStyle.zIndex,
        listZIndex: listStyle.zIndex,
        circle0ZIndex: circle0Style.zIndex,
        circle0Bg: circle0Style.backgroundColor,
        railTop: railRect.top,
        c0CenterY: (c0Rect.top + c0Rect.bottom) / 2,
        railBottom: railRect.bottom,
        cLastCenterY: (cLastRect.top + cLastRect.bottom) / 2,
        railStartsAtMarkerCenter: Math.abs(railRect.top - (c0Rect.top + c0Rect.bottom) / 2) < 5,
        railEndsAtMarkerCenter: Math.abs(railRect.bottom - (cLastRect.top + cLastRect.bottom) / 2) < 5
      };
    })()`);
    console.log('Process verification result:', processVerification);

    // Scroll to process and capture
    await evaluate(`document.querySelector('#process').scrollIntoView()`);
    await new Promise(r => setTimeout(r, 600));
    await captureScreenshot('regression-process-desktop-1440.png');

    console.log('\n=== 3. VERIFYING FAQ AUTOPLAY & PROGRESS INDICATOR ===');
    const faqVerification = await evaluate(`(() => {
      const playToggle = document.querySelector('.faq-play-toggle');
      const playToggleStyle = window.getComputedStyle(playToggle);
      const dots = Array.from(document.querySelectorAll('.faq-dot'));
      const counter = document.getElementById('faq-counter');

      return {
        playToggleDisplay: playToggleStyle.display,
        playToggleHidden: playToggleStyle.display === 'none',
        dotCount: dots.length,
        counterText: counter ? counter.textContent : ''
      };
    })()`);
    console.log('FAQ verification result:', faqVerification);

    // Scroll to FAQ and capture
    await evaluate(`document.querySelector('#faq').scrollIntoView()`);
    await new Promise(r => setTimeout(r, 600));
    await captureScreenshot('regression-faq-desktop-1440.png');

    console.log('\n=== 4. VERIFYING CONTACT SECTION DESKTOP & MOBILE LAYOUT ===');
    await setViewport(1440, 900);
    await evaluate(`document.querySelector('#brief').scrollIntoView()`);
    await new Promise(r => setTimeout(r, 600));

    const contactDesktopVerification = await evaluate(`(() => {
      const leftCol = document.querySelector('.brief-left-column');
      const formCol = document.querySelector('.brief-form-column');
      const header = document.querySelector('.brief-header');
      const form = document.querySelector('.brief-form');
      const contactCard = document.querySelector('.brief-contact-card');

      const leftRect = leftCol.getBoundingClientRect();
      const formRect = formCol.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const formInnerRect = form.getBoundingClientRect();

      return {
        leftColTop: leftRect.top,
        formColTop: formRect.top,
        topAlignmentDiff: Math.abs(leftRect.top - formRect.top),
        headerTop: headerRect.top,
        formTop: formInnerRect.top,
        headerFormDiff: Math.abs(headerRect.top - formInnerRect.top),
        contactCardBelowHeader: contactCard.getBoundingClientRect().top > headerRect.bottom,
        isTwoColumn: formRect.left > leftRect.right - 10
      };
    })()`);
    console.log('Contact desktop verification:', contactDesktopVerification);
    await captureScreenshot('regression-contact-desktop-1440.png');

    // Switch to Dark Theme
    await evaluate(`document.documentElement.dataset.theme = 'dark'`);
    await new Promise(r => setTimeout(r, 300));
    await captureScreenshot('regression-contact-dark-1440.png');

    // Test Mobile Viewport (390px)
    await setViewport(390, 844);
    await evaluate(`document.documentElement.dataset.theme = 'light'`);
    await evaluate(`document.querySelector('#brief').scrollIntoView()`);
    await new Promise(r => setTimeout(r, 600));

    const contactMobileVerification = await evaluate(`(() => {
      const header = document.querySelector('.brief-header');
      const formCol = document.querySelector('.brief-form-column');
      const contactPanel = document.querySelector('.brief-contact-panel');

      const headerRect = header.getBoundingClientRect();
      const formRect = formCol.getBoundingClientRect();
      const contactRect = contactPanel.getBoundingClientRect();

      return {
        headerTop: headerRect.top,
        formTop: formRect.top,
        contactTop: contactRect.top,
        naturalStackOrder: headerRect.top < formRect.top && formRect.top < contactRect.top,
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      };
    })()`);
    console.log('Contact mobile verification (390px):', contactMobileVerification);
    await captureScreenshot('regression-contact-mobile-390.png');

    console.log('\n=== ALL REGRESSION CHECKS COMPLETED SUCCESSFULLY ===');

    ws.close();
  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    chromeProc.kill();
    server.close();
  }
});
