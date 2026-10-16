import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf-8');
const mainJs = readFileSync('src/main.js', 'utf-8');
const motionJs = readFileSync('src/motion.js', 'utf-8');
const portfolioJs = readFileSync('src/portfolio-cinematic.js', 'utf-8');
const premiumMotionCss = readFileSync('src/premium-motion.css', 'utf-8');

test('Portfolio section preserves all projects, links, images, labels, and modal', () => {
  // Preserves section ID and heading
  assert.match(html, /<section id="work" class="studio-work section-pad">/);
  assert.match(html, /03 \/ SELECTED WORK &amp; CASE STUDIES/);
  assert.match(html, /Selected work &amp;<br \/><em>case studies\.<\/em>/);

  // Project 1: Tiruttani Quick
  assert.match(html, /Tiruttani Quick/);
  assert.match(html, /https:\/\/gopi-2006\.github\.io\/tiruttani-quick-privacy-policy\//);
  assert.match(html, /\/tiruttani-quick-preview\.png/);
  assert.match(html, /LIVE STOREFRONT \/ COMMERCE/);
  assert.match(html, /LOCAL COMMERCE\. CONNECTED\./);

  // Project 2: BidVerify AI
  assert.match(html, /BidVerify <em>AI\.<\/em>/);
  assert.match(html, /AI SOFTWARE \/ IN DEVELOPMENT/);
  assert.match(html, /ENGINEERING FOR BETTER DECISIONS\./);

  // Modal dialog and trigger buttons preserved
  assert.match(html, /<dialog id="project-dialog"/);
  assert.match(html, /data-project="0"/);
  assert.match(html, /data-project="1"/);
});

test('Portfolio cinematic module implements heading mask and coordinated case-study reveals', () => {
  // Heading mask and stagger
  assert.match(portfolioJs, /revealHeadingMask\(h2,/);
  assert.match(portfolioJs, /eyebrow\.animate/);
  assert.match(portfolioJs, /desc\.animate/);

  // Case study card entrance
  assert.match(portfolioJs, /study\.animate\(\s*\[\s*\{\s*opacity:\s*0,\s*transform:\s*'translateY\(32px\)'\s*\}/);

  // Case cover mask unveil and scale
  assert.match(portfolioJs, /clipPath:\s*'inset\(10% 0 0 0 round 22px\)'/);
  assert.match(portfolioJs, /transform:\s*'scale\(1\.04\)'/);

  // Metadata arrival
  assert.match(portfolioJs, /meta\.animate/);

  // Stagger intervals
  assert.match(portfolioJs, /const delay = index \* 140/);
});

test('Scroll-responsive depth and fine-pointer tilt are configured cleanly without collisions', () => {
  // Scroll depth tracking with unified scroll manager
  assert.match(portfolioJs, /createUnifiedScrollManager\(\)/);
  assert.match(portfolioJs, /study\.style\.setProperty\('--case-depth-shift'/);
  assert.match(portfolioJs, /innerWidth < 768/);

  // Tilt micro-interaction uses foundation custom properties
  assert.match(portfolioJs, /createInteractiveTilt\(cover,/);

  // motion.js delegates case-study to avoid competing transforms
  assert.match(motionJs, /\/\/ Coordinated by portfolio-cinematic\.js module/);
});

test('Portfolio CSS enforces refined hover states, scroll depth, action button rotation, and dialog transitions', () => {
  // Case cover hover border and shadow
  assert.match(premiumMotionCss, /\.case-study:hover \.case-cover\s*\{[^}]*border-color:\s*color-mix/);
  assert.match(premiumMotionCss, /\.case-study:hover \.case-cover\s*\{[^}]*box-shadow:/);

  // Live preview image hover zoom on fine pointer
  assert.match(premiumMotionCss, /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)[\s\S]*?\.case-study:hover \.cover-live \.preview-browser img\s*\{[^}]*transform:\s*scale\(1\.035\)/);

  // Scroll depth transform on desktop
  assert.match(premiumMotionCss, /@media\s*\(min-width:\s*768px\)[\s\S]*?\.cover-live \.preview-browser\s*\{[^}]*transform:\s*translateY\(var\(--case-depth-shift,\s*0px\)\)/);
  assert.match(premiumMotionCss, /@media\s*\(min-width:\s*768px\)[\s\S]*?\.cover-ai \.document-stack\s*\{[^}]*transform:\s*translateY\(calc\(var\(--case-depth-shift,\s*0px\)\s*\*\s*0\.75\)\)/);

  // Action button hover rotation
  assert.match(premiumMotionCss, /\.case-study:hover \.case-open\s*\{[^}]*transform:\s*rotate\(45deg\)\s*scale\(1\.08\)/);

  // Dialog opening transition
  assert.match(premiumMotionCss, /#project-dialog\s*\{[^}]*transition:[^}]*opacity/);
});

test('Reduced motion and data-motion="off" safely disable portfolio transforms and transitions', () => {
  assert.match(premiumMotionCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.case-cover[^{]*\{[^}]*transform:\s*none !important/);
  assert.match(premiumMotionCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.case-open[^{]*\{[^}]*transform:\s*none !important/);
  assert.match(premiumMotionCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?#project-dialog[^{]*\{[^}]*transform:\s*none !important/);

  assert.match(premiumMotionCss, /:root\[data-motion="off"\][^{]*\.case-cover[^{]*\{[^}]*transform:\s*none !important/);
  assert.match(premiumMotionCss, /:root\[data-motion="off"\][^{]*\.case-open[^{]*\{[^}]*transform:\s*none !important/);
  assert.match(premiumMotionCss, /:root\[data-motion="off"\][^{]*#project-dialog[^{]*\{[^}]*transform:\s*none !important/);
});

test('main.js integrates portfolio cinematic module with HMR disposal', () => {
  assert.match(mainJs, /import \{ initPortfolioCinematic \} from '\.\/portfolio-cinematic\.js';/);
  assert.match(mainJs, /const disposePortfolioCinematic = initPortfolioCinematic\(\);/);
  assert.match(mainJs, /disposePortfolioCinematic\(\);/);
});

test('Hero section (#home) remains strictly untouched during portfolio upgrade', () => {
  assert.match(html, /<section id="home" class="hero section-pad">/);
  assert.match(html, /<h1 class="hero-enter"><span class="hero-line">Big ideas\.<\/span>/);
  assert.match(html, /<div class="system-showcase"/);
  assert.match(html, /<div class="system-display">/);
  assert.match(html, /<nav class="eg-navbar desktop-nav"/);
});
