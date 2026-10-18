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

const PORT = 9028;
const DEBUG_PORT = 9248;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Verification Server running at http://127.0.0.1:${PORT}`);

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

  let exitCode = 0;

  try {
    const versionRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const tabs = await versionRes.json();
    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];

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

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result ? res.result.value : null;
    }

    console.log('\n--- 1. DESKTOP VERIFICATION (1440x900) ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await new Promise(r => setTimeout(r, 600));

    const desktopState = await evaluate(`
      (() => {
        const motionControl = document.querySelector('.motion-control');
        const themeToggle = document.querySelector('.theme-toggle');
        const desktopNav = document.querySelector('.desktop-nav');
        const menuToggle = document.querySelector('.menu-toggle');
        const headerCta = document.querySelector('.header-cta');
        return {
          motionControlExists: !!motionControl,
          themeToggleVisible: themeToggle ? window.getComputedStyle(themeToggle).display !== 'none' : false,
          desktopNavVisible: desktopNav ? window.getComputedStyle(desktopNav).display !== 'none' : false,
          menuToggleDisplay: menuToggle ? window.getComputedStyle(menuToggle).display : 'none',
          headerCtaVisible: headerCta ? window.getComputedStyle(headerCta).display !== 'none' : false
        };
      })()
    `);
    console.log('Desktop State:', desktopState);
    if (desktopState.motionControlExists) throw new Error('Motion control button still exists on desktop!');
    if (!desktopState.desktopNavVisible) throw new Error('Desktop nav is not visible!');
    if (desktopState.menuToggleDisplay !== 'none') throw new Error('Mobile menu toggle should be display:none on desktop!');

    const desktopShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screenshotsDir, 'nav-desktop-1440.png'), Buffer.from(desktopShot.data, 'base64'));
    console.log('Saved: nav-desktop-1440.png');

    console.log('\n--- 2. MOBILE VERIFICATION (390x844) ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 600));

    const mobileClosedState = await evaluate(`
      (() => {
        const motionControl = document.querySelector('.motion-control');
        const menuToggle = document.querySelector('.menu-toggle');
        const desktopNav = document.querySelector('.desktop-nav');
        const overlay = document.querySelector('#mobile-nav');
        const triggerRect = menuToggle.getBoundingClientRect();
        return {
          motionControlExists: !!motionControl,
          desktopNavDisplay: window.getComputedStyle(desktopNav).display,
          menuToggleVisible: window.getComputedStyle(menuToggle).display !== 'none',
          triggerWidth: triggerRect.width,
          triggerHeight: triggerRect.height,
          overlayHidden: overlay.hidden,
          overlayIsOpen: overlay.classList.contains('is-open')
        };
      })()
    `);
    console.log('Mobile Closed State:', mobileClosedState);
    if (mobileClosedState.motionControlExists) throw new Error('Motion control exists on mobile!');
    if (mobileClosedState.desktopNavDisplay !== 'none') throw new Error('Desktop nav should be hidden on mobile!');
    if (!mobileClosedState.menuToggleVisible) throw new Error('Menu toggle not visible on mobile!');
    if (mobileClosedState.triggerWidth < 44 || mobileClosedState.triggerWidth > 50) {
      console.warn(`Trigger width ${mobileClosedState.triggerWidth} is outside recommended 44-48px`);
    }

    // Click trigger to open menu
    console.log('Opening mobile menu via trigger click...');
    await evaluate(`
      document.querySelector('.menu-toggle').click();
    `);
    await new Promise(r => setTimeout(r, 600));

    const mobileOpenState = await evaluate(`
      (() => {
        const overlay = document.querySelector('#mobile-nav');
        const trigger = document.querySelector('.menu-toggle');
        const centerBtn = overlay.querySelector('.eg-radial-center-btn');
        const items = Array.from(overlay.querySelectorAll('.eg-radial-item')).map(item => {
          const rect = item.getBoundingClientRect();
          const style = window.getComputedStyle(item);
          const label = item.querySelector('.eg-radial-label')?.textContent.trim();
          return {
            href: item.getAttribute('href'),
            label,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
            opacity: style.opacity,
            pointerEvents: style.pointerEvents,
            background: style.backgroundImage || style.backgroundColor
          };
        });

        return {
          overlayHidden: overlay.hidden,
          overlayIsOpen: overlay.classList.contains('is-open'),
          triggerAriaExpanded: trigger.getAttribute('aria-expanded'),
          centerBtnFocused: document.activeElement === centerBtn,
          bodyOverflow: document.body.style.overflow,
          itemsCount: items.length,
          items
        };
      })()
    `);
    console.log('Mobile Open State:', {
      overlayHidden: mobileOpenState.overlayHidden,
      overlayIsOpen: mobileOpenState.overlayIsOpen,
      triggerAriaExpanded: mobileOpenState.triggerAriaExpanded,
      centerBtnFocused: mobileOpenState.centerBtnFocused,
      bodyOverflow: mobileOpenState.bodyOverflow,
      itemsCount: mobileOpenState.itemsCount
    });

    console.log('Destination Items Geometry & Colors:');
    mobileOpenState.items.forEach(it => {
      console.log(` - ${it.label} (${it.href}): box [${Math.round(it.left)}, ${Math.round(it.top)}, ${Math.round(it.width)}x${Math.round(it.height)}], opacity: ${it.opacity}`);
    });

    if (mobileOpenState.overlayHidden || !mobileOpenState.overlayIsOpen) {
      throw new Error('Overlay failed to open properly!');
    }
    if (mobileOpenState.itemsCount !== 6) {
      throw new Error(`Expected 6 destination items, got ${mobileOpenState.itemsCount}`);
    }

    const openShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screenshotsDir, 'nav-mobile-390-open.png'), Buffer.from(openShot.data, 'base64'));
    console.log('Saved: nav-mobile-390-open.png');

    // Test destination routing
    console.log('Clicking Services item (#services)...');
    await evaluate(`
      document.querySelector('.eg-radial-item--services').click();
    `);
    await new Promise(r => setTimeout(r, 600));

    const afterNavigationState = await evaluate(`
      (() => {
        const overlay = document.querySelector('#mobile-nav');
        const trigger = document.querySelector('.menu-toggle');
        const scrollY = window.scrollY;
        const servicesTop = document.querySelector('#services').getBoundingClientRect().top;
        return {
          overlayIsOpen: overlay.classList.contains('is-open'),
          triggerAriaExpanded: trigger.getAttribute('aria-expanded'),
          scrollY,
          servicesTop
        };
      })()
    `);
    console.log('After Navigation State:', afterNavigationState);
    if (afterNavigationState.overlayIsOpen) {
      throw new Error('Overlay should be closed after clicking a link!');
    }

    console.log('\n--- 3. 320PX SCREEN COMPATIBILITY ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 320,
      height: 640,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 500));

    // Open menu on 320px screen
    await evaluate(`
      document.querySelector('.menu-toggle').click();
    `);
    await new Promise(r => setTimeout(r, 600));

    const check320 = await evaluate(`
      (() => {
        const overlay = document.querySelector('#mobile-nav');
        const items = Array.from(overlay.querySelectorAll('.eg-radial-item')).map(item => {
          const rect = item.getBoundingClientRect();
          return {
            href: item.getAttribute('href'),
            left: rect.left,
            right: rect.right,
            width: rect.width
          };
        });
        const minLeft = Math.min(...items.map(i => i.left));
        const maxRight = Math.max(...items.map(i => i.right));
        const docScrollWidth = document.documentElement.scrollWidth;
        const bodyScrollWidth = document.body.scrollWidth;

        return {
          viewportWidth: window.innerWidth,
          docScrollWidth,
          bodyScrollWidth,
          minLeft,
          maxRight,
          fitsHorizontally: minLeft >= 0 && maxRight <= 320
        };
      })()
    `);
    console.log('320px Geometry Check:', check320);

    const shot320 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screenshotsDir, 'nav-mobile-320-open.png'), Buffer.from(shot320.data, 'base64'));
    console.log('Saved: nav-mobile-320-open.png');

    if (!check320.fitsHorizontally) {
      throw new Error(`Radial items overflow 320px viewport: minLeft=${check320.minLeft}, maxRight=${check320.maxRight}`);
    }

    // Close via Escape key
    console.log('Testing Escape key dismissal...');
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await new Promise(r => setTimeout(r, 500));

    const escapeClosedState = await evaluate(`
      (() => {
        const overlay = document.querySelector('#mobile-nav');
        const trigger = document.querySelector('.menu-toggle');
        return {
          overlayIsOpen: overlay.classList.contains('is-open'),
          triggerAriaExpanded: trigger.getAttribute('aria-expanded'),
          focusedElement: document.activeElement === trigger ? 'trigger' : document.activeElement.tagName
        };
      })()
    `);
    console.log('Escape Key Result:', escapeClosedState);
    if (escapeClosedState.overlayIsOpen) {
      throw new Error('Menu did not close on Escape key!');
    }
    if (escapeClosedState.focusedElement !== 'trigger') {
      console.warn(`Focus after escape was on: ${escapeClosedState.focusedElement}`);
    }

    console.log('\n ALL VERIFICATION CHECKS PASSED PERFECTLY!');
  } catch (err) {
    console.error('Verification failed:', err);
    exitCode = 1;
  } finally {
    chromeProc.kill('SIGKILL');
    server.close();
    process.exit(exitCode);
  }
});
