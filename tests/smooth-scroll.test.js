import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  isSmoothingAllowed,
  getHeaderOffset,
  scrollToTarget,
  initSmoothScroll
} from '../src/smooth-scroll.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const termsHtml = readFileSync(new URL('../terms.html', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const smoothScrollJs = readFileSync(new URL('../src/smooth-scroll.js', import.meta.url), 'utf8');
const smoothScrollCss = readFileSync(new URL('../src/smooth-scroll.css', import.meta.url), 'utf8');
const serviceNavJs = readFileSync(new URL('../src/service-accordion-nav.js', import.meta.url), 'utf8');
const pricingCardsJs = readFileSync(new URL('../src/pricing-cards.js', import.meta.url), 'utf8');

test('Smooth scroll module exports required functions and has clean structure', () => {
  assert.equal(typeof isSmoothingAllowed, 'function');
  assert.equal(typeof getHeaderOffset, 'function');
  assert.equal(typeof scrollToTarget, 'function');
  assert.equal(typeof initSmoothScroll, 'function');
});

test('Lenis configuration enforces gentle desktop smoothing, single RAF, and native touch', () => {
  // Desired feel: lerp 0.12 (short, subtle easing, immediately responsive, no float)
  assert.match(smoothScrollJs, /lerp:\s*0\.12/);

  // Preserve native touch scrolling completely: syncTouch must be false
  assert.match(smoothScrollJs, /syncTouch:\s*false/);

  // Single animation driving mechanism: autoRaf true without external secondary RAF loop
  assert.match(smoothScrollJs, /autoRaf:\s*true/);

  // Unified anchor routing: anchors disabled in Lenis so our unified scrollToTarget handles it
  assert.match(smoothScrollJs, /anchors:\s*false/);

  // Independent scrolling prevention hook for dialogs, textareas, selects, mobile-nav
  assert.match(smoothScrollJs, /node\.closest\('dialog'\)/);
  assert.match(smoothScrollJs, /node\.closest\('\[data-lenis-prevent\]'\)/);
  assert.match(smoothScrollJs, /node\.closest\('#mobile-nav'\)/);
});

test('Accessibility & site motion toggle compliance: isSmoothingAllowed reflects state', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  try {
    // 1. Normal state -> allowed
    globalThis.window = {
      matchMedia: (query) => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {}
      })
    };
    globalThis.document = {
      documentElement: { dataset: { motion: 'on' } },
      hidden: false
    };
    assert.equal(isSmoothingAllowed(), true, 'Smoothing should be allowed in default state');

    // 2. Prefers reduced motion -> disabled
    globalThis.window = {
      matchMedia: (query) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        addEventListener: () => {},
        removeEventListener: () => {}
      })
    };
    assert.equal(isSmoothingAllowed(), false, 'Smoothing must be disabled when prefers-reduced-motion is active');

    // 3. Site motion toggle off -> disabled
    globalThis.window = {
      matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
    };
    globalThis.document = {
      documentElement: { dataset: { motion: 'off' } },
      hidden: false
    };
    assert.equal(isSmoothingAllowed(), false, 'Smoothing must be disabled when data-motion="off"');

    // 4. Document hidden (background tab) -> disabled
    globalThis.document = {
      documentElement: { dataset: { motion: 'on' } },
      hidden: true
    };
    assert.equal(isSmoothingAllowed(), false, 'Smoothing must be disabled when document is hidden');
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});

test('Header offset calculation accounts for actual header height plus a small gap', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  try {
    globalThis.window = {};
    globalThis.document = {
      querySelector: (sel) => {
        if (sel === '.header') {
          return { offsetHeight: 76 };
        }
        return null;
      }
    };

    // Header 76px + gap 16px = 92px
    assert.equal(getHeaderOffset(), 92, 'Header offset should equal header.offsetHeight + 16');
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});

test('Dialog elements have data-lenis-prevent attribute in index.html and terms.html', () => {
  assert.match(html, /<dialog id="project-dialog"[^>]*data-lenis-prevent/);
  assert.match(termsHtml, /<dialog id="project-dialog"[^>]*data-lenis-prevent/);
});

test('CSS rules prevent conflicts between Lenis and native smooth scroll', () => {
  // html.lenis must have scroll-behavior: auto !important to prevent fight with Lenis
  assert.match(smoothScrollCss, /html\.lenis[^{]*\{[^}]*scroll-behavior:\s*auto !important;/);

  // data-motion="off" must force scroll-behavior: auto !important
  assert.match(smoothScrollCss, /:root\[data-motion="off"\][^{]*\{[^}]*scroll-behavior:\s*auto !important;/);

  // Dialog and data-lenis-prevent must have overscroll-behavior: contain
  assert.match(smoothScrollCss, /dialog[^{]*\{[^}]*overscroll-behavior:\s*contain;/);
  assert.match(smoothScrollCss, /\[data-lenis-prevent\]/);
});

test('main.js integrates smooth-scroll cleanly with imports, initialization, and HMR disposal', () => {
  assert.match(mainJs, /import 'lenis\/dist\/lenis\.css';/);
  assert.match(mainJs, /import '\.\/smooth-scroll\.css';/);
  assert.match(mainJs, /import \{[^}]*initSmoothScroll[^}]*\} from '\.\/smooth-scroll\.js';/);
  assert.match(mainJs, /const disposeSmoothScroll = initSmoothScroll\(\);/);
  assert.match(mainJs, /disposeSmoothScroll\(\);/);
});

test('Unified anchor routing in service-accordion-nav and pricing-cards', () => {
  // Service accordion nav uses scrollToTarget
  assert.match(serviceNavJs, /import \{ scrollToTarget \} from '\.\/smooth-scroll\.js';/);
  assert.match(serviceNavJs, /scrollToTarget\(item,\s*\{[^}]*focusTarget:\s*true/);

  // Pricing cards CTA button uses scrollToTarget
  assert.match(pricingCardsJs, /import \{ scrollToTarget \} from '\.\/smooth-scroll\.js';/);
  assert.match(pricingCardsJs, /scrollToTarget\(targetElement/);
});

test('scrollToTarget routes target appropriately and sets accessible focus', () => {
  let scrolledToY = null;
  let focusedElement = null;
  let hasTabindex = false;

  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  const mockTarget = {
    id: 'services',
    getBoundingClientRect: () => ({ top: 400 }),
    hasAttribute: (attr) => (attr === 'tabindex' ? hasTabindex : false),
    setAttribute: (attr, val) => { if (attr === 'tabindex') hasTabindex = true; },
    focus: () => { focusedElement = mockTarget; }
  };

  try {
    globalThis.window = {
      scrollY: 100,
      matchMedia: () => ({ matches: false }),
      scrollTo: ({ top }) => { scrolledToY = top; },
      location: { pathname: '/', hash: '' }
    };
    globalThis.document = {
      documentElement: { dataset: { motion: 'off' } }, // test native fallback
      hidden: false,
      querySelector: (sel) => (sel === '.header' ? { offsetHeight: 80 } : mockTarget)
    };

    // target 400 + scrollY 100 - headerOffset (80+16=96) = 404
    scrollToTarget(mockTarget, { focusTarget: true, updateHash: false });
    assert.equal(scrolledToY, 404);
    assert.equal(hasTabindex, true, 'Accessible tabindex="-1" must be set on target');
    assert.equal(focusedElement, mockTarget, 'Target must receive focus for accessibility');

    // #home scrolls to 0
    scrollToTarget('#home', { focusTarget: false, updateHash: false });
    assert.equal(scrolledToY, 0, '#home target must scroll to top (0)');
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
