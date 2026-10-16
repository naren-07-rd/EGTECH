/**
 * EG TECH — Premium Cinematic Portfolio Motion
 *
 * Cinematic case-study gallery interactions for the #work section:
 * 1. Section entrance: smooth upward masked heading reveal with staggered eyebrow & description
 * 2. Cinematic project reveal: subtle upward movement, clip-path mask unveil, scale from 1.05 to 1,
 *    and coordinated metadata arrival
 * 3. Scroll-responsive image depth: subtle scroll-linked visual shift inside .case-cover on larger screens
 * 4. Premium hover interactions: image scale, 3D tilt micro-interaction, action icon rotation, refined border/glow
 * 5. Project detail interaction: smooth dialog entrance/exit while preserving focus management and accessibility
 * 6. Mobile experience: pointer-dependent tilt disabled on touch, fluid responsive layout
 *
 * Strictly protects #home hero, navbar, and other sections.
 * Full reduced-motion and site motion toggle compliance.
 */

import {
  isMotionAllowed,
  revealHeadingMask,
  createRevealObserver,
  createInteractiveTilt,
  createUnifiedScrollManager,
  MOTION_EASING,
  MOTION_DURATIONS
} from './premium-motion.js';

export function initPortfolioCinematic() {
  const section = document.querySelector('#work');
  if (!section || section.dataset.cinematicPortfolio === 'true') return () => {};
  section.dataset.cinematicPortfolio = 'true';

  const cleanups = [];

  // ---------------------------------------------------------------------------
  // 1. Section Heading & Typography Reveal
  // ---------------------------------------------------------------------------
  const headingContainer = section.querySelector('.section-heading');
  if (headingContainer) {
    const eyebrow = headingContainer.querySelector('.eyebrow');
    const h2 = headingContainer.querySelector('h2');
    const desc = headingContainer.querySelector('p:last-child:not(.eyebrow)');

    if (!isMotionAllowed()) {
      if (eyebrow) eyebrow.style.opacity = '1';
      if (h2) h2.style.opacity = '1';
      if (desc) desc.style.opacity = '1';
    } else {
      const headingObserver = createRevealObserver(() => {
        if (!isMotionAllowed()) return;

        if (eyebrow) {
          eyebrow.animate(
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
            { delay: 220, duration: 700, easing: MOTION_EASING, fill: 'both' }
          );
        }
      }, { threshold: 0.15 });

      headingObserver.observe(headingContainer);
      cleanups.push(() => headingObserver.disconnect());
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Cinematic Project Case-Study Reveals
  // ---------------------------------------------------------------------------
  const caseGrid = section.querySelector('.case-grid');
  const caseStudies = Array.from(section.querySelectorAll('.case-study'));

  if (caseGrid && caseStudies.length > 0) {
    if (!isMotionAllowed()) {
      caseStudies.forEach(study => {
        study.style.opacity = '1';
        study.style.transform = 'none';
        const cover = study.querySelector('.case-cover');
        if (cover) {
          cover.style.opacity = '1';
          cover.style.clipPath = 'none';
        }
      });
    } else {
      const gridObserver = createRevealObserver(() => {
        if (!isMotionAllowed()) return;

        caseStudies.forEach((study, index) => {
          const delay = index * 140;

          // Animate card container upward entrance
          study.animate(
            [
              { opacity: 0, transform: 'translateY(32px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            {
              duration: 850,
              delay,
              easing: MOTION_EASING,
              fill: 'both'
            }
          );

          // Animate case cover mask unveiling and gentle scale
          const cover = study.querySelector('.case-cover');
          if (cover) {
            cover.animate(
              [
                { opacity: 0.6, clipPath: 'inset(10% 0 0 0 round 22px)', transform: 'scale(1.04)' },
                { opacity: 1, clipPath: 'inset(0% 0 0 0 round 22px)', transform: 'scale(1)' }
              ],
              {
                duration: 900,
                delay,
                easing: MOTION_EASING,
                fill: 'both'
              }
            );
          }

          // Animate metadata arrival
          const meta = study.querySelector('.case-meta');
          if (meta) {
            meta.animate(
              [
                { opacity: 0, transform: 'translateY(16px)' },
                { opacity: 1, transform: 'translateY(0)' }
              ],
              {
                duration: 700,
                delay: delay + 180,
                easing: MOTION_EASING,
                fill: 'both'
              }
            );
          }
        });
      }, { threshold: 0.1 });

      gridObserver.observe(caseGrid);
      cleanups.push(() => gridObserver.disconnect());
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Scroll-Responsive Image Depth (Larger Screens Only)
  // ---------------------------------------------------------------------------
  const scrollManager = createUnifiedScrollManager();
  const unregisterScroll = scrollManager.register(({ innerHeight, innerWidth }) => {
    // Only active on desktop/tablet with motion permitted
    if (!isMotionAllowed() || innerWidth < 768) {
      caseStudies.forEach(study => {
        study.style.removeProperty('--case-depth-shift');
      });
      return;
    }

    caseStudies.forEach(study => {
      const rect = study.getBoundingClientRect();
      // Calculate progress when card passes through viewport
      const totalDist = innerHeight + rect.height;
      if (totalDist <= 0) return;
      const progress = (innerHeight - rect.top) / totalDist;
      const clamped = Math.max(0, Math.min(1, progress));
      // Subtle shift range: -11px to +11px
      const shift = ((clamped - 0.5) * -22).toFixed(1);
      study.style.setProperty('--case-depth-shift', `${shift}px`);
    });
  });

  cleanups.push(() => {
    unregisterScroll();
    scrollManager.destroy();
    caseStudies.forEach(study => study.style.removeProperty('--case-depth-shift'));
  });

  // ---------------------------------------------------------------------------
  // 4. Tactile 3D Tilt Micro-Interaction (Fine Pointers Only)
  // ---------------------------------------------------------------------------
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  if (finePointer.matches) {
    caseStudies.forEach(study => {
      const cover = study.querySelector('.case-cover');
      if (cover) {
        const cleanupTilt = createInteractiveTilt(cover, {
          maxTiltX: 5,
          maxTiltY: 6
        });
        cleanups.push(cleanupTilt);
      }
    });
  }

  return function disposePortfolioCinematic() {
    cleanups.forEach(cleanup => cleanup());
    section.removeAttribute('data-cinematic-portfolio');
  };
}
