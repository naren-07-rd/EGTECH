import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const faqJs = readFileSync(new URL('../src/faq-carousel.js', import.meta.url), 'utf8');
const redesignCss = readFileSync(new URL('../src/redesign.css', import.meta.url), 'utf8');

test('all five questions and exact answers are preserved in FAQ carousel and fallback list', () => {
  const expectedPairs = [
    {
      q: 'What services does EG TECH provide?',
      a: 'We connect strategy, design and engineering across custom web applications, ecommerce platforms, brand identity, workflow automation, and search infrastructure.'
    },
    {
      q: 'How does the delivery process work?',
      a: 'We follow a five-step delivery framework: Discovery & scope, Architecture & design, Engineering & review, Testing & hardening, and Deployment & handover. You communicate directly with the engineers building your software.'
    },
    {
      q: 'Where is EG TECH located?',
      a: 'EG TECH is based in Tamil Nadu, India, pairing local market insight with modern web engineering standards.'
    },
    {
      q: 'Are project scopes and timelines agreed in writing?',
      a: 'Yes. Deliverables, responsibilities, review milestones, and handover criteria are documented in writing before kickoff.'
    },
    {
      q: 'How can we start a project or enquiry?',
      a: 'Prepare a structured project brief using the briefing tool below. You can review, copy, download, or email your requirements directly to EG TECH.'
    }
  ];

  // Verify section ID and heading
  assert.ok(html.includes('id="faq"'), 'missing id="faq"');
  assert.match(html, /Common questions &amp;<br class="faq-heading-br" \/> <em>clear answers\.<\/em>/);

  // Check each Q&A in the carousel stage
  expectedPairs.forEach((pair, idx) => {
    assert.ok(html.includes(pair.q), `missing question in carousel: ${pair.q}`);
    // Extract answer text from HTML, normalising &amp;
    const cleanAnswer = pair.a.replace(/&/g, '&amp;');
    assert.ok(html.includes(cleanAnswer), `missing answer in carousel: ${pair.a}`);
  });

  // Check each Q&A in the all-questions fallback list
  const fallbackListStart = html.indexOf('id="faq-all-list"');
  assert.ok(fallbackListStart !== -1, 'missing #faq-all-list');
  const fallbackSub = html.slice(fallbackListStart);
  expectedPairs.forEach(pair => {
    assert.ok(fallbackSub.includes(pair.q), `missing question in fallback: ${pair.q}`);
  });
});

test('FAQ layout has central card, angled side panels, and left-aligned text', () => {
  // Centred section
  assert.match(redesignCss, /\.faq\s*\{[^}]*display:\s*flex/);
  assert.match(redesignCss, /\.faq\s*\{[^}]*align-items:\s*center/);
  assert.match(redesignCss, /\.faq__container\s*\{[^}]*text-align:\s*center/);

  // Spacing above carousel connected
  assert.match(redesignCss, /\.faq__header\s*\{[^}]*margin-bottom:\s*34px/);

  // Central Card: max-width 880-960px (920px), border-radius 32px, left-aligned
  assert.match(redesignCss, /\.faq-card\s*\{[^}]*max-width:\s*920px/);
  assert.match(redesignCss, /\.faq-card\s*\{[^}]*border-radius:\s*32px/);
  assert.match(redesignCss, /\.faq-card\s*\{[^}]*text-align:\s*left/);
  assert.match(redesignCss, /\.faq-card\s*\{[^}]*box-shadow:\s*0 24px 60px/);

  // Layered background panels with 3D perspective and rotateY
  assert.match(redesignCss, /\.faq-scene\s*\{[^}]*perspective:\s*1200px/);
  assert.match(redesignCss, /\.faq-bg-panel--left\s*\{[^}]*rotateY\(18deg\)/);
  assert.match(redesignCss, /\.faq-bg-panel--right\s*\{[^}]*rotateY\(-18deg\)/);

  // Top metadata row
  assert.match(html, /class="faq-card__label">COMMON QUESTIONS<\/span>/);
  assert.match(html, /id="faq-counter"[^>]*>01 \/ 05<\/span>/);

  // Left-aligned questions and answers
  assert.match(redesignCss, /\.faq-slide\s*\{[^}]*text-align:\s*left/);
  assert.match(redesignCss, /\.faq-question\s*\{[^}]*text-align:\s*left/);
  assert.match(redesignCss, /\.faq-answer\s*\{[^}]*text-align:\s*left/);

  // Navy background token
  assert.match(redesignCss, /\.faq\s*\{[^}]*background:\s*var\(--bg\)/);
  assert.match(redesignCss, /\.faq-question\s*\{[^}]*color:\s*var\(--text\)/);
  assert.match(redesignCss, /\.faq-answer\s*\{[^}]*color:\s*var\(--muted\)/);
});

test('FAQ typography matches design tokens and responsive specifications', () => {
  // Heading typography
  assert.match(redesignCss, /\.faq__heading\s*\{[^}]*font-size:\s*clamp\(32px,\s*4\.5vw,\s*54px\)/);
  // Question typography: ~28-34px desktop, 22-24px mobile
  assert.match(redesignCss, /\.faq-question\s*\{[^}]*font-size:\s*clamp\(24px,\s*3\.2vw,\s*32px\)/);
  // Answer typography: 18px desktop, 16px mobile
  assert.match(redesignCss, /\.faq-answer\s*\{[^}]*font-size:\s*clamp\(16px,\s*1\.8vw,\s*18px\)/);
  assert.match(redesignCss, /\.faq-answer\s*\{[^}]*line-height:\s*1\.65/);
});

