/**
 * EG TECH — Interactive Pricing, FAQ & Contact Motion
 *
 * Cinematic enhancements for:
 * 1. #feedback (Website Packages):
 *    - Upward masked heading reveal with staggered eyebrow & subtitle
 *    - Refined staggered card entrance with slight vertical translation & scale settling
 *    - Subtle fine-pointer perspective tilt without dramatic rotation
 *    - Gentle card surface highlight, shadow elevation & selection pulse
 *    - Fully preserves pricing-cards.js selection, text morphing & heart save states
 * 2. #faq (Frequently Asked Questions):
 *    - Line-by-line typography reveal for "Common questions & clear answers"
 *    - Refined question transition with coordinated fade & subtle vertical glide
 *    - Smooth central card entrance
 *    - Gentle ambient depth for decorative angled background panels
 *    - Strictly preserves faq-carousel.js 5s autoplay, pause/resume, and controls
 * 3. #brief (Project Enquiry & Contact):
 *    - Line-by-line masked heading reveal with coordinated lead copy
 *    - Contact card reveal with subtle scale and icon micro-interactions
 *    - Smooth form entrance with refined input focus rings and submit hover feedback
 *    - Smooth validation error and brief result presentation without layout jumps
 *    - Never animates inputs while typing; preserves all form functionality
 *
 * Strictly protects #home hero, navbar, and other sections.
 * Full compliance with prefers-reduced-motion and site data-motion toggle.
 */

import {
  isMotionAllowed,
  revealHeadingMask,
  createRevealObserver,
  createInteractiveTilt,
  createUnifiedScrollManager,
  onMotionStateChange,
  MOTION_EASING,
  MOTION_DURATIONS
} from './premium-motion.js';

