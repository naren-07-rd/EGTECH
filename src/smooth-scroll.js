/**
 * EG TECH — Gentle Desktop Smooth Scrolling (Lenis)
 *
 * Implements subtle, responsive smooth scrolling for desktop while preserving
 * 100% native touch scrolling on mobile and hybrid touchscreens.
 *
 * Guarantees:
 * 1. Single Lenis instance with single internal auto-RAF driving mechanism.
 * 2. Short, subtle easing after wheel input (lerp: 0.12); immediate responsiveness with zero lag.
 * 3. syncTouch: false (100% native touch scrolling, zero simulated inertia).
 * 4. Full reduced-motion & site data-motion="off" compliance: destroys instance cleanly.
 * 5. Unified anchor navigation with sticky-header offset + small gap.
 * 6. Isolated modal scrolling with data-lenis-prevent and automatic pause on dialog open.
 * 7. Recalculates dimensions on accordion toggles, image loads, and window resizes.
 * 8. Clean hot-module-reload disposal.
 */

import Lenis from 'lenis';

let lenisInstance = null;
const scrollSubscribers = new Set();

/**
 * Registers a subscriber callback to receive scroll events directly from the
 * active Lenis instance's auto-RAF tick.
 * Returns an unregister function.
 */
export function onLenisScroll(callback) {
  if (typeof callback !== 'function') return () => {};
  scrollSubscribers.add(callback);
  return () => {
    scrollSubscribers.delete(callback);
  };
}

/**
 * Checks whether smooth scrolling is permitted based on:
 * - prefers-reduced-motion media query
 * - global data-motion site toggle
 * - document visibility state
 */
export function isSmoothingAllowed() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  const root = document.documentElement;
  if (root && root.dataset && root.dataset.motion === 'off') {
    return false;
  }
  if (typeof document !== 'undefined' && document.hidden) {
    return false;
  }
  return true;
}

/**
 * Returns the currently active Lenis instance, or null if disabled.
 */
export function getLenis() {
  return lenisInstance;
}

/**
 * Computes sticky header offset including a small gap.
 * Header height is measured dynamically from the DOM.
 */
export function getHeaderOffset() {
  if (typeof document === 'undefined') return 84;
  const header = document.querySelector('.header');
  const headerHeight = header ? header.offsetHeight : 84;
  const gap = 16;
  return headerHeight + gap;
}

/**
 * Unified anchor & programmatic scroll router.
 *
 * @param {Element|string|number} target - Destination element, selector, or Y coordinate
 * @param {Object} [options] - Configuration options
 * @param {number} [options.offset] - Custom scroll offset
 * @param {number} [options.duration=0.8] - Scroll duration in seconds
 * @param {boolean} [options.immediate=false] - Skip animation
 * @param {boolean} [options.lock=false] - Prevent user input during scroll
 * @param {boolean} [options.updateHash=true] - Update browser address bar hash
 * @param {boolean} [options.focusTarget=true] - Set accessible focus after scroll
 * @param {string} [options.hash] - Explicit hash string to push to history
 * @param {Function} [options.onComplete] - Callback when scroll finishes
 */
