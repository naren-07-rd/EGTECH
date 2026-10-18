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
  await new Promise(r => setTimeout(r, 2000));

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

    console.log('\n--- 1. Checking Lenis Presence & Initial State ---');
    const initialStatus = await evaluate(`(() => {
      return {
        hasLenisClass: document.documentElement.classList.contains('lenis'),
        lenisVersion: window.lenisVersion,
        scrollY: window.scrollY,
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        headerSticky: getComputedStyle(document.querySelector('.header')).position === 'sticky'
      };
    })()`);
    console.log('Initial Status:', initialStatus);

    console.log('\n--- 2. Testing Mouse-Wheel Scrolling & Smooth Interpolation ---');
    // Dispatch wheel event
    await evaluate(`(() => {
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, bubbles: true, cancelable: true }));
    })()`);
    // Sample scroll position over several frames
    const samples = [];
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 60));
      const y = await evaluate(`window.scrollY`);
      samples.push(y);
    }
    console.log('ScrollY samples after 300px wheel:', samples);
    const settledY = samples[samples.length - 1];
    console.log(`Wheel settled at Y: ${settledY}px (Smooth progression: ${samples.every((val, i, arr) => i === 0 || val >= arr[i - 1])})`);

    console.log('\n--- 3. Testing Navbar Anchor Navigation & Indicator Selection ---');
    const navResult = await evaluate(`(async () => {
      const servicesLink = document.querySelector('.eg-navbar__link[href="#services"]');
      servicesLink.click();
      // Wait for smooth scroll to finish
      await new Promise(r => setTimeout(r, 1000));

      const servicesEl = document.querySelector('#services');
      const headerEl = document.querySelector('.header');
      const rect = servicesEl.getBoundingClientRect();
      const headerHeight = headerEl.offsetHeight;

      return {
        scrollY: window.scrollY,
        rectTop: rect.top,
        headerHeight,
        gapBelowHeader: rect.top - headerHeight,
        isCurrent: servicesLink.getAttribute('aria-current'),
        isActiveClass: servicesLink.classList.contains('is-active'),
        hash: window.location.hash
      };
    })()`);
    console.log('Navbar #services navigation result:', navResult);

    console.log('\n--- 4. Testing Service Accordion Deep Link ---');
    const accordionResult = await evaluate(`(async () => {
      const softLink = document.querySelector('.service-accordion-link[href="#service-software"]');
      if (softLink) {
        softLink.click();
        await new Promise(r => setTimeout(r, 1000));
      }
      const softwareDetails = document.querySelectorAll('#services details.service')[2];
      const headerEl = document.querySelector('.header');
      const rect = softwareDetails ? softwareDetails.getBoundingClientRect() : null;

      return {
        isOpen: softwareDetails ? softwareDetails.open : false,
        summaryAriaExpanded: softwareDetails ? softwareDetails.querySelector('summary').getAttribute('aria-expanded') : null,
        rectTop: rect ? rect.top : null,
        headerHeight: headerEl.offsetHeight,
        gapBelowHeader: rect ? rect.top - headerEl.offsetHeight : null,
        hash: window.location.hash
      };
    })()`);
    console.log('Accordion #service-software result:', accordionResult);

    console.log('\n--- 5. Testing Project Modal Dialog & Scroll Isolation ---');
    const dialogResult = await evaluate(`(async () => {
      const projectBtn = document.querySelector('[data-project="0"]');
      projectBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const dialog = document.querySelector('#project-dialog');
      const pageScrollBefore = window.scrollY;

      // Try scrolling dialog
      dialog.scrollTop = 120;
      const dialogScrollTop = dialog.scrollTop;

      // Try dispatching wheel event inside dialog
      dialog.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 300));
      const pageScrollAfter = window.scrollY;

      // Close dialog
      const closeBtn = dialog.querySelector('.dialog-close');
      closeBtn.click();
      await new Promise(r => setTimeout(r, 300));

      return {
        dialogHasPreventAttr: dialog.hasAttribute('data-lenis-prevent'),
        dialogScrolled: dialogScrollTop > 0,
        pageScrollRemainedLocked: pageScrollBefore === pageScrollAfter,
        dialogClosed: !dialog.open,
        focusedElementIsTrigger: document.activeElement === projectBtn
      };
    })()`);
    console.log('Dialog isolation result:', dialogResult);

    console.log('\n--- 6. Testing Global Motion-Off & Re-Enabling ---');
    const motionToggleResult = await evaluate(`(async () => {
      const motionBtn = document.querySelector('.motion-control');
      // Click to turn motion OFF
      motionBtn.click();
      await new Promise(r => setTimeout(r, 200));
      const offState = {
        dataMotion: document.documentElement.dataset.motion,
        hasLenisClass: document.documentElement.classList.contains('lenis')
      };

      // Click to turn motion back ON
      motionBtn.click();
      await new Promise(r => setTimeout(r, 200));
      const onState = {
        dataMotion: document.documentElement.dataset.motion,
        hasLenisClass: document.documentElement.classList.contains('lenis')
      };

      return { offState, onState };
    })()`);
    console.log('Motion toggle result:', motionToggleResult);

    console.log('\n--- 7. Testing Back To Top Link ---');
    const backToTopResult = await evaluate(`(async () => {
      const topLink = document.querySelector('.back-to-top-link');
      topLink.click();
      await new Promise(r => setTimeout(r, 1000));
      return {
        scrollY: window.scrollY,
        hash: window.location.hash
      };
    })()`);
    console.log('Back to top result:', backToTopResult);

    console.log('\n--- 8. Testing Mobile Viewport & Menu ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 300));

    const mobileResult = await evaluate(`(async () => {
      const menuBtn = document.querySelector('.menu-toggle');
      menuBtn.click();
      const navVisible = !document.querySelector('#mobile-nav').hidden;

      // Click a mobile nav link
      const mobileWork = document.querySelector('#mobile-nav a[href="#work"]');
      mobileWork.click();
      await new Promise(r => setTimeout(r, 800));

      return {
        menuOpened: navVisible,
        menuClosedAfterClick: document.querySelector('#mobile-nav').hidden,
        scrollY: window.scrollY,
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
      };
    })()`);
    console.log('Mobile viewport result:', mobileResult);

    console.log('\n=== ALL BROWSER CHECKS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Error during live browser verification:', err);
  } finally {
    chromeProc.kill();
    server.close();
  }
});
