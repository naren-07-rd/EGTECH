import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getSavedPlans, savePlan, unsavePlan } from '../src/pricing-cards.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const redesignCss = readFileSync(new URL('../src/redesign.css', import.meta.url), 'utf8');
const pricingCardsJs = readFileSync(new URL('../src/pricing-cards.js', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

const packageSection = html.slice(html.indexOf('id="feedback"'), html.indexOf('id="manifesto"'));

test('pricing section contains 3 package cards with heart buttons and morphing CTA buttons', () => {
  // Eyebrow and heading preserved
  assert.match(packageSection, /07 \/ WEBSITE PACKAGES/);
  assert.match(packageSection, /Choose the right website<br \/><em>for your business\.<\/em>/);

  // Exactly 3 cards
  const cards = [...packageSection.matchAll(/<article class="eg-package-card reveal"/g)];
  assert.equal(cards.length, 3, 'Must have exactly three package cards');

  // Heart buttons with minimum touch target setup and accessible labels
  const heartButtons = [...packageSection.matchAll(/class="pricing-card__heart-btn"[^>]*data-plan-id="([^"]+)"/g)];
  assert.equal(heartButtons.length, 3, 'Must have three heart buttons');
  assert.equal(heartButtons[0][1], 'basic');
  assert.equal(heartButtons[1][1], 'custom');
  assert.equal(heartButtons[2][1], 'ecommerce');

  // Heart buttons have type="button", aria-label and aria-pressed attributes
  assert.match(packageSection, /<button type="button" class="pricing-card__heart-btn" aria-label="Save Basic Website" aria-pressed="false"/);
  assert.match(packageSection, /<button type="button" class="pricing-card__heart-btn" aria-label="Save Custom Website" aria-pressed="false"/);
  assert.match(packageSection, /<button type="button" class="pricing-card__heart-btn" aria-label="Save E-commerce" aria-pressed="false"/);

  // Heart SVG and particles container present
  assert.match(packageSection, /<span class="pricing-card__particles" aria-hidden="true"><\/span>/);

  // CTA buttons have morphing slots
  assert.match(packageSection, /<span class="pricing-card__btn-morph" aria-hidden="true">/);
  assert.match(packageSection, /<span class="pricing-card__btn-text pricing-card__btn-text--choose">Choose Basic<\/span>/);
  assert.match(packageSection, /<span class="pricing-card__btn-text pricing-card__btn-text--chosen">Chosen<\/span>/);
  assert.match(packageSection, /<span class="pricing-card__btn-text pricing-card__btn-text--choose">Choose Custom<\/span>/);
  assert.match(packageSection, /<span class="pricing-card__btn-text pricing-card__btn-text--choose">Choose E-commerce<\/span>/);

  // Screen reader only texts
  assert.match(packageSection, /<span class="pricing-card__btn-sr sr-only">Choose Basic Website<\/span>/);
});

test('pricing cards CSS implements required motion tokens and design specifications', () => {
  // Motion tokens in .eg-package-grid
  assert.match(redesignCss, /--card-dur:\s*400ms;/);
  assert.match(redesignCss, /--card-lift:\s*6px;/);
  assert.match(redesignCss, /--text-morph-dur:\s*180ms;/);
  assert.match(redesignCss, /--text-morph-resize-dur:\s*240ms;/);
  assert.match(redesignCss, /--text-morph-blur:\s*2px;/);
  assert.match(redesignCss, /--press-scale:\s*0\.97;/);
  assert.match(redesignCss, /--press-dur:\s*150ms;/);

  // Heart press scale override
  assert.match(redesignCss, /\.pricing-card__heart-btn:active[^{]*\{[^}]*transform:\s*scale\(0\.95\);/s);

  // Heart button touch target is at least 44x44px
  assert.match(redesignCss, /min-width:\s*44px;/);
  assert.match(redesignCss, /min-height:\s*44px;/);

  // CTA button height is at least 48px
  assert.match(redesignCss, /min-height:\s*48px;/);

  // 8-particle burst keyframes
  assert.match(redesignCss, /@keyframes like-particle-burst/);
  assert.match(redesignCss, /@keyframes like-pop/);

  // Card lift on selected
  assert.match(redesignCss, /transform:\s*translateY\(calc\(-1\s*\*\s*var\(--card-lift\)\)\);/);

  // Reduced motion specifications
  const reducedMotionBlock = redesignCss.slice(redesignCss.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(reducedMotionBlock, /transition:\s*box-shadow 400ms linear,\s*border-color 400ms linear !important;/);
  assert.match(reducedMotionBlock, /\.pricing-card__particles\s*\{[^}]*display:\s*none !important;/);
});

test('pricing-cards.js correctly manages favourites persistence and imports cleanly in main.js', () => {
  // Verify main.js integrates pricing-cards module
  assert.match(mainJs, /import \{ initPricingCards \} from '\.\/pricing-cards\.js';/);
  assert.match(mainJs, /const disposePricingCards = initPricingCards\(\);/);
  assert.match(mainJs, /disposePricingCards\(\);/);

  // Mock localStorage for node environment
  const store = new Map();
  globalThis.localStorage = {
    getItem: key => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: key => store.delete(key),
    clear: () => store.clear()
  };

  // Initially empty
  assert.deepEqual(getSavedPlans(), []);

  // Save plan
  savePlan('custom');
  assert.deepEqual(getSavedPlans(), ['custom']);

  // Idempotent save
  savePlan('custom');
  assert.deepEqual(getSavedPlans(), ['custom']);

  // Save second plan
  savePlan('basic');
  assert.deepEqual(getSavedPlans(), ['custom', 'basic']);

  // Unsave plan
  unsavePlan('custom');
  assert.deepEqual(getSavedPlans(), ['basic']);

  // Safe against localStorage throw
  globalThis.localStorage.getItem = () => { throw new Error('QuotaExceeded'); };
  assert.deepEqual(getSavedPlans(), []);

  // Touch press handler exists in pricingCardsJs
  assert.match(pricingCardsJs, /bindTouchPress/);
  assert.match(pricingCardsJs, /--press-dur/);

  // Event propagation stopped on heart click so selection/scroll does not trigger
  assert.match(pricingCardsJs, /event\.stopPropagation\(\);/);
});