test('FAQ motion uses coordinated 400ms transition and cubic-bezier easing', () => {
  assert.match(redesignCss, /400ms\s+cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/);
  assert.match(redesignCss, /translateY\(12px\)/);
  assert.match(redesignCss, /translateY\(-12px\)/);
  assert.match(faqJs, /HOLD_DURATION\s*=\s*5000/);
  assert.match(faqJs, /TRANSITION_DURATION\s*=\s*400/);
});

test('FAQ navigation controls and accessibility attributes are correctly structured', () => {
  // Previous and Next buttons
  assert.match(html, /class="faq-nav-btn faq-nav-btn--prev"/);
  assert.match(html, /class="faq-nav-btn faq-nav-btn--next"/);

  // Five progress indicators with descriptive labels
  assert.match(html, /aria-label="Show question 1: What services does EG TECH provide\?"/);
  assert.match(html, /aria-label="Show question 2: How does the delivery process work\?"/);
  assert.match(html, /aria-label="Show question 3: Where is EG TECH located\?"/);
  assert.match(html, /aria-label="Show question 4: Are project scopes and timelines agreed in writing\?"/);
  assert.match(html, /aria-label="Show question 5: How can we start a project or enquiry\?"/);

  // Play/Pause button
  assert.match(html, /class="faq-play-toggle"/);
  assert.match(html, /Pause/);

  // View all questions toggle with aria attributes
  assert.match(html, /id="faq-view-all-toggle"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="faq-all-list"/);

  // Live region for manual announcement
  assert.match(html, /class="faq-sr-status sr-only"\s+aria-live="polite"/);

  // Inactive slides have aria-hidden and inert
  assert.match(html, /id="faq-slide-0"[^>]*aria-hidden="false"/);
  assert.match(html, /id="faq-slide-1"[^>]*aria-hidden="true"[^>]*inert/);
});

test('reduced motion and site motion settings are strictly handled', () => {
  assert.match(redesignCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.faq-slide\s*\{[^}]*transition:\s*none\s*!important/);
  assert.match(redesignCss, /:root\[data-motion=off\]\s+\.faq-slide\s*\{[^}]*transition:\s*none\s*!important/);
  assert.match(faqJs, /prefers-reduced-motion:\s*reduce/);
  assert.match(faqJs, /document\.documentElement\.dataset\.motion === 'off'/);
});

test('initFaqCarousel is properly imported, called, and disposed in main.js', () => {
  assert.match(mainJs, /import\s*\{\s*initFaqCarousel\s*\}\s*from\s*'\.\/faq-carousel\.js'/);
  assert.match(mainJs, /const\s+disposeFaqCarousel\s*=\s*initFaqCarousel\(\)/);
  assert.match(mainJs, /disposeFaqCarousel\(\)/);
});

test('FAQ progress timer uses transform-based scaleX fill, single authoritative state, and correct color tokens', () => {
  // Transform-based fill with transform-origin: left
  assert.match(redesignCss, /\.faq-dot__fill\s*\{[^}]*transform-origin:\s*left/);
  assert.match(redesignCss, /\.faq-dot__fill\s*\{[^}]*transform:\s*scaleX\(0\)/);
  assert.match(redesignCss, /\.faq-dot\.is-completed\s+\.faq-dot__fill\s*\{[^}]*transform:\s*scaleX\(1\)\s*!important/);

  // Segment colors: bright blue for active (#3b82f6 / #2563eb), muted blue for completed (#254473 / #93b3e8)
  assert.match(redesignCss, /\.faq-dot\.is-completed\s+\.faq-dot__fill\s*\{[^}]*background:\s*#254473/);
  assert.match(redesignCss, /:root\[data-theme=light\]\s+\.faq-dot\.is-completed\s+\.faq-dot__fill\s*\{[^}]*background:\s*#93b3e8/);
  assert.match(redesignCss, /\.faq-dot\.is-active\s+\.faq-dot__fill\s*\{[^}]*background:\s*#3b82f6/);
  assert.match(redesignCss, /:root\[data-theme=light\]\s+\.faq-dot\.is-active\s+\.faq-dot__fill\s*\{[^}]*background:\s*#2563eb/);

  // Single authoritative elapsed time state and unbroken RAF tick loop
  assert.match(faqJs, /animFrameId\s*=\s*requestAnimationFrame\(tick\);/);
  assert.match(faqJs, /updateProgressUI\(elapsedTime\s*\/\s*HOLD_DURATION\)/);
  assert.match(faqJs, /fill\.style\.transform\s*=\s*`scaleX\(\$\{clampedFraction\}\)`/);

  // Clicking active segment restarts 5s countdown
  assert.match(faqJs, /const\s+isSameSlide\s*=\s*targetIndex\s*===\s*currentIndex;/);
  assert.match(faqJs, /if\s*\(isSameSlide\)\s*\{\s*return;\s*\}/);
});

