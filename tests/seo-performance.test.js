import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const redesignCss = readFileSync(new URL('../src/redesign.css', import.meta.url), 'utf8');
const motionJs = readFileSync(new URL('../src/motion.js', import.meta.url), 'utf8');

const visibilitySection = html.slice(html.indexOf('id="visibility"'), html.indexOf('id="process"'));

test('SEO & Performance section preserves ID, replaces old content, and has required introduction', () => {
  // Preserve section ID
  assert.match(visibilitySection, /id="visibility" class="visibility section-pad"/);

  // Old content is completely removed from this section
  assert.doesNotMatch(visibilitySection, /Search discoverability/);
  assert.doesNotMatch(visibilitySection, /engineering discipline/);
  assert.doesNotMatch(visibilitySection, /<div class="search-blueprint/);
  assert.doesNotMatch(visibilitySection, /latency-target/);
  assert.doesNotMatch(visibilitySection, /<50\s*ms/i);
  assert.doesNotMatch(visibilitySection, /&lt;50/);

  // New introduction content
  assert.match(visibilitySection, /SEO &amp; PERFORMANCE|SEO & PERFORMANCE/);
  assert.match(visibilitySection, /Built for speed\.<br \/><span class="seo-accent">Ready to be found\.<\/span>/);
  assert.match(visibilitySection, /We improve your website’s speed, structure, and search setup so customers can explore your business and take the next step\./);

  // CTA link
  assert.match(visibilitySection, /<a class="button seo-cta" href="#brief">Discuss your website <span aria-hidden="true">↗<\/span><\/a>/);
});

test('four service cards exist as native buttons with exact titles, descriptions, line icons, and shared highlight', () => {
  // Attribution
  assert.match(visibilitySection, /Highlighted Feature Cards/);

  // Shared highlight element
  assert.match(visibilitySection, /<div class="seo-feature-highlight" aria-hidden="true"><\/div>/);

  // Card 1 (initially pressed)
  assert.match(visibilitySection, /<button type="button" class="seo-feature-card reveal" aria-pressed="true">/);
  assert.match(visibilitySection, /<h3 class="seo-feature-card__title">Faster pages<\/h3>/);
  assert.match(visibilitySection, /<p class="seo-feature-card__desc">Optimized images and streamlined code for smoother browsing\.<\/p>/);

  // Card 2
  assert.match(visibilitySection, /<h3 class="seo-feature-card__title">Search-ready structure<\/h3>/);
  assert.match(visibilitySection, /<p class="seo-feature-card__desc">Clear page titles, useful internal links, and organized sitemaps\.<\/p>/);

  // Card 3
  assert.match(visibilitySection, /<h3 class="seo-feature-card__title">Mobile-friendly experience<\/h3>/);
  assert.match(visibilitySection, /<p class="seo-feature-card__desc">Readable content, comfortable buttons, and layouts that fit smaller screens\.<\/p>/);

  // Card 4
  assert.match(visibilitySection, /<h3 class="seo-feature-card__title">Measurement &amp; insights<\/h3>/);
  assert.match(visibilitySection, /<p class="seo-feature-card__desc">Analytics and search reporting to help you understand website performance\.<\/p>/);

  // 4 cards in total as buttons
  const cardMatches = [...visibilitySection.matchAll(/class="seo-feature-card reveal"/g)];
  assert.equal(cardMatches.length, 4, 'Must have exactly four SEO feature cards');

  // Exactly one initially pressed card
  const pressedMatches = [...visibilitySection.matchAll(/aria-pressed="true"/g)];
  assert.equal(pressedMatches.length, 1, 'Must have exactly one card with aria-pressed="true"');

  // Line icons: consistent SVG without emojis
  const svgMatches = [...visibilitySection.matchAll(/<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"/g)];
  assert.equal(svgMatches.length, 4, 'Each card must have one 20x20 inline SVG icon');
});

test('scoped CSS enforces layout, card styling, responsiveness, motion tokens, and reduced motion', () => {
  // Desktop layout ratio: 42% intro / 58% card grid
  assert.match(redesignCss, /#visibility \.visibility-container\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*42fr\)\s+minmax\(0,\s*58fr\)/);
  assert.match(redesignCss, /#visibility \.visibility-container\s*\{[^}]*gap:\s*48px/);

  // Section vertical padding: 80px desktop, 48px mobile
  assert.match(redesignCss, /#visibility\.visibility\s*\{[^}]*padding-top:\s*80px;\s*padding-bottom:\s*80px;/);
  assert.match(redesignCss, /@media\s*\(max-width:\s*767px\)\s*\{[^}]*#visibility\.visibility\s*\{[^}]*padding-top:\s*48px;\s*padding-bottom:\s*48px;/);

  // Component token mapping
  assert.match(redesignCss, /--stage-bg:\s*var\(--elevated\);/);
  assert.match(redesignCss, /--stage-fg:\s*var\(--text\);/);
  assert.match(redesignCss, /--stage-muted:\s*var\(--muted\);/);
  assert.match(redesignCss, /--stage-border:\s*var\(--line\);/);
  assert.match(redesignCss, /--stage-surface:\s*var\(--surface\);/);
  assert.match(redesignCss, /--stage-accent:\s*var\(--accent\);/);
  assert.match(redesignCss, /--stage-on-accent:\s*var\(--accent-text\);/);

  // Exact motion tokens
  assert.match(redesignCss, /--tabs-dur:\s*250ms;/);
  assert.match(redesignCss, /--tabs-ease:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\);/);
  assert.match(redesignCss, /--press-scale:\s*0\.97;/);
  assert.match(redesignCss, /--press-dur:\s*150ms;/);
  assert.match(redesignCss, /--ease-smooth-out:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\);/);

  // 2x2 grid and 1-column responsive breakpoints
  assert.match(redesignCss, /#visibility \.seo-feature-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);\s*gap:\s*20px;/);
  assert.match(redesignCss, /@media\s*\(max-width:\s*1023px\)\s*\{[^}]*#visibility \.visibility-container\s*\{[^}]*grid-template-columns:\s*1fr;/);
  assert.match(redesignCss, /@media\s*\(max-width:\s*639px\)\s*\{[^}]*#visibility \.seo-feature-grid\s*\{[^}]*grid-template-columns:\s*1fr;\s*gap:\s*20px;/);

  // Card appearance: 16px radius, 24px padding, touch-action pan-y, pressed scale
  assert.match(redesignCss, /#visibility \.seo-feature-card\s*\{[^}]*border-radius:\s*16px;/);
  assert.match(redesignCss, /#visibility \.seo-feature-card\s*\{[^}]*padding:\s*24px;/);
  assert.match(redesignCss, /#visibility \.seo-feature-card\s*\{[^}]*touch-action:\s*pan-y;/);
  assert.match(redesignCss, /#visibility \.seo-feature-card\.is-pressed\s*\{[^}]*transform:\s*scale\(var\(--press-scale\)\);/);

  // Highlight styling
  assert.match(redesignCss, /#visibility \.seo-feature-highlight\s*\{[^}]*border-radius:\s*16px;/);
  assert.match(redesignCss, /#visibility \.seo-feature-highlight\s*\{[^}]*pointer-events:\s*none;/);

  // CTA focus state
  assert.match(redesignCss, /#visibility \.seo-cta:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\);/);

  // Reduced motion support
  assert.match(redesignCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?#visibility \.seo-feature-card\s*\{[^}]*transition:\s*none !important;/);
  assert.match(redesignCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?#visibility \.seo-feature-highlight\s*\{[^}]*transition:\s*none !important;/);
  assert.match(motionJs, /element\.matches\('\.seo-card'\)/);
  assert.match(motionJs, /element\.matches\('\.seo-feature-card'\)/);
});

test('seo-feature-cards module is imported and initialized in main.js', () => {
  const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(mainJs, /import\s*\{\s*initSeoFeatureCards\s*\}\s*from\s*'\.\/seo-feature-cards\.js'/);
  assert.match(mainJs, /initSeoFeatureCards\(\)/);
});

