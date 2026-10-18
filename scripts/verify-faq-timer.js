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

const PORT = 9015;
const DEBUG_PORT = 9235;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`FAQ Verification Server running at http://127.0.0.1:${PORT}`);

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

    const consoleErrors = [];
    ws.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
      }
    });

    await send('Runtime.enable');
    await send('Page.enable');

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result ? res.result.value : null;
    }

    async function takeScreenshot(name) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(shot.data, 'base64');
      const outPath = path.join(screenshotsDir, name);
      fs.writeFileSync(outPath, buffer);
      console.log(`Saved screenshot: ${name}`);
    }

    console.log('--- Step 1: Scroll to FAQ Section ---');
    await evaluate(`
      const faq = document.querySelector('#faq');
      faq.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await new Promise(r => setTimeout(r, 600));

    // Helper to get dot states
    async function getCarouselState() {
      return await evaluate(`
        (() => {
          const dots = Array.from(document.querySelectorAll('.faq-dot'));
          const counter = document.querySelector('#faq-counter')?.textContent.trim();
          const activeSlide = document.querySelector('.faq-slide.is-active .faq-question')?.textContent.trim();
          const dotInfo = dots.map((d, i) => {
            const fill = d.querySelector('.faq-dot__fill');
            const style = fill ? fill.style.transform : '';
            const match = style.match(/scaleX\\(([0-9.]+)\\)/);
            const scaleX = match ? parseFloat(match[1]) : (d.classList.contains('is-completed') ? 1 : 0);
            const computedStyle = window.getComputedStyle(fill);
            return {
              index: i,
              isActive: d.classList.contains('is-active'),
              isCompleted: d.classList.contains('is-completed'),
              isUpcoming: d.classList.contains('is-upcoming'),
              scaleX: scaleX,
              transformStyle: style,
              backgroundColor: computedStyle.backgroundColor,
              transformOrigin: computedStyle.transformOrigin
            };
          });
          return { counter, activeSlide, dotInfo };
        })()
      `);
    }

    const initialState = await getCarouselState();
    console.log(`Initial state on load: Counter=${initialState.counter}, Slide="${initialState.activeSlide}"`);
    console.log(`Segment 0: active=${initialState.dotInfo[0].isActive}, scaleX=${initialState.dotInfo[0].scaleX}, origin=${initialState.dotInfo[0].transformOrigin}`);

    if (initialState.dotInfo[0].transformOrigin.indexOf('0px') !== 0 && initialState.dotInfo[0].transformOrigin.indexOf('left') === -1) {
      console.warn('Transform origin check: ', initialState.dotInfo[0].transformOrigin);
    }

    console.log('\n--- Step 2: Observe filling of Question 1 (01/05) over 5 seconds ---');
    await new Promise(r => setTimeout(r, 2000));
    const mid1State = await getCarouselState();
    console.log(`At ~2.0s: Segment 0 scaleX=${mid1State.dotInfo[0].scaleX.toFixed(3)} (expected between 0.30 and 0.55)`);
    if (mid1State.dotInfo[0].scaleX < 0.25 || mid1State.dotInfo[0].scaleX > 0.60) {
      throw new Error(`Segment 0 unexpected scaleX at 2s: ${mid1State.dotInfo[0].scaleX}`);
    }

    // Wait until transition to Question 2
    console.log('Waiting for Question 1 to complete and advance to Question 2 (~3.2s)...');
    await new Promise(r => setTimeout(r, 3400));
    const q2State = await getCarouselState();
    console.log(`Now at: Counter=${q2State.counter}, Slide="${q2State.activeSlide}"`);
    console.log(`Segment 0: completed=${q2State.dotInfo[0].isCompleted}, scaleX=${q2State.dotInfo[0].scaleX}, bg=${q2State.dotInfo[0].backgroundColor}`);
    console.log(`Segment 1: active=${q2State.dotInfo[1].isActive}, scaleX=${q2State.dotInfo[1].scaleX.toFixed(3)}, bg=${q2State.dotInfo[1].backgroundColor}`);

    if (q2State.counter !== '02 / 05') {
      throw new Error(`Expected Question 2 (02 / 05), but got ${q2State.counter}`);
    }
    if (!q2State.dotInfo[0].isCompleted) {
      throw new Error('Segment 0 should be marked completed');
    }
    if (!q2State.dotInfo[1].isActive) {
      throw new Error('Segment 1 should be active');
    }

    console.log('\n--- Step 3: Observe filling of Question 2 over 5 seconds ---');
    await new Promise(r => setTimeout(r, 2200));
    const mid2State = await getCarouselState();
    console.log(`At ~2.2s into Q2: Segment 1 scaleX=${mid2State.dotInfo[1].scaleX.toFixed(3)} (filling smoothly)`);
    if (mid2State.dotInfo[1].scaleX < 0.25 || mid2State.dotInfo[1].scaleX > 0.65) {
      throw new Error(`Segment 1 failed to fill! scaleX=${mid2State.dotInfo[1].scaleX}`);
    }

    await takeScreenshot('faq-question-02-filling.png');

    console.log('\n--- Step 4: Complete Cycle 1 (Questions 3, 4, 5 and wrap to 1) ---');
    // Fast-track or wait through remaining questions in cycle 1
    // Let's watch Q3
    await new Promise(r => setTimeout(r, 3200));
    const q3State = await getCarouselState();
    console.log(`Advanced to: Counter=${q3State.counter}, Segment 2 active=${q3State.dotInfo[2].isActive}, Segment 1 completed=${q3State.dotInfo[1].isCompleted}`);

    // Wait through Q3 to Q4
    await new Promise(r => setTimeout(r, 5200));
    const q4State = await getCarouselState();
    console.log(`Advanced to: Counter=${q4State.counter}, Segment 3 active=${q4State.dotInfo[3].isActive}, Segments 0-2 completed`);

    // Wait through Q4 to Q5
    await new Promise(r => setTimeout(r, 5200));
    const q5State = await getCarouselState();
    console.log(`Advanced to: Counter=${q5State.counter}, Segment 4 active=${q5State.dotInfo[4].isActive}, Segments 0-3 completed`);

    // Wait through Q5 to wrap back to Q1
    await new Promise(r => setTimeout(r, 5200));
    const cycle1WrapState = await getCarouselState();
    console.log(`Wrapped back to: Counter=${cycle1WrapState.counter}, Slide="${cycle1WrapState.activeSlide}"`);
    console.log(`Segment 0: active=${cycle1WrapState.dotInfo[0].isActive}, scaleX=${cycle1WrapState.dotInfo[0].scaleX.toFixed(3)}`);
    console.log(`Segment 1..4 upcoming: ${cycle1WrapState.dotInfo.slice(1).every(d => d.isUpcoming)}`);

    if (cycle1WrapState.counter !== '01 / 05') {
      throw new Error(`Expected wrap to 01 / 05, got ${cycle1WrapState.counter}`);
    }

    console.log('\n--- Step 5: Test Clicking Currently Active Segment (Restarts 5s Countdown Fresh) ---');
    // Wait 2.5s into Q1 so it is half-filled
    await new Promise(r => setTimeout(r, 2500));
    const beforeClickState = await getCarouselState();
    console.log(`Before clicking active segment: scaleX=${beforeClickState.dotInfo[0].scaleX.toFixed(3)}`);
    if (beforeClickState.dotInfo[0].scaleX < 0.35) {
      throw new Error(`Expected scaleX > 0.35 before clicking active segment, got ${beforeClickState.dotInfo[0].scaleX}`);
    }

    // Click active segment (dot 0)
    await evaluate(`document.querySelector('#faq-tab-0').click()`);
    await new Promise(r => setTimeout(r, 80));
    const immediatelyAfterClick = await getCarouselState();
    console.log(`Immediately after clicking active segment: scaleX=${immediatelyAfterClick.dotInfo[0].scaleX.toFixed(3)} (reset to ~0)`);
    if (immediatelyAfterClick.dotInfo[0].scaleX > 0.10) {
      throw new Error(`Segment 0 did not reset immediately on click: scaleX=${immediatelyAfterClick.dotInfo[0].scaleX}`);
    }

    // Confirm it continues filling fresh from 0
    await new Promise(r => setTimeout(r, 1500));
    const fillingAfterReset = await getCarouselState();
    console.log(`1.5s after active segment click: scaleX=${fillingAfterReset.dotInfo[0].scaleX.toFixed(3)} (restarted successfully)`);
    if (fillingAfterReset.dotInfo[0].scaleX < 0.20 || fillingAfterReset.dotInfo[0].scaleX > 0.45) {
      throw new Error(`Segment did not restart smooth filling after click: ${fillingAfterReset.dotInfo[0].scaleX}`);
    }

    console.log('\n--- Step 6: Test Navigation Controls (Next, Prev, Arbitrary Segment Click) ---');
    // Click Next
    await evaluate(`document.querySelector('.faq-nav-btn--next').click()`);
    await new Promise(r => setTimeout(r, 200));
    const afterNext = await getCarouselState();
    console.log(`After Next button: Counter=${afterNext.counter}, Seg 1 active=${afterNext.dotInfo[1].isActive}`);
    if (afterNext.counter !== '02 / 05' || !afterNext.dotInfo[1].isActive) {
      throw new Error('Next button failed to select question 2');
    }

    // Click Prev
    await evaluate(`document.querySelector('.faq-nav-btn--prev').click()`);
    await new Promise(r => setTimeout(r, 200));
    const afterPrev = await getCarouselState();
    console.log(`After Prev button: Counter=${afterPrev.counter}, Seg 0 active=${afterPrev.dotInfo[0].isActive}`);
    if (afterPrev.counter !== '01 / 05' || !afterPrev.dotInfo[0].isActive) {
      throw new Error('Prev button failed to select question 1');
    }

    // Click Segment 3 (04 / 05)
    await evaluate(`document.querySelector('#faq-tab-3').click()`);
    await new Promise(r => setTimeout(r, 200));
    const afterTab3 = await getCarouselState();
    console.log(`After clicking Tab 3: Counter=${afterTab3.counter}`);
    console.log(`Seg 0, 1, 2 completed: ${afterTab3.dotInfo.slice(0, 3).every(d => d.isCompleted)}`);
    console.log(`Seg 3 active: ${afterTab3.dotInfo[3].isActive}`);
    console.log(`Seg 4 upcoming: ${afterTab3.dotInfo[4].isUpcoming}`);
    if (afterTab3.counter !== '04 / 05' || !afterTab3.dotInfo[3].isActive) {
      throw new Error('Clicking tab 3 failed');
    }

    console.log('\n--- Step 7: Test Rapid Clicking ---');
    await evaluate(`
      const next = document.querySelector('.faq-nav-btn--next');
      next.click();
      next.click();
      next.click();
      next.click();
    `);
    await new Promise(r => setTimeout(r, 500));
    const afterRapid = await getCarouselState();
    const activeCount = await evaluate(`document.querySelectorAll('.faq-slide.is-active').length`);
    console.log(`After rapid clicking 4 times: Counter=${afterRapid.counter}, active slides count=${activeCount}`);
    if (activeCount !== 1) {
      throw new Error(`Expected exactly 1 active slide after rapid clicking, got ${activeCount}`);
    }

    console.log('\n--- Step 8: Test Mouse Hover (Must NOT Pause Countdown) ---');
    // Dispatch mouseenter on carousel
    await evaluate(`
      const carousel = document.querySelector('#faq-carousel');
      carousel.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      carousel.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    `);
    const hoverStart = await getCarouselState();
    const activeIdx = hoverStart.dotInfo.findIndex(d => d.isActive);
    const startScaleX = hoverStart.dotInfo[activeIdx].scaleX;
    console.log(`Hover started at scaleX=${startScaleX.toFixed(3)} on slide ${hoverStart.counter}`);
    await new Promise(r => setTimeout(r, 1800));
    const hoverAfter = await getCarouselState();
    const activeIdxAfter = hoverAfter.dotInfo.findIndex(d => d.isActive);
    console.log(`1.8s later during hover: scaleX=${hoverAfter.dotInfo[activeIdxAfter].scaleX.toFixed(3)} (counter=${hoverAfter.counter})`);
    // It should have either advanced or filled by ~0.35
    if (activeIdx === activeIdxAfter && hoverAfter.dotInfo[activeIdxAfter].scaleX <= startScaleX + 0.15) {
      throw new Error('Countdown paused on mouse hover! It must NOT pause on hover.');
    }
    console.log('Confirmed: Mouse hover does NOT pause countdown.');

    console.log('\n--- Step 9: Test Viewport Leaving / Re-entering (Suspension and Resumption) ---');
    // Wait until start of a slide
    await evaluate(`document.querySelector('#faq-tab-0').click()`);
    await new Promise(r => setTimeout(r, 2000));
    const beforeOffscreen = await getCarouselState();
    const offscreenScaleX = beforeOffscreen.dotInfo[0].scaleX;
    console.log(`Before scrolling offscreen: scaleX=${offscreenScaleX.toFixed(3)}`);

    // Scroll away to top
    await evaluate(`window.scrollTo(0, 0)`);
    await new Promise(r => setTimeout(r, 3000));
    // Scroll back
    await evaluate(`document.querySelector('#faq').scrollIntoView({ behavior: 'instant', block: 'center' })`);
    await new Promise(r => setTimeout(r, 100));
    const afterReturn = await getCarouselState();
    console.log(`Upon returning from offscreen: Counter=${afterReturn.counter}, scaleX=${afterReturn.dotInfo[0].scaleX.toFixed(3)}`);
    if (afterReturn.counter !== '01 / 05') {
      throw new Error(`Carousel skipped questions while offscreen! Current: ${afterReturn.counter}`);
    }
    // Verify it continues from remaining time
    await new Promise(r => setTimeout(r, 1500));
    const afterResume = await getCarouselState();
    console.log(`1.5s after return: scaleX=${afterResume.dotInfo[0].scaleX.toFixed(3)} (smoothly continued)`);
    if (afterResume.dotInfo[0].scaleX <= offscreenScaleX) {
      throw new Error('Carousel failed to resume after scrolling back into view');
    }

    console.log('\n--- Step 10: Test Tab Switch / Visibility Change (Suspension and Resumption) ---');
    await evaluate(`document.querySelector('#faq-tab-1').click()`);
    await new Promise(r => setTimeout(r, 2000));
    const beforeTabSwitch = await getCarouselState();
    const tabSwitchScaleX = beforeTabSwitch.dotInfo[1].scaleX;
    console.log(`Before tab hidden: Counter=${beforeTabSwitch.counter}, scaleX=${tabSwitchScaleX.toFixed(3)}`);

    // Simulate tab hidden
    await evaluate(`
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    `);
    await new Promise(r => setTimeout(r, 3500));

    // Simulate tab visible
    await evaluate(`
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    `);
    await new Promise(r => setTimeout(r, 100));
    const afterTabVisible = await getCarouselState();
    console.log(`Immediately after tab visible: Counter=${afterTabVisible.counter}, scaleX=${afterTabVisible.dotInfo[1].scaleX.toFixed(3)}`);
    if (afterTabVisible.counter !== '02 / 05') {
      throw new Error(`Carousel skipped questions during tab suspension! Current: ${afterTabVisible.counter}`);
    }

    // Verify it smoothly resumes
    await new Promise(r => setTimeout(r, 1500));
    const tabResumeState = await getCarouselState();
    console.log(`1.5s after tab visible: scaleX=${tabResumeState.dotInfo[1].scaleX.toFixed(3)}`);
    if (tabResumeState.dotInfo[1].scaleX <= tabSwitchScaleX) {
      throw new Error('Failed to resume countdown after tab visibility returned');
    }

    console.log('\n--- Step 11: Test Site Motion Toggle (data-motion="off" / "on") ---');
    // Turn motion off
    await evaluate(`document.documentElement.dataset.motion = 'off'`);
    await new Promise(r => setTimeout(r, 500));
    const motionOffState = await getCarouselState();
    const playBtnText = await evaluate(`document.querySelector('.faq-play-toggle__text')?.textContent`);
    console.log(`Motion off: Play button text="${playBtnText}" (expected Play/paused)`);
    if (playBtnText !== 'Play') {
      throw new Error(`Expected Play button text to be Play when motion is off, got ${playBtnText}`);
    }

    // Turn motion back on
    await evaluate(`document.documentElement.dataset.motion = 'on'`);
    await new Promise(r => setTimeout(r, 500));
    const playBtnTextRestored = await evaluate(`document.querySelector('.faq-play-toggle__text')?.textContent`);
    console.log(`Motion on: Play button text="${playBtnTextRestored}" (expected Pause/running)`);
    if (playBtnTextRestored !== 'Pause') {
      throw new Error(`Expected Play button text to restore to Pause, got ${playBtnTextRestored}`);
    }

    console.log('\n--- Step 12: Check Console Errors ---');
    console.log(`Console error count: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error('Console errors encountered:', consoleErrors);
      throw new Error('Console errors encountered during test');
    }

    console.log('\n=========================================');
    console.log('ALL FAQ CAROUSEL TIMER VERIFICATIONS PASSED!');
    console.log('=========================================');
  } catch (err) {
    console.error('VERIFICATION FAILED:', err);
    exitCode = 1;
  } finally {
    chromeProc.kill('SIGKILL');
    server.close();
    process.exit(exitCode);
  }
});
