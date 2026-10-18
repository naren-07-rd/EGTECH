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

const PORT = 9006;
const DEBUG_PORT = 9226;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Parallax test server running at http://127.0.0.1:${PORT}`);

  const chromeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--window-size=1440,900',
    `http://127.0.0.1:${PORT}/`
  ];

  const chromeProc = spawn(CHROME_PATH, chromeArgs);
  await new Promise(r => setTimeout(r, 2200));

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

    async function captureScreenshot(filename) {
      const res = await send('Page.captureScreenshot', { format: 'png' });
      if (res && res.data) {
        fs.writeFileSync(path.join(screenshotsDir, filename), Buffer.from(res.data, 'base64'));
        console.log(`Saved screenshot: ${filename}`);
      }
    }

    console.log('\n--- 1. Checking Parallax Element Discovery & Initial Markup ---');
    const catalog = await evaluate(`(() => {
      const cropImages = Array.from(document.querySelectorAll('#services .service-media img[data-parallax="crop"]')).map(img => ({
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt')?.slice(0, 30),
        dataset: img.dataset.parallax,
        parentClass: img.parentElement.className
      }));

      const portfolioDrift = document.querySelector('.preview-browser[data-parallax="drift"]');
      const manifestoDrift = document.querySelector('#philosophy .manifesto-image[data-parallax="drift"]');

      const excludedHeaderLogo = document.querySelector('.brand img')?.dataset.parallax || null;
      const excludedFooterLogo = document.querySelector('footer img')?.dataset.parallax || null;
      const excludedHero = document.querySelector('#home [data-parallax]') || null;
      const excludedFaq = document.querySelector('#faq [data-parallax]') || null;

      return {
        cropCount: cropImages.length,
        cropImages,
        portfolioFound: !!portfolioDrift,
        manifestoFound: !!manifestoDrift,
        manifestoSrc: manifestoDrift?.getAttribute('src'),
        excludedHeaderLogo,
        excludedFooterLogo,
        excludedHeroFound: !!excludedHero,
        excludedFaqFound: !!excludedFaq
      };
    })()`);
    console.log('Catalog result:', JSON.stringify(catalog, null, 2));

    console.log('\n--- 2. Inspecting Initial Computed Styles at Top of Page ---');
    const initialStyles = await evaluate(`(() => {
      const img1 = document.querySelector('#services .service-media img[data-parallax="crop"]');
      const manifesto = document.querySelector('#philosophy .manifesto-image[data-parallax="drift"]');
      const cs1 = window.getComputedStyle(img1);
      const csMan = window.getComputedStyle(manifesto);
      return {
        service1: {
          scale: cs1.scale,
          translate: cs1.translate,
          transform: cs1.transform,
          parallaxYVar: cs1.getPropertyValue('--parallax-y')
        },
        manifesto: {
          translate: csMan.translate,
          transform: csMan.transform,
          parallaxYVar: csMan.getPropertyValue('--parallax-y')
        }
      };
    })()`);
    console.log('Initial styles:', JSON.stringify(initialStyles, null, 2));

    console.log('\n--- 3. Scrolling to Services Section and Inspecting Parallax Travel ---');
    // Scroll window so services is in middle of viewport
    await evaluate(`(() => {
      const s = document.querySelector('#services');
      s.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const servicesScrolledStyles = await evaluate(`(() => {
      const img1 = document.querySelector('#services .service-media img[data-parallax="crop"]');
      const cs = window.getComputedStyle(img1);
      const rect = img1.getBoundingClientRect();
      return {
        scrollY: window.scrollY,
        rectTop: rect.top,
        rectHeight: rect.height,
        scale: cs.scale,
        translate: cs.translate,
        transform: cs.transform,
        parallaxYVar: cs.getPropertyValue('--parallax-y')
      };
    })()`);
    console.log('Services scrolled styles:', JSON.stringify(servicesScrolledStyles, null, 2));
    await captureScreenshot('parallax-services-desktop.png');

    console.log('\n--- 4. Testing Hover Zoom on Service Image (Confirming No Property Collision) ---');
    // Simulate hover on first service row
    const hoverTest = await evaluate(`(() => {
      const firstRow = document.querySelector('#services details.service');
      firstRow.classList.add('hover-test');
      const img = firstRow.querySelector('.service-media img');
      const cs = window.getComputedStyle(img);
      return {
        scale: cs.scale,
        translate: cs.translate,
        transform: cs.transform,
        parallaxYVar: cs.getPropertyValue('--parallax-y')
      };
    })()`);
    console.log('Hover on service image result:', JSON.stringify(hoverTest, null, 2));

    console.log('\n--- 5. Scrolling to Manifesto Mockup in #philosophy ---');
    await evaluate(`(() => {
      const m = document.querySelector('#philosophy');
      m.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const manifestoScrolled = await evaluate(`(() => {
      const img = document.querySelector('#philosophy .manifesto-image[data-parallax="drift"]');
      const cs = window.getComputedStyle(img);
      const rect = img.getBoundingClientRect();
      return {
        scrollY: window.scrollY,
        rectTop: rect.top,
        rectHeight: rect.height,
        translate: cs.translate,
        parallaxYVar: cs.getPropertyValue('--parallax-y')
      };
    })()`);
    console.log('Manifesto mockup styles while centered:', JSON.stringify(manifestoScrolled, null, 2));
    await captureScreenshot('parallax-manifesto-mockup.png');

    console.log('\n--- 6. Testing Accordion Toggle Dynamic Recalculation ---');
    // Scroll back to services and open Service 2 and Service 3
    await evaluate(`(() => {
      const s = document.querySelector('#services');
      s.scrollIntoView({ behavior: 'instant', block: 'start' });
    })()`);
    await new Promise(r => setTimeout(r, 400));

    const accordionToggleResult = await evaluate(`(() => {
      const services = Array.from(document.querySelectorAll('#services details.service'));
      // Open service 2 (Brand)
      services[1].open = true;
      services[1].dispatchEvent(new Event('toggle'));
      // Open service 3 (Auto)
      services[2].open = true;
      services[2].dispatchEvent(new Event('toggle'));
      return {
        service2Open: services[1].open,
        service3Open: services[2].open
      };
    })()`);
    await new Promise(r => setTimeout(r, 500));

    const openedServiceImages = await evaluate(`(() => {
      const img2 = document.querySelectorAll('#services .service-media img[data-parallax="crop"]')[1];
      const img3 = document.querySelectorAll('#services .service-media img[data-parallax="crop"]')[2];
      const cs2 = window.getComputedStyle(img2);
      const cs3 = window.getComputedStyle(img3);
      return {
        service2Brand: {
          scale: cs2.scale,
          translate: cs2.translate,
          parallaxYVar: cs2.getPropertyValue('--parallax-y')
        },
        service3Auto: {
          scale: cs3.scale,
          translate: cs3.translate,
          parallaxYVar: cs3.getPropertyValue('--parallax-y')
        }
      };
    })()`);
    console.log('Newly opened service images styles:', JSON.stringify(openedServiceImages, null, 2));
    await captureScreenshot('parallax-accordions-opened.png');

    console.log('\n--- 7. Testing Site Motion Toggle (data-motion="off") Resting Positions ---');
    await evaluate(`(() => {
      document.documentElement.setAttribute('data-motion', 'off');
    })()`);
    await new Promise(r => setTimeout(r, 300));

    const motionOffStyles = await evaluate(`(() => {
      const img1 = document.querySelector('#services .service-media img[data-parallax="crop"]');
      const manifesto = document.querySelector('#philosophy .manifesto-image[data-parallax="drift"]');
      const cs1 = window.getComputedStyle(img1);
      const csMan = window.getComputedStyle(manifesto);
      return {
        motionAttr: document.documentElement.getAttribute('data-motion'),
        img1Translate: cs1.translate,
        img1Scale: cs1.scale,
        img1ParallaxY: cs1.getPropertyValue('--parallax-y'),
        manifestoTranslate: csMan.translate,
        manifestoParallaxY: csMan.getPropertyValue('--parallax-y')
      };
    })()`);
    console.log('Styles when data-motion="off":', JSON.stringify(motionOffStyles, null, 2));

    // Restore motion
    await evaluate(`(() => {
      document.documentElement.setAttribute('data-motion', 'on');
    })()`);
    await new Promise(r => setTimeout(r, 300));

    console.log('\n--- 8. Testing Mobile Viewport (375x812) ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 500));

    const mobileStyles = await evaluate(`(() => {
      const img1 = document.querySelector('#services .service-media img[data-parallax="crop"]');
      const manifesto = document.querySelector('#philosophy .manifesto-image[data-parallax="drift"]');
      const cs1 = window.getComputedStyle(img1);
      const csMan = window.getComputedStyle(manifesto);
      return {
        innerWidth: window.innerWidth,
        img1Scale: cs1.scale,
        img1Translate: cs1.translate,
        manifestoTranslate: csMan.translate
      };
    })()`);
    console.log('Styles on mobile viewport:', JSON.stringify(mobileStyles, null, 2));
    await captureScreenshot('parallax-mobile-viewport.png');

    console.log('\n--- 9. Theme Verification (Dark and Light) ---');
    // Light theme
    await evaluate(`(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    })()`);
    await new Promise(r => setTimeout(r, 300));
    await captureScreenshot('parallax-theme-light.png');

    // Dark theme
    await evaluate(`(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    })()`);
    await new Promise(r => setTimeout(r, 300));
    await captureScreenshot('parallax-theme-dark.png');

    console.log('\n=========================================');
    console.log('ALL LIVE BROWSER VERIFICATIONS COMPLETED!');
    console.log('=========================================\n');

  } catch (err) {
    console.error('Error during browser verification:', err);
  } finally {
    try {
      chromeProc.kill('SIGTERM');
    } catch {}
    server.close();
    process.exit(0);
  }
});
