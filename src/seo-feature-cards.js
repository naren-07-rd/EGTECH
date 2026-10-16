// Highlighted Feature Cards interaction
// Single shared highlight, pointer/keyboard/touch handling, and responsive tracking

export function initSeoFeatureCards() {
  const grid = document.querySelector('#visibility .seo-feature-grid');
  if (!grid || grid.dataset.initialized === 'true') return () => {};
  grid.dataset.initialized = 'true';

  const cards = Array.from(grid.querySelectorAll('.seo-feature-card'));
  if (cards.length === 0) return () => {};

  let highlight = grid.querySelector('.seo-feature-highlight');
  if (!highlight) {
    highlight = document.createElement('div');
    highlight.className = 'seo-feature-highlight';
    highlight.setAttribute('aria-hidden', 'true');
    grid.prepend(highlight);
  }

  let activeCard = cards.find(c => c.getAttribute('aria-pressed') === 'true') || cards[0];
  let currentPressedCard = null;
  let pressStartTime = 0;
  let pressTimer = null;

  function getPressDuration() {
    const style = getComputedStyle(grid);
    const val = style.getPropertyValue('--press-dur').trim();
    if (val.endsWith('ms')) return parseFloat(val) || 150;
    if (val.endsWith('s')) return (parseFloat(val) || 0.15) * 1000;
    return 150;
  }

  function updateHighlight(card, immediate = false) {
    if (!card) return;
    const x = card.offsetLeft;
    const y = card.offsetTop;
    const w = card.offsetWidth;
    const h = card.offsetHeight;

    if (immediate) {
      highlight.style.transition = 'none';
    }

    grid.style.setProperty('--hl-x', `${x}px`);
    grid.style.setProperty('--hl-y', `${y}px`);
    grid.style.setProperty('--hl-w', `${w}px`);
    grid.style.setProperty('--hl-h', `${h}px`);

    if (immediate) {
      void highlight.offsetWidth;
      highlight.style.removeProperty('transition');
    }
  }

  function selectCard(card) {
    if (!card) return;
    activeCard = card;
    cards.forEach(c => {
      c.setAttribute('aria-pressed', String(c === card));
    });
    updateHighlight(card);
  }

  function clearPress(card, immediate = false) {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    if (!card) return;
    if (immediate) {
      card.classList.remove('is-pressed');
      if (currentPressedCard === card) currentPressedCard = null;
      return;
    }
    const minPress = getPressDuration();
    const elapsed = performance.now() - pressStartTime;
    const remaining = Math.max(0, minPress - elapsed);
    if (remaining > 0) {
      pressTimer = setTimeout(() => {
        card.classList.remove('is-pressed');
        if (currentPressedCard === card) currentPressedCard = null;
        pressTimer = null;
      }, remaining);
    } else {
      card.classList.remove('is-pressed');
      if (currentPressedCard === card) currentPressedCard = null;
    }
  }

  cards.forEach(card => {
    // Hover selection only for mouse input
    card.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') {
        selectCard(card);
      }
    });

    // Focus selection for keyboard navigation
    card.addEventListener('focus', () => {
      selectCard(card);
    });

    // Tactile press on pointer down
    card.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (currentPressedCard && currentPressedCard !== card) {
        clearPress(currentPressedCard, true);
      }
      currentPressedCard = card;
      pressStartTime = performance.now();
      card.classList.add('is-pressed');
      selectCard(card);
    });

    // Pointer up: maintain minimum 150ms press feedback
    card.addEventListener('pointerup', () => {
      if (currentPressedCard === card) {
        clearPress(card, false);
      }
    });

    // Clean up pressed states on pointer cancel or lost interaction
    card.addEventListener('pointercancel', () => {
      clearPress(card, true);
    });

    card.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse' && currentPressedCard === card) {
        clearPress(card, true);
      }
    });

    // Click handler for Enter/Space keyboard activation
    card.addEventListener('click', () => {
      selectCard(card);
    });
  });

  // Global safety handlers to clear stuck pressed state
  const onWindowPointerUp = () => {
    if (currentPressedCard) clearPress(currentPressedCard, false);
  };
  const onWindowPointerCancel = () => {
    if (currentPressedCard) clearPress(currentPressedCard, true);
  };
  const onWindowBlur = () => {
    if (currentPressedCard) clearPress(currentPressedCard, true);
  };

  window.addEventListener('pointerup', onWindowPointerUp, { passive: true });
  window.addEventListener('pointercancel', onWindowPointerCancel, { passive: true });
  window.addEventListener('blur', onWindowBlur, { passive: true });

  // Initial placement without entrance slide
  selectCard(activeCard);
  updateHighlight(activeCard, true);
  requestAnimationFrame(() => {
    highlight.classList.add('is-ready');
  });

  // Responsive recalculations
  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateHighlight(activeCard);
    });
    resizeObserver.observe(grid);
    cards.forEach(c => resizeObserver.observe(c));
  }

  const onWindowResize = () => updateHighlight(activeCard);
  window.addEventListener('resize', onWindowResize, { passive: true });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => updateHighlight(activeCard));
  }

  return () => {
    if (resizeObserver) resizeObserver.disconnect();
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('pointercancel', onWindowPointerCancel);
    window.removeEventListener('blur', onWindowBlur);
  };
}
