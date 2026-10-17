import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const pfcJs = readFileSync(new URL('../src/pricing-faq-contact-cinematic.js', import.meta.url), 'utf8');
const motionJs = readFileSync(new URL('../src/motion.js', import.meta.url), 'utf8');
const premiumMotionCss = readFileSync(new URL('../src/premium-motion.css', import.meta.url), 'utf8');

test('initPricingFaqContactCinematic exports properly and integrates into main.js', () => {
  assert.match(pfcJs, /export function initPricingFaqContactCinematic\(\)/);
  assert.match(mainJs, /import \{ initPricingFaqContactCinematic \} from '\.\/pricing-faq-contact-cinematic\.js';/);
  assert.match(mainJs, /const disposePricingFaqContactCinematic = initPricingFaqContactCinematic\(\);/);
  assert.match(mainJs, /disposePricingFaqContactCinematic\(\);/);
});

test('Website Packages (#feedback) preserves cards, hearts, and implements cinematic staggered entrance', () => {
  // Preserves 3 package cards
  assert.match(html, /<section id="feedback" class="website-packages section-pad">/);
  assert.match(html, /07 \/ WEBSITE PACKAGES/);
  assert.match(html, /Choose the right website<br \/><em>for your business\.<\/em>/);
  assert.match(html, /data-package="Basic Website"/);
  assert.match(html, /data-package="Custom Website"/);
  assert.match(html, /data-package="E-commerce"/);

  // Heart buttons and morphing CTA buttons preserved
  assert.match(html, /class="pricing-card__heart-btn"/);
  assert.match(html, /class="pricing-card__particles"/);
  assert.match(html, /class="pricing-card__btn-morph"/);

  // JS implements heading reveal, card entrance, and subtle tilt
  assert.match(pfcJs, /revealHeadingMask\(h2/);
  assert.match(pfcJs, /pricingSection\.querySelectorAll\('\.eg-package-card'\)/);
  assert.match(pfcJs, /createInteractiveTilt\(card/);
  assert.match(pfcJs, /has-selected-pop/);

  // CSS implements hover border, glow, and selected pulse
  assert.match(premiumMotionCss, /#feedback\.website-packages/);
  assert.match(premiumMotionCss, /#feedback \.eg-package-card:hover/);
  assert.match(premiumMotionCss, /#feedback \.eg-package-card\.has-selected-pop/);
  assert.match(premiumMotionCss, /@keyframes package-selected-pulse/);
});

test('FAQ section (#faq) preserves carousel, controls, 5s autoplay, and implements visual choreography', () => {
  // Preserves carousel structure and 5 questions
  assert.match(html, /<section id="faq" class="faq section-pad"/);
  assert.match(html, /09 \/ FREQUENTLY ASKED QUESTIONS/);
  assert.match(html, /Common questions &amp;<br class="faq-heading-br" \/> <em>clear answers\.<\/em>/);
  assert.match(html, /id="faq-carousel"/);
  assert.match(html, /id="faq-stage"/);
  assert.match(html, /class="faq-bg-panel faq-bg-panel--left"/);
  assert.match(html, /class="faq-bg-panel faq-bg-panel--right"/);

  // JS implements heading reveal, central card reveal, and ambient background depth
  assert.match(pfcJs, /revealHeadingMask\(h2/);
  assert.match(pfcJs, /faqSection\.querySelector\('\.faq-card'\)/);
  assert.match(pfcJs, /--faq-panel-shift/);

  // CSS implements refined slide transition and panel parallax
  assert.match(premiumMotionCss, /#faq\.faq/);
  assert.match(premiumMotionCss, /#faq \.faq-slide/);
  assert.match(premiumMotionCss, /#faq \.faq-bg-panel--left/);
});

test('Project Enquiry (#brief) preserves form, contacts, and implements refined focus and entrance motion', () => {
  // Preserves form and contact panel
  assert.match(html, /<section id="brief" class="brief section-pad">/);
  assert.match(html, /10 \/ PROJECT BRIEFING &amp; CONTACT/);
  assert.match(html, /Have a project in mind\?<br \/><span class="contact-accent">Let’s discuss the details\.<\/span>/);
  assert.match(html, /id="brief-form"/);
  assert.match(html, /id="field-name"/);
  assert.match(html, /id="field-email"/);
  assert.match(html, /id="field-idea"/);
  assert.match(html, /id="field-package"/);

  // JS implements heading reveal, contact card entrance, and form entrance
  assert.match(pfcJs, /revealHeadingMask\(h2/);
  assert.match(pfcJs, /contactCard\.animate/);
  assert.match(pfcJs, /briefForm\.animate/);

  // CSS implements smooth input focus ring and button hover/active transitions
  assert.match(premiumMotionCss, /#brief\.brief/);
  assert.match(premiumMotionCss, /#brief \.brief-form input:not\(\[type=checkbox\]\):focus-visible/);
  assert.match(premiumMotionCss, /#brief \.brief-contact-card:hover/);
  assert.match(premiumMotionCss, /#brief \.brief-contact-item:hover/);
  assert.match(premiumMotionCss, /#brief \.brief-form \.form-submit:hover:not\(:disabled\)/);
});

test('Hero (#home) and Header (.header) remain strictly protected from modification', () => {
  assert.doesNotMatch(pfcJs, /querySelector\(['"][^'"]*#home/);
  assert.doesNotMatch(pfcJs, /querySelector\(['"][^'"]*\.hero/);
  assert.doesNotMatch(pfcJs, /querySelector\(['"][^'"]*\.header/);
  assert.doesNotMatch(pfcJs, /querySelector\(['"][^'"]*\.logo-loader/);
});

test('motion.js coordinates with pricing-faq-contact-cinematic without competing transforms', () => {
  assert.match(motionJs, /element\.closest\('#feedback'\)\s*\|\|\s*element\.closest\('#faq'\)\s*\|\|\s*element\.closest\('#brief'\)/);
});

test('Reduced motion and data-motion="off" overrides are comprehensive for feedback, faq, and brief', () => {
  // prefers-reduced-motion checks
  assert.match(premiumMotionCss, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?#feedback \.eg-package-card/);
  assert.match(premiumMotionCss, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?#faq \.faq-slide/);
  assert.match(premiumMotionCss, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?#brief \.brief-contact-card/);

  // data-motion="off" checks
  assert.match(premiumMotionCss, /:root\[data-motion="off"\] #feedback \.eg-package-card/);
  assert.match(premiumMotionCss, /:root\[data-motion="off"\] #faq \.faq-slide/);
  assert.match(premiumMotionCss, /:root\[data-motion="off"\] #brief \.brief-contact-card/);

  // JS state change handler
  assert.match(pfcJs, /onMotionStateChange\(allowed =>/);
});
