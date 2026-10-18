/**
 * EG TECH — Process, About & Studio Manifesto Cinematic Motion
 *
 * Cinematic interactions for:
 * 1. #process (Engineering Methodology):
 *    - Upward masked heading reveal with staggered eyebrow & description
 *    - Coordinated sequential entrance for the 5 step rows (number circle, title, chevron)
 *    - Smooth scroll-based progress rail filling as the user advances through the timeline
 *    - Harmonic coordination with process-steps.js manual selection and panel expansion
 * 2. #about (Studio Profile):
 *    - Controlled cinematic mask reveal and subtle scale on .studio-art
 *    - Restrained, non-jumping entrance for .studio-monogram
 *    - Scroll-responsive ambient depth shift on studio artwork
 *    - Line-by-line masked reveal on h2 and coordinated lead paragraph
 *    - Staggered individual fades for supporting paragraphs without animating large blocks simultaneously
 * 3. #philosophy (Studio Manifesto):
 *    - Restrained, line-by-line masked reveal for core statement heading
 *    - Sequential entrance for the 3 numbered principles with animated underline dividers
 *    - Refined, non-distracting principle hover focus with subtle sibling dimming
 *    - Coordinated closing statement and project discussion CTA arrival
 *
 * Strictly protects #home hero, navbar, and other sections.
 * Full compliance with prefers-reduced-motion and site data-motion toggle.
 */

import {
  isMotionAllowed,
  revealHeadingMask,
  createRevealObserver,
  createUnifiedScrollManager,
  onMotionStateChange,
  MOTION_EASING,
  MOTION_DURATIONS
} from './premium-motion.js';

