import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const redesignCss = readFileSync(new URL('../src/redesign.css', import.meta.url), 'utf8');
const motionJs = readFileSync(new URL('../src/motion.js', import.meta.url), 'utf8');

test('all four original image files exist in public/ with matching byte counts', () => {
  const expected = [
    { file: 'public/web.jpg', size: 69927 },
    { file: 'public/Brand-Design-copy.webp', size: 22418 },
    { file: 'public/auto.webp', size: 111404 },
    { file: 'public/growth.webp', size: 52944 }
  ];
  for (const { file, size } of expected) {
    const url = new URL(`../${file}`, import.meta.url);
    assert.ok(existsSync(url), `File ${file} should exist`);
    assert.equal(statSync(url).size, size, `${file} size should match original bytes`);
  }
});

test('service markup correctly maps each service to its corresponding image and layout', () => {
  // Service 1: Web & commerce -> web.jpg
  assert.match(html, /<h3>Web &amp; commerce<\/h3>/);
  assert.match(html, /<img[^>]+src="\/web\.jpg"[^>]+alt="[^"]+"[^>]+width="1024"[^>]+height="585"[^>]+loading="lazy"/);

  // Service 2: Brand & product design -> Brand-Design-copy.webp
  assert.match(html, /<h3>Brand &amp; product design<\/h3>/);
  assert.match(html, /<div class="service-media service-media--brand">\s*<img[^>]+src="\/Brand-Design-copy\.webp"/);

  // Service 3: Software & automation -> auto.webp
  assert.match(html, /<h3>Software &amp; automation<\/h3>/);
  assert.match(html, /<img[^>]+src="\/auto\.webp"[^>]+alt="[^"]+"[^>]+width="1024"[^>]+height="585"[^>]+loading="lazy"/);

  // Service 4: Search & digital growth -> growth.webp
  assert.match(html, /<h3>Search &amp; digital growth<\/h3>/);
  assert.match(html, /<img[^>]+src="\/growth\.webp"[^>]+alt="[^"]+"[^>]+width="1024"[^>]+height="768"[^>]+loading="lazy"/);
});

test('accordion summaries have initial aria-expanded attributes and motion.js syncs them', () => {
  assert.match(html, /<details class="service reveal" open>\s*<summary aria-expanded="true">/);
  assert.match(html, /<summary aria-expanded="false"><span class="service-number">02<\/span>/);
  assert.match(html, /<summary aria-expanded="false"><span class="service-number">03<\/span>/);
  assert.match(html, /<summary aria-expanded="false"><span class="service-number">04<\/span>/);
  assert.match(motionJs, /summary\.setAttribute\('aria-expanded',\s*String\(details\.open\)\)/);
});

test('scoped CSS enforces 55/45 desktop split, 32px gap, 16:10 frame, 16px radius, and mobile 1-column', () => {
  assert.match(redesignCss, /#services \.service-content\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*55fr\)\s+minmax\(0,\s*45fr\)/);
  assert.match(redesignCss, /#services \.service-content\s*\{[^}]*gap:\s*32px/);
  assert.match(redesignCss, /#services \.service-media\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10/);
  assert.match(redesignCss, /#services \.service-media\s*\{[^}]*border-radius:\s*16px/);
  assert.match(redesignCss, /#services \.service-media--brand img\s*\{[^}]*object-fit:\s*contain/);
  assert.match(redesignCss, /@media\s*\(max-width:\s*767px\)\s*\{[^}]*#services \.service-content\s*\{[^}]*grid-template-columns:\s*1fr;[^}]*gap:\s*20px/);
});
