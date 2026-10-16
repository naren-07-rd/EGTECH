/**
 * EG TECH — Premium Motion Design Foundation
 *
 * Core animation engine, motion tokens, and reusable primitives for post-hero sections.
 * Built with native Web Animations API (WAAPI), CSS transforms, and IntersectionObserver.
 * Zero external animation dependencies. 60fps GPU target. Full reduced-motion compliance.
 *
 * ABSOLUTE RULE: Protects #home hero, .header, and .logo-loader from any modification.
 */

// Refined motion tokens
export const MOTION_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

export const MOTION_DURATIONS = Object.freeze({
  fast: 400,     // 0.4s: micro-interactions, toggles, badges
  normal: 800,   // 0.8s: standard section and card reveals (0.6s–1.1s range)
  slow: 1100,    // 1.1s: dramatic image and headline reveals
});

export const STAGGER_DELAY = 100; // 0.1s: tight coordinated card stagger (0.08s–0.15s standard)

// Track active animations for lifecycle cancellation on disable/pause
const activeWAAPIAnimations = new Set();

/**
 * Checks whether motion is currently permitted based on system preference,
 * site toggle, and document visibility.
 */
export function isMotionAllowed() {
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
 * Strict hero & header protection predicate.
 * Guarantees no motion foundation primitive ever transforms or modifies #home,
 * .hero, .header, or .logo-loader elements.
 */
export function isProtectedHeroOrHeader(element) {
  if (!element) return true;
  if (typeof element.closest !== 'function') return false;
  return Boolean(
    element.closest('#home') ||
    element.closest('.hero') ||
    element.closest('.header') ||
    element.closest('.logo-loader') ||
    element.closest('#mobile-nav')
  );
}

/**
 * Subscribes to motion preference changes, data-motion attribute changes, and visibility changes.
 * Returns an unsubscribe cleanup function.
 */
export function onMotionStateChange(callback) {
  if (typeof window === 'undefined') return () => {};

  const cleanups = [];
  const root = document.documentElement;

  const handleChange = () => {
    callback(isMotionAllowed());
  };

  if (window.matchMedia) {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', handleChange);
    cleanups.push(() => reducedMotionQuery.removeEventListener('change', handleChange));
  }

  if (typeof MutationObserver !== 'undefined' && root) {
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.attributeName === 'data-motion') {
          handleChange();
          break;
        }
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
    cleanups.push(() => observer.disconnect());
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleChange);
    cleanups.push(() => document.removeEventListener('visibilitychange', handleChange));
  }

  return () => {
    cleanups.forEach(cleanup => cleanup());
  };
}

/**
 * Cancels and cleans up all active WAAPI animations created by this foundation.
 */
export function cancelActiveAnimations() {
  activeWAAPIAnimations.forEach(anim => {
    try {
      anim.cancel();
    } catch {
      // Ignored if already finished or canceled
    }
  });
  activeWAAPIAnimations.clear();
}

/**
 * Helper to register a WAAPI animation into the tracked pool.
 */
function trackAnimation(animation) {
  if (!animation) return animation;
  activeWAAPIAnimations.add(animation);
  const remove = () => activeWAAPIAnimations.delete(animation);
  animation.finished.then(remove, remove);
  return animation;
}

/**
 * Upward masked heading reveal primitive.
 * Wraps heading lines or inner content in overflow-hidden mask containers
 * and translates up with organic easing without clipping descenders.
 *
 * Strictly rejects any elements inside #home or .header.
 */
