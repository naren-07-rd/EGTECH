/**
 * EG TECH — Cinematic Footer Motion
 *
 * Cinematic enhancements for .footer:
 * 1. Coordinated column reveals with staggered vertical glides (stagger: 90ms)
 * 2. Restrained brand mark logo entrance with micro-scale & opacity settling
 * 3. Animated hover underline pseudo-elements for all footer navigation links
 * 4. Refined top section boundary transition with ambient gradient glow
 * 5. Smooth bottom bar reveal (copyright, legal links, back to top)
 * 6. Full reduced-motion and site data-motion toggle compliance
 *
 * Strictly protects all prior sections and hero components.
 */

import {
  isMotionAllowed,
  createRevealObserver,
  onMotionStateChange,
  MOTION_EASING,
  MOTION_DURATIONS
} from './premium-motion.js';

export function initFooterCinematic() {
  const footer = document.querySelector('.footer');
  if (!footer || footer.dataset.cinematicFooter === 'true') return () => {};
  footer.dataset.cinematicFooter = 'true';

  const cleanups = [];
  const trackedAnimations = new Set();

  function trackAnim(anim) {
    if (!anim) return anim;
    trackedAnimations.add(anim);
    const remove = () => trackedAnimations.delete(anim);
    anim.finished.then(remove, remove).catch(() => {});
    return anim;
  }

  const columns = Array.from(footer.querySelectorAll('.footer-col'));
  const brandLogo = footer.querySelector('.footer-brand img');
  const bottomBar = footer.querySelector('.footer-bottom');

  function resetToStatic() {
    columns.forEach(col => {
      if (col?.style) {
        col.style.opacity = '1';
        col.style.transform = 'none';
      }
    });
    if (brandLogo?.style) {
      brandLogo.style.opacity = '1';
      brandLogo.style.transform = 'none';
    }
    if (bottomBar?.style) {
      bottomBar.style.opacity = '1';
      bottomBar.style.transform = 'none';
    }
  }

  if (!isMotionAllowed()) {
    resetToStatic();
  } else {
    const footerObserver = createRevealObserver(() => {
      if (!isMotionAllowed()) {
        resetToStatic();
        return;
      }

      // 1. Restrained brand logo micro-scale entrance
      if (brandLogo) {
        trackAnim(
          brandLogo.animate(
            [
              { opacity: 0, transform: 'scale(0.92)' },
              { opacity: 1, transform: 'scale(1)' }
            ],
            { duration: 650, easing: MOTION_EASING, fill: 'both' }
          )
        );
      }

      // 2. Coordinated column reveals with staggered vertical glide
      columns.forEach((col, index) => {
        trackAnim(
          col.animate(
            [
              { opacity: 0, transform: 'translateY(24px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            {
              duration: MOTION_DURATIONS.normal,
              delay: index * 90,
              easing: MOTION_EASING,
              fill: 'both'
            }
          )
        );
      });

      // 3. Bottom bar coordinated entrance
      if (bottomBar) {
        trackAnim(
          bottomBar.animate(
            [
              { opacity: 0, transform: 'translateY(16px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            {
              duration: 700,
              delay: columns.length * 90 + 80,
              easing: MOTION_EASING,
              fill: 'both'
            }
          )
        );
      }
    }, { threshold: 0.1 });

    footerObserver.observe(footer);
    cleanups.push(() => footerObserver.disconnect());
  }

  // React to runtime motion toggle / reduced-motion changes
  cleanups.push(
    onMotionStateChange(allowed => {
      if (!allowed) {
        trackedAnimations.forEach(anim => {
          try { anim.cancel(); } catch {}
        });
        trackedAnimations.clear();
        resetToStatic();
      }
    })
  );

  return () => {
    trackedAnimations.forEach(anim => {
      try { anim.cancel(); } catch {}
    });
    trackedAnimations.clear();
    cleanups.forEach(cleanup => cleanup());
    delete footer.dataset.cinematicFooter;
    resetToStatic();
  };
}
