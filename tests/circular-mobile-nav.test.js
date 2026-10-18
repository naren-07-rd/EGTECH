import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const redesignCss = readFileSync(new URL('../src/redesign.css', import.meta.url), 'utf8');
const motionJs = readFileSync(new URL('../src/motion.js', import.meta.url), 'utf8');
const motionCss = readFileSync(new URL('../src/motion.css', import.meta.url), 'utf8');
const mobileMenuJs = readFileSync(new URL('../src/mobile-menu.js', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('global animation pause/resume button is completely removed from HTML, CSS, and JS', () => {
  // HTML must not contain .motion-control or .motion-toggle in the header
  assert.doesNotMatch(html, /class="[^"]*motion-(?:control|toggle)[^"]*"/, 'HTML still contains motion control button');
  assert.doesNotMatch(html, /aria-label="Pause animations"/, 'HTML still contains pause animations aria-label');

  // motion.js must not create or append a button
  assert.doesNotMatch(motionJs, /createElement\(['"]button['"]\)/, 'motion.js still creates button');
  assert.doesNotMatch(motionJs, /motion-control/, 'motion.js still references motion-control');
  assert.doesNotMatch(motionJs, /prepend\(button\)/, 'motion.js still prepends button');

  // motion.css must not style .motion-control
  assert.doesNotMatch(motionCss, /\.motion-control/, 'motion.css still styles .motion-control');

  // redesign.css must not have reserved spacing or styles for .motion-control
  assert.doesNotMatch(redesignCss, /\.motion-control/, 'redesign.css still references .motion-control');
});

test('motion.js preserves prefers-reduced-motion and document visibility syncing', () => {
  assert.match(motionJs, /root\.dataset\.motion\s*=\s*enabled\(\)\s*\?\s*['"]on['"]\s*:\s*['"]off['"]/, 'motion.js must sync dataset.motion');
  assert.match(motionJs, /preference\.matches/, 'motion.js must check preference.matches');
  assert.match(motionJs, /document\.hidden/, 'motion.js must check document.hidden');
  assert.match(motionJs, /visibilitychange/, 'motion.js must listen to visibilitychange');
});

test('circular mobile trigger has correct markup and accessibility attributes', () => {
  assert.match(html, /<button\s+class="menu-toggle eg-radial-trigger"\s+type="button"\s+aria-expanded="false"\s+aria-controls="mobile-nav"\s+aria-label="Open navigation menu">/);
  assert.match(html, /<span class="eg-hamburger-lines" aria-hidden="true">/);
  assert.match(html, /<span class="eg-line eg-line--1"><\/span>/);
  assert.match(html, /<span class="eg-line eg-line--2"><\/span>/);
  assert.match(html, /<span class="eg-line eg-line--3"><\/span>/);
});

test('mobile navigation overlay has radial structure, 6 destinations, and central close hub', () => {
  assert.match(html, /<nav id="mobile-nav" class="eg-mobile-radial-overlay" aria-label="Mobile navigation" hidden>/);
  assert.match(html, /<div class="eg-radial-backdrop" aria-hidden="true"><\/div>/);
  assert.match(html, /<div class="eg-radial-scroller" data-lenis-prevent>/);
  assert.match(html, /<div class="eg-radial-stage">/);
  assert.match(html, /<div class="eg-mobile-radial-menu">/);

  // 6 Destination items
  const destinations = [
    { cls: 'eg-radial-item--work', href: '#work', label: 'Work' },
    { cls: 'eg-radial-item--services', href: '#services', label: 'Services' },
    { cls: 'eg-radial-item--process', href: '#process', label: 'Process' },
    { cls: 'eg-radial-item--about', href: '#about', label: 'About' },
    { cls: 'eg-radial-item--faq', href: '#faq', label: 'FAQ' },
    { cls: 'eg-radial-item--contact', href: '#brief', label: 'Contact' }
  ];

  for (const dest of destinations) {
    const regex = new RegExp(`<a class="eg-radial-item ${dest.cls}" href="${dest.href}" aria-label="${dest.label}">[\\s\\S]*?<span class="eg-radial-label">${dest.label}<\\/span>[\\s\\S]*?<\\/a>`);
    assert.match(html, regex, `Missing or invalid destination link for ${dest.label}`);
  }

  // Central close button
  assert.match(html, /<button\s+[^>]*class="eg-radial-center-btn"[^>]*aria-label="Close navigation menu"[^>]*>/);
  assert.match(html, /<span class="eg-hamburger-lines is-active" aria-hidden="true">/);
});

test('scoped CSS defines radial menu geometry, responsive sizing, and staggered transitions', () => {
  assert.match(redesignCss, /\.menu-toggle\.eg-radial-trigger/);
  assert.match(redesignCss, /\.eg-hamburger-lines/);
  assert.match(redesignCss, /\.eg-mobile-radial-overlay/);
  assert.match(redesignCss, /\.eg-radial-scroller/);
  assert.match(redesignCss, /\.eg-radial-stage/);
  assert.match(redesignCss, /\.eg-mobile-radial-menu/);
  assert.match(redesignCss, /--menu-radius:\s*clamp\(/);
  assert.match(redesignCss, /--item-size:\s*clamp\(/);
  assert.match(redesignCss, /\.eg-radial-center-btn/);
  assert.match(redesignCss, /\.eg-radial-item/);

  // Distinct colors for 6 destinations
  assert.match(redesignCss, /\.eg-radial-item--work\{background:linear-gradient/);
  assert.match(redesignCss, /\.eg-radial-item--services\{background:linear-gradient/);
  assert.match(redesignCss, /\.eg-radial-item--process\{background:linear-gradient/);
  assert.match(redesignCss, /\.eg-radial-item--about\{background:linear-gradient/);
  assert.match(redesignCss, /\.eg-radial-item--faq\{background:linear-gradient/);
  assert.match(redesignCss, /\.eg-radial-item--contact\{background:linear-gradient/);

  // Staggered transitions
  assert.match(redesignCss, /\.eg-mobile-radial-overlay\.is-open \.eg-radial-item--work/);
  assert.match(redesignCss, /\.eg-mobile-radial-overlay\.is-open \.eg-radial-item--services/);
  assert.match(redesignCss, /\.eg-mobile-radial-overlay\.is-open \.eg-radial-item--process/);
  assert.match(redesignCss, /\.eg-mobile-radial-overlay\.is-open \.eg-radial-item--about/);
  assert.match(redesignCss, /\.eg-mobile-radial-overlay\.is-open \.eg-radial-item--faq/);
  assert.match(redesignCss, /\.eg-mobile-radial-overlay\.is-open \.eg-radial-item--contact/);

  // Reduced motion
  assert.match(redesignCss, /@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.eg-mobile-radial-overlay/);
  assert.match(redesignCss, /:root\[data-motion=off\] \.eg-mobile-radial-overlay/);
});

test('mobile-menu.js implements lifecycle, focus trap, Escape key, scroll locking, and smooth scroll routing', () => {
  assert.match(mobileMenuJs, /export function initMobileMenu\(\)/);
  assert.match(mobileMenuJs, /scrollToTarget/);
  assert.match(mobileMenuJs, /getLenis/);
  assert.match(mobileMenuJs, /Escape/);
  assert.match(mobileMenuJs, /Shift\+Tab|shiftKey/);
  assert.match(mobileMenuJs, /aria-expanded/);
  assert.match(mobileMenuJs, /matchMedia\(['"]\(min-width: 961px\)['"]\)/);

  // Integration into main.js
  assert.match(mainJs, /import \{ initMobileMenu \} from '\.\/mobile-menu\.js';/);
  assert.match(mainJs, /const disposeMobileMenu = initMobileMenu\(\);/);
});
