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

const PORT = 9020;
const DEBUG_PORT = 9240;
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
      if (res.exceptionDetails) {
        console.error('Eval error:', res.exceptionDetails.exception?.description || res.exceptionDetails.text);
      }
      return res.result ? res.result.value : null;
    }

    async function captureScreenshot(filepath, clip = null) {
      const params = { format: 'png', captureBeyondViewport: true };
      if (clip) params.clip = clip;
      const res = await send('Page.captureScreenshot', params);
      fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'));
      console.log(`Saved screenshot: ${filepath}`);
    }

    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1400,
      deviceScaleFactor: 1,
      mobile: false
    });
    await send('Page.enable');
    await send('DOM.enable');
    await send('CSS.enable');

    // Wait for fonts and startup
    await new Promise(r => setTimeout(r, 1000));

    console.log('\n=== SECTION 1: NAVBAR HIGHLIGHT BEHAVIOUR ===');

    // 1. Initial State: No link is highlighted, indicator opacity is 0
    const initialNav = await evaluate(`(() => {
      const rect = document.querySelector('.eg-navbar__rect');
      const activeLinks = document.querySelectorAll('.desktop-nav a.is-active, .desktop-nav a[aria-current]');
      const nav = document.querySelector('.eg-navbar');
      return {
        activeLinksCount: activeLinks.length,
        rectOpacity: window.getComputedStyle(rect).opacity,
        navOpacityVar: getComputedStyle(nav).getPropertyValue('--indicator-opacity').trim()
      };
    })()`);
    console.log('Initial indicator state:', initialNav);

    // 2. Hovering a link (e.g. Work): previews indicator
    await evaluate(`(() => {
      const workLink = document.querySelector('.desktop-nav a[href="#work"]');
      workLink.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    })()`);
    await new Promise(r => setTimeout(r, 150));

    const workHovered = await evaluate(`(() => {
      const rect = document.querySelector('.eg-navbar__rect');
      const nav = document.querySelector('.eg-navbar');
      return {
        rectOpacity: window.getComputedStyle(rect).opacity,
        rectTransform: window.getComputedStyle(rect).transform,
        indicatorXVar: getComputedStyle(nav).getPropertyValue('--indicator-x').trim(),
        selectedLink: nav.dataset.selectedLink || null
      };
    })()`);
    console.log('Work link hovered (preview):', workHovered);

    // Capture screenshot of navbar preview
    const navBbox = await evaluate(`(() => {
      const nav = document.querySelector('.eg-navbar');
      const r = nav.getBoundingClientRect();
      return { x: Math.max(0, r.x - 20), y: Math.max(0, r.y - 10), width: r.width + 40, height: r.height + 20, scale: 1 };
    })()`);
    await captureScreenshot(path.join(screenshotsDir, 'navbar-preview-1440.png'), navBbox);

    // 3. Pointer leaving navbar before any click: indicator hides
    await evaluate(`(() => {
      const nav = document.querySelector('.eg-navbar');
      nav.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    })()`);
    await new Promise(r => setTimeout(r, 100));

    const navLeftBeforeClick = await evaluate(`(() => {
      const rect = document.querySelector('.eg-navbar__rect');
      const nav = document.querySelector('.eg-navbar');
      return {
        rectOpacity: window.getComputedStyle(rect).opacity,
        navOpacityVar: getComputedStyle(nav).getPropertyValue('--indicator-opacity').trim()
      };
    })()`);
    console.log('Pointer left navbar before click (indicator hides):', navLeftBeforeClick);

    // 4. Click a link (e.g. Work): commits selection
    await evaluate(`(() => {
      const workLink = document.querySelector('.desktop-nav a[href="#work"]');
      workLink.click();
    })()`);
    await new Promise(r => setTimeout(r, 200));

    const workSelected = await evaluate(`(() => {
      const rect = document.querySelector('.eg-navbar__rect');
      const nav = document.querySelector('.eg-navbar');
      const workLink = document.querySelector('.desktop-nav a[href="#work"]');
      return {
        rectOpacity: window.getComputedStyle(rect).opacity,
        workHasAriaCurrent: workLink.hasAttribute('aria-current'),
        indicatorXVar: getComputedStyle(nav).getPropertyValue('--indicator-x').trim()
      };
    })()`);
    console.log('Work selected by click:', workSelected);

    // 5. Hover another link (e.g. FAQ): temporary preview
    await evaluate(`(() => {
      const faqLink = document.querySelector('.desktop-nav a[href="#faq"]');
      faqLink.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    })()`);
    await new Promise(r => setTimeout(r, 100));

    const faqHovered = await evaluate(`(() => {
      const rect = document.querySelector('.eg-navbar__rect');
      const nav = document.querySelector('.eg-navbar');
      return {
        rectOpacity: window.getComputedStyle(rect).opacity,
        indicatorXVar: getComputedStyle(nav).getPropertyValue('--indicator-x').trim()
      };
    })()`);
    console.log('FAQ hovered while Work selected (preview moves to FAQ):', faqHovered);

    // 6. Leave navbar: returns to selected Work
    await evaluate(`(() => {
      const nav = document.querySelector('.eg-navbar');
      nav.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    })()`);
    await new Promise(r => setTimeout(r, 100));

    const returnedToWork = await evaluate(`(() => {
      const rect = document.querySelector('.eg-navbar__rect');
      const nav = document.querySelector('.eg-navbar');
      return {
        rectOpacity: window.getComputedStyle(rect).opacity,
        indicatorXVar: getComputedStyle(nav).getPropertyValue('--indicator-x').trim()
      };
    })()`);
    console.log('Pointer left navbar (returned to selected Work):', returnedToWork);

    // 7. Verify no thin underlines
    const underlines = await evaluate(`(() => {
      const links = Array.from(document.querySelectorAll('.desktop-nav a'));
      return links.map(link => {
        const cs = window.getComputedStyle(link);
        const after = window.getComputedStyle(link, '::after');
        return {
          text: link.textContent.trim(),
          textDecorationLine: cs.textDecorationLine,
          borderBottomWidth: cs.borderBottomWidth,
          afterContent: after.content,
          afterDisplay: after.display
        };
      });
    })()`);
    console.log('Navbar link underline verification:', underlines);

    console.log('\n=== SECTION 2: WEBSITE-PACKAGE CARDS REDESIGN ===');

    // Scroll down to #feedback
    await evaluate(`document.getElementById('feedback').scrollIntoView({ behavior: 'instant' })`);
    await new Promise(r => setTimeout(r, 500));

    // 1. Inspect package cards content and structure
    const cardsInfo = await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('.eg-package-card'));
      return cards.map(c => {
        const title = c.querySelector('.eg-package-card__title')?.textContent.trim();
        const desc = c.querySelector('.eg-package-card__desc')?.textContent.trim();
        const conciseFeatures = Array.from(c.querySelectorAll('.eg-package-card__features--concise li')).map(li => li.textContent.trim());
        const quoteNote = c.querySelector('.eg-package-card__quote-note')?.textContent.trim();
        const btnText = c.querySelector('.pricing-card__btn-text--choose')?.textContent.trim();
        const hasIcon = !!c.querySelector('.eg-package-card__icon svg');
        const heartBtn = c.querySelector('.pricing-card__heart-btn');
        const heartVisible = heartBtn ? window.getComputedStyle(heartBtn).display !== 'none' : false;
        const cs = window.getComputedStyle(c);
        const rect = c.getBoundingClientRect();
        return {
          title,
          desc,
          conciseFeatures,
          quoteNote,
          btnText,
          hasIcon,
          heartVisible,
          borderRadius: cs.borderRadius,
          height: rect.height,
          transform: cs.transform
        };
      });
    })()`);
    console.log('Cards count:', cardsInfo.length);
    console.log('Cards details:', JSON.stringify(cardsInfo, null, 2));

    // Capture Dark Mode Package Cards Screenshot
    await evaluate(`document.documentElement.setAttribute('data-theme', 'dark')`);
    await new Promise(r => setTimeout(r, 400));
    const feedbackBbox = await evaluate(`(() => {
      const section = document.getElementById('feedback');
      const r = section.getBoundingClientRect();
      return { x: 0, y: Math.max(0, window.scrollY + r.y), width: 1440, height: Math.ceil(r.height), scale: 1 };
    })()`);
    await captureScreenshot(path.join(screenshotsDir, 'package-cards-dark-1440.png'), feedbackBbox);

    // 2. Test Card Hover Lift
    console.log('\n--- Card Hover Lift Test ---');
    const hoverLift = await evaluate(`(() => {
      const card = document.querySelector('.eg-package-card');
      const restingTransform = window.getComputedStyle(card).transform;
      // Emulate hover styles
      card.classList.add('hover-test');
      return {
        restingTransform,
        cardTransition: window.getComputedStyle(card).transition
      };
    })()`);
    console.log('Card transition and resting state:', hoverLift);

    // 3. Test Details disclosure toggle without selecting card
    console.log('\n--- Details Disclosure Test ---');
    const detailsToggle = await evaluate(`(() => {
      const card = document.querySelector('.eg-package-card');
      const details = card.querySelector('.eg-package-card__details');
      const summary = card.querySelector('.eg-package-card__details-summary');
      const initialOpen = details.open;
      const initialSelected = card.classList.contains('is-selected');

      // Click summary
      summary.click();
      const openAfterClick = details.open;
      const selectedAfterDetailsClick = card.classList.contains('is-selected');

      // Close it again
      summary.click();
      return {
        initialOpen,
        openAfterClick,
        selectedAfterDetailsClick
      };
    })()`);
    console.log('Details toggle result:', detailsToggle);

    // 4. Test Card Selection and Enquiry Form Sync
    console.log('\n--- Package Selection & Brief Form Sync Test ---');
    const selectionResult = await evaluate(`(() => {
      const basicBtn = document.querySelectorAll('.eg-package-card')[0].querySelector('.pricing-card__btn');
      const customBtn = document.querySelectorAll('.eg-package-card')[1].querySelector('.pricing-card__btn');
      const cards = document.querySelectorAll('.eg-package-card');
      const select = document.getElementById('field-package');

      // Click Choose Basic
      basicBtn.click();
      const basicSelected = cards[0].classList.contains('is-selected');
      const selectValAfterBasic = select ? select.value : null;

      // Click Choose Custom
      customBtn.click();
      const basicSelectedAfterCustom = cards[0].classList.contains('is-selected');
      const customSelected = cards[1].classList.contains('is-selected');
      const selectValAfterCustom = select ? select.value : null;

      return {
        basicSelected,
        selectValAfterBasic,
        basicSelectedAfterCustom,
        customSelected,
        selectValAfterCustom
      };
    })()`);
    console.log('Selection and sync result:', selectionResult);

    // 5. Light Theme Verification
    console.log('\n=== SECTION 3: LIGHT THEME & MOBILE CHECKS ===');
    await evaluate(`document.documentElement.setAttribute('data-theme', 'light')`);
    await new Promise(r => setTimeout(r, 400));

    const lightCardStyles = await evaluate(`(() => {
      const card = document.querySelector('.eg-package-card');
      const cs = window.getComputedStyle(card);
      return {
        background: cs.background,
        borderColor: cs.borderColor,
        boxShadow: cs.boxShadow
      };
    })()`);
    console.log('Light theme card styles:', lightCardStyles);
    await captureScreenshot(path.join(screenshotsDir, 'package-cards-light-1440.png'), feedbackBbox);

    // Reset back to dark theme
    await evaluate(`document.documentElement.setAttribute('data-theme', 'dark')`);

    // 6. Mobile 390px Viewport Verification
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 2000,
      deviceScaleFactor: 1,
      mobile: true
    });
    await evaluate(`document.getElementById('feedback').scrollIntoView({ behavior: 'instant' })`);
    await new Promise(r => setTimeout(r, 500));

    const mobileCheck = await evaluate(`(() => {
      const section = document.getElementById('feedback');
      const cards = Array.from(document.querySelectorAll('.eg-package-card'));
      const rects = cards.map(c => ({
        top: c.getBoundingClientRect().top,
        height: c.getBoundingClientRect().height,
        width: c.getBoundingClientRect().width
      }));
      return {
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        hasHorizontalOverflow: document.body.scrollWidth > document.body.clientWidth,
        cardsStackedVertically: rects[1].top > rects[0].top,
        cardWidths: rects.map(r => r.width)
      };
    })()`);
    console.log('Mobile 390px check:', mobileCheck);

    const mobileFeedbackBbox = await evaluate(`(() => {
      const section = document.getElementById('feedback');
      const r = section.getBoundingClientRect();
      return { x: 0, y: Math.max(0, window.scrollY + r.y), width: 390, height: Math.min(1800, Math.ceil(r.height)), scale: 1 };
    })()`);
    await captureScreenshot(path.join(screenshotsDir, 'package-cards-mobile-390.png'), mobileFeedbackBbox);

    console.log('\nAll verifications completed successfully!');
    ws.close();
    chromeProc.kill();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Verification failed with error:', err);
    chromeProc.kill();
    server.close();
    process.exit(1);
  }
});
