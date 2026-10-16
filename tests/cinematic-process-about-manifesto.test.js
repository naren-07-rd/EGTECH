import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const pamJs = readFileSync(new URL('../src/process-about-manifesto-cinematic.js', import.meta.url), 'utf8');
const motionJs = readFileSync(new URL('../src/motion.js', import.meta.url), 'utf8');
const premiumMotionCss = readFileSync(new URL('../src/premium-motion.css', import.meta.url), 'utf8');

test('initProcessAboutManifestoCinematic module exports properly and integrates into main.js', () => {
  assert.match(pamJs, /export function initProcessAboutManifestoCinematic\(\)/);
  assert.match(mainJs, /import \{ initProcessAboutManifestoCinematic \} from '\.\/process-about-manifesto-cinematic\.js';/);
  assert.match(mainJs, /const disposeProcessAboutManifestoCinematic = initProcessAboutManifestoCinematic\(\);/);
  assert.match(mainJs, /disposeProcessAboutManifestoCinematic\(\);/);
});

test('Process section (#process) preserves markup, interactive steps, and adds cinematic scroll progress', () => {
  // Preserves existing sections and headers
  assert.match(html, /<section id="process" class="engineering-process section-pad">/);
  assert.match(html, /05 \/ ENGINEERING METHODOLOGY/);
  assert.match(html, /From requirements<br \/>to <em>verified release\.<\/em>/);
  assert.match(html, /class="process-steps"/);
  assert.match(html, /class="process-steps__rail"/);
  assert.match(html, /class="process-steps__line-fill"/);

  // All 5 steps preserved
  for (let i = 0; i < 5; i++) {
    assert.match(html, new RegExp(`data-step="${i}"`));
    assert.match(html, new RegExp(`<span class="process-step__circle">${i + 1}</span>`));
    assert.match(html, new RegExp(`id="process-header-${i}"`));
    assert.match(html, new RegExp(`id="process-panel-${i}"`));
  }

  // JS implements heading mask reveal, step entrance, and scroll progress rail
  assert.match(pamJs, /revealHeadingMask\(h2/);
  assert.match(pamJs, /processSection\.querySelectorAll\('\.process-step'\)/);
  assert.match(pamJs, /lineFill\.style\.height/);
  assert.match(pamJs, /activeStep !== '-1'/);
  assert.match(pamJs, /step\.setAttribute\('data-circle', 'accented'\)/);

  // CSS contains scoped enhancements
  assert.match(premiumMotionCss, /#process\.engineering-process/);
  assert.match(premiumMotionCss, /#process \.process-step/);
});

test('About section (#about) preserves artwork, monogram, copy, and implements cinematic mask reveals', () => {
  // Preserves markup
  assert.match(html, /<section id="about" class="studio-profile section-pad">/);
  assert.match(html, /<div class="studio-art reveal" aria-hidden="true">/);
  assert.match(html, /<div class="studio-monogram">EG<span>TECH\.<\/span><\/div>/);
  assert.match(html, /06 \/ STUDIO PROFILE/);
  assert.match(html, /Focused engineering<br \/>from <em>Tamil Nadu\.<\/em>/);
  assert.match(html, /class="studio-lead"/);
  assert.match(html, /class="text-link" href="#brief"/);

  // JS implements artwork clip-path mask, restrained monogram entrance, and depth shift
  assert.match(pamJs, /clipPath:\s*'inset\(16% 0 0 0 round 23px\)'/);
  assert.match(pamJs, /monogram\.animate/);
  assert.match(pamJs, /--art-depth-shift/);
  assert.match(pamJs, /lead\.animate/);
  assert.match(pamJs, /paragraphs\.forEach/);

  // CSS contains scoped artwork elevation & depth transform
  assert.match(premiumMotionCss, /#about\.studio-profile/);
  assert.match(premiumMotionCss, /#about \.studio-art/);
  assert.match(premiumMotionCss, /--art-depth-shift/);
  assert.match(premiumMotionCss, /#about \.text-link:hover/);
});

test('Studio Manifesto (#philosophy) preserves core statement, principles, animated dividers, and CTA', () => {
  // Preserves markup
  assert.match(html, /<section id="philosophy" class="manifesto section-pad">/);
  assert.match(html, /08 \/ STUDIO MANIFESTO/);
  assert.match(html, /Intentional design\.<br \/><em>Zero noise\.<\/em>/);
  assert.match(html, /<span>01<\/span>Function and usability guide every interface\./);
  assert.match(html, /<span>02<\/span>Performance and low latency are foundational requirements\./);
  assert.match(html, /<span>03<\/span>Clean, maintainable code outlasts fleeting aesthetic trends\./);
  assert.match(html, /class="manifesto-bottom"/);
  assert.match(html, /href="#brief">Discuss your project/);

  // JS implements sequential entrance and divider reveals
  assert.match(pamJs, /revealHeadingMask\(h2/);
  assert.match(pamJs, /principles\.forEach/);
  assert.match(pamJs, /is-divider-revealed/);
  assert.match(pamJs, /bottomText\.animate/);
  assert.match(pamJs, /bottomBtn\.animate/);

  // CSS contains animated underline divider and sibling hover dimming
  assert.match(premiumMotionCss, /#philosophy \.manifesto-principles p::after/);
  assert.match(premiumMotionCss, /#philosophy \.manifesto-principles p\.is-divider-revealed::after/);
  assert.match(premiumMotionCss, /#philosophy \.manifesto-principles:hover p/);
  assert.match(premiumMotionCss, /#philosophy \.manifesto-principles p:hover/);
  assert.match(premiumMotionCss, /#philosophy \.manifesto-bottom \.button:hover/);
});

test('Hero (#home) and Header (.header) remain strictly protected and unimpacted', () => {
  assert.doesNotMatch(pamJs, /querySelector\(['"][^'"]*#home/);
  assert.doesNotMatch(pamJs, /querySelector\(['"][^'"]*\.hero/);
  assert.doesNotMatch(pamJs, /querySelector\(['"][^'"]*\.header/);
  assert.doesNotMatch(pamJs, /querySelector\(['"][^'"]*\.logo-loader/);

  assert.match(html, /<span class="hero-line">Big ideas\.<\/span>/);
  assert.match(html, /<span class="hero-line">Beautifully built\.<\/span>/);
  assert.match(html, /<span class="hero-line">Real <em>impact\.<\/em><\/span>/);
});

test('motion.js coordinates with process-about-manifesto-cinematic without competing transforms', () => {
  assert.match(motionJs, /element\.closest\('#process'\)\s*\|\|\s*element\.closest\('#about'\)\s*\|\|\s*element\.closest\('#philosophy'\)/);
});

test('Reduced motion and data-motion="off" overrides are comprehensive', () => {
  // CSS checks for prefers-reduced-motion
  assert.match(premiumMotionCss, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?#process \.process-step/);
  assert.match(premiumMotionCss, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?#about \.studio-art/);
  assert.match(premiumMotionCss, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?#philosophy \.manifesto-principles p/);

  // CSS checks for :root[data-motion="off"]
  assert.match(premiumMotionCss, /:root\[data-motion="off"\] #process \.process-step/);
  assert.match(premiumMotionCss, /:root\[data-motion="off"\] #about \.studio-art/);
  assert.match(premiumMotionCss, /:root\[data-motion="off"\] #philosophy \.manifesto-principles p/);

  // JS checks for onMotionStateChange handling
  assert.match(pamJs, /onMotionStateChange\(allowed =>/);
});

test('revealHeadingMask supports multi-line masked reveals and rail reacts to deselect/hover leave', () => {
  const premiumMotionJs = readFileSync(new URL('../src/premium-motion.js', import.meta.url), 'utf8');
  assert.match(premiumMotionJs, /lineStagger\s*\?\?\s*110/);
  assert.match(premiumMotionJs, /node\.tagName\.toLowerCase\(\)\s*===\s*'br'/);

  assert.match(pamJs, /updateRailFill/);
  assert.match(pamJs, /stepsContainer\.addEventListener\('pointerleave'/);
  assert.match(pamJs, /data-active-step/);
});

