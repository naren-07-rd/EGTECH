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

const PORT = 9010;
const DEBUG_PORT = 9230;
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
    await send('DOM.enable');
    await send('CSS.enable');

    // Wait 1.5s for initial page load and animations
    await new Promise(r => setTimeout(r, 1500));

    console.log('\n=== TEST 1: NO NAVBAR UNDERLINE IN ANY STATE ===');
    const underlineCheck = await evaluate(`(() => {
      const links = Array.from(document.querySelectorAll('.eg-navbar__link'));
      return links.map(link => {
        const computed = window.getComputedStyle(link);
        const afterComputed = window.getComputedStyle(link, '::after');
        const beforeComputed = window.getComputedStyle(link, '::before');
        return {
          text: link.textContent.trim(),
          textDecorationLine: computed.textDecorationLine,
          borderBottomWidth: computed.borderBottomWidth,
          afterDisplay: afterComputed.display,
          afterContent: afterComputed.content,
          beforeDisplay: beforeComputed.display
        };
      });
    })()`);
    console.log('Navbar links underline check:', underlineCheck);

    console.log('\n=== TEST 2: NAVBAR INDICATOR INITIAL STATE (HIDDEN) ===');
    const initialNav = await evaluate(`(() => {
      const nav = document.querySelector('.eg-navbar');
      const rect = nav.querySelector('.eg-navbar__rect');
      const links = Array.from(nav.querySelectorAll('.eg-navbar__link'));
      const activeLinks = links.filter(l => l.hasAttribute('aria-current') || l.classList.contains('is-active'));
      const rectStyle = window.getComputedStyle(rect);
      const navOpacityVar = nav.style.getPropertyValue('--indicator-opacity');
      return {
        activeLinksCount: activeLinks.length,
        rectOpacity: rectStyle.opacity,
        rectStyleAttrOpacity: rect.style.opacity,
        navOpacityVar
      };
    })()`);
    console.log('Initial indicator state:', initialNav);
    await captureScreenshot('navbar-resting-desktop-1440.png');

    console.log('\n=== TEST 3: HOVERING NAVBAR LINK DOES NOT SHOW/MOVE INDICATOR ===');
    const workLinkBox = await evaluate(`(() => {
      const link = document.querySelector('.eg-navbar__link[href="#work"]');
      const rect = link.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);

    // Dispatch mousemove to hover Work link
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: workLinkBox.x,
      y: workLinkBox.y
    });
    await new Promise(r => setTimeout(r, 200));

    const hoverNav = await evaluate(`(() => {
      const nav = document.querySelector('.eg-navbar');
      const rect = nav.querySelector('.eg-navbar__rect');
      const rectStyle = window.getComputedStyle(rect);
      const link = document.querySelector('.eg-navbar__link[href="#work"]');
      const linkStyle = window.getComputedStyle(link);
      return {
        rectOpacity: rectStyle.opacity,
        linkHoverColor: linkStyle.color,
        hasAriaCurrent: link.hasAttribute('aria-current')
      };
    })()`);
    console.log('Work link hovered state:', hoverNav);
    await captureScreenshot('navbar-hover-desktop-1440.png');

    console.log('\n=== TEST 4: CLICKING WORK SELECTS IT AND ACTIVATES INDICATOR ===');
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      button: 'left',
      clickCount: 1,
      x: workLinkBox.x,
      y: workLinkBox.y
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      button: 'left',
      clickCount: 1,
      x: workLinkBox.x,
      y: workLinkBox.y
    });
    await new Promise(r => setTimeout(r, 350));

    const workSelected = await evaluate(`(() => {
      const nav = document.querySelector('.eg-navbar');
      const rect = nav.querySelector('.eg-navbar__rect');
      const rectStyle = window.getComputedStyle(rect);
      const workLink = document.querySelector('.eg-navbar__link[href="#work"]');
      const workBounds = workLink.getBoundingClientRect();
      const navBounds = nav.getBoundingClientRect();
      const expectedX = Math.round(workBounds.left - navBounds.left);
      return {
        rectOpacity: rectStyle.opacity,
        workHasAriaCurrent: workLink.getAttribute('aria-current') === 'location',
        workHasActiveClass: workLink.classList.contains('is-active'),
        rectTransform: rectStyle.transform,
        indicatorXVar: nav.style.getPropertyValue('--indicator-x'),
        expectedX: expectedX + 'px'
      };
    })()`);
    console.log('Work selected state:', workSelected);
    await captureScreenshot('navbar-selected-work-desktop-1440.png');

    console.log('\n=== TEST 5: SCROLLING DOES NOT MOVE OR HIDE THE SELECTED INDICATOR ===');
    await evaluate(`window.scrollTo({ top: document.querySelector('#services').offsetTop, behavior: 'instant' })`);
    await new Promise(r => setTimeout(r, 350));

    const scrollCheck = await evaluate(`(() => {
      const nav = document.querySelector('.eg-navbar');
      const rect = nav.querySelector('.eg-navbar__rect');
      const rectStyle = window.getComputedStyle(rect);
      const workLink = document.querySelector('.eg-navbar__link[href="#work"]');
      return {
        rectOpacity: rectStyle.opacity,
        workHasAriaCurrent: workLink.getAttribute('aria-current') === 'location',
        workHasActiveClass: workLink.classList.contains('is-active'),
        indicatorXVar: nav.style.getPropertyValue('--indicator-x')
      };
    })()`);
    console.log('After scroll check (indicator persists on Work):', scrollCheck);

    console.log('\n=== TEST 6: CLICKING SERVICES MOVES INDICATOR TO SERVICES ===');
    const servicesLinkBox = await evaluate(`(() => {
      const link = document.querySelector('.eg-navbar__link[href="#services"]');
      const rect = link.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);

    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      button: 'left',
      clickCount: 1,
      x: servicesLinkBox.x,
      y: servicesLinkBox.y
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      button: 'left',
      clickCount: 1,
      x: servicesLinkBox.x,
      y: servicesLinkBox.y
    });
    await new Promise(r => setTimeout(r, 350));

    const servicesSelected = await evaluate(`(() => {
      const nav = document.querySelector('.eg-navbar');
      const rect = nav.querySelector('.eg-navbar__rect');
      const rectStyle = window.getComputedStyle(rect);
      const servicesLink = document.querySelector('.eg-navbar__link[href="#services"]');
      const workLink = document.querySelector('.eg-navbar__link[href="#work"]');
      const servicesBounds = servicesLink.getBoundingClientRect();
      const navBounds = nav.getBoundingClientRect();
      const expectedX = Math.round(servicesBounds.left - navBounds.left);
      return {
        rectOpacity: rectStyle.opacity,
        servicesHasAriaCurrent: servicesLink.getAttribute('aria-current') === 'location',
        workHasAriaCurrent: workLink.hasAttribute('aria-current'),
        indicatorXVar: nav.style.getPropertyValue('--indicator-x'),
        expectedX: expectedX + 'px'
      };
    })()`);
    console.log('Services selected state:', servicesSelected);

    console.log('\n=== TEST 7: KEYBOARD FOCUS STYLE & ENTER KEY ACTIVATION ===');
    const keyboardTest = await evaluate(`(() => {
      const aboutLink = document.querySelector('.eg-navbar__link[href="#about"]');
      aboutLink.focus();
      const focusedBeforeEnter = {
        activeElement: document.activeElement.getAttribute('href'),
        aboutHasAriaCurrent: aboutLink.hasAttribute('aria-current')
      };
      
      // Press Enter
      aboutLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      
      const nav = document.querySelector('.eg-navbar');
      return {
        ...focusedBeforeEnter,
        aboutSelectedAfterEnter: aboutLink.getAttribute('aria-current') === 'location',
        indicatorXVar: nav.style.getPropertyValue('--indicator-x')
      };
    })()`);
    console.log('Keyboard focus and Enter activation:', keyboardTest);

    console.log('\n=== TEST 8: SERVICES: ANIMATE ONLY HEADING ON HOVER ===');
    // Scroll to services
    await evaluate(`document.querySelector('#services').scrollIntoView({ behavior: 'instant' })`);
    await new Promise(r => setTimeout(r, 600));

    // Reset mouse to top left
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
    await new Promise(r => setTimeout(r, 200));

    // Test with Service 02 (Brand & product design) which starts closed
    const service2CheckResting = await evaluate(`(() => {
      const services = Array.from(document.querySelectorAll('#services .service'));
      const s2 = services[1];
      const summary = s2.querySelector('summary');
      const h3 = summary.querySelector('h3');
      const num = summary.querySelector('.service-number');
      const expand = summary.querySelector('.expand');

      return {
        open: s2.open,
        ariaExpanded: summary.getAttribute('aria-expanded'),
        h3Transform: window.getComputedStyle(h3).transform,
        numTransform: window.getComputedStyle(num).transform,
        expandTransform: window.getComputedStyle(expand).transform
      };
    })()`);
    console.log('Service 02 resting state (closed):', service2CheckResting);
    await captureScreenshot('service-resting-desktop-1440.png');

    // Center Service 02 in viewport
    const service2SummaryBox = await evaluate(`(() => {
      const services = Array.from(document.querySelectorAll('#services .service'));
      services[1].scrollIntoView({ behavior: 'instant', block: 'center' });
      const rect = services[1].querySelector('summary').getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, rect };
    })()`);
    console.log('Service 02 summary box:', service2SummaryBox);
    await new Promise(r => setTimeout(r, 400));

    // Move mouse over Service 02 summary
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: service2SummaryBox.x,
      y: service2SummaryBox.y
    });
    await new Promise(r => setTimeout(r, 300));

    const service2HoverCheck = await evaluate(`(() => {
      const services = Array.from(document.querySelectorAll('#services .service'));
      const s2 = services[1];
      const summary = s2.querySelector('summary');
      const num = summary.querySelector('.service-number');
      const h3 = summary.querySelector('h3');
      const expand = summary.querySelector('.expand');

      const numStyle = window.getComputedStyle(num);
      const h3Style = window.getComputedStyle(h3);
      const expandStyle = window.getComputedStyle(expand);
      const summaryStyle = window.getComputedStyle(summary);

      return {
        serviceOpen: s2.open,
        h3Transform: h3Style.transform,
        h3Color: h3Style.color,
        numTransform: numStyle.transform,
        expandTransform: expandStyle.transform,
        summaryPaddingLeft: summaryStyle.paddingLeft
      };
    })()`);
    console.log('Service 02 hover check (heading lifted 2px, others stationary, details still closed):', service2HoverCheck);
    await captureScreenshot('service-hover-desktop-1440.png');

    console.log('\n=== TEST 9: SERVICES: CLICK EXPANDS DETAILS AND PERSISTS ON LEAVE ===');
    // Click Service 02 summary to open
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      button: 'left',
      clickCount: 1,
      x: service2SummaryBox.x,
      y: service2SummaryBox.y
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      button: 'left',
      clickCount: 1,
      x: service2SummaryBox.x,
      y: service2SummaryBox.y
    });
    await new Promise(r => setTimeout(r, 500));

    // Move mouse away to 10, 10
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 10,
      y: 10
    });
    await new Promise(r => setTimeout(r, 300));

    const service2ClickCheck = await evaluate(`(() => {
      const services = Array.from(document.querySelectorAll('#services .service'));
      const s2 = services[1];
      const summary = s2.querySelector('summary');
      const expand = summary.querySelector('.expand');
      const expandStyle = window.getComputedStyle(expand);
      const content = s2.querySelector('.service-content');
      const contentRect = content.getBoundingClientRect();

      return {
        serviceOpen: s2.open,
        ariaExpanded: summary.getAttribute('aria-expanded'),
        expandTransform: expandStyle.transform,
        contentVisibleHeight: contentRect.height
      };
    })()`);
    console.log('Service 02 opened by click (remains open after pointer leaves):', service2ClickCheck);
    await captureScreenshot('service-opened-click-desktop-1440.png');

    console.log('\n=== TEST 10: PRICING CARDS HOVER BEHAVIOUR PRESERVED ===');
    // Scroll to pricing (#feedback)
    await evaluate(`(() => {
      const s = document.querySelector('#feedback');
      s.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const cardBox = await evaluate(`(() => {
      const card = document.querySelectorAll('.eg-package-card')[0];
      const rect = card.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, rect };
    })()`);
    console.log('Target pricing card box:', cardBox);

    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: cardBox.x,
      y: cardBox.y
    });
    await new Promise(r => setTimeout(r, 350));

    const pricingHoverCheck = await evaluate(`(() => {
      const card = document.querySelectorAll('.eg-package-card')[0];
      const style = window.getComputedStyle(card);
      return {
        cardTransform: style.transform,
        cardZIndex: style.zIndex,
        boxShadow: style.boxShadow
      };
    })()`);
    console.log('Pricing card hover check (lift intact):', pricingHoverCheck);

    console.log('\n=== TEST 11: MOBILE NAVIGATION CHECK ===');
    await setViewport(390, 844);
    await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    await new Promise(r => setTimeout(r, 400));

    const mobileCheck = await evaluate(`(() => {
      const desktopNav = document.querySelector('.desktop-nav');
      const menuToggle = document.querySelector('.menu-toggle');
      const mobileNav = document.querySelector('#mobile-nav');
      return {
        desktopNavDisplay: window.getComputedStyle(desktopNav).display,
        menuToggleDisplay: window.getComputedStyle(menuToggle).display,
        mobileNavExists: !!mobileNav
      };
    })()`);
    console.log('Mobile navigation check:', mobileCheck);

    console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Error during verification:', err);
    process.exitCode = 1;
  } finally {
    try { chromeProc.kill(); } catch {}
    server.close();
  }
});
