// Process Steps Rows interaction
// Straight vertical list with numbered circles, connecting progress line,
// desktop hover previews with stationary pointer protection, touch toggle,
// keyboard accessibility, and tactile touch press feedback.

export function initProcessSteps() {
  const container = document.querySelector('#process .process-steps');
  if (!container || container.dataset.initialized === 'true') return () => {};
  container.dataset.initialized = 'true';

  const rail = container.querySelector('.process-steps__rail');
  const lineFill = container.querySelector('.process-steps__line-fill');
  const steps = Array.from(container.querySelectorAll('.process-step'));
  const headers = Array.from(container.querySelectorAll('.process-step__header'));
  const panels = Array.from(container.querySelectorAll('.process-step__panel'));
  const circles = Array.from(container.querySelectorAll('.process-step__circle'));

  if (steps.length === 0 || headers.length === 0 || panels.length === 0) {
    return () => {};
  }

  let activeStep = -1;
  let hoveredStep = -1;
  let currentPressedHeader = null;
  let pressStartTime = 0;
  let pressTimer = null;
  const collapseTimers = new Map();
  let animFrameId = null;
  let animEndTime = 0;

  // Track real pointer movements to guard against cascades from shifting rows
  let lastClientX = null;
  let lastClientY = null;

  // Track keyboard navigation vs pointer interaction
  let isKeyboardNav = false;
  let justFocusedByKeyboard = false;

  function getDurationMs(varName, defaultMs) {
    const val = getComputedStyle(container).getPropertyValue(varName).trim();
    if (val.endsWith('ms')) return parseFloat(val) || defaultMs;
    if (val.endsWith('s')) return (parseFloat(val) || (defaultMs / 1000)) * 1000;
    return defaultMs;
  }

  function updateConnector() {
    if (circles.length < 2 || !rail || !lineFill) return;
    const containerRect = container.getBoundingClientRect();
    const c0Rect = circles[0].getBoundingClientRect();
    const cLastRect = circles[circles.length - 1].getBoundingClientRect();

    const c0_center_x = (c0Rect.left + c0Rect.right) / 2 - containerRect.left;
    const c0_center_y = (c0Rect.top + c0Rect.bottom) / 2 - containerRect.top;
    const cLast_center_y = (cLastRect.top + cLastRect.bottom) / 2 - containerRect.top;

    rail.style.left = `${c0_center_x}px`;
    rail.style.top = `${c0_center_y}px`;
    rail.style.height = `${Math.max(0, cLast_center_y - c0_center_y)}px`;

    if (activeStep >= 0 && activeStep < circles.length) {
      const activeCircleRect = circles[activeStep].getBoundingClientRect();
      const active_center_y = (activeCircleRect.top + activeCircleRect.bottom) / 2 - containerRect.top;
      const fillHeight = Math.max(0, active_center_y - c0_center_y);
      lineFill.style.height = `${fillHeight}px`;
    } else {
      lineFill.style.height = '0px';
    }
  }

  function startConnectorAnimation() {
    const expandDur = getDurationMs('--acc-expand-dur', 250);
    const lineDur = getDurationMs('--line-dur', 400);
    const duration = Math.max(expandDur, lineDur) + 80;
    animEndTime = performance.now() + duration;

    if (animFrameId) cancelAnimationFrame(animFrameId);

    function loop() {
      updateConnector();
      if (performance.now() < animEndTime) {
        animFrameId = requestAnimationFrame(loop);
      } else {
        animFrameId = null;
        updateConnector();
      }
    }
    animFrameId = requestAnimationFrame(loop);
  }

  function setActiveStep(nextStep) {
    if (nextStep === activeStep) return;

    // Update circles appearance
    steps.forEach((step, idx) => {
      if (nextStep === -1) {
        step.removeAttribute('data-circle');
      } else if (idx <= nextStep) {
        step.setAttribute('data-circle', 'accented');
      } else {
        step.removeAttribute('data-circle');
      }
    });

    // Update panels and headers
    steps.forEach((step, idx) => {
      const header = headers[idx];
      const panel = panels[idx];

      if (idx === nextStep) {
        if (collapseTimers.has(idx)) {
          clearTimeout(collapseTimers.get(idx));
          collapseTimers.delete(idx);
        }
        panel.hidden = false;
        panel.removeAttribute('inert');
        header.setAttribute('aria-expanded', 'true');
        void panel.offsetHeight; // Force reflow for height transition
        step.setAttribute('data-state', 'open');
      } else {
        header.setAttribute('aria-expanded', 'false');
        step.setAttribute('data-state', 'closed');

        if (collapseTimers.has(idx)) {
          clearTimeout(collapseTimers.get(idx));
          collapseTimers.delete(idx);
        }

        const collapseDur = getDurationMs('--acc-collapse-dur', 250);
        if (collapseDur <= 1) {
          panel.hidden = true;
          panel.setAttribute('inert', '');
        } else {
          const timer = setTimeout(() => {
            if (step.getAttribute('data-state') === 'closed') {
              panel.hidden = true;
              panel.setAttribute('inert', '');
            }
            collapseTimers.delete(idx);
          }, collapseDur);
          collapseTimers.set(idx, timer);
        }
      }
    });

    activeStep = nextStep;
    container.dataset.activeStep = String(nextStep);
    startConnectorAnimation();
  }

  function clearPress(header, immediate = false) {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    if (!header) return;
    if (immediate) {
      header.classList.remove('is-pressed');
      if (currentPressedHeader === header) currentPressedHeader = null;
      return;
    }
    const minPress = getDurationMs('--press-dur', 150);
    const elapsed = performance.now() - pressStartTime;
    const remaining = Math.max(0, minPress - elapsed);
    if (remaining > 0) {
      pressTimer = setTimeout(() => {
        header.classList.remove('is-pressed');
        if (currentPressedHeader === header) currentPressedHeader = null;
        pressTimer = null;
      }, remaining);
    } else {
      header.classList.remove('is-pressed');
      if (currentPressedHeader === header) currentPressedHeader = null;
    }
  }

  // Guard against synthetic events caused by row height expansion underneath a stationary pointer
  function hasPointerPhysicallyMoved(event) {
    if (event.pointerType === 'touch') return false;
    if (lastClientX === null || lastClientY === null) {
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      return true;
    }
    const dx = Math.abs(event.clientX - lastClientX);
    const dy = Math.abs(event.clientY - lastClientY);
    if (dx >= 2 || dy >= 2) {
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      return true;
    }
    return false;
  }

  // Window-level tracking for keyboard focus vs pointer
  const onWindowKeyDown = (e) => {
    if (e.key === 'Tab' || e.key.startsWith('Arrow')) {
      isKeyboardNav = true;
    }
  };

  const onWindowPointerDown = () => {
    isKeyboardNav = false;
    justFocusedByKeyboard = false;
  };

  const onWindowPointerUp = () => {
    if (currentPressedHeader) clearPress(currentPressedHeader, false);
  };

  const onWindowPointerCancel = () => {
    if (currentPressedHeader) clearPress(currentPressedHeader, true);
  };

  window.addEventListener('keydown', onWindowKeyDown, { capture: true, passive: true });
  window.addEventListener('pointerdown', onWindowPointerDown, { capture: true, passive: true });
  window.addEventListener('pointerup', onWindowPointerUp, { passive: true });
  window.addEventListener('pointercancel', onWindowPointerCancel, { passive: true });

  // Step-level handlers
  steps.forEach((step, index) => {
    const header = headers[index];

    // Desktop hover handling: only triggers when pointer physically moves into/over a step
    const handlePointerHover = (event) => {
      if (event.pointerType === 'touch') return;
      if (!hasPointerPhysicallyMoved(event)) return;
      hoveredStep = index;
      setActiveStep(index);
    };

    step.addEventListener('pointerenter', handlePointerHover);
    step.addEventListener('pointermove', handlePointerHover);

    // Keyboard focus on header reveals details
    header.addEventListener('focus', () => {
      if (isKeyboardNav) {
        justFocusedByKeyboard = true;
        setActiveStep(index);
      }
    });

    header.addEventListener('blur', () => {
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (!container.contains(activeEl) && hoveredStep === -1) {
          setActiveStep(-1);
        }
      }, 10);
    });

    // Tactile press on pointer down
    header.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (currentPressedHeader && currentPressedHeader !== header) {
        clearPress(currentPressedHeader, true);
      }
      currentPressedHeader = header;
      pressStartTime = performance.now();
      header.classList.add('is-pressed');
    });

    header.addEventListener('pointerup', () => {
      if (currentPressedHeader === header) {
        clearPress(header, false);
      }
    });

    header.addEventListener('pointercancel', () => {
      clearPress(header, true);
    });

    header.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse' && currentPressedHeader === header) {
        clearPress(header, true);
      }
    });

    // Click handler:
    // Handles touch taps, mouse clicks, and native Enter/Space activation.
    // If step is open: tapping/clicking it toggles it closed.
    // Avoids immediate closing when focus precedes click.
    header.addEventListener('click', (event) => {
      if (activeStep === index) {
        if (event.detail === 0 && justFocusedByKeyboard) {
          // Enter/Space pressed after keyboard tab
          setActiveStep(-1);
        } else if (!justFocusedByKeyboard) {
          // Pointer click or subsequent keyboard activation on already open step
          setActiveStep(-1);
        }
      } else {
        setActiveStep(index);
      }
      justFocusedByKeyboard = false;
    });
  });

  // When pointer leaves the entire list, collapse hovered details unless keyboard focus is retained
  container.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'touch') return;
    hoveredStep = -1;
    lastClientX = null;
    lastClientY = null;

    const activeEl = document.activeElement;
    if (activeEl && container.contains(activeEl)) {
      const focusedIndex = steps.findIndex(s => s.contains(activeEl));
      if (focusedIndex >= 0) {
        setActiveStep(focusedIndex);
        return;
      }
    }
    setActiveStep(-1);
  });

  // Resize handling
  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateConnector();
    });
    resizeObserver.observe(container);
  }

  const onWindowResize = () => {
    updateConnector();
  };
  window.addEventListener('resize', onWindowResize, { passive: true });

  // Initial alignment
  updateConnector();
  // Ensure panels start hidden and inert
  panels.forEach(p => {
    p.hidden = true;
    p.setAttribute('inert', '');
  });

  return function dispose() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (pressTimer) clearTimeout(pressTimer);
    collapseTimers.forEach(t => clearTimeout(t));
    collapseTimers.clear();

    window.removeEventListener('keydown', onWindowKeyDown, { capture: true });
    window.removeEventListener('pointerdown', onWindowPointerDown, { capture: true });
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('pointercancel', onWindowPointerCancel);
    window.removeEventListener('resize', onWindowResize);

    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    container.removeAttribute('data-initialized');
  };
}
