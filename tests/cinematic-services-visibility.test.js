import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf-8');
const mainJs = readFileSync('src/main.js', 'utf-8');
const motionJs = readFileSync('src/motion.js', 'utf-8');
const servicesJs = readFileSync('src/services-cinematic.js', 'utf-8');
const visibilityJs = readFileSync('src/visibility-cinematic.js', 'utf-8');
const premiumMotionCss = readFileSync('src/premium-motion.css', 'utf-8');

test('Services section has required structure, semantic markup, and preserved heading breaks', () => {
  // Preserves heading semantic structure and line break
  assert.match(html, /<section id="services" class="capabilities section-pad">/);
  assert.match(html, /<div class="section-heading reveal">\s*<p class="eyebrow">02 \/ SERVICES &amp; CAPABILITIES<\/p>\s*<h2>Services &amp;<br \/><em>capabilities\.<\/em><\/h2>\s*<p>Clear scopes/);

  // Exactly 4 service accordion rows with details/summary structure
  const serviceMatches = [...html.matchAll(/<details class="service reveal"/g)];
  assert.equal(serviceMatches.length, 4, 'Must have exactly 4 service accordion rows');

  // First service starts open
  assert.match(html, /<details class="service reveal" open>\s*<summary aria-expanded="true">/);

  // All 4 image files are referenced
  assert.match(html, /src="\/web\.jpg"/);
  assert.match(html, /src="\/Brand-Design-copy\.webp"/);
  assert.match(html, /src="\/auto\.webp"/);
  assert.match(html, /src="\/growth\.webp"/);
});

test('Services cinematic motion module coordinates heading, accordion, and images', () => {
  // Heading mask and stagger
  assert.match(servicesJs, /revealHeadingMask\(h2,/);
  assert.match(servicesJs, /eyebrow\.animate/);
  assert.match(servicesJs, /desc\.animate/);

  // Staggered service row entrance
  assert.match(servicesJs, /row\.animate\(\s*\[\s*\{\s*opacity:\s*0,\s*transform:\s*'translateY\(24px\)'\s*\}/);

  // Smooth accordion expand & collapse
  assert.match(servicesJs, /details\.open\s*=\s*false/);
  assert.match(servicesJs, /details\.open\s*=\s*true/);
  assert.match(servicesJs, /summary\.setAttribute\('aria-expanded'/);

  // Service image clip-path & scale reveal
  assert.match(servicesJs, /clipPath:\s*'inset\(100% 0 0 0 round 16px\)'/);
  assert.match(servicesJs, /transform:\s*'scale\(1\.04\)'/);

  // Reduced motion guard
  assert.match(servicesJs, /if \(!isMotionAllowed\(\)\)/);
});

test('Services CSS provides smooth plus/minus rotation, row hover highlight, and fine-pointer image zoom', () => {
  // Plus/minus indicator rotation
  assert.match(premiumMotionCss, /#services \.service \.expand\s*\{[^}]*transition:\s*transform 0\.38s cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/);
  assert.match(premiumMotionCss, /#services \.service\[open\] \.expand\s*\{[^}]*transform:\s*rotate\(45deg\)/);

  // Row hover highlighting
  assert.match(premiumMotionCss, /#services \.service:hover\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--accent\)\s*3\.5%,\s*transparent\)/);
  assert.match(premiumMotionCss, /#services \.service\[open\]\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--accent\)\s*2%,\s*transparent\)/);

  // Media hover zoom on fine pointer
  assert.match(premiumMotionCss, /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)[\s\S]*?#services \.service:hover \.service-media img\s*\{[^}]*transform:\s*scale\(1\.03\)/);
});

test('SEO & Performance (#visibility) has coordinated typography, staggered cards, and depth', () => {
  // Section exists and preserves ID
  assert.match(html, /<section id="visibility" class="visibility section-pad">/);

  // Typography coordinated reveals in visibility-cinematic.js
  assert.match(visibilityJs, /revealHeadingMask\(h2,/);
  assert.match(visibilityJs, /label\.animate/);
  assert.match(visibilityJs, /desc\.animate/);
  assert.match(visibilityJs, /cta\.animate/);

  // Feature cards staggered entrance
  assert.match(visibilityJs, /card\.animate\(\s*\[\s*\{\s*opacity:\s*0,\s*transform:\s*'translateY\(24px\) scale\(0\.98\)'\s*\}/);

  // CSS background depth and icon hover motion
  assert.match(premiumMotionCss, /#visibility\.visibility::before\s*\{[^}]*radial-gradient/);
  assert.match(premiumMotionCss, /#visibility \.seo-feature-card:hover \.seo-feature-card__icon svg\s*\{[^}]*transform:\s*translateY\(-2px\)\s*scale\(1\.1\)/);
});

test('Reduced motion and data-motion="off" safely disable all transforms and transitions for services and visibility', () => {
  assert.match(premiumMotionCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?#services \.service[^{]*\{[^}]*transition:\s*none !important/);
  assert.match(premiumMotionCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?#services \.service \.expand[^{]*\{[^}]*transform:\s*none !important/);
  assert.match(premiumMotionCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?#services \.service-media img[^{]*\{[^}]*transform:\s*none !important/);
  assert.match(premiumMotionCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?#visibility \.seo-feature-card:hover \.seo-feature-card__icon svg[^{]*\{[^}]*transform:\s*none !important/);

  assert.match(premiumMotionCss, /:root\[data-motion="off"\][^{]*#services \.service[^{]*\{[^}]*transition:\s*none !important/);
  assert.match(premiumMotionCss, /:root\[data-motion="off"\][^{]*#services \.service \.expand[^{]*\{[^}]*transform:\s*none !important/);
  assert.match(premiumMotionCss, /:root\[data-motion="off"\][^{]*#services \.service-media img[^{]*\{[^}]*transform:\s*none !important/);
  assert.match(premiumMotionCss, /:root\[data-motion="off"\][^{]*#visibility \.seo-feature-card:hover \.seo-feature-card__icon svg[^{]*\{[^}]*transform:\s*none !important/);
});

test('main.js integrates cinematic services and visibility modules with HMR disposal', () => {
  assert.match(mainJs, /import \{ initServicesCinematic \} from '\.\/services-cinematic\.js';/);
  assert.match(mainJs, /import \{ initVisibilityCinematic \} from '\.\/visibility-cinematic\.js';/);
  assert.match(mainJs, /const disposeServicesCinematic = initServicesCinematic\(\);/);
  assert.match(mainJs, /const disposeVisibilityCinematic = initVisibilityCinematic\(\);/);
  assert.match(mainJs, /disposeVisibilityCinematic\(\);/);
  assert.match(mainJs, /disposeServicesCinematic\(\);/);
});

test('Hero section (#home) and Header (.header) remain 100% untouched', () => {
  // Hero section and header markup untouched in HTML
  assert.match(html, /<section id="home" class="hero section-pad">/);
  assert.match(html, /<span class="hero-line">Big ideas\.<\/span>/);
  assert.match(html, /<div class="system-showcase"/);
  assert.match(html, /<div class="system-display">/);
  assert.match(html, /<nav class="eg-navbar desktop-nav"/);

  // motion.js still protects headings and runs hero intro
  assert.match(motionJs, /if \(element\.matches\('h2'\) \|\| element\.querySelector\('h2'\)\) return;/);
});