export function scrollToTarget(target, options = {}) {
  if (typeof window === 'undefined' || (target === null || target === undefined)) return;

  const headerOffset = getHeaderOffset();
  let targetY = 0;
  let targetElement = null;
  let effectiveHash = options.hash || '';

  if (typeof target === 'number') {
    targetY = Math.max(0, target);
  } else if (typeof target === 'string') {
    effectiveHash = effectiveHash || (target.startsWith('#') ? target : `#${target}`);
    if (target === '#home' || target === 'top' || target === '#' || target === '#main') {
      if (target === '#main') {
        targetElement = document.querySelector('#main');
        targetY = targetElement ? Math.max(0, targetElement.getBoundingClientRect().top + window.scrollY - headerOffset) : 0;
      } else {
        targetY = 0;
        targetElement = document.querySelector('#home');
      }
    } else {
      try {
        targetElement = document.querySelector(target);
      } catch {
        targetElement = null;
      }
      if (!targetElement) return;
      targetY = Math.max(0, targetElement.getBoundingClientRect().top + window.scrollY - headerOffset);
    }
  } else if ((typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) || (target && typeof target === 'object' && typeof target.getBoundingClientRect === 'function')) {
    targetElement = target;
    if (target.id === 'home') {
      targetY = 0;
      effectiveHash = effectiveHash || '#home';
    } else {
      targetY = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset);
      if (target.id) {
        effectiveHash = effectiveHash || `#${target.id}`;
      }
    }
  }

  const duration = options.duration ?? 0.8;
  const immediate = options.immediate ?? (!isSmoothingAllowed());
  const lock = options.lock ?? false;

  const finishScroll = () => {
    if (typeof options.onComplete === 'function') {
      options.onComplete();
    }
    if (options.focusTarget !== false && targetElement && typeof targetElement.focus === 'function') {
      if (!targetElement.hasAttribute('tabindex')) {
        targetElement.setAttribute('tabindex', '-1');
      }
      targetElement.focus({ preventScroll: true });
    }
  };

  if (lenisInstance && isSmoothingAllowed() && !immediate) {
    if (targetY === 0) {
      lenisInstance.scrollTo(0, {
        duration,
        lock,
        onComplete: finishScroll
      });
    } else if (targetElement) {
      lenisInstance.scrollTo(targetElement, {
        offset: options.offset !== undefined ? options.offset : -headerOffset,
        duration,
        lock,
        onComplete: finishScroll
      });
    } else {
      lenisInstance.scrollTo(targetY, {
        duration,
        lock,
        onComplete: finishScroll
      });
    }
  } else {
    // Native scroll fallback
    const behavior = isSmoothingAllowed() && !immediate ? 'smooth' : 'auto';
    window.scrollTo({
      top: targetY,
      behavior
    });

    if (behavior === 'auto') {
      finishScroll();
    } else {
      setTimeout(finishScroll, 320);
    }
  }

  // Update URL hash without causing native instant jump
  if (options.updateHash !== false && effectiveHash) {
    try {
      history.pushState(null, '', effectiveHash);
    } catch {
      window.location.hash = effectiveHash;
    }
  }
}

/**
 * Initializes gentle desktop Lenis smoothing and anchor integration.
 * Returns a disposal cleanup function for HMR and teardown.
 */