export function initPricingFaqContactCinematic() {
  const pricingSection = document.querySelector('#feedback');
  const faqSection = document.querySelector('#faq');
  const briefSection = document.querySelector('#brief');

  if (pricingSection?.dataset.cinematicPfc === 'true') return () => {};
  if (pricingSection) pricingSection.dataset.cinematicPfc = 'true';
  if (faqSection) faqSection.dataset.cinematicPfc = 'true';
  if (briefSection) briefSection.dataset.cinematicPfc = 'true';

  const cleanups = [];
  const trackedAnimations = new Set();

  function trackAnim(anim) {
    if (!anim) return anim;
    trackedAnimations.add(anim);
    const remove = () => trackedAnimations.delete(anim);
    anim.finished.then(remove, remove).catch(() => {});
    return anim;
  }

  // ===========================================================================
  // PART 1 — WEBSITE PACKAGES (#feedback)
  // ===========================================================================
  if (pricingSection) {
    // 1. Heading & intro typography reveal
    const headingWrap = pricingSection.querySelector('.section-heading');
    if (headingWrap) {
      const eyebrow = headingWrap.querySelector('.eyebrow');
      const h2 = headingWrap.querySelector('h2');
      const desc = headingWrap.querySelector('p:last-child:not(.eyebrow)');

      if (!isMotionAllowed()) {
        if (eyebrow) eyebrow.style.opacity = '1';
        if (h2) h2.style.opacity = '1';
        if (desc) desc.style.opacity = '1';
      } else {
        const headingObserver = createRevealObserver(() => {
          if (!isMotionAllowed()) return;

          if (eyebrow) {
            trackAnim(
              eyebrow.animate(
                [
                  { opacity: 0, transform: 'translateY(16px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { duration: 600, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }

          if (h2) {
            revealHeadingMask(h2, {
              delay: 100,
              duration: MOTION_DURATIONS.normal
            });
          }

          if (desc) {
            trackAnim(
              desc.animate(
                [
                  { opacity: 0, transform: 'translateY(18px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { delay: 220, duration: 700, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }
        }, { threshold: 0.15 });

        headingObserver.observe(headingWrap);
        cleanups.push(() => headingObserver.disconnect());
      }
    }

    // 2. Refined Staggered Card Entrance
    const grid = pricingSection.querySelector('.eg-package-grid');
    const cards = Array.from(pricingSection.querySelectorAll('.eg-package-card'));

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
            const delay = index * 110;
            const anim = trackAnim(
              card.animate(
                [
                  { opacity: 0, transform: 'translateY(28px) scale(0.98)' },
                  { opacity: 1, transform: 'translateY(0) scale(1)' }
                ],
                {
                  delay,
                  duration: 800,
                  easing: MOTION_EASING,
                  fill: 'both'
                }
              )
            );
            anim.finished.then(() => {
              card.style.opacity = '1';
              card.style.transform = '';
              anim.cancel();
            }).catch(() => {});
          });
        }, { threshold: 0.1 });

        gridObserver.observe(grid);
        cleanups.push(() => gridObserver.disconnect());
      }

      // 3. Subtle pointer-responsive perspective (Fine pointers only)
      const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
      if (finePointer.matches) {
        cards.forEach(card => {
          const cleanupTilt = createInteractiveTilt(card, {
            maxTiltX: 3.5,
            maxTiltY: 4.5
          });
          cleanups.push(cleanupTilt);
        });
      }

      // 4. Selection Highlight Animation
      // Watches for class changes to trigger a short elegant selection pulse
      const selectObserver = typeof MutationObserver !== 'undefined'
        ? new MutationObserver(mutations => {
            for (const mutation of mutations) {
              if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.classList.contains('is-selected') && !target.classList.contains('has-selected-pop')) {
                  target.classList.add('has-selected-pop');
                  setTimeout(() => target.classList.remove('has-selected-pop'), 650);
                }
              }
            }
          })
        : null;

      if (selectObserver) {
        cards.forEach(card => selectObserver.observe(card, { attributes: true, attributeFilter: ['class'] }));
        cleanups.push(() => selectObserver.disconnect());
      }
    }
  }

  // ===========================================================================
  // PART 2 — FAQ CINEMATIC PRESENTATION (#faq)
  // ===========================================================================
  if (faqSection) {
    // 1. Heading typography reveal
    const faqHeader = faqSection.querySelector('.faq__header');
    if (faqHeader) {
      const eyebrow = faqHeader.querySelector('.eyebrow');
      const h2 = faqHeader.querySelector('h2');
      const subheading = faqHeader.querySelector('.faq__subheading');

      if (!isMotionAllowed()) {
        if (eyebrow) eyebrow.style.opacity = '1';
        if (h2) h2.style.opacity = '1';
        if (subheading) subheading.style.opacity = '1';
      } else {
        const headerObserver = createRevealObserver(() => {
          if (!isMotionAllowed()) return;

          if (eyebrow) {
            trackAnim(
              eyebrow.animate(
                [
                  { opacity: 0, transform: 'translateY(16px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { duration: 600, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }

          if (h2) {
            revealHeadingMask(h2, {
              delay: 100,
              duration: MOTION_DURATIONS.normal
            });
          }

          if (subheading) {
            trackAnim(
              subheading.animate(
                [
                  { opacity: 0, transform: 'translateY(18px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { delay: 220, duration: 700, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }
        }, { threshold: 0.15 });

        headerObserver.observe(faqHeader);
        cleanups.push(() => headerObserver.disconnect());
      }
    }

    // 2. Central FAQ Card & Stage Entrance
    const faqCard = faqSection.querySelector('.faq-card');
    const bgPanels = Array.from(faqSection.querySelectorAll('.faq-bg-panel'));

    if (faqCard) {
      if (!isMotionAllowed()) {
        faqCard.style.opacity = '1';
        faqCard.style.transform = 'none';
      } else {
        const cardObserver = createRevealObserver(() => {
          if (!isMotionAllowed()) return;

          trackAnim(
            faqCard.animate(
              [
                { opacity: 0, transform: 'translateY(24px) scale(0.99)' },
                { opacity: 1, transform: 'translateY(0) scale(1)' }
              ],
              { duration: 800, easing: MOTION_EASING, fill: 'both' }
            )
          );

          bgPanels.forEach(panel => {
            trackAnim(
              panel.animate(
                [
                  { opacity: 0.15, transform: 'translateY(-48%) scale(0.82)' },
                  { opacity: 0.42, transform: 'translateY(-50%) scale(0.86)' }
                ],
                { duration: 950, easing: MOTION_EASING, fill: 'both' }
              )
            );
          });
        }, { threshold: 0.1 });

        cardObserver.observe(faqCard);
        cleanups.push(() => cardObserver.disconnect());
      }
    }

    // 3. Subtle ambient depth shift for decorative background panels
    const faqScrollManager = createUnifiedScrollManager();
    const unregisterFaqScroll = faqScrollManager.register(({ innerHeight, innerWidth }) => {
      if (!isMotionAllowed() || innerWidth < 768) {
        faqSection.style.removeProperty('--faq-panel-shift');
        return;
      }

      const rect = faqSection.getBoundingClientRect();
      const totalDist = innerHeight + rect.height;
      if (totalDist <= 0) return;

      const progress = (innerHeight - rect.top) / totalDist;
      const clamped = Math.max(0, Math.min(1, progress));
      const shift = ((clamped - 0.5) * -18).toFixed(1);
      faqSection.style.setProperty('--faq-panel-shift', `${shift}px`);
    });

    cleanups.push(() => {
      unregisterFaqScroll();
      faqScrollManager.destroy();
      faqSection.style.removeProperty('--faq-panel-shift');
    });
  }

  // ===========================================================================
  // PART 3 — PROJECT ENQUIRY & CONTACT (#brief)
  // ===========================================================================
  if (briefSection) {
    // 1. Heading typography reveal
    const briefHeader = briefSection.querySelector('.brief-header');
    if (briefHeader) {
      const eyebrow = briefHeader.querySelector('.eyebrow');
      const h2 = briefHeader.querySelector('h2');
      const lead = briefHeader.querySelector('.brief-lead');

      if (!isMotionAllowed()) {
        if (eyebrow) eyebrow.style.opacity = '1';
        if (h2) h2.style.opacity = '1';
        if (lead) lead.style.opacity = '1';
      } else {
        const headerObserver = createRevealObserver(() => {
          if (!isMotionAllowed()) return;

          if (eyebrow) {
            trackAnim(
              eyebrow.animate(
                [
                  { opacity: 0, transform: 'translateY(16px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { duration: 600, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }

          if (h2) {
            revealHeadingMask(h2, {
              delay: 110,
              duration: MOTION_DURATIONS.normal
            });
          }

          if (lead) {
            trackAnim(
              lead.animate(
                [
                  { opacity: 0, transform: 'translateY(18px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { delay: 260, duration: 750, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }
        }, { threshold: 0.15 });

        headerObserver.observe(briefHeader);
        cleanups.push(() => headerObserver.disconnect());
      }
    }

    // 2. Contact panel & form column entrance
    const contactPanel = briefSection.querySelector('.brief-contact-panel');
    const contactCard = briefSection.querySelector('.brief-contact-card');
    const contactItems = Array.from(briefSection.querySelectorAll('.brief-contact-item'));
    const formColumn = briefSection.querySelector('.brief-form-column');
    const briefForm = briefSection.querySelector('#brief-form');

    if (contactPanel && formColumn) {
      if (!isMotionAllowed()) {
        if (contactCard) {
          contactCard.style.opacity = '1';
          contactCard.style.transform = 'none';
        }
        if (briefForm) {
          briefForm.style.opacity = '1';
          briefForm.style.transform = 'none';
        }
      } else {
        const gridObserver = createRevealObserver(() => {
          if (!isMotionAllowed()) return;

          if (contactCard) {
            trackAnim(
              contactCard.animate(
                [
                  { opacity: 0, transform: 'translateY(24px) scale(0.98)' },
                  { opacity: 1, transform: 'translateY(0) scale(1)' }
                ],
                { duration: 800, easing: MOTION_EASING, fill: 'both' }
              )
            );

            contactItems.forEach((item, idx) => {
              trackAnim(
                item.animate(
                  [
                    { opacity: 0, transform: 'translateY(12px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                  ],
                  { delay: 180 + idx * 90, duration: 650, easing: MOTION_EASING, fill: 'both' }
                )
              );
            });
          }

          if (briefForm) {
            trackAnim(
              briefForm.animate(
                [
                  { opacity: 0, transform: 'translateY(24px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { delay: 140, duration: 800, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }
        }, { threshold: 0.1 });

        gridObserver.observe(contactPanel);
        cleanups.push(() => gridObserver.disconnect());
      }
    }

    // 3. Smooth Brief Result presentation observer
    const formResult = briefSection.querySelector('.form-result');
    if (formResult && typeof MutationObserver !== 'undefined') {
      const resultObserver = new MutationObserver(records => {
        for (const record of records) {
          if (record.attributeName === 'hidden' && !formResult.hidden && isMotionAllowed()) {
            trackAnim(
              formResult.animate(
                [
                  { opacity: 0, transform: 'translateY(14px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { duration: 550, easing: MOTION_EASING, fill: 'both' }
              )
            );
            break;
          }
        }
      });
      resultObserver.observe(formResult, { attributes: true, attributeFilter: ['hidden'] });
      cleanups.push(() => resultObserver.disconnect());
    }
  }

  // ===========================================================================
  // GLOBAL MOTION STATE CHANGE LISTENER
  // ===========================================================================
  const unsubscribeState = onMotionStateChange(allowed => {
    if (!allowed) {
      trackedAnimations.forEach(anim => {
        try { anim.cancel(); } catch {}
      });
      trackedAnimations.clear();

      document.querySelectorAll('#feedback .eg-package-card').forEach(card => {
        card.style.opacity = '1';
        card.style.transform = 'none';
        card.style.removeProperty('--tilt-rx');
        card.style.removeProperty('--tilt-ry');
      });

      document.querySelectorAll('#faq .faq-card, #faq .faq-bg-panel').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });

      document.querySelectorAll('#brief .brief-contact-card, #brief #brief-form').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });

      if (faqSection) faqSection.style.removeProperty('--faq-panel-shift');
    }
  });
  cleanups.push(unsubscribeState);

  // ===========================================================================
  // DISPOSAL
  // ===========================================================================
  return function disposePricingFaqContactCinematic() {
    trackedAnimations.forEach(anim => {
      try { anim.cancel(); } catch {}
    });
    trackedAnimations.clear();

    cleanups.forEach(fn => {
      try { fn(); } catch {}
    });

    if (pricingSection) pricingSection.removeAttribute('data-cinematic-pfc');
    if (faqSection) faqSection.removeAttribute('data-cinematic-pfc');
    if (briefSection) briefSection.removeAttribute('data-cinematic-pfc');
  };
}
