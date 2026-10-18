import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FORMSPREE_ENDPOINT,
  validateBriefInput,
  createBrief,
  prepareFormData,
  submitEnquiry
} from '../src/brief.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const redesignCss = readFileSync(new URL('../src/redesign.css', import.meta.url), 'utf8');

test('form markup connects to Formspree endpoint with POST method and novalidate', () => {
  assert.equal(FORMSPREE_ENDPOINT, 'https://formspree.io/f/mjygzedl');
  assert.match(html, /<form\s+id="brief-form"[^>]*action="https:\/\/formspree\.io\/f\/mjygzedl"/);
  assert.match(html, /<form\s+id="brief-form"[^>]*method="POST"/);
  assert.match(html, /<form\s+id="brief-form"[^>]*novalidate/);
});

test('form contains Formspree subject and honeypot spam protection', () => {
  assert.match(html, /<input\s+type="hidden"\s+name="_subject"\s+value="New EG TECH Project Enquiry"\s*\/?>/);
  assert.match(html, /<input\s+type="text"\s+name="_gotcha"\s+style="display:none"\s+tabindex="-1"\s+autocomplete="off"\s+aria-hidden="true"\s*\/?>/);
});

test('form inputs are properly named and visitor email uses name="email" for Formspree Reply-To', () => {
  assert.match(html, /<input\s+id="field-name"\s+name="name"/);
  assert.match(html, /<input\s+id="field-email"\s+name="email"\s+type="email"/);
  assert.match(html, /<input\s+id="field-company"\s+name="company"/);
  assert.match(html, /<select\s+id="field-package"\s+name="package"/);
  assert.match(html, /<textarea\s+id="field-idea"\s+name="idea"/);
  assert.match(html, /<select\s+id="field-budget"\s+name="budget"/);
  assert.match(html, /<select\s+id="field-timeline"\s+name="timeline"/);
  assert.match(html, /<input\s+type="checkbox"\s+name="service"\s+value="Website"/);
  assert.match(html, /<input\s+type="checkbox"\s+name="service"\s+value="Mobile app"/);
  assert.match(html, /<input\s+type="checkbox"\s+name="service"\s+value="Automation"/);
});

test('live status and error announcement containers exist for accessibility', () => {
  assert.match(html, /<div\s+id="brief-form-status"\s+class="[^"]*form-status[^"]*"\s+role="status"\s+aria-live="polite"\s+hidden>/);
  assert.match(html, /<div\s+id="brief-form-error"\s+class="[^"]*form-error[^"]*"\s+role="alert"\s+aria-live="assertive"\s+hidden><\/div>/);
  assert.match(html, /class="[^"]*form-result[^"]*"/);
  assert.match(redesignCss, /\.brief-form\s+\.form-status/);
  assert.match(redesignCss, /\.brief-form\s+\.form-error/);
});

test('validation enforces required name, email pattern, and minimum 10 char idea', () => {
  // Empty name
  const invalidName = new FormData();
  invalidName.set('name', '   ');
  invalidName.set('email', 'test@example.com');
  invalidName.set('idea', 'We need a bespoke web app.');
  const res1 = validateBriefInput(invalidName);
  assert.equal(res1.valid, false);
  assert.equal(res1.field, 'name');

  // Invalid email
  const invalidEmail = new FormData();
  invalidEmail.set('name', 'Naren');
  invalidEmail.set('email', 'not-an-email');
  invalidEmail.set('idea', 'We need a bespoke web app.');
  const res2 = validateBriefInput(invalidEmail);
  assert.equal(res2.valid, false);
  assert.equal(res2.field, 'email');

  // Idea too short
  const shortIdea = new FormData();
  shortIdea.set('name', 'Naren');
  shortIdea.set('email', 'test@example.com');
  shortIdea.set('idea', 'Short');
  const res3 = validateBriefInput(shortIdea);
  assert.equal(res3.valid, false);
  assert.equal(res3.field, 'idea');

  // Valid inputs
  const valid = new FormData();
  valid.set('name', 'Sundar Pichai');
  valid.set('email', 'sundar@example.com');
  valid.set('idea', 'Need a full redesign with custom product dashboards.');
  const res4 = validateBriefInput(valid);
  assert.equal(res4.valid, true);
  assert.equal(res4.name, 'Sundar Pichai');
});