export function initSmoothScroll() {
  if (typeof window === 'undefined') return () => {};

  const cleanups = [];

  function createInstance() {
    if (lenisInstance) return lenisInstance;
    if (!isSmoothingAllowed()) return null;

    try {
      lenisInstance = new Lenis({
        lerp: 0.12, // Short, subtle easing after mouse-wheel input; immediately responsive
        wheelMultiplier: 1.0, // Natural scroll distance
        touchMultiplier: 1.0,
        syncTouch: false, // 100% native touch scrolling, NO simulated touch inertia!
        autoResize: true,
        autoRaf: true, // Single animation-driving mechanism via Lenis auto-RAF
        anchors: false, // Unified anchor handling routed through scrollToTarget
        prevent: (node) => {
          // Native scrolling in dialogs, menus, textareas, selects
          return (
            node.closest('dialog') !== null ||
            node.closest('[data-lenis-prevent]') !== null ||
            node.closest('textarea') !== null ||
            node.closest('select') !== null ||
            node.closest('#mobile-nav') !== null
          );
        }
      });

      lenisInstance.on('scroll', (event) => {
        scrollSubscribers.forEach(cb => {
          try {
            cb(event);
          } catch (err) {
            console.error('[SmoothScroll] subscriber error:', err);
          }
        });
      });
    } catch (err) {
      console.warn('[SmoothScroll] Failed to instantiate Lenis:', err);
      lenisInstance = null;
    }

    return lenisInstance;
  }

  function destroyInstance() {
    if (lenisInstance) {
      try {
        lenisInstance.destroy();
      } catch {}
      lenisInstance = null;
      document.documentElement.classList.remove('lenis', 'lenis-smooth', 'lenis-scrolling', 'lenis-stopped');
    }
  }

  function syncState() {
    if (isSmoothingAllowed()) {
      if (!lenisInstance) {
        createInstance();
      }
    } else {
      if (lenisInstance) {
        destroyInstance();
      }
    }
  }

  // Initialize if allowed
  createInstance();

  // 1. Accessibility: Listen for prefers-reduced-motion changes
  if (window.matchMedia) {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onReducedMotionChange = () => syncState();
    reducedMotionQuery.addEventListener('change', onReducedMotionChange);
    cleanups.push(() => reducedMotionQuery.removeEventListener('change', onReducedMotionChange));
  }

  // 2. Global motion toggle: Listen for root data-motion attribute changes
  const root = document.documentElement;
  if (typeof MutationObserver !== 'undefined' && root) {
    const motionObserver = new MutationObserver(records => {
      for (const record of records) {
        if (record.attributeName === 'data-motion') {
          syncState();
          break;
        }
      }
    });
    motionObserver.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
    cleanups.push(() => motionObserver.disconnect());
  }

  // 3. Tab visibility: Pause/resume Lenis
  const onVisibilityChange = () => {
    if (document.hidden) {
      lenisInstance?.stop();
    } else {
      if (isSmoothingAllowed()) {
        if (!lenisInstance) createInstance();
        lenisInstance?.start();
      }
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  cleanups.push(() => document.removeEventListener('visibilitychange', onVisibilityChange));

  // 4. Dialog isolation: Pause Lenis when modal opens, resume on close
  const dialogEl = document.querySelector('#project-dialog');
  if (dialogEl && typeof MutationObserver !== 'undefined') {
    const dialogObserver = new MutationObserver(() => {
      if (dialogEl.open) {
        lenisInstance?.stop();
      } else {
        lenisInstance?.start();
        lenisInstance?.resize();
      }
    });
    dialogObserver.observe(dialogEl, { attributes: true, attributeFilter: ['open'] });
    cleanups.push(() => dialogObserver.disconnect());
  }

  // 5. Unified Anchor Navigation Click Handler
  const onAnchorClick = (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;

    const rawHref = link.getAttribute('href');
    if (!rawHref) return;

    const isHashOnly = rawHref.startsWith('#');
    const isHomepageSlashHash =
      rawHref.startsWith('/#') &&
      (window.location.pathname === '/' ||
       window.location.pathname.endsWith('index.html') ||
       window.location.pathname === '');

    if (!isHashOnly && !isHomepageSlashHash) {
      return;
    }

    // Service deep links are handled with service accordion logic in service-accordion-nav.js
    if (rawHref.includes('#service-')) {
      return;
    }

    const hash = isHashOnly ? rawHref : rawHref.substring(1);
    if (!hash || hash === '#') return;

    const targetId = hash.substring(1);
    const target = targetId === 'home' ? '#home' : document.getElementById(targetId);

    if (target || targetId === 'home') {
      event.preventDefault();
      scrollToTarget(targetId === 'home' ? '#home' : target, {
        hash,
        focusTarget: true
      });
    }
  };

  document.addEventListener('click', onAnchorClick);
  cleanups.push(() => document.removeEventListener('click', onAnchorClick));

  // 6. Direct hash navigation & browser back/forward support
  const onHashChange = () => {
    const hash = window.location.hash;
    if (hash && !hash.startsWith('#service-')) {
      const target = hash === '#home' ? '#home' : document.querySelector(hash);
      if (target) {
        scrollToTarget(target, { immediate: false, updateHash: false, focusTarget: false });
      }
    }
  };
  window.addEventListener('hashchange', onHashChange);
  cleanups.push(() => window.removeEventListener('hashchange', onHashChange));

  // Handle direct hash on initial page load
  if (window.location.hash && !window.location.hash.startsWith('#service-')) {
    setTimeout(() => {
      const initialTarget = window.location.hash === '#home' ? '#home' : document.querySelector(window.location.hash);
      if (initialTarget) {
        scrollToTarget(initialTarget, { immediate: false, updateHash: false, focusTarget: false });
      }
    }, 150);
  }

  // 7. Dimension recalculation on accordion expansion and dynamic content
  const serviceDetails = document.querySelectorAll('#services details.service');
  serviceDetails.forEach(details => {
    const onToggle = () => {
      requestAnimationFrame(() => {
        lenisInstance?.resize();
      });
    };
    details.addEventListener('toggle', onToggle);
    cleanups.push(() => details.removeEventListener('toggle', onToggle));
  });

  // Images load dimension recalculation
  document.querySelectorAll('img').forEach(img => {
    if (!img.complete) {
      const onLoad = () => lenisInstance?.resize();
      img.addEventListener('load', onLoad, { once: true });
      cleanups.push(() => img.removeEventListener('load', onLoad));
    }
  });

  // Fonts ready dimension recalculation
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      lenisInstance?.resize();
    });
  }

  return function disposeSmoothScroll() {
    destroyInstance();
    cleanups.forEach(cleanup => {
      try {
        cleanup();
      } catch {}
    });
  };
}
