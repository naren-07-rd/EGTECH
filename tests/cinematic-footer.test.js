import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const termsHtml = readFileSync(new URL('../terms.html', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const footerJs = readFileSync(new URL('../src/footer-cinematic.js', import.meta.url), 'utf8');
const motionJs = readFileSync(new URL('../src/motion.js', import.meta.url), 'utf8');
const legalCss = readFileSync(new URL('../src/legal.css', import.meta.url), 'utf8');
const premiumMotionCss = readFileSync(new URL('../src/premium-motion.css', import.meta.url), 'utf8');

test('initFooterCinematic exports properly and integrates into main.js with HMR disposal', () => {
  assert.match(footerJs, /export function initFooterCinematic\(\)/);
  assert.match(mainJs, /import \{ initFooterCinematic \} from '\.\/footer-cinematic\.js';/);
  assert.match(mainJs, /const disposeFooterCinematic = initFooterCinematic\(\);/);
  assert.match(mainJs, /disposeFooterCinematic\(\);/);
});

test('Footer structure is preserved: 4 columns, brand mark, Explore, Services, Contact, and Bottom Bar', () => {
  assert.match(html, /<footer class="footer">/);
  assert.match(html, /<div class="footer-col footer-col--brand">/);
  assert.match(html, /<img src="\/eg-tech-logo\.jpeg" alt="EG TECH official logo" width="44" height="44"/);
  assert.match(html, /Websites, digital experiences, and automation for growing businesses\./);

  // Explore column
  assert.match(html, /<h3 class="footer-col__title">Explore<\/h3>/);
  assert.match(html, /href="#work" class="footer-link">Work<\/a>/);
  assert.match(html, /href="#services" class="footer-link">Services<\/a>/);
  assert.match(html, /href="#process" class="footer-link">Process<\/a>/);
  assert.match(html, /href="#about" class="footer-link">About<\/a>/);
  assert.match(html, /href="#faq" class="footer-link">FAQ<\/a>/);

  // Services column
  assert.match(html, /<h3 class="footer-col__title">Services<\/h3>/);
  assert.match(html, /href="#service-web" class="footer-link service-accordion-link"/);
  assert.match(html, /href="#service-brand" class="footer-link service-accordion-link"/);
  assert.match(html, /href="#service-software" class="footer-link service-accordion-link"/);
  assert.match(html, /href="#service-growth" class="footer-link service-accordion-link"/);

  // Contact column
  assert.match(html, /<h3 class="footer-col__title">Get in touch<\/h3>/);
  assert.match(html, /\+91 7604921213/);
  assert.match(html, /narenthiranath703@gmail\.com/);

  // Bottom bar
  assert.match(html, /<div class="footer-bottom section-pad">/);
  assert.match(html, /<span class="footer-year" id="year">2026<\/span> EG TECH\. All rights reserved\./);
  assert.match(html, /id="footer-privacy-btn">Privacy Policy<\/button>/);
  assert.match(html, /<a href="\/terms\.html" class="footer-bottom-link">Terms &amp; Conditions<\/a>/);
  assert.match(html, /<a href="#home" class="footer-bottom-link back-to-top-link">Back to top ↑<\/a>/);
});

test('footer-cinematic.js coordinates column stagger, brand entrance, and bottom bar', () => {
  // Column stagger and transforms
  assert.match(footerJs, /columns\.forEach\(\(col, index\) =>/);
  assert.match(footerJs, /delay:\s*index\s*\*\s*90/);
  assert.match(footerJs, /translateY\(24px\)/);

  // Restrained brand logo entrance
  assert.match(footerJs, /scale\(0\.92\)/);
  assert.match(footerJs, /scale\(1\)/);

  // Bottom bar entrance
  assert.match(footerJs, /bottomBar\.animate/);
  assert.match(footerJs, /translateY\(16px\)/);

  // Reduced motion and state tracking
  assert.match(footerJs, /isMotionAllowed\(\)/);
  assert.match(footerJs, /onMotionStateChange/);
  assert.match(footerJs, /delete footer\.dataset\.cinematicFooter/);
});

test('premium-motion.css Section 15 implements section transition, link underlines, and reduced-motion safety', () => {
  // Ambient gradient top accent
  assert.match(premiumMotionCss, /\.footer::before\s*\{/);
  assert.match(premiumMotionCss, /linear-gradient/);

  // Link hover animated underline
  assert.match(premiumMotionCss, /\.footer-link::after\s*\{/);
  assert.match(premiumMotionCss, /transform:\s*scaleX\(0\)/);
  assert.match(premiumMotionCss, /\.footer-link:hover::after,\s*\.footer-link:focus-visible::after\s*\{\s*transform:\s*scaleX\(1\);/);

  // Reduced motion & data-motion="off" overrides
  assert.match(premiumMotionCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.footer-col/);
  assert.match(premiumMotionCss, /:root\[data-motion="off"\]\s*\.footer-col/);
  assert.match(premiumMotionCss, /:root\[data-motion="off"\]\s*\.footer-link::after/);
});

test('motion.js yields .footer cleanly to prevent competing animations', () => {
  assert.match(motionJs, /element\.closest\('\.footer'\)/);
});

test('Terms & Conditions page maintains unpinned, clean legal review with subtle entrance animation', () => {
  assert.match(termsHtml, /<body class="legal-page">/);
  assert.match(termsHtml, /<h1 class="legal-title">Terms &amp; Conditions<\/h1>/);
  assert.match(legalCss, /@keyframes legalFadeIn/);
  assert.match(legalCss, /\.legal-container\s*\{[\s\S]*?animation:\s*legalFadeIn/);
  assert.match(legalCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.legal-container\s*\{\s*animation:\s*none\s*!important;\s*\}\s*\}/);
});

test('Hero section (#home), header (.header), and startup loader remain 100% protected', () => {
  assert.match(html, /<section id="home" class="hero section-pad">/);
  assert.match(html, /<header class="header">/);
  assert.match(mainJs, /startLogoIntro/);

  const footerCode = footerJs.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  assert.doesNotMatch(footerCode, /#home|\.hero|\.header|\.logo-loader/);
});
