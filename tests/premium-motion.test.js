import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  MOTION_EASING,
  MOTION_DURATIONS,
  STAGGER_DELAY,
  isProtectedHeroOrHeader,
  isMotionAllowed,
  revealHeadingMask,
  revealImageClip,
  revealStaggeredCards,
  createInteractiveTilt,
  createMagneticHover,
  createUnifiedScrollManager,
  createRevealObserver,
  initPremiumMotion
} from '../src/premium-motion.js';

test('Premium motion design tokens match agency specifications', () => {
  // Organic, premium easing curve
  assert.equal(MOTION_EASING, 'cubic-bezier(0.16, 1, 0.3, 1)');

  // Refined durations (predominantly 0.6s–1.1s)
  assert.equal(MOTION_DURATIONS.fast, 400);
  assert.equal(MOTION_DURATIONS.normal, 800);
  assert.equal(MOTION_DURATIONS.slow, 1100);
  assert.ok(MOTION_DURATIONS.normal >= 600 && MOTION_DURATIONS.normal <= 1100);
  assert.ok(MOTION_DURATIONS.slow >= 600 && MOTION_DURATIONS.slow <= 1100);

  // Tight stagger delays (0.08s–0.15s standard)
  assert.equal(STAGGER_DELAY, 100);
  assert.ok(STAGGER_DELAY >= 80 && STAGGER_DELAY <= 150);
});

test('Hero section (#home) and Header (.header) are strictly protected from modification', () => {
  // Mock element hierarchy
  function makeMockElement(id, className, parent = null) {
    const el = {
      id,
      className,
      parentElement: parent,
      closest(selector) {
        if (selector === '#home' && (this.id === 'home' || this.parentElement?.closest('#home'))) return true;
        if (selector === '.hero' && (this.className.includes('hero') || this.parentElement?.closest('.hero'))) return true;
        if (selector === '.header' && (this.className.includes('header') || this.parentElement?.closest('.header'))) return true;
        if (selector === '.logo-loader' && (this.className.includes('logo-loader') || this.parentElement?.closest('.logo-loader'))) return true;
        if (selector === '#mobile-nav' && (this.id === 'mobile-nav' || this.parentElement?.closest('#mobile-nav'))) return true;
        return this.parentElement ? this.parentElement.closest(selector) : null;
      },
      style: {
        removeProperty: () => {},
        setProperty: () => {}
      },
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false
      },
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    return el;
  }

  const heroSection = makeMockElement('home', 'hero section-pad');
  const heroHeading = makeMockElement('', 'hero-enter', heroSection);
  const heroGraphic = makeMockElement('', 'system-display', heroSection);
  const header = makeMockElement('', 'header');
  const headerNav = makeMockElement('', 'eg-navbar', header);
  const loader = makeMockElement('', 'logo-loader');

  const postHeroSection = makeMockElement('services', 'capabilities section-pad');
  const postHeroHeading = makeMockElement('', 'section-heading', postHeroSection);
  const postHeroCard = makeMockElement('', 'eg-package-card', postHeroSection);

  // Assert protection predicate
  assert.equal(isProtectedHeroOrHeader(heroSection), true, 'Hero section root must be protected');
  assert.equal(isProtectedHeroOrHeader(heroHeading), true, 'Hero heading must be protected');
  assert.equal(isProtectedHeroOrHeader(heroGraphic), true, 'Hero system graphic must be protected');
  assert.equal(isProtectedHeroOrHeader(header), true, 'Header must be protected');
  assert.equal(isProtectedHeroOrHeader(headerNav), true, 'Navbar inside header must be protected');
  assert.equal(isProtectedHeroOrHeader(loader), true, 'Logo loader must be protected');

  // Post-hero elements must NOT be blocked
  assert.equal(isProtectedHeroOrHeader(postHeroSection), false, 'Services section must be eligible for motion');
  assert.equal(isProtectedHeroOrHeader(postHeroHeading), false, 'Services heading must be eligible for motion');
  assert.equal(isProtectedHeroOrHeader(postHeroCard), false, 'Card must be eligible for motion');

  // Primitives must immediately reject protected elements without modifying them
  assert.equal(revealHeadingMask(heroHeading), null, 'revealHeadingMask must reject hero heading');
  assert.equal(revealImageClip(heroGraphic), null, 'revealImageClip must reject hero graphic');
  assert.deepEqual(revealStaggeredCards([heroHeading, heroGraphic]), [], 'revealStaggeredCards must reject hero children');
  assert.equal(typeof createInteractiveTilt(heroGraphic), 'function', 'createInteractiveTilt returns safe no-op cleanup');
  assert.equal(typeof createMagneticHover(heroHeading), 'function', 'createMagneticHover returns safe no-op cleanup');
});

test('Reduced motion and data-motion="off" safety checks function correctly', () => {
  // Test module exports isMotionAllowed
  assert.equal(typeof isMotionAllowed, 'function');

  // Read CSS rules to verify reduced motion and data-motion="off" overrides
  const css = readFileSync('src/premium-motion.css', 'utf-8');
  assert.match(css, /--motion-ease-premium:\s*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\);/);
  assert.match(css, /--motion-duration-normal:\s*800ms;/);
  assert.match(css, /--motion-duration-slow:\s*1100ms;/);
  assert.match(css, /--motion-stagger-gap:\s*100ms;/);

  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /:root\[data-motion="off"\]/);
  assert.match(css, /transform:\s*none\s*!important/);
  assert.match(css, /opacity:\s*1\s*!important/);
  assert.match(css, /clip-path:\s*none\s*!important/);
});

test('Unified scroll manager and reveal observer operate with clean lifecycle', () => {
  const scrollManager = createUnifiedScrollManager();
  assert.equal(typeof scrollManager.register, 'function');
  assert.equal(typeof scrollManager.destroy, 'function');

  let callCount = 0;
  const unregister = scrollManager.register(state => {
    callCount++;
    assert.ok(typeof state.scrollY === 'number');
    assert.ok(typeof state.innerHeight === 'number');
  });

  assert.ok(callCount >= 1, 'Initial registration invokes callback synchronously');
  unregister();
  scrollManager.destroy();

  const revealObserver = createRevealObserver(() => {});
  assert.equal(typeof revealObserver.observe, 'function');
  assert.equal(typeof revealObserver.unobserve, 'function');
  assert.equal(typeof revealObserver.disconnect, 'function');
  revealObserver.disconnect();
});

test('main.js integrates premium-motion foundation cleanly with hot-reload disposal', () => {
  const mainJs = readFileSync('src/main.js', 'utf-8');
  assert.match(mainJs, /import '\.\/premium-motion\.css';/);
  assert.match(mainJs, /import \{[^}]*initPremiumMotion[^}]*\} from '\.\/premium-motion\.js';/);
  assert.match(mainJs, /const disposePremiumMotion = initPremiumMotion\(\);/);
  assert.match(mainJs, /disposePremiumMotion\(\);/);
});
