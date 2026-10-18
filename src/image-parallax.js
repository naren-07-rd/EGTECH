/**
 * EG TECH — Smooth Image Parallax Controller
 *
 * Implements subtle, scroll-linked parallax for eligible content images:
 * 1. Treatment 1: Stationary frame with gentle inset image travel (-5% to +5%)
 *    on photographic and illustration service cards (#services).
 * 2. Treatment 2: Whole-image vertical drift (8–12px) without cropping device
 *    edges or text on mockups (#philosophy).
 *
 * Performance and Architecture Guarantees:
 * - Reuses the single Lenis auto-RAF loop via onLenisScroll; zero duplicate RAF loops.
 * - IntersectionObserver limits per-frame calculations strictly to onscreen images.
 * - Independent CSS `translate` property prevents collision with hover transforms and WAAPI reveals.
 * - Recalculates dynamically when service accordions toggle open/closed, images load, or viewport resizes.
 * - Complete reduced-motion, mobile touch, and data-motion="off" compliance: restores resting 0px position.
 * - Strictly protects #home hero, .header, dialogs, and logos.
 */

import { isMotionAllowed, isProtectedHeroOrHeader, onMotionStateChange } from './premium-motion.js';
import { getLenis, onLenisScroll } from './smooth-scroll.js';

export function initImageParallax() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const cleanups = [];
  const intersectingElements = new Set();

  // Query eligible content elements explicitly marked with data-parallax
  // Excludes #work .preview-browser if its drift is managed by portfolio-cinematic.js
  const eligibleElements = Array.from(
    document.querySelectorAll('[data-parallax="crop"], #philosophy .manifesto-image[data-parallax="drift"]')
  ).filter(el => !isProtectedHeroOrHeader(el));

  if (eligibleElements.length === 0) {
    return () => {};
  }

  function updateElement(el) {
    if (!isMotionAllowed() || window.innerWidth < 768) {
      el.style.removeProperty('--parallax-y');
      return;
    }

    const rect = el.getBoundingClientRect();
    const viewHeight = window.innerHeight || 800;
    const totalDist = viewHeight + rect.height;
    if (totalDist <= 0) return;

    // Viewport progress: 0 when top enters bottom of screen, 1 when bottom leaves top
    const progress = (viewHeight - rect.top) / totalDist;
    const clamped = Math.max(0, Math.min(1, progress));

    // Centered factor: -1 at bottom entry, 0 when centered in viewport, +1 at top exit
    const factor = (clamped - 0.5) * 2;

    const type = el.dataset.parallax;
    let maxTravel = 12; // default ±12px (~5% frame travel)

    if (type === 'crop') {
      // Service 2 has object-fit: contain on branded gradient background
      maxTravel = el.closest('.service-media--brand') ? 8 : 12;
    } else if (type === 'drift') {
      // Whole-image mockup drift: 10px (within 8–12px target range)
      maxTravel = 10;
    }

    // Motion reference direction: subtle drift following scroll progress
    const y = (factor * maxTravel).toFixed(1);
    el.style.setProperty('--parallax-y', `${y}px`);
  }

  function updateAll() {
    if (!isMotionAllowed() || window.innerWidth < 768) {
      eligibleElements.forEach(el => el.style.removeProperty('--parallax-y'));
      return;
    }
    // Update currently visible elements
    intersectingElements.forEach(el => updateElement(el));
  }

  // 1. IntersectionObserver to track visible images and avoid calculating offscreen images
  let observer = null;
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            intersectingElements.add(entry.target);
            updateElement(entry.target);
          } else {
            intersectingElements.delete(entry.target);
          }
        });
      },
      {
        rootMargin: '100px 0px 100px 0px',
        threshold: 0
      }
    );

    eligibleElements.forEach(el => observer.observe(el));
    cleanups.push(() => {
      observer.disconnect();
      intersectingElements.clear();
    });
  } else {
    // Fallback: all eligible elements are tracked
    eligibleElements.forEach(el => intersectingElements.add(el));
  }

  // 2. Primary scroll-driving mechanism: Subscribe to Lenis auto-RAF scroll events
  const unregisterLenis = onLenisScroll(() => {
    if (!isMotionAllowed() || window.innerWidth < 768) return;
    intersectingElements.forEach(updateElement);
  });
  cleanups.push(unregisterLenis);

  // 3. Fallback window scroll listener (only runs if Lenis is not active, throttled to 1 RAF)
  let fallbackRaf = 0;
  const onWindowScroll = () => {
    if (getLenis()) return; // Lenis is the sole driving mechanism when active
    if (!isMotionAllowed() || window.innerWidth < 768) return;
    if (fallbackRaf) return;
    fallbackRaf = requestAnimationFrame(() => {
      fallbackRaf = 0;
      intersectingElements.forEach(updateElement);
    });
  };
  window.addEventListener('scroll', onWindowScroll, { passive: true });
  cleanups.push(() => {
    window.removeEventListener('scroll', onWindowScroll);
    if (fallbackRaf) cancelAnimationFrame(fallbackRaf);
  });

  // 4. Dynamic dimension recalculation on service accordion toggle
  const serviceDetails = document.querySelectorAll('#services details.service');
  serviceDetails.forEach(details => {
    const onToggle = () => {
      // Re-evaluate immediately and after accordion open/close transition
      updateAll();
      setTimeout(updateAll, 60);
      setTimeout(updateAll, 380);
    };
    details.addEventListener('toggle', onToggle);
    cleanups.push(() => details.removeEventListener('toggle', onToggle));
  });

  // 5. Image load and font ready listeners
  eligibleElements.forEach(el => {
    const img = el.tagName.toLowerCase() === 'img' ? el : el.querySelector('img');
    if (img && !img.complete) {
      const onLoad = () => updateAll();
      img.addEventListener('load', onLoad, { once: true });
      cleanups.push(() => img.removeEventListener('load', onLoad));
    }
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => updateAll()).catch(() => {});
  }

  // 6. Viewport resize listener
  let resizeTimeout = 0;
  const onResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateAll, 80);
  };
  window.addEventListener('resize', onResize, { passive: true });
  cleanups.push(() => {
    window.removeEventListener('resize', onResize);
    clearTimeout(resizeTimeout);
  });

  // 7. Accessibility and global site motion toggle listener
  const unregisterMotion = onMotionStateChange(allowed => {
    if (!allowed) {
      eligibleElements.forEach(el => el.style.removeProperty('--parallax-y'));
    } else {
      updateAll();
    }
  });
  cleanups.push(unregisterMotion);

  // Initial calculation
  updateAll();

  // Teardown disposal function for hot reload and component cleanup
  return function disposeImageParallax() {
    cleanups.forEach(fn => {
      try { fn(); } catch {}
    });
    eligibleElements.forEach(el => {
      el.style.removeProperty('--parallax-y');
    });
    intersectingElements.clear();
  };
}
