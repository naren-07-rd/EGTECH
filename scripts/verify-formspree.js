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

const PORT = 9038;
const DEBUG_PORT = 9258;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Verification Server running at http://127.0.0.1:${PORT}`);

  const chromeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--window-size=1280,900',
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
    await send('Fetch.enable', {
      patterns: [{ urlPattern: '*formspree.io*' }]
    });

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result ? res.result.value : null;
    }

    // Scroll to #brief section
    await evaluate(`
      document.querySelector('#brief').scrollIntoView({ behavior: 'instant', block: 'start' });
    `);
    await new Promise(r => setTimeout(r, 400));

    console.log('\n--- 1. VALIDATION ERROR HANDLING ---');
    // Try submitting empty form
    await evaluate(`
      document.querySelector('#brief-form .form-submit').click();
    `);
    await new Promise(r => setTimeout(r, 200));

    const emptyValidation = await evaluate(`
      (() => {
        const error = document.querySelector('#brief-form-error');
        const nameField = document.querySelector('#field-name');
        return {
          errorHidden: error.hidden,
          errorMessage: error.textContent,
          nameInvalid: nameField.getAttribute('aria-invalid'),
          nameDescribedby: nameField.getAttribute('aria-describedby')
        };
      })()
    `);
    console.log('Empty Name Validation:', emptyValidation);
    if (emptyValidation.errorHidden || !emptyValidation.errorMessage.includes('Please enter your name')) {
      throw new Error('Required name validation failed!');
    }

    // Fill name, test invalid email
    await evaluate(`
      document.querySelector('#field-name').value = 'Kavitha S';
      document.querySelector('#field-email').value = 'invalid-email-address';
      document.querySelector('#brief-form .form-submit').click();
    `);
    await new Promise(r => setTimeout(r, 200));

    const emailValidation = await evaluate(`
      (() => {
        const error = document.querySelector('#brief-form-error');
        const emailField = document.querySelector('#field-email');
        return {
          errorMessage: error.textContent,
          emailInvalid: emailField.getAttribute('aria-invalid')
        };
      })()
    `);
    console.log('Email Validation:', emailValidation);
    if (!emailValidation.errorMessage.includes('valid email address')) {
      throw new Error('Email format validation failed!');
    }

    // Capture screenshot of validation error state
    const shotVal = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screenshotsDir, 'form-validation-state.png'), Buffer.from(shotVal.data, 'base64'));
    console.log('Saved: form-validation-state.png');

    console.log('\n--- 2. MOCKED SUCCESSFUL FORMSPREE SUBMISSION ---');
    // Fill full form with multiple services and package selection
    await evaluate(`
      document.querySelector('#field-email').value = 'kavitha@example.com';
      document.querySelector('#field-company').value = 'Kavitha Enterprises';
      document.querySelector('#field-idea').value = 'We require an interactive web platform with automated client invoicing and real-time order tracking.';
      
      // Select two services: Website and Automation
      document.querySelectorAll('.service-chips input[type="checkbox"]').forEach(cb => {
        if (cb.value === 'Website' || cb.value === 'Automation') {
          cb.checked = true;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Select package: Custom Website
      const pkgSelect = document.querySelector('#field-package');
      pkgSelect.value = 'Custom Website';
      pkgSelect.dispatchEvent(new Event('change', { bubbles: true }));
    `);

    // Setup listener for Formspree request interception
    let interceptedRequest = null;
    let interceptedRequestId = null;

    const requestPromise = new Promise((resolve) => {
      const fetchHandler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.method === 'Fetch.requestPaused') {
          ws.removeEventListener('message', fetchHandler);
          interceptedRequest = msg.params.request;
          interceptedRequestId = msg.params.requestId;
          resolve();
        }
      };
      ws.addEventListener('message', fetchHandler);
    });

    // Submit form
    await evaluate(`
      document.querySelector('#brief-form .form-submit').click();
    `);

    // Check sending button state while in-flight
    await new Promise(r => setTimeout(r, 100));
    const inFlightState = await evaluate(`
      (() => {
        const btn = document.querySelector('#brief-form .form-submit');
        const form = document.querySelector('#brief-form');
        return {
          btnDisabled: btn.disabled,
          btnText: btn.textContent.trim(),
          ariaBusy: form.getAttribute('aria-busy')
        };
      })()
    `);
    console.log('In-Flight State:', inFlightState);
    if (!inFlightState.btnDisabled || !inFlightState.btnText.includes('Sending')) {
      throw new Error(`Submit button did not show sending state: ${JSON.stringify(inFlightState)}`);
    }

    // Await intercepted request to Formspree
    await requestPromise;
    console.log('Intercepted Request to:', interceptedRequest.url);
    console.log('Method:', interceptedRequest.method);
    console.log('Accept Header:', interceptedRequest.headers['Accept'] || interceptedRequest.headers['accept']);
    console.log('Post Data Preview:', (interceptedRequest.postData || '').slice(0, 300));

    if (interceptedRequest.url !== 'https://formspree.io/f/mjygzedl') {
      throw new Error(`Unexpected endpoint URL: ${interceptedRequest.url}`);
    }
    if (interceptedRequest.method !== 'POST') {
      throw new Error(`Expected POST method, got ${interceptedRequest.method}`);
    }
    const postData = interceptedRequest.postData || '';
    if (!postData.includes('kavitha@example.com')) throw new Error('Missing visitor email!');
    if (!postData.includes('Kavitha S')) throw new Error('Missing visitor name!');
    if (!postData.includes('Custom Website')) throw new Error('Missing website package!');
    if (!postData.includes('Website') || !postData.includes('Automation')) throw new Error('Missing services selection!');

    // Mock Formspree 200 response
    const mockResponseBody = Buffer.from(JSON.stringify({ ok: true, next: 'https://formspree.io/thanks' })).toString('base64');
    await send('Fetch.fulfillRequest', {
      requestId: interceptedRequestId,
      responseCode: 200,
      responsePhrase: 'OK',
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Access-Control-Allow-Origin', value: '*' }
      ],
      body: mockResponseBody
    });

    await new Promise(r => setTimeout(r, 600));

    const successState = await evaluate(`
      (() => {
        const formStatus = document.querySelector('#brief-form-status');
        const formError = document.querySelector('#brief-form-error');
        const formResult = document.querySelector('.form-result');
        const resultDesc = document.querySelector('#result-description');
        const btn = document.querySelector('#brief-form .form-submit');
        const nameField = document.querySelector('#field-name');
        const emailField = document.querySelector('#field-email');
        const pkgSelect = document.querySelector('#field-package');
        const checkedChips = document.querySelectorAll('.service-chips input:checked');

        return {
          statusHidden: formStatus ? formStatus.hidden : true,
          statusText: formStatus ? formStatus.textContent.trim() : '',
          errorHidden: formError ? formError.hidden : true,
          errorText: formError ? formError.textContent.trim() : '',
          resultDescText: resultDesc ? resultDesc.textContent.trim() : '',
          btnDisabled: btn.disabled,
          nameValue: nameField.value,
          emailValue: emailField.value,
          pkgValue: pkgSelect.value,
          checkedChipsCount: checkedChips.length
        };
      })()
    `);
    console.log('Success State:', successState);
    const expectedSuccess = 'Thank you! Your enquiry has been submitted. We’ll get back to you soon.';
    if (!successState.statusText.includes(expectedSuccess) && !successState.resultDescText.includes(expectedSuccess)) {
      throw new Error(`Success message mismatch: statusText=${successState.statusText}, resultDesc=${successState.resultDescText}`);
    }
    if (successState.btnDisabled) {
      throw new Error('Submit button should be re-enabled after completion!');
    }
    if (successState.nameValue !== '' || successState.emailValue !== '') {
      throw new Error('Form fields should be reset after successful submission!');
    }
    if (successState.pkgValue !== 'Not sure yet') {
      throw new Error(`Package select should be reset to 'Not sure yet', got ${successState.pkgValue}`);
    }
    if (successState.checkedChipsCount !== 0) {
      throw new Error(`Service chips should be unchecked, found ${successState.checkedChipsCount}`);
    }

    const shotSuccess = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screenshotsDir, 'form-success-state.png'), Buffer.from(shotSuccess.data, 'base64'));
    console.log('Saved: form-success-state.png');

    console.log('\n--- 3. MOCKED ERROR HANDLING (INPUT PRESERVED) ---');
    // Fill again to test error handling
    await evaluate(`
      document.querySelector('#field-name').value = 'David K';
      document.querySelector('#field-email').value = 'david@startup.io';
      document.querySelector('#field-company').value = 'NextGen AI';
      document.querySelector('#field-idea').value = 'Developing an AI pipeline tool for enterprise workflow automation.';
    `);

    // Setup listener for Formspree request interception
    let errorReqPromise = new Promise((resolve) => {
      const fetchHandler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.method === 'Fetch.requestPaused') {
          ws.removeEventListener('message', fetchHandler);
          resolve(msg.params.requestId);
        }
      };
      ws.addEventListener('message', fetchHandler);
    });

    await evaluate(`
      document.querySelector('#brief-form .form-submit').click();
    `);

    const errorReqId = await errorReqPromise;

    // Mock Formspree 429 response
    const mockErrorBody = Buffer.from(JSON.stringify({ error: 'Monthly submission limit reached.' })).toString('base64');
    await send('Fetch.fulfillRequest', {
      requestId: errorReqId,
      responseCode: 429,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' }
      ],
      body: mockErrorBody
    });

    await new Promise(r => setTimeout(r, 400));

    const errorPreservedState = await evaluate(`
      (() => {
        const error = document.querySelector('#brief-form-error');
        const btn = document.querySelector('#brief-form .form-submit');
        const nameField = document.querySelector('#field-name');
        const emailField = document.querySelector('#field-email');
        const companyField = document.querySelector('#field-company');
        const ideaField = document.querySelector('#field-idea');
        return {
          errorHidden: error.hidden,
          errorMessage: error.textContent,
          btnDisabled: btn.disabled,
          nameValue: nameField.value,
          emailValue: emailField.value,
          companyValue: companyField.value,
          ideaValue: ideaField.value
        };
      })()
    `);
    console.log('Error Preserved State:', errorPreservedState);
    if (errorPreservedState.errorHidden) {
      throw new Error('Error element should be visible on failure!');
    }
    if (errorPreservedState.btnDisabled) {
      throw new Error('Submit button should be re-enabled on failure to allow retry!');
    }
    if (errorPreservedState.nameValue !== 'David K' || errorPreservedState.emailValue !== 'david@startup.io') {
      throw new Error('Visitor inputs must be preserved on error!');
    }

    const shotError = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screenshotsDir, 'form-error-state.png'), Buffer.from(shotError.data, 'base64'));
    console.log('Saved: form-error-state.png');

    console.log('\n ALL FORMSPREE INTEGRATION CHECKS PASSED PERFECTLY!');
  } catch (err) {
    console.error('Verification failed:', err);
    exitCode = 1;
  } finally {
    chromeProc.kill('SIGKILL');
    server.close();
    process.exit(exitCode);
  }
});
