/**
 * EG TECH — Visibility (SEO & Performance) Cinematic Motion
 *
 * Cinematic interactions for the #visibility section:
 * 1. Coordinated typography reveals: eyebrow, masked h2, description, and CTA
 * 2. Staggered feature card entrances with tight timing and organic easing
 * 3. Preserves seo-feature-cards.js behavior with zero duplicate listeners
 * 4. Respects reduced motion and site motion pause settings
 */

import {
  isMotionAllowed,
  revealHeadingMask,
  createRevealObserver,
  onMotionStateChange,
  MOTION_EASING,
  MOTION_DURATIONS
} from './premium-motion.js';

export function initVisibilityCinematic() {
  const section = document.querySelector('#visibility');
  if (!section || section.dataset.cinematicVisibility === 'true') return () => {};
  section.dataset.cinematicVisibility = 'true';

  const cleanups = [];
  const activeAnimations = new Set();

  // ---------------------------------------------------------------------------
  // 1. Heading & Typography Coordinated Reveal
  // ---------------------------------------------------------------------------
  const copyContainer = section.querySelector('.visibility-copy');
  if (copyContainer) {
    const label = copyContainer.querySelector('.seo-label');
    const h2 = copyContainer.querySelector('h2');
    const desc = copyContainer.querySelector('.seo-desc');
    const cta = copyContainer.querySelector('.seo-cta');

    if (!isMotionAllowed()) {
      if (label) label.style.opacity = '1';
      if (h2) h2.style.opacity = '1';
      if (desc) desc.style.opacity = '1';
      if (cta) cta.style.opacity = '1';
    } else {
      const copyObserver = createRevealObserver(() => {
        if (!isMotionAllowed()) return;

        if (label) {
          label.animate(
            [
              { opacity: 0, transform: 'translateY(16px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            { duration: 600, easing: MOTION_EASING, fill: 'both' }
          );
        }

        if (h2) {
          revealHeadingMask(h2, {
            delay: 100,
            duration: MOTION_DURATIONS.normal
          });
        }

        if (desc) {
          desc.animate(
            [
              { opacity: 0, transform: 'translateY(18px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            { delay: 220, duration: 680, easing: MOTION_EASING, fill: 'both' }
          );
        }

        if (cta) {
          cta.animate(
            [
              { opacity: 0, transform: 'translateY(18px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            { delay: 320, duration: 680, easing: MOTION_EASING, fill: 'both' }
          );
        }
      }, { threshold: 0.15 });

      copyObserver.observe(copyContainer);
      cleanups.push(() => copyObserver.disconnect());
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Staggered Feature Cards Entrance
  // ---------------------------------------------------------------------------
  const grid = section.querySelector('.seo-feature-grid');
  const cards = Array.from(section.querySelectorAll('.seo-feature-card'));

  if (grid && cards.length > 0) {
    if (!isMotionAllowed()) {
      cards.forEach(card => {
        card.style.opacity = '1';
        card.style.transform = 'none';
      });
    } else {
      const gridObserver = createRevealObserver(() => {
        if (!isMotionAllowed()) return;

        cards.forEach((card, index) => {
          const anim = card.animate(
            [
              { opacity: 0, transform: 'translateY(24px) scale(0.98)' },
              { opacity: 1, transform: 'translateY(0) scale(1)' }
            ],
            {
              duration: 750,
              delay: index * 95,
              easing: MOTION_EASING,
              fill: 'both'
            }
          );
          activeAnimations.add(anim);
          const finalize = () => {
            activeAnimations.delete(anim);
            card.style.opacity = '1';
            card.style.transform = 'none';
          };
          anim.finished.then(finalize).catch(() => {
            activeAnimations.delete(anim);
          });
        });
      }, { threshold: 0.12 });

      gridObserver.observe(grid);
      cleanups.push(() => gridObserver.disconnect());
    }
  }

  // Handle runtime motion toggle / reduced-motion changes
  cleanups.push(
    onMotionStateChange(allowed => {
      if (!allowed) {
        activeAnimations.forEach(anim => {
          try { anim.cancel(); } catch {}
        });
        activeAnimations.clear();
        cards.forEach(card => {
          card.style.opacity = '1';
          card.style.transform = 'none';
        });
        if (copyContainer) {
          copyContainer.querySelectorAll('.seo-label, h2, .seo-desc, .seo-cta').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
          });
        }
      }
    })
  );

  return function disposeVisibilityCinematic() {
    activeAnimations.forEach(anim => {
      try { anim.cancel(); } catch {}
    });
    activeAnimations.clear();
    cards.forEach(card => {
      card.style.removeProperty('opacity');
      card.style.removeProperty('transform');
    });
    cleanups.forEach(cleanup => cleanup());
    section.removeAttribute('data-cinematic-visibility');
  };
}
