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

test('desktop process layout is decoupled from data-motion=on', () => {
  // Verify that .cinematic-process .delivery-steps grid does not require :root[data-motion=on]
  assert.match(refMotionCss, /\.cinematic-process\s+\.delivery-steps\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(refMotionCss, /:root\[data-motion=on\]\s+\.cinematic-process\s+\.delivery-steps\{display:grid/);
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