export function revealHeadingMask(headingEl, options = {}) {
  if (!headingEl || isProtectedHeroOrHeader(headingEl)) {
    return null;
  }

  if (!isMotionAllowed()) {
    headingEl.style.removeProperty('opacity');
    headingEl.style.removeProperty('transform');
    return null;
  }

  const duration = options.duration ?? MOTION_DURATIONS.normal;
  const baseDelay = options.delay ?? 0;
  const lineStagger = options.lineStagger ?? 110;
  const easing = options.easing ?? MOTION_EASING;

  // Ensure content is wrapped in mask wrappers (per line if <br> tags exist)
  let maskInners = Array.from(headingEl.querySelectorAll('.motion-mask-inner'));
  if (maskInners.length === 0) {
    const rawNodes = Array.from(headingEl.childNodes);
    const hasBr = rawNodes.some(node => node.nodeType === 1 && node.tagName.toLowerCase() === 'br');

    if (hasBr) {
      const lines = [[]];
      rawNodes.forEach(node => {
        if (node.nodeType === 1 && node.tagName.toLowerCase() === 'br') {
          lines.push([]);
        } else {
          lines[lines.length - 1].push(node);
        }
      });

      headingEl.replaceChildren();
      lines.forEach((nodes, lineIdx) => {
        if (lineIdx > 0) {
          headingEl.appendChild(document.createElement('br'));
        }
        const maskWrap = document.createElement('span');
        maskWrap.className = 'motion-mask-wrap';
        const inner = document.createElement('span');
        inner.className = 'motion-mask-inner';
        nodes.forEach(n => inner.appendChild(n));
        maskWrap.appendChild(inner);
        headingEl.appendChild(maskWrap);
        maskInners.push(inner);
      });
    } else {
      const maskWrap = document.createElement('span');
      maskWrap.className = 'motion-mask-wrap';
      const inner = document.createElement('span');
      inner.className = 'motion-mask-inner';

      while (headingEl.firstChild) {
        inner.appendChild(headingEl.firstChild);
      }
      maskWrap.appendChild(inner);
      headingEl.appendChild(maskWrap);
      maskInners.push(inner);
    }
  }

  const animations = [];
  maskInners.forEach((maskInner, idx) => {
    try {
      const anim = maskInner.animate(
        [
          { transform: 'translateY(110%)', opacity: 0 },
          { transform: 'translateY(0%)', opacity: 1 }
        ],
        {
          duration,
          delay: baseDelay + idx * lineStagger,
          easing,
          fill: 'both'
        }
      );
      animations.push(trackAnimation(anim));
    } catch {
      maskInner.style.transform = 'none';
      maskInner.style.opacity = '1';
    }
  });

  return animations.length > 0 ? animations[0] : null;
}

/**
 * Controlled clip-path & subtle scale reveal for images.
 * Reveals image via expanding clip-path while scaling down smoothly to 1.
 *
 * Strictly rejects any elements inside #home or .header.
 */
export function revealImageClip(imageOrContainer, options = {}) {
  if (!imageOrContainer || isProtectedHeroOrHeader(imageOrContainer)) {
    return null;
  }

  const target = imageOrContainer.querySelector('img') || imageOrContainer;

  if (!isMotionAllowed()) {
    target.style.removeProperty('clipPath');
    target.style.removeProperty('transform');
    target.style.removeProperty('opacity');
    return null;
  }

  const duration = options.duration ?? MOTION_DURATIONS.slow;
  const delay = options.delay ?? 0;
  const easing = options.easing ?? MOTION_EASING;
  const clipFrom = options.clipFrom ?? 'inset(100% 0 0 0 round 16px)';
  const clipTo = options.clipTo ?? 'inset(0% 0 0 0 round 16px)';
  const scaleFrom = options.scaleFrom ?? 'scale(1.06)';

  try {
    const anim = target.animate(
      [
        { clipPath: clipFrom, transform: scaleFrom, opacity: 0.6 },
        { clipPath: clipTo, transform: 'scale(1)', opacity: 1 }
      ],
      {
        duration,
        delay,
        easing,
        fill: 'both'
      }
    );
    return trackAnimation(anim);
  } catch {
    target.style.clipPath = 'none';
    target.style.transform = 'none';
    target.style.opacity = '1';
    return null;
  }
}

/**
 * Coordinated staggered card entrance.
 * Translates cards upward with subtle scale and fade, staggered at 100ms.
 *
 * Strictly filters out any cards inside #home or .header.
 */
