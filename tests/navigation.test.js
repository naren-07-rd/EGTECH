import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('all in-page navigation targets exist and section IDs are unique', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'duplicate DOM IDs');
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.includes(target), `missing target #${target}`);
  }
});

test('the seven requested narratives occur in the specified order', () => {
  const anchors = ['services', 'work', 'visibility', 'process', 'about', 'feedback', 'philosophy'];
  let previous = -1;
  for (const anchor of anchors) {
    const position = html.indexOf(`id="${anchor}"`);
    assert.ok(position > previous, `section #${anchor} missing or out of order`);
    previous = position;
  }
});

test('the removed sculpture cannot load through markup or the entry script', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html + main, /sculpture\.png|scene\.js|hero-canvas|journey-canvas/);
});

test('organization metadata is valid and contains no invented ratings', () => {
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(data.name, 'EG TECH');
  assert.equal(data['@type'], 'Organization');
  assert.equal(data.aggregateRating, undefined);
});

test('desktop and mobile navigation use exactly the five specified links in order', () => {
  const desktopMatch = html.match(/<nav class="eg-navbar desktop-nav"[^>]*>(.*?)<\/nav>/s);
  assert.ok(desktopMatch, 'missing desktop eg-navbar');
  const desktopLinks = [...desktopMatch[1].matchAll(/<a class="eg-navbar__link" href="([^"]+)">([^<]+)<\/a>/g)].map(m => ({ href: m[1], text: m[2].trim() }));
  assert.deepEqual(desktopLinks, [
    { href: '#work', text: 'Work' },
    { href: '#services', text: 'Services' },
    { href: '#process', text: 'Process' },
    { href: '#about', text: 'About' },
    { href: '#faq', text: 'FAQ' },
  ]);

  const mobileMatch = html.match(/<nav id="mobile-nav"[^>]*>(.*?)<\/nav>/s);
  assert.ok(mobileMatch, 'missing mobile-nav');
  const mobileHrefs = [...mobileMatch[1].matchAll(/<a(?:\s+[^>]*?)?href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(mobileHrefs.slice(0, 5), ['#work', '#services', '#process', '#about', '#faq']);
});

test('animated border navbar contains scoped SVG outline and SelfMadeSystem attribution', () => {
  const redesignCss = readFileSync(new URL('../src/redesign.css', import.meta.url), 'utf8');
  assert.match(html, /Visual reference inspired by Uiverse\.io by SelfMadeSystem/);
  assert.match(redesignCss, /Visual reference inspired by Uiverse\.io by SelfMadeSystem/);
  assert.match(html, /<svg class="eg-navbar__outline" aria-hidden="true"/);
  assert.match(html, /<rect class="eg-navbar__rect"/);
  assert.match(redesignCss, /\.eg-navbar/);
  assert.match(redesignCss, /\.eg-navbar__outline/);
  assert.match(redesignCss, /\.eg-navbar__rect/);
});

test('header is sticky with backdrop filter and anchor scroll offsets are configured', () => {
  const redesignCss = readFileSync(new URL('../src/redesign.css', import.meta.url), 'utf8');
  assert.match(redesignCss, /\.header\{position:sticky;top:0/);
  assert.match(redesignCss, /backdrop-filter:blur/);
  assert.match(redesignCss, /html\{scroll-padding-top:96px\}/);
  assert.match(redesignCss, /section\{scroll-margin-top:96px\}/);
});

test('compact FAQ section exists before brief section with confirmed details', () => {
  const faqPos = html.indexOf('id="faq"');
  const briefPos = html.indexOf('id="brief"');
  assert.ok(faqPos !== -1, 'missing #faq section');
  assert.ok(briefPos !== -1, 'missing #brief section');
  assert.ok(faqPos < briefPos, '#faq must appear before #brief');
  assert.match(html, /What services does EG TECH provide\?/);
  assert.match(html, /How does the delivery process work\?/);
  assert.match(html, /Where is EG TECH located\?/);
});