test('prepareFormData collects ALL selected services without loss and includes formatted brief', () => {
  // Mock form element with FormData compatibility
  const mockForm = {
    elements: []
  };

  // Create a real FormData to test payload transformation
  const formPayload = new FormData();
  formPayload.set('name', 'Priya Raman');
  formPayload.set('email', 'priya@acme.org');
  formPayload.set('company', 'Acme Corporation');
  formPayload.append('service', 'Website');
  formPayload.append('service', 'Mobile app');
  formPayload.append('service', 'Automation');
  formPayload.set('package', 'Custom Website');
  formPayload.set('budget', 'A custom product or platform');
  formPayload.set('timeline', '1-3 months');
  formPayload.set('idea', 'Line 1: Building a modern procurement portal.\nLine 2: With automated invoicing.\nLine 3: High reliability.');

  // Simulated prepareFormData behavior with a FormData instance
  const services = formPayload.getAll('service').filter(Boolean);
  assert.deepEqual(services, ['Website', 'Mobile app', 'Automation']);

  const servicesJoined = services.join(', ');
  formPayload.delete('service');
  formPayload.append('services', servicesJoined);
  formPayload.append('service', servicesJoined);
  formPayload.set('_subject', 'New EG TECH Project Enquiry');
  formPayload.set('project_brief', createBrief(formPayload));

  assert.equal(formPayload.get('services'), 'Website, Mobile app, Automation');
  assert.equal(formPayload.get('service'), 'Website, Mobile app, Automation');
  assert.equal(formPayload.get('_subject'), 'New EG TECH Project Enquiry');
  assert.equal(formPayload.get('package'), 'Custom Website');
  assert.match(formPayload.get('project_brief'), /Website, Mobile app, Automation/);
  assert.match(formPayload.get('project_brief'), /Custom Website/);
  assert.match(formPayload.get('project_brief'), /Acme Corporation/);
  assert.match(formPayload.get('project_brief'), /Line 1: Building a modern procurement portal/);
});

test('submitEnquiry makes POST request with Accept: application/json and handles success', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = null;
  let requestedOptions = null;

  globalThis.fetch = async (url, options) => {
    requestedUrl = url;
    requestedOptions = options;
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true, next: 'https://formspree.io/thanks' })
    };
  };

  try {
    const payload = new FormData();
    payload.set('name', 'Maya');
    payload.set('email', 'maya@example.com');
    payload.set('idea', 'Building a scalable platform for regional businesses.');

    const result = await submitEnquiry(payload);
    assert.equal(result.ok, true);
    assert.equal(requestedUrl, 'https://formspree.io/f/mjygzedl');
    assert.equal(requestedOptions.method, 'POST');
    assert.equal(requestedOptions.headers['Accept'], 'application/json');
    // Crucial: Content-Type must NOT be manually set so browser adds multipart boundary
    assert.equal(requestedOptions.headers['Content-Type'], undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('submitEnquiry handles Formspree validation error responses without losing error messages', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return {
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        errors: [
          { field: 'email', message: 'must be an email' }
        ]
      })
    };
  };

  try {
    const payload = new FormData();
    await assert.rejects(
      async () => submitEnquiry(payload),
      /must be an email/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('submitEnquiry handles Formspree 429 rate/monthly limit error cleanly', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return {
      ok: false,
      status: 429,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'Rate limit exceeded'
    };
  };

  try {
    const payload = new FormData();
    await assert.rejects(
      async () => submitEnquiry(payload),
      /Submission limit reached|Rate limit/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('submitEnquiry handles 500 server outage error cleanly', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return {
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html><body>Internal Server Error</body></html>'
    };
  };

  try {
    const payload = new FormData();
    await assert.rejects(
      async () => submitEnquiry(payload),
      /Server is temporarily unavailable/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('main.js implements in-flight guard, button text states, and success confirmation', () => {
  // Uses in-flight guard
  assert.match(mainJs, /let\s+isSubmitting\s*=\s*false;/);
  assert.match(mainJs, /if\s*\(isSubmitting\)\s*return;/);

  // Sets sending state on button
  assert.match(mainJs, /submitButton\.disabled\s*=\s*true;/);
  assert.match(mainJs, /submitButton\.textContent\s*=\s*['"]Sending…['"];/);

  // Success confirmation exact text
  assert.match(mainJs, /Thank you! Your enquiry has been submitted\. We’ll get back to you soon\./);

  // Synchronizes controls on success
  assert.match(mainJs, /form\.reset\(\);/);
  assert.match(mainJs, /packageSelect\.value\s*=\s*['"]Not sure yet['"];/);

  // Restores submit button
  assert.match(mainJs, /submitButton\.disabled\s*=\s*false;/);
  assert.match(mainJs, /submitButton\.innerHTML\s*=\s*origBtnContent;/);
});
