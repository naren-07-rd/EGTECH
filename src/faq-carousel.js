// FAQ Carousel Component
// Centred animated question-and-answer carousel with coordinated transitions,
// frame-accurate progress indicators, manual controls, keyboard accessibility,
// full fallback, and respects reduced motion & site motion settings.

const HOLD_DURATION = 5000;
const TRANSITION_DURATION = 400;

export function initFaqCarousel() {
  const section = document.querySelector('#faq');
  if (!section) return () => {};

  const carousel = section.querySelector('#faq-carousel');
  const stage = section.querySelector('#faq-stage');
  if (!carousel || !stage) return () => {};

  if (carousel.dataset.faqInitialized === 'true') {
    return () => {};
  }
  carousel.dataset.faqInitialized = 'true';
  carousel.classList.add('faq-carousel--enhanced');

  const slides = Array.from(stage.querySelectorAll('.faq-slide'));
  const prevBtn = carousel.querySelector('.faq-nav-btn--prev');
  const nextBtn = carousel.querySelector('.faq-nav-btn--next');
  const playToggle = carousel.querySelector('.faq-play-toggle');
  const playToggleIcon = playToggle?.querySelector('.faq-play-toggle__icon');
  const playToggleText = playToggle?.querySelector('.faq-play-toggle__text');
  const dotsContainer = carousel.querySelector('.faq-dots');
  const dots = Array.from(carousel.querySelectorAll('.faq-dot'));
  const viewAllBtn = section.querySelector('#faq-view-all-toggle');
  const allList = section.querySelector('#faq-all-list');
  const srStatus = carousel.querySelector('.faq-sr-status');
  const counterEl = carousel.querySelector('#faq-counter');

  if (slides.length === 0) return () => {};

  const questions = slides.map(slide => {
    const qEl = slide.querySelector('.faq-question');
    return qEl ? qEl.textContent.trim() : '';
  });

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function isMotionAllowed() {
    if (reducedMotionQuery.matches) return false;
    if (document.documentElement.dataset.motion === 'off') return false;
    return true;
  }

  let currentIndex = 0;
  // Under prefers-reduced-motion or if motion is off, start with autoplay off
  let isManuallyPaused = !isMotionAllowed();
  let isFocused = false;
  let isVisible = false;
  let isDocumentVisible = !document.hidden;
  let isAllExpanded = false;
  let isTransitioning = false;

  let elapsedTime = 0;
  let lastTimestamp = null;
  let animFrameId = null;
  let transitionTimeoutId = null;

  const eventCleanups = [];

  function listen(target, type, callback, options) {
    if (!target) return;
    target.addEventListener(type, callback, options);
    eventCleanups.push(() => target.removeEventListener(type, callback, options));
  }

  function shouldAutoplayRun() {
    return !isManuallyPaused &&
           !isFocused &&
           isVisible &&
           isDocumentVisible &&
           !isAllExpanded &&
           !isTransitioning &&
           isMotionAllowed();
  }

  function syncPlayButtonUI() {
    if (!playToggle) return;
    const isPaused = isManuallyPaused || !isMotionAllowed();
    playToggle.setAttribute('aria-pressed', String(isPaused));
    if (isPaused) {
      playToggle.setAttribute('aria-label', 'Play autoplay');
      playToggle.title = 'Play rotation';
      if (playToggleText) playToggleText.textContent = 'Play';
      if (playToggleIcon) playToggleIcon.textContent = '▶';
    } else {
      playToggle.setAttribute('aria-label', 'Pause autoplay');
      playToggle.title = 'Pause rotation';
      if (playToggleText) playToggleText.textContent = 'Pause';
      if (playToggleIcon) playToggleIcon.textContent = '⏸';
    }
  }

  function updateTabsUI() {
    dots.forEach((dot, idx) => {
      const isActive = idx === currentIndex;
      const isCompleted = idx < currentIndex;
      const isUpcoming = idx > currentIndex;

      dot.setAttribute('aria-selected', String(isActive));
      dot.classList.toggle('is-active', isActive);
      dot.classList.toggle('is-completed', isCompleted);
      dot.classList.toggle('is-upcoming', isUpcoming);
      dot.tabIndex = isActive ? 0 : -1;
    });
  }

  function updateProgressUI(fraction) {
    dots.forEach((dot, idx) => {
      const fill = dot.querySelector('.faq-dot__fill');
      if (!fill) return;
      if (idx === currentIndex) {
        const pct = Math.min(100, Math.max(0, fraction * 100));
        fill.style.width = `${pct}%`;
      } else if (idx < currentIndex) {
        fill.style.width = '100%';
      } else {
        fill.style.width = '0%';
      }
    });
  }

  function updateCounterUI() {
    if (!counterEl) return;
    const current = String(currentIndex + 1).padStart(2, '0');
    const total = String(slides.length).padStart(2, '0');
    counterEl.textContent = `${current} / ${total}`;
  }

  function announceSlide(index) {
    if (!srStatus) return;
    const qText = questions[index] || `Question ${index + 1}`;
    srStatus.textContent = `Question ${index + 1} of ${slides.length}: ${qText}`;
  }

  function updateStageHeight() {
    if (!stage || slides.length === 0) return;
    let maxHeight = 0;
    slides.forEach(slide => {
      const h = slide.offsetHeight || slide.scrollHeight;
      if (h > maxHeight) maxHeight = h;
    });
    if (maxHeight > 0) {
      stage.style.minHeight = `${maxHeight}px`;
    }
  }

  function goToSlide(targetIndex, source = 'auto') {
    if (targetIndex < 0) targetIndex = slides.length - 1;
    if (targetIndex >= slides.length) targetIndex = 0;

    if (targetIndex === currentIndex && !isTransitioning) return;

    if (source === 'manual') {
      announceSlide(targetIndex);
    }

    if (transitionTimeoutId) {
      clearTimeout(transitionTimeoutId);
      transitionTimeoutId = null;
    }

    const prevIndex = currentIndex;
    const outgoingSlide = slides[prevIndex];
    const incomingSlide = slides[targetIndex];

    currentIndex = targetIndex;
    elapsedTime = 0;
    lastTimestamp = null;
    updateProgressUI(0);
    updateTabsUI();
    updateCounterUI();

    const motionOk = isMotionAllowed();

    if (!motionOk) {
      slides.forEach((slide, idx) => {
        const active = idx === targetIndex;
        slide.classList.toggle('is-active', active);
        slide.classList.remove('is-leaving');
        slide.setAttribute('aria-hidden', String(!active));
        if (active) {
          slide.removeAttribute('inert');
        } else {
          slide.setAttribute('inert', '');
        }
      });
      isTransitioning = false;
      updateStageHeight();
      return;
    }

    isTransitioning = true;

    // Reset non-involved slides
    slides.forEach((slide, idx) => {
      if (idx !== prevIndex && idx !== targetIndex) {
        slide.classList.remove('is-active', 'is-leaving');
        slide.setAttribute('aria-hidden', 'true');
        slide.setAttribute('inert', '');
      }
    });

    // Outgoing slide animation
    outgoingSlide.classList.remove('is-active');
    outgoingSlide.classList.add('is-leaving');
    outgoingSlide.setAttribute('aria-hidden', 'true');
    outgoingSlide.setAttribute('inert', '');

    // Incoming slide animation
    incomingSlide.classList.remove('is-leaving');
    incomingSlide.classList.add('is-active');
    incomingSlide.setAttribute('aria-hidden', 'false');
    incomingSlide.removeAttribute('inert');

    transitionTimeoutId = setTimeout(() => {
      outgoingSlide.classList.remove('is-leaving');
      isTransitioning = false;
      transitionTimeoutId = null;
      updateStageHeight();
    }, TRANSITION_DURATION);
  }

  function tick(timestamp) {
    if (shouldAutoplayRun()) {
      if (lastTimestamp !== null) {
        const delta = timestamp - lastTimestamp;
        elapsedTime += delta;
        if (elapsedTime >= HOLD_DURATION) {
          elapsedTime = 0;
          lastTimestamp = null;
          updateProgressUI(1);
          const nextIndex = (currentIndex + 1) % slides.length;
          goToSlide(nextIndex, 'auto');
          return;
        }
      }
      lastTimestamp = timestamp;
      updateProgressUI(elapsedTime / HOLD_DURATION);
    } else {
      lastTimestamp = null;
    }
    animFrameId = requestAnimationFrame(tick);
  }

  // Prev / Next Navigation
  listen(prevBtn, 'click', () => {
    const prev = (currentIndex - 1 + slides.length) % slides.length;
    goToSlide(prev, 'manual');
  });

  listen(nextBtn, 'click', () => {
    const next = (currentIndex + 1) % slides.length;
    goToSlide(next, 'manual');
  });

  // Play / Pause Button
  listen(playToggle, 'click', () => {
    isManuallyPaused = !isManuallyPaused;
    syncPlayButtonUI();
    if (!isManuallyPaused && isMotionAllowed()) {
      // Resume
      lastTimestamp = null;
    }
  });

  // Indicator Dots
  dots.forEach((dot, idx) => {
    listen(dot, 'click', () => {
      isFocused = false;
      goToSlide(idx, 'manual');
    });

    listen(dot, 'keydown', event => {
      let targetIdx = -1;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        targetIdx = (idx + 1) % dots.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        targetIdx = (idx - 1 + dots.length) % dots.length;
      } else if (event.key === 'Home') {
        targetIdx = 0;
      } else if (event.key === 'End') {
        targetIdx = dots.length - 1;
      }

      if (targetIdx !== -1) {
        event.preventDefault();
        dots[targetIdx].focus();
        isFocused = false;
        goToSlide(targetIdx, 'manual');
      }
    });
  });

  // Keyboard focus entering slide content pauses autoplay to avoid replacing content during interaction
  listen(carousel, 'focusin', event => {
    if (event.target && event.target.closest('.faq-slide')) {
      isFocused = true;
    }
  });

  listen(carousel, 'focusout', event => {
    if (!carousel.contains(event.relatedTarget)) {
      isFocused = false;
      lastTimestamp = null;
    }
  });

  // View All Questions Toggle
  if (viewAllBtn && allList) {
    listen(viewAllBtn, 'click', () => {
      isAllExpanded = !isAllExpanded;
      // Activating pauses the carousel; hiding must not unexpectedly restart autoplay
      isManuallyPaused = true;
      syncPlayButtonUI();

      viewAllBtn.setAttribute('aria-expanded', String(isAllExpanded));
      allList.hidden = !isAllExpanded;

      const textEl = viewAllBtn.querySelector('.faq-view-all-text');
      const iconEl = viewAllBtn.querySelector('.faq-view-all-icon');
      if (textEl) textEl.textContent = isAllExpanded ? 'Hide all questions' : 'View all questions';
      if (iconEl) iconEl.textContent = isAllExpanded ? '↑' : '↓';
    });
  }

  // IntersectionObserver for meaningful visibility
  const visibilityObserver = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      }
    },
    { threshold: [0, 0.25, 0.5] }
  );
  visibilityObserver.observe(section);

  // Tab visibility changes
  function onVisibilityChange() {
    isDocumentVisible = !document.hidden;
  }
  listen(document, 'visibilitychange', onVisibilityChange);

  // Motion preference changes & Site motion toggle changes
  function syncMotionState() {
    syncPlayButtonUI();
    if (!isMotionAllowed()) {
      isManuallyPaused = true;
      elapsedTime = 0;
      updateProgressUI(0);
      syncPlayButtonUI();
    }
  }

  listen(reducedMotionQuery, 'change', syncMotionState);

  const motionObserver = new MutationObserver(() => {
    syncMotionState();
  });
  motionObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-motion']
  });

  // Resize and Font load height calibration
  function handleResize() {
    updateStageHeight();
  }
  listen(window, 'resize', handleResize, { passive: true });

  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateStageHeight();
    });
    resizeObserver.observe(carousel);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      updateStageHeight();
    }).catch(() => {});
  }

  // Initial setup
  slides.forEach((slide, idx) => {
    const isActive = idx === 0;
    slide.classList.toggle('is-active', isActive);
    slide.classList.remove('is-leaving');
    slide.setAttribute('aria-hidden', String(!isActive));
    if (isActive) {
      slide.removeAttribute('inert');
    } else {
      slide.setAttribute('inert', '');
    }
  });

  updateTabsUI();
  updateProgressUI(0);
  updateCounterUI();
  syncPlayButtonUI();
  updateStageHeight();

  // Start tick loop
  animFrameId = requestAnimationFrame(tick);

  return function cleanup() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (transitionTimeoutId) clearTimeout(transitionTimeoutId);
    visibilityObserver.disconnect();
    motionObserver.disconnect();
    if (resizeObserver) resizeObserver.disconnect();
    eventCleanups.forEach(fn => fn());
    carousel.dataset.faqInitialized = 'false';
  };
}