export function revealStaggeredCards(cardElements, options = {}) {
  if (!Array.isArray(cardElements) && !(cardElements instanceof NodeList)) {
    return [];
  }

  const validCards = Array.from(cardElements).filter(card => !isProtectedHeroOrHeader(card));
  if (validCards.length === 0) return [];

  if (!isMotionAllowed()) {
    validCards.forEach(card => {
      card.style.removeProperty('transform');
      card.style.removeProperty('opacity');
    });
    return [];
  }

  const duration = options.duration ?? MOTION_DURATIONS.normal;
  const baseDelay = options.delay ?? 0;
  const stagger = options.stagger ?? STAGGER_DELAY;
  const easing = options.easing ?? MOTION_EASING;

  const animations = [];
  validCards.forEach((card, index) => {
    try {
      const anim = card.animate(
        [
          { opacity: 0, transform: 'translateY(28px) scale(0.98)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' }
        ],
        {
          duration,
          delay: baseDelay + index * stagger,
          easing,
          fill: 'both'
        }
      );
      animations.push(trackAnimation(anim));
    } catch {
      card.style.transform = 'none';
      card.style.opacity = '1';
    }
  });

  return animations;
}

/**
 * Subtle tactile 3D card tilt micro-interaction.
 * Uses CSS custom properties (--tilt-rx, --tilt-ry) to avoid clobbering base transforms.
 * Throttled with requestAnimationFrame for 60fps execution.
 *
 * Strictly rejects any elements inside #home or .header.
 */
export function createInteractiveTilt(cardEl, options = {}) {
  if (!cardEl || isProtectedHeroOrHeader(cardEl)) {
    return () => {};
  }

  const maxTiltX = options.maxTiltX ?? 6; // max degrees on X axis
  const maxTiltY = options.maxTiltY ?? 6; // max degrees on Y axis
  let rafId = 0;
  let isHovered = false;

  cardEl.classList.add('motion-tilt-card');

  const onPointerMove = event => {
    if (!isMotionAllowed()) return;
    if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    isHovered = true;
    if (rafId) return;

    const { clientX, clientY } = event;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      if (!isHovered || !isMotionAllowed()) return;
      const rect = cardEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const normX = (clientX - rect.left) / rect.width - 0.5;
      const normY = (clientY - rect.top) / rect.height - 0.5;

      const rotX = (-normY * maxTiltX).toFixed(2);
      const rotY = (normX * maxTiltY).toFixed(2);

      cardEl.style.setProperty('--tilt-rx', `${rotX}deg`);
      cardEl.style.setProperty('--tilt-ry', `${rotY}deg`);
    });
  };

  const resetTilt = () => {
    isHovered = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    cardEl.style.removeProperty('--tilt-rx');
    cardEl.style.removeProperty('--tilt-ry');
  };

  cardEl.addEventListener('pointermove', onPointerMove);
  cardEl.addEventListener('pointerleave', resetTilt);
  cardEl.addEventListener('blur', resetTilt);

  return () => {
    resetTilt();
    cardEl.removeEventListener('pointermove', onPointerMove);
    cardEl.removeEventListener('pointerleave', resetTilt);
    cardEl.removeEventListener('blur', resetTilt);
    cardEl.classList.remove('motion-tilt-card');
  };
}

/**
 * Subtle magnetic hover micro-interaction.
 * Uses style.translate rather than style.transform to avoid clobbering matrixes.
 *
 * Strictly rejects any elements inside #home or .header.
 */
export function createMagneticHover(element, options = {}) {
  if (!element || isProtectedHeroOrHeader(element)) {
    return () => {};
  }

  const strengthX = options.strengthX ?? 0.12;
  const strengthY = options.strengthY ?? 0.18;
  let rafId = 0;
  let isHovered = false;

  const onPointerMove = event => {
    if (!isMotionAllowed()) return;
    if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    isHovered = true;
    if (rafId) return;

    const { clientX, clientY } = event;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      if (!isHovered || !isMotionAllowed()) return;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const offsetX = (clientX - rect.left - rect.width / 2) * strengthX;
      const offsetY = (clientY - rect.top - rect.height / 2) * strengthY;

      element.style.translate = `${offsetX.toFixed(2)}px ${offsetY.toFixed(2)}px`;
    });
  };

  const resetTranslate = () => {
    isHovered = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    element.style.removeProperty('translate');
  };

  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerleave', resetTranslate);
  element.addEventListener('blur', resetTranslate);

  return () => {
    resetTranslate();
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerleave', resetTranslate);
    element.removeEventListener('blur', resetTranslate);
  };
}

/**
 * Centralized Unified Scroll Manager.
 * Batches window scroll & resize events into a single requestAnimationFrame tick.
 * Prevents layout thrashing and redundant getBoundingClientRect measurements.
 */
