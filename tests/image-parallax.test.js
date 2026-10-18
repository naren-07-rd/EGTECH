import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initImageParallax } from '../src/image-parallax.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const parallaxJs = readFileSync(new URL('../src/image-parallax.js', import.meta.url), 'utf8');
const parallaxCss = readFileSync(new URL('../src/image-parallax.css', import.meta.url), 'utf8');
const smoothScrollJs = readFileSync(new URL('../src/smooth-scroll.js', import.meta.url), 'utf8');

test('image-parallax module exports initImageParallax and integrates cleanly into main.js', () => {
  assert.equal(typeof initImageParallax, 'function');
  assert.match(mainJs, /import '\.\/image-parallax\.css';/);
  assert.match(mainJs, /import \{[^}]*initImageParallax[^}]*\} from '\.\/image-parallax\.js';/);
  assert.match(mainJs, /const disposeImageParallax = initImageParallax\(\);/);
  assert.match(mainJs, /disposeImageParallax\(\);/);
});

test('eligible content images are explicitly marked with scoped data-parallax attributes', () => {
  // Treatment 1: The 4 Service card images have data-parallax="crop"
  assert.match(html, /<img[^>]+src="\/web\.jpg"[^>]+data-parallax="crop"/);
  assert.match(html, /<img[^>]+src="\/Brand-Design-copy\.webp"[^>]+data-parallax="crop"/);
  assert.match(html, /<img[^>]+src="\/auto\.webp"[^>]+data-parallax="crop"/);
  assert.match(html, /<img[^>]+src="\/growth\.webp"[^>]+data-parallax="crop"/);

  // Treatment 2: Portfolio preview and Manifesto mockup have data-parallax="drift"
  assert.match(html, /<div class="preview-browser" data-parallax="drift">/);
  assert.match(html, /<img[^>]+src="\/studio-mockup\.jpg"[^>]+class="manifesto-image"[^>]+data-parallax="drift"/);
});

test('excluded images and UI graphics strictly do NOT receive parallax markup', () => {
  // Header and footer brand logos
  assert.match(html, /<a class="brand"[^>]*><img src="\/eg-tech-logo\.jpeg"[^>]*>/);
  assert.doesNotMatch(html, /<img src="\/eg-tech-logo\.jpeg"[^>]*data-parallax/);

  // FAQ carousel preview card images
  const faqSection = html.slice(html.indexOf('id="faq"'), html.indexOf('id="brief"'));
  assert.doesNotMatch(faqSection, /<img[^>]+data-parallax/);

  // Hero section strictly protected
  const heroSection = html.slice(html.indexOf('id="home"'), html.indexOf('id="services"'));
  assert.doesNotMatch(heroSection, /data-parallax/);
});

test('CSS enforces Treatment 1 (overscan inside stationary frame) for service images', () => {
  // Stationary frame with overflow: hidden
  assert.match(parallaxCss, /#services \.service-media\s*\{[^}]*overflow:\s*hidden/);

  // Image overscan and independent translate property
  assert.match(parallaxCss, /#services \.service-media img\[data-parallax="crop"\]\s*\{[^}]*scale:\s*1\.11;/);
  assert.match(parallaxCss, /#services \.service-media img\[data-parallax="crop"\]\s*\{[^}]*translate:\s*0 var\(--parallax-y,\s*0px\);/);

  // Brand design illustration containment
  assert.match(parallaxCss, /#services \.service-media--brand img\[data-parallax="crop"\]\s*\{[^}]*scale:\s*1\.04;/);
  assert.match(parallaxCss, /#services \.service-media--brand img\[data-parallax="crop"\]\s*\{[^}]*translate:\s*0 var\(--parallax-y,\s*0px\);/);
});

test('CSS enforces Treatment 2 (whole-image drift without clipping) for mockups', () => {
  assert.match(parallaxCss, /#philosophy \.manifesto-image\[data-parallax="drift"\]\s*\{[^}]*translate:\s*0 var\(--parallax-y,\s*0px\);/);
});

test('CSS and JS enforce reduced-motion and data-motion="off" overrides to restore resting position', () => {
  // prefers-reduced-motion in CSS
  assert.match(parallaxCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?translate:\s*0 0 !important;/);
  assert.match(parallaxCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?scale:\s*1 !important;/);

  // data-motion="off" in CSS
  assert.match(parallaxCss, /:root\[data-motion="off"\][\s\S]*?translate:\s*0 0 !important;/);
  assert.match(parallaxCss, /:root\[data-motion="off"\][\s\S]*?scale:\s*1 !important;/);

  // JS listens to motion state change
  assert.match(parallaxJs, /onMotionStateChange\(allowed =>/);
  assert.match(parallaxJs, /el\.style\.removeProperty\('--parallax-y'\)/);
});

test('Mobile touch devices keep images static and preserve native scrolling', () => {
  assert.match(parallaxCss, /@media \(max-width:\s*767px\), \(hover:\s*none\) and \(pointer:\s*coarse\)[\s\S]*?scale:\s*1 !important;/);
  assert.match(parallaxCss, /@media \(max-width:\s*767px\), \(hover:\s*none\) and \(pointer:\s*coarse\)[\s\S]*?translate:\s*0 0 !important;/);
  assert.match(parallaxJs, /window\.innerWidth < 768/);
});

test('JS coordinates with Lenis auto-RAF without duplicate RAF loops or layout thrashing', () => {
  // Subscribes to Lenis scroll event
  assert.match(smoothScrollJs, /export function onLenisScroll/);
  assert.match(parallaxJs, /onLenisScroll\(/);

  // Uses IntersectionObserver to restrict calculations strictly to visible elements
  assert.match(parallaxJs, /new IntersectionObserver/);
  assert.match(parallaxJs, /intersectingElements\.add/);
  assert.match(parallaxJs, /intersectingElements\.delete/);

  // Recalculates dynamically on accordion toggles, image load, and resize
  assert.match(parallaxJs, /details\.addEventListener\('toggle'/);
  assert.match(parallaxJs, /window\.addEventListener\('resize'/);
  assert.match(parallaxJs, /img\.addEventListener\('load'/);
});