export function initProcessAboutManifestoCinematic() {
  const processSection = document.querySelector('#process');
  const aboutSection = document.querySelector('#about');
  const philosophySection = document.querySelector('#philosophy');

  if (processSection?.dataset.cinematicPam === 'true') return () => {};
  if (processSection) processSection.dataset.cinematicPam = 'true';
  if (aboutSection) aboutSection.dataset.cinematicPam = 'true';
  if (philosophySection) philosophySection.dataset.cinematicPam = 'true';

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
  // PART 1 — ENGINEERING PROCESS (#process)
  // ===========================================================================
  if (processSection) {
    // 1. Heading & description reveal
    const headingWrap = processSection.querySelector('.section-heading');
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

    // 2. Coordinated step sequence entrance
    const stepsContainer = processSection.querySelector('.process-steps');
    const stepItems = Array.from(processSection.querySelectorAll('.process-step'));

    if (stepsContainer && stepItems.length > 0) {
      if (!isMotionAllowed()) {
        stepItems.forEach(step => {
          step.style.opacity = '1';
          step.style.transform = 'none';
        });
      } else {
        const stepsObserver = createRevealObserver(() => {
          if (!isMotionAllowed()) return;

          stepItems.forEach((step, index) => {
            const delay = index * 100;
            const circle = step.querySelector('.process-step__circle');
            const title = step.querySelector('.process-step__title');
            const chevron = step.querySelector('.process-step__chevron');

            const stepAnim = trackAnim(
              step.animate(
                [
                  { opacity: 0, transform: 'translateY(22px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { delay, duration: 750, easing: MOTION_EASING, fill: 'both' }
              )
            );
            stepAnim.finished.then(() => {
              step.style.opacity = '1';
              step.style.transform = '';
              stepAnim.cancel();
            }).catch(() => {});

            if (circle) {
              trackAnim(
                circle.animate(
                  [
                    { opacity: 0, transform: 'scale(0.8) translateY(6px)' },
                    { opacity: 1, transform: 'scale(1) translateY(0)' }
                  ],
                  { delay: delay + 40, duration: 650, easing: MOTION_EASING, fill: 'both' }
                )
              );
            }

            if (title) {
              trackAnim(
                title.animate(
                  [
                    { opacity: 0, transform: 'translateY(14px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                  ],
                  { delay: delay + 80, duration: 700, easing: MOTION_EASING, fill: 'both' }
                )
              );
            }

            if (chevron) {
              trackAnim(
                chevron.animate(
                  [
                    { opacity: 0 },
                    { opacity: 1 }
                  ],
                  { delay: delay + 120, duration: 550, easing: MOTION_EASING, fill: 'both' }
                )
              );
            }
          });
        }, { threshold: 0.1 });

        stepsObserver.observe(stepsContainer);
        cleanups.push(() => stepsObserver.disconnect());
      }
    }

    // 3. Scroll-based progress rail filling
    const rail = processSection.querySelector('.process-steps__rail');
    const lineFill = processSection.querySelector('.process-steps__line-fill');
    const circles = Array.from(processSection.querySelectorAll('.process-step__circle'));

    if (stepsContainer && rail && lineFill && circles.length >= 2) {
      function updateRailFill(customHeight = null) {
        if (!isMotionAllowed()) {
          lineFill.style.removeProperty('height');
          return;
        }

        // Only manage scroll fill when no step is actively selected or hovered
        const activeStep = stepsContainer.dataset.activeStep;
        if (activeStep !== undefined && activeStep !== '-1') {
          return;
        }

        const containerRect = stepsContainer.getBoundingClientRect();
        const c0Rect = circles[0].getBoundingClientRect();
        const cLastRect = circles[circles.length - 1].getBoundingClientRect();

        const c0CenterY = (c0Rect.top + c0Rect.bottom) / 2 - containerRect.top;
        const cLastCenterY = (cLastRect.top + cLastRect.bottom) / 2 - containerRect.top;
        const totalHeight = Math.max(0, cLastCenterY - c0CenterY);
        if (totalHeight <= 0) return;

        // Viewport trigger threshold around 60% down the screen
        const innerHeight = customHeight || window.innerHeight || 800;
        const viewTrigger = innerHeight * 0.60;
        const startTrigger = c0Rect.top + c0Rect.height / 2;
        const endTrigger = cLastRect.top + cLastRect.height / 2;
        const dist = endTrigger - startTrigger;
        if (dist <= 0) return;

        const progress = (viewTrigger - startTrigger) / dist;
        const clamped = Math.max(0, Math.min(1, progress));
        const fillHeight = clamped * totalHeight;

        lineFill.style.height = `${fillHeight.toFixed(1)}px`;

        // Highlight passed circles along the progression line when unselected
        const stepRatio = 1 / (circles.length - 1);
        stepItems.forEach((step, idx) => {
          const threshold = idx * stepRatio;
          if (clamped >= threshold && clamped > 0) {
            step.setAttribute('data-circle', 'accented');
          } else {
            step.removeAttribute('data-circle');
          }
        });
      }

      const scrollManager = createUnifiedScrollManager();
      const unregisterRail = scrollManager.register(({ innerHeight }) => {
        updateRailFill(innerHeight);
      });

      // Restore scroll fill immediately when hover or selection ends
      const onContainerLeave = () => {
        requestAnimationFrame(() => updateRailFill());
      };
      stepsContainer.addEventListener('pointerleave', onContainerLeave);

      const activeStepObserver = typeof MutationObserver !== 'undefined'
        ? new MutationObserver(records => {
            for (const r of records) {
              if (r.attributeName === 'data-active-step' && stepsContainer.dataset.activeStep === '-1') {
                requestAnimationFrame(() => updateRailFill());
                break;
              }
            }
          })
        : null;

      if (activeStepObserver) {
        activeStepObserver.observe(stepsContainer, { attributes: true, attributeFilter: ['data-active-step'] });
      }

      cleanups.push(() => {
        unregisterRail();
        scrollManager.destroy();
        stepsContainer.removeEventListener('pointerleave', onContainerLeave);
        if (activeStepObserver) activeStepObserver.disconnect();
        lineFill.style.removeProperty('height');
      });
    }
  }

  // ===========================================================================
  // PART 2 — ABOUT SECTION (#about)
  // ===========================================================================
  if (aboutSection) {
    // 1. Artwork cinematic mask reveal & monogram entrance
    const studioArt = aboutSection.querySelector('.studio-art');
    const monogram = aboutSection.querySelector('.studio-monogram');
    const artHeader = aboutSection.querySelector('.studio-art > p');
    const artFooter = aboutSection.querySelector('.studio-art-footer');

    if (studioArt) {
      if (!isMotionAllowed()) {
        studioArt.style.opacity = '1';
        studioArt.style.clipPath = 'none';
        studioArt.style.transform = 'none';
        if (monogram) {
          monogram.style.opacity = '1';
          monogram.style.transform = 'none';
        }
      } else {
        const artObserver = createRevealObserver(() => {
          if (!isMotionAllowed()) return;

          trackAnim(
            studioArt.animate(
              [
                { opacity: 0.65, clipPath: 'inset(16% 0 0 0 round 23px)', transform: 'scale(1.04)' },
                { opacity: 1, clipPath: 'inset(0% 0 0 0 round 23px)', transform: 'scale(1)' }
              ],
              { duration: 1000, easing: MOTION_EASING, fill: 'both' }
            )
          );

          if (monogram) {
            trackAnim(
              monogram.animate(
                [
                  { opacity: 0, transform: 'translateY(34px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { delay: 240, duration: 900, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }

          if (artHeader) {
            trackAnim(
              artHeader.animate(
                [
                  { opacity: 0, transform: 'translateY(-10px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { delay: 160, duration: 650, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }

          if (artFooter) {
            trackAnim(
              artFooter.animate(
                [
                  { opacity: 0, transform: 'translateY(12px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { delay: 380, duration: 700, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }
        }, { threshold: 0.15 });

        artObserver.observe(studioArt);
        cleanups.push(() => artObserver.disconnect());
      }

      // Ambient artwork depth shift on desktop/tablet scroll
      const artScrollManager = createUnifiedScrollManager();
      const unregisterArtScroll = artScrollManager.register(({ innerHeight, innerWidth }) => {
        if (!isMotionAllowed() || innerWidth < 768) {
          studioArt.style.removeProperty('--art-depth-shift');
          return;
        }

        const rect = studioArt.getBoundingClientRect();
        const totalDist = innerHeight + rect.height;
        if (totalDist <= 0) return;

        const progress = (innerHeight - rect.top) / totalDist;
        const clamped = Math.max(0, Math.min(1, progress));
        const shift = ((clamped - 0.5) * -24).toFixed(1);
        studioArt.style.setProperty('--art-depth-shift', `${shift}px`);
      });

      cleanups.push(() => {
        unregisterArtScroll();
        artScrollManager.destroy();
        studioArt.style.removeProperty('--art-depth-shift');
      });
    }

    // 2. Studio Profile Typography Reveals
    const copyWrap = aboutSection.querySelector('.studio-profile-copy');
    if (copyWrap) {
      const eyebrow = copyWrap.querySelector('.eyebrow');
      const h2 = copyWrap.querySelector('h2');
      const lead = copyWrap.querySelector('.studio-lead');
      const paragraphs = Array.from(copyWrap.querySelectorAll('p:not(.eyebrow):not(.studio-lead)'));
      const textLink = copyWrap.querySelector('.text-link');

      if (!isMotionAllowed()) {
        if (eyebrow) eyebrow.style.opacity = '1';
        if (h2) h2.style.opacity = '1';
        if (lead) lead.style.opacity = '1';
        paragraphs.forEach(p => { p.style.opacity = '1'; });
        if (textLink) textLink.style.opacity = '1';
      } else {
        const copyObserver = createRevealObserver(() => {
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
                { delay: 280, duration: 750, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }

          // Stagger supporting paragraphs individually without animating large blocks simultaneously
          paragraphs.forEach((p, idx) => {
            const delay = 420 + idx * 140;
            trackAnim(
              p.animate(
                [
                  { opacity: 0, transform: 'translateY(14px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { delay, duration: 700, easing: MOTION_EASING, fill: 'both' }
              )
            );
          });

          if (textLink) {
            const linkDelay = 420 + paragraphs.length * 140 + 60;
            trackAnim(
              textLink.animate(
                [
                  { opacity: 0, transform: 'translateY(12px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { delay: linkDelay, duration: 650, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }
        }, { threshold: 0.15 });

        copyObserver.observe(copyWrap);
        cleanups.push(() => copyObserver.disconnect());
      }
    }
  }

  // ===========================================================================
  // PART 3 — STUDIO MANIFESTO (#philosophy)
  // ===========================================================================
  if (philosophySection) {
    const eyebrow = philosophySection.querySelector('.eyebrow');
    const h2 = philosophySection.querySelector('h2');
    const principlesWrap = philosophySection.querySelector('.manifesto-principles');
    const principles = Array.from(philosophySection.querySelectorAll('.manifesto-principle'));
    const bottomWrap = philosophySection.querySelector('.manifesto-bottom');
    const bottomText = bottomWrap?.querySelector('p');
    const bottomBtn = bottomWrap?.querySelector('.button');

    if (!isMotionAllowed()) {
      if (eyebrow) eyebrow.style.opacity = '1';
      if (h2) h2.style.opacity = '1';
      principles.forEach(p => { p.style.opacity = '1'; });
      if (bottomText) bottomText.style.opacity = '1';
      if (bottomBtn) bottomBtn.style.opacity = '1';
    } else {
      // 1. Heading statement reveal
      const manifestoObserver = createRevealObserver(() => {
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
            delay: 120,
            duration: MOTION_DURATIONS.normal
          });
        }
      }, { threshold: 0.15 });

      if (h2) manifestoObserver.observe(h2);
      else if (eyebrow) manifestoObserver.observe(eyebrow);
      cleanups.push(() => manifestoObserver.disconnect());

      // 2. Sequential principles entrance with animated dividers
      if (principlesWrap && principles.length > 0) {
        const principlesObserver = createRevealObserver(() => {
          if (!isMotionAllowed()) return;

          principles.forEach((principle, idx) => {
            const delay = 140 + idx * 140;
            const numSpan = principle.querySelector('span');

            trackAnim(
              principle.animate(
                [
                  { opacity: 0, transform: 'translateY(18px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { delay, duration: 750, easing: MOTION_EASING, fill: 'both' }
              )
            );

            if (numSpan) {
              trackAnim(
                numSpan.animate(
                  [
                    { opacity: 0, transform: 'translateX(-12px)' },
                    { opacity: 1, transform: 'translateX(0)' }
                  ],
                  { delay: delay + 40, duration: 600, easing: MOTION_EASING, fill: 'both' }
                )
              );
            }

            // Trigger animated underline divider class after slight delay
            setTimeout(() => {
              if (isMotionAllowed()) {
                principle.classList.add('is-divider-revealed');
              }
            }, delay + 80);
          });
        }, { threshold: 0.15 });

        principlesObserver.observe(principlesWrap);
        cleanups.push(() => principlesObserver.disconnect());
      }

      // 3. Closing call to action arrival
      if (bottomWrap) {
        const bottomObserver = createRevealObserver(() => {
          if (!isMotionAllowed()) return;

          if (bottomText) {
            trackAnim(
              bottomText.animate(
                [
                  { opacity: 0, transform: 'translateY(16px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
                { delay: 100, duration: 750, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }

          if (bottomBtn) {
            trackAnim(
              bottomBtn.animate(
                [
                  { opacity: 0, transform: 'translateY(14px) scale(0.97)' },
                  { opacity: 1, transform: 'translateY(0) scale(1)' }
                ],
                { delay: 240, duration: 700, easing: MOTION_EASING, fill: 'both' }
              )
            );
          }
        }, { threshold: 0.15 });

        bottomObserver.observe(bottomWrap);
        cleanups.push(() => bottomObserver.disconnect());
      }
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

      document.querySelectorAll('#about .studio-art').forEach(el => {
        el.style.removeProperty('--art-depth-shift');
        el.style.clipPath = 'none';
        el.style.opacity = '1';
        el.style.transform = 'none';
      });

      document.querySelectorAll('#philosophy .manifesto-principles p').forEach(p => {
        p.classList.remove('is-divider-revealed');
        p.style.opacity = '1';
        p.style.transform = 'none';
      });

      document.querySelectorAll('#process .process-step').forEach(s => {
        s.style.opacity = '1';
        s.style.transform = 'none';
      });
    }
  });
  cleanups.push(unsubscribeState);

  // ===========================================================================
  // DISPOSAL
  // ===========================================================================
  return function disposeProcessAboutManifestoCinematic() {
    trackedAnimations.forEach(anim => {
      try { anim.cancel(); } catch {}
    });
    trackedAnimations.clear();

    cleanups.forEach(fn => {
      try { fn(); } catch {}
    });

    if (processSection) processSection.removeAttribute('data-cinematic-pam');
    if (aboutSection) aboutSection.removeAttribute('data-cinematic-pam');
    if (philosophySection) philosophySection.removeAttribute('data-cinematic-pam');
  };
}