export function createUnifiedScrollManager(customWindow = null) {
  const win = typeof window !== 'undefined' ? window : customWindow;
  if (!win) {
    return {
      register(callback) {
        if (typeof callback === 'function') {
          try {
            callback({
              scrollY: 0,
              innerHeight: 800,
              innerWidth: 1200,
              isScrollingDown: true
            });
          } catch {
            // Handled
          }
        }
        return () => {};
      },
      destroy: () => {}
    };
  }

  const subscribers = new Set();
  let rafId = 0;
  let lastScrollY = window.scrollY || 0;

  const tick = () => {
    rafId = 0;
    const currentScrollY = window.scrollY || 0;
    const innerHeight = window.innerHeight || 800;
    const innerWidth = window.innerWidth || 1200;
    const isScrollingDown = currentScrollY >= lastScrollY;
    lastScrollY = currentScrollY;

    const scrollState = {
      scrollY: currentScrollY,
      innerHeight,
      innerWidth,
      isScrollingDown
    };

    subscribers.forEach(handler => {
      try {
        handler(scrollState);
      } catch (err) {
        console.error('[UnifiedScrollManager] subscriber error:', err);
      }
    });
  };

  const scheduleTick = () => {
    if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
  };

  window.addEventListener('scroll', scheduleTick, { passive: true });
  window.addEventListener('resize', scheduleTick, { passive: true });

  return {
    register(callback) {
      if (typeof callback !== 'function') return () => {};
      subscribers.add(callback);
      // Immediately invoke with initial state
      callback({
        scrollY: window.scrollY || 0,
        innerHeight: window.innerHeight || 800,
        innerWidth: window.innerWidth || 1200,
        isScrollingDown: true
      });
      return () => {
        subscribers.delete(callback);
      };
    },
    destroy() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      window.removeEventListener('scroll', scheduleTick);
      window.removeEventListener('resize', scheduleTick);
      subscribers.clear();
    }
  };
}

/**
 * Shared performant IntersectionObserver factory.
 * Manages scroll-triggered entrances with configurable threshold and automatic unobserve.
 */
export function createRevealObserver(onReveal, options = {}) {
  if (typeof IntersectionObserver === 'undefined') {
    return {
      observe: () => {},
      unobserve: () => {},
      disconnect: () => {}
    };
  }

  const threshold = options.threshold ?? 0.15;
  const rootMargin = options.rootMargin ?? '0px 0px -40px 0px';
  const once = options.once !== false;

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (!isMotionAllowed()) {
        // If motion disabled, still notify so elements are revealed without animation
        onReveal(entry.target, entry);
        if (once) observer.unobserve(entry.target);
        continue;
      }

      onReveal(entry.target, entry);
      if (once) {
        observer.unobserve(entry.target);
      }
    }
  }, { threshold, rootMargin });

  return {
    observe(element) {
      if (element && !isProtectedHeroOrHeader(element)) {
        observer.observe(element);
      }
    },
    unobserve(element) {
      if (element) {
        observer.unobserve(element);
      }
    },
    disconnect() {
      observer.disconnect();
    }
  };
}

/**
 * Global initialization of the Premium Motion Foundation.
 * Coordinates motion state changes, provides cleanup and hot module disposal.
 */
export function initPremiumMotion() {
  const cleanups = [];

  // Listen to motion preference and site toggle changes
  const unsubscribeState = onMotionStateChange(allowed => {
    if (!allowed) {
      cancelActiveAnimations();
      document.querySelectorAll('.motion-tilt-card').forEach(card => {
        card.style.removeProperty('--tilt-rx');
        card.style.removeProperty('--tilt-ry');
      });
      document.querySelectorAll('[style*="translate"]').forEach(el => {
        if (!isProtectedHeroOrHeader(el)) {
          el.style.removeProperty('translate');
        }
      });
    }
  });
  cleanups.push(unsubscribeState);

  // Initialize unified scroll manager
  const scrollManager = createUnifiedScrollManager();
  cleanups.push(() => scrollManager.destroy());

  return function disposePremiumMotion() {
    cancelActiveAnimations();
    cleanups.forEach(cleanup => cleanup());
  };
}
