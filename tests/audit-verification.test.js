import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBriefInput, createBrief, isContactEmail, makeEmailLink } from '../src/brief.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const refMotionCss = readFileSync(new URL('../src/reference-motion.css', import.meta.url), 'utf8');
const redesignCss = readFileSync(new URL('../src/redesign.css', import.meta.url), 'utf8');
const typographyCss = readFileSync(new URL('../src/typography.css', import.meta.url), 'utf8');

test('form rejects whitespace-only name and project description', () => {
  // Whitespace-only name
  const data1 = new FormData();
  data1.set('name', '   ');
  data1.set('email', 'alex@example.com');
  data1.set('idea', 'Valid project description with more than ten characters.');
  const result1 = validateBriefInput(data1);
  assert.equal(result1.valid, false);
  assert.equal(result1.field, 'name');

  // Whitespace-only idea
  const data2 = new FormData();
  data2.set('name', 'Alex Morgan');
  data2.set('email', 'alex@example.com');
  data2.set('idea', '            ');
  const result2 = validateBriefInput(data2);
  assert.equal(result2.valid, false);
  assert.equal(result2.field, 'idea');

  // Valid input
  const data3 = new FormData();
  data3.set('name', 'Alex Morgan');
  data3.set('email', 'alex@example.com');
  data3.set('idea', 'We want to build a modern ecommerce platform for local produce.');
  const result3 = validateBriefInput(data3);
  assert.equal(result3.valid, true);
  assert.equal(result3.name, 'Alex Morgan');
});

test('form markup has safe method and fallback action to prevent GET query exposure', () => {
  assert.match(html, /<form[^>]+method="POST"/i);
  assert.match(html, /<form[^>]+action="javascript:void\(0\)"/i);
});

test('form formatting does not use artificial 850ms delay', () => {
  assert.doesNotMatch(mainJs, /wait\(850\)|wait\(.*850.*\)/);
});

test('both portfolio projects, their links and preview assets are preserved', () => {
  // Tiruttani Quick
  assert.match(html, /Tiruttani Quick/);
  assert.match(html, /https:\/\/gopi-2006\.github\.io\/tiruttani-quick-privacy-policy\//);
  assert.match(html, /\/tiruttani-quick-preview\.png/);

  // BidVerify AI
  assert.match(html, /BidVerify AI/);

  // Project records in main.js
  assert.match(mainJs, /title:\s*'Tiruttani Quick'/);
  assert.match(mainJs, /title:\s*'BidVerify AI'/);
});

test('desktop process layout has 3-column card grid and is decoupled from data-motion=on', () => {
  // Verify that .eg-process-grid has 3 columns in redesign.css
  assert.match(redesignCss, /\.eg-process-grid\{display:grid;grid-template-columns:repeat\(3,1fr\)/);
  assert.doesNotMatch(redesignCss, /:root\[data-motion=on\]\s+\.eg-process-grid/);

  // Verify all 5 process steps are present
  assert.match(html, /Discovery &amp; scope/);
  assert.match(html, /Architecture &amp; design/);
  assert.match(html, /Engineering &amp; review/);
  assert.match(html, /Testing &amp; hardening/);
  assert.match(html, /Deployment &amp; handover/);

  // Verify all deliverable tags are present
  assert.match(html, /BRIEF \+ SCOPE/);
  assert.match(html, /SYSTEM PLAN \+ PROTOTYPE/);
  assert.match(html, /WORKING PRODUCT \+ REVIEWS/);
  assert.match(html, /TEST PASS \+ RELEASE PLAN/);
  assert.match(html, /DEPLOYMENT \+ HANDOVER/);
});

test('headings are not split with innerHTML and br in motion modules', () => {
  const expressiveMotion = readFileSync(new URL('../src/expressive-motion.js', import.meta.url), 'utf8');
  assert.doesNotMatch(expressiveMotion, /\.split\(\/<br/);
});

test('accessible contrast tokens and form input font-sizes are enforced', () => {
  // Accessible blue #245de0 has >= 4.5:1 contrast with white
  assert.match(redesignCss, /--accent:\s*#245de0/);

  // Form inputs have font-size >= 16px to prevent iOS auto-zoom
  assert.match(typographyCss, /input:not\(\[type=checkbox\]\),\s*textarea,\s*select\s*\{[^}]*font-size:\s*16px/);
});

test('startup loader contains no fake progress percentage counter', () => {
  const loaderJs = readFileSync(new URL('../src/loader.js', import.meta.url), 'utf8');
  assert.doesNotMatch(loaderJs, /intro-count/);
  assert.doesNotMatch(loaderJs, /\/ 100/);
});

test('contact section layout, exact contact details, and rounded form fields are verified', () => {
  // Exact contact details
  assert.match(html, /Contact us/);
  assert.match(html, /Let’s talk about your project\./);
  assert.match(html, /\+91 7604921213/);
  assert.match(html, /href="tel:\+917604921213"/);
  assert.match(html, /narenthiranath703@gmail\.com/);
  assert.match(html, /href="mailto:narenthiranath703@gmail\.com"/);

  // Shortened placeholders & updated field label
  assert.match(html, /placeholder="Your name"/);
  assert.match(html, /placeholder="you@company\.com"/);
  assert.match(html, /placeholder="Company name"/);
  assert.match(html, /Project details/);
  assert.match(html, /placeholder="Briefly describe your project\."/);

  // Default contactEmail in main.js
  assert.match(mainJs, /narenthiranath703@gmail\.com/);

  // Layout & rounded field constraints in redesign.css
  assert.match(redesignCss, /\.brief-container\{[^}]*max-width:\s*1260px/);
  assert.match(redesignCss, /\.brief-form\{[^}]*border-radius:\s*24px/);
  assert.match(redesignCss, /\.brief-contact-card\{[^}]*border-radius:\s*24px/);
  assert.match(redesignCss, /\.brief-form input:not\(\[type=checkbox\]\),\.brief-form select\{[^}]*height:\s*52px/);
  assert.match(redesignCss, /\.brief-form input:not\(\[type=checkbox\]\),\.brief-form select\{[^}]*border-radius:\s*14px/);
  assert.match(redesignCss, /\.brief-form textarea\{[^}]*min-height:\s*140px/);
  assert.match(redesignCss, /\.brief-form textarea\{[^}]*border-radius:\s*14px/);
});
