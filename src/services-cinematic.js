/**
 * EG TECH — Services Cinematic Motion
 *
 * Cinematic interactions for the #services section:
 * 1. Smooth upward masked heading reveal with staggered eyebrow and description
 * 2. Staggered service row entrance with subtle vertical translation and opacity
 * 3. Smooth accordion expand & collapse animation preserving native <details> semantics
 * 4. Tasteful clip-path and scale reveal for service media images
 * 5. Smooth plus/minus indicator rotation and fine-pointer hover zoom
 *
 * Fully respects reduced-motion preferences and site motion toggle.
 */

import {
  isMotionAllowed,
  revealHeadingMask,
  createRevealObserver,
  onMotionStateChange,
  MOTION_EASING,
  MOTION_DURATIONS
} from './premium-motion.js';

export function initServicesCinematic() {
  const section = document.querySelector('#services');
  if (!section || section.dataset.cinematicServices === 'true') return () => {};
  section.dataset.cinematicServices = 'true';

  const cleanups = [];

  // ---------------------------------------------------------------------------
  // 1. Heading & Typography Reveal
  // ---------------------------------------------------------------------------
  const headingContainer = section.querySelector('.section-heading');
  if (headingContainer) {
    const eyebrow = headingContainer.querySelector('.eyebrow');
    const h2 = headingContainer.querySelector('h2');
    const desc = headingContainer.querySelector('p:last-child:not(.eyebrow)');

    // Ensure elements start visible if motion is not permitted
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
  // 2. Service Rows Staggered Entrance
  // ---------------------------------------------------------------------------
  const serviceList = section.querySelector('.service-list');
  const serviceRows = Array.from(section.querySelectorAll('details.service'));

  if (serviceList && serviceRows.length > 0) {
    if (!isMotionAllowed()) {
      serviceRows.forEach(row => {
        row.style.opacity = '1';
        row.style.transform = 'none';
      });
    } else {
      const listObserver = createRevealObserver(() => {
        if (!isMotionAllowed()) return;

        serviceRows.forEach((row, index) => {
          const anim = row.animate(
            [
              { opacity: 0, transform: 'translateY(24px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            {
              duration: 700,
              delay: index * 90,
              easing: MOTION_EASING,
              fill: 'both'
            }
          );
          anim.finished.then(() => {
            row.style.opacity = '1';
            row.style.transform = '';
            anim.cancel();
          }).catch(() => {});
        });
      }, { threshold: 0.1 });

      listObserver.observe(serviceList);
      cleanups.push(() => listObserver.disconnect());
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Smooth Accordion Expand & Collapse
  // ---------------------------------------------------------------------------
  const activeAnimations = new Map();

  function triggerImageReveal(content) {
    const img = content.querySelector('.service-media img');
    if (!img || !isMotionAllowed()) return;

    try {
      img.animate(
        [
          { clipPath: 'inset(100% 0 0 0 round 16px)', transform: 'scale(1.04)', opacity: 0.7 },
          { clipPath: 'inset(0% 0 0 0 round 16px)', transform: 'scale(1)', opacity: 1 }
        ],
        {
          duration: 650,
          easing: MOTION_EASING,
          fill: 'both'
        }
      );
    } catch {
      img.style.clipPath = 'none';
      img.style.transform = 'none';
      img.style.opacity = '1';
    }
  }

  serviceRows.forEach(details => {
    const summary = details.querySelector('summary');
    const content = details.querySelector('.service-content');
    if (!summary || !content) return;

    let transitionToken = 0;

    // Handle Summary Click (Mouse, Touch, and Keyboard Space/Enter)
    const onSummaryClick = event => {
      // If motion is off or reduced motion requested, use instant native toggle
      if (!isMotionAllowed()) {
        return;
      }

      event.preventDefault();

      const thisToken = ++transitionToken;

      // Cancel any ongoing transition for this accordion
      if (activeAnimations.has(content)) {
        const prevAnim = activeAnimations.get(content);
        activeAnimations.delete(content);
        try {
          prevAnim.cancel();
        } catch {}
      }

      if (details.open) {
        // Closing accordion
        const startHeight = content.offsetHeight;
        content.style.overflow = 'hidden';

        const anim = content.animate(
          [
            { height: `${startHeight}px`, opacity: 1, transform: 'translateY(0)' },
            { height: '0px', opacity: 0, transform: 'translateY(-8px)' }
          ],
          {
            duration: 320,
            easing: MOTION_EASING
          }
        );

        activeAnimations.set(content, anim);

        anim.finished
          .then(() => {
            // Only finalize if this animation is still the active generation
            if (transitionToken !== thisToken) return;
            details.open = false;
            summary.setAttribute('aria-expanded', 'false');
            content.style.removeProperty('height');
            content.style.removeProperty('overflow');
            content.style.removeProperty('opacity');
            content.style.removeProperty('transform');
            activeAnimations.delete(content);
          })
          .catch(() => {
            // Cancelled animation: do NOT overwrite state if a newer transition has begun
            if (transitionToken === thisToken) {
              content.style.removeProperty('height');
              content.style.removeProperty('overflow');
              content.style.removeProperty('opacity');
              content.style.removeProperty('transform');
              summary.setAttribute('aria-expanded', String(details.open));
              activeAnimations.delete(content);
            }
          });
      } else {
        // Opening accordion
        details.open = true;
        summary.setAttribute('aria-expanded', 'true');

        // Measure natural target height
        const targetHeight = content.offsetHeight;
        content.style.overflow = 'hidden';

        const anim = content.animate(
          [
            { height: '0px', opacity: 0, transform: 'translateY(-10px)' },
            { height: `${targetHeight}px`, opacity: 1, transform: 'translateY(0)' }
          ],
          {
            duration: 380,
            easing: MOTION_EASING
          }
        );

        activeAnimations.set(content, anim);

        // Coordinate image reveal
        triggerImageReveal(content);

        anim.finished
          .then(() => {
            // Only finalize if this animation is still the active generation
            if (transitionToken !== thisToken) return;
            content.style.removeProperty('height');
            content.style.removeProperty('overflow');
            content.style.removeProperty('opacity');
            content.style.removeProperty('transform');
            activeAnimations.delete(content);
          })
          .catch(() => {
            // Cancelled animation: do NOT overwrite state if a newer transition has begun
            if (transitionToken === thisToken) {
              content.style.removeProperty('height');
              content.style.removeProperty('overflow');
              content.style.removeProperty('opacity');
              content.style.removeProperty('transform');
              summary.setAttribute('aria-expanded', String(details.open));
              activeAnimations.delete(content);
            }
          });
      }
    };

    summary.addEventListener('click', onSummaryClick);
    cleanups.push(() => summary.removeEventListener('click', onSummaryClick));

    // Listen to native toggle to catch programmatic opening (e.g. from service-accordion-nav)
    const onToggle = () => {
      summary.setAttribute('aria-expanded', String(details.open));
      if (details.open && !activeAnimations.has(content)) {
        triggerImageReveal(content);
      }
    };

    details.addEventListener('toggle', onToggle);
    cleanups.push(() => details.removeEventListener('toggle', onToggle));
  });

  // React to runtime motion toggle / reduced-motion changes
  cleanups.push(
    onMotionStateChange(allowed => {
      if (!allowed) {
        activeAnimations.forEach(anim => {
          try { anim.cancel(); } catch {}
        });
        activeAnimations.clear();
        serviceRows.forEach(details => {
          const content = details.querySelector('.service-content');
          const summary = details.querySelector('summary');
          if (content) {
            content.style.removeProperty('height');
            content.style.removeProperty('overflow');
            content.style.removeProperty('opacity');
            content.style.removeProperty('transform');
          }
          if (summary) {
            summary.setAttribute('aria-expanded', String(details.open));
          }
        });
      }
    })
  );

  return function disposeServicesCinematic() {
    activeAnimations.forEach(anim => {
      try {
        anim.cancel();
      } catch {}
    });
    activeAnimations.clear();
    serviceRows.forEach(details => {
      const content = details.querySelector('.service-content');
      if (content) {
        content.style.removeProperty('height');
        content.style.removeProperty('overflow');
        content.style.removeProperty('opacity');
        content.style.removeProperty('transform');
      }
    });
    cleanups.forEach(cleanup => cleanup());
    section.removeAttribute('data-cinematic-services');
  };
}
