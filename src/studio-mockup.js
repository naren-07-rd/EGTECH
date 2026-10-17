/**
 * Interactive Desktop & Mobile Studio Mockup
 * Synchronized previews for Web Dev, UI/UX, E-commerce, and Automation
 */

export function initStudioMockup() {
  const section = document.querySelector('#philosophy');
  if (!section) return () => {};

  const stage = section.querySelector('.eg-mockup-stage');
  const devices = section.querySelector('.eg-mockup-devices');
  const liveRegion = section.querySelector('#mockup-live-status');

  // Shared state model
  const state = {
    activeTab: 'webdev', // 'webdev' | 'uiux' | 'ecommerce' | 'automation'
    uiuxView: 'grid', // 'grid' | 'list'
    cartItems: new Set(),
    servicesRevealed: false,
    automationRunning: false,
    automationTimers: []
  };

  const cleanups = [];

  function announce(message) {
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }

  function isMotionAllowed() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const siteMotionOff = document.documentElement.getAttribute('data-motion') === 'off';
    return !reduced && !siteMotionOff;
  }

  // Clear running automation timers
  function clearAutomationTimers() {
    state.automationTimers.forEach(id => clearTimeout(id));
    state.automationTimers = [];
    state.automationRunning = false;
  }

  // -------------------------------------------------------------------------
  // 1. Tab Switching & Synchronization
  // -------------------------------------------------------------------------
  const tabButtons = Array.from(section.querySelectorAll('.eg-mockup-tab'));
  const desktopPanels = Array.from(section.querySelectorAll('.eg-mockup-desktop .eg-mockup-panel'));
  const mobilePanels = Array.from(section.querySelectorAll('.eg-mockup-mobile .eg-mockup-mobile-panel'));

  function setActiveTab(tabId, announceText = true) {
    if (state.activeTab === tabId && !announceText) return;

    // If leaving automation, reset its timers
    if (state.activeTab === 'automation' && tabId !== 'automation') {
      clearAutomationTimers();
      resetAutomationUI();
    }

    state.activeTab = tabId;

    // Update tab buttons
    tabButtons.forEach(btn => {
      const isMatch = btn.dataset.tab === tabId;
      btn.classList.toggle('is-active', isMatch);
      btn.setAttribute('aria-selected', String(isMatch));
      btn.setAttribute('tabindex', isMatch ? '0' : '-1');
    });

    // Update desktop panels
    desktopPanels.forEach(panel => {
      const isMatch = panel.dataset.panel === tabId;
      panel.classList.toggle('is-active', isMatch);
      panel.setAttribute('aria-hidden', String(!isMatch));
    });

    // Update mobile panels
    mobilePanels.forEach(panel => {
      const isMatch = panel.dataset.panel === tabId;
      panel.classList.toggle('is-active', isMatch);
      panel.setAttribute('aria-hidden', String(!isMatch));
    });

    if (announceText) {
      const label = {
        webdev: 'Web Development preview selected',
        uiux: 'UI/UX Design preview selected',
        ecommerce: 'E-commerce preview selected',
        automation: 'Automation pipeline preview selected'
      }[tabId] || `${tabId} preview selected`;
      announce(label);
    }
  }

  tabButtons.forEach((btn, index) => {
    const onClick = (e) => {
      e.preventDefault();
      setActiveTab(btn.dataset.tab);
    };

    const onKeyDown = (e) => {
      let nextIndex = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIndex = (index + 1) % tabButtons.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = tabButtons.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        tabButtons[nextIndex].focus();
        setActiveTab(tabButtons[nextIndex].dataset.tab);
      }
    };

    btn.addEventListener('click', onClick);
    btn.addEventListener('keydown', onKeyDown);
    cleanups.push(() => {
      btn.removeEventListener('click', onClick);
      btn.removeEventListener('keydown', onKeyDown);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Web Development: "View services" Action
  // -------------------------------------------------------------------------
  const viewServicesBtns = section.querySelectorAll('.mockup-view-services-btn');
  const webdevPreviews = section.querySelectorAll('.eg-preview-webdev, .eg-preview-webdev-mobile');

  function toggleServicesReveal() {
    state.servicesRevealed = !state.servicesRevealed;
    webdevPreviews.forEach(el => {
      el.classList.toggle('is-services-revealed', state.servicesRevealed);
    });
    viewServicesBtns.forEach(btn => {
      btn.textContent = state.servicesRevealed ? 'Hide services ←' : 'View services →';
    });
    announce(state.servicesRevealed ? 'Services constellation revealed' : 'Services constellation hidden');
  }

  viewServicesBtns.forEach(btn => {
    btn.addEventListener('click', toggleServicesReveal);
    cleanups.push(() => btn.removeEventListener('click', toggleServicesReveal));
  });

  // -------------------------------------------------------------------------
  // 3. UI/UX Design: List vs Grid Toggle
  // -------------------------------------------------------------------------
  const toggleBtns = section.querySelectorAll('.eg-toggle-btn');
  const uiuxCardsContainers = section.querySelectorAll('.eg-uiux-cards');

  function setUiuxView(view) {
    state.uiuxView = view;
    toggleBtns.forEach(btn => {
      const isMatch = btn.dataset.view === view;
      btn.classList.toggle('is-active', isMatch);
      btn.setAttribute('aria-pressed', String(isMatch));
    });
    uiuxCardsContainers.forEach(container => {
      container.classList.remove('view-grid', 'view-list');
      container.classList.add(`view-${view}`);
    });
    announce(`UI/UX components switched to ${view} layout`);
  }

  toggleBtns.forEach(btn => {
    const onClick = (e) => {
      e.preventDefault();
      setUiuxView(btn.dataset.view);
    };
    btn.addEventListener('click', onClick);
    cleanups.push(() => btn.removeEventListener('click', onClick));
  });

  // -------------------------------------------------------------------------
  // 4. E-commerce: Add to Cart & Counter Sync
  // -------------------------------------------------------------------------
  const addCartBtns = section.querySelectorAll('.eg-add-cart-btn');
  const cartBadges = section.querySelectorAll('.mockup-cart-count');

  function updateCartUI() {
    const count = state.cartItems.size;
    cartBadges.forEach(badge => {
      badge.textContent = String(count);
    });

    addCartBtns.forEach(btn => {
      const prodId = btn.dataset.item || btn.dataset.productId;
      const isAdded = state.cartItems.has(prodId);
      btn.classList.toggle('is-added', isAdded);
      btn.textContent = isAdded ? 'Remove ✓' : 'Add +';
      btn.setAttribute('aria-pressed', String(isAdded));
    });
  }

  addCartBtns.forEach(btn => {
    const onClick = (e) => {
      e.preventDefault();
      const prodId = btn.dataset.item || btn.dataset.productId;
      const prodName = btn.dataset.productName || 'Item';
      if (state.cartItems.has(prodId)) {
        state.cartItems.delete(prodId);
        announce(`${prodName} removed from demo cart`);
      } else {
        state.cartItems.add(prodId);
        announce(`${prodName} added to demo cart`);
      }
      updateCartUI();
    };
    btn.addEventListener('click', onClick);
    cleanups.push(() => btn.removeEventListener('click', onClick));
  });

  // -------------------------------------------------------------------------
  // 5. Automation: Step-by-Step Simulation
  // -------------------------------------------------------------------------
  const autoRunBtns = section.querySelectorAll('.eg-auto-run-btn');
  const autoSteps = section.querySelectorAll('.eg-auto-step');
  const autoStatusEls = section.querySelectorAll('.eg-auto-status');

  function resetAutomationUI() {
    autoSteps.forEach(step => {
      step.classList.remove('is-active', 'is-finished');
    });
    autoStatusEls.forEach(el => {
      el.textContent = 'Idle · Ready to run';
      el.classList.remove('is-complete');
    });
    autoRunBtns.forEach(btn => {
      btn.textContent = 'Run demo ▶';
      btn.disabled = false;
    });
  }

  function runAutomation() {
    if (state.automationRunning) return;
    clearAutomationTimers();
    state.automationRunning = true;

    autoRunBtns.forEach(btn => {
      btn.textContent = 'Running demo...';
      btn.disabled = true;
    });

    // Reset steps
    autoSteps.forEach(step => step.classList.remove('is-active', 'is-finished'));
    autoStatusEls.forEach(el => {
      el.textContent = 'Step 1/3: Enquiry Received...';
      el.classList.remove('is-complete');
    });

    // Step 1: Enquiry
    const step1Els = section.querySelectorAll('.eg-auto-step[data-step="1"]');
    step1Els.forEach(el => el.classList.add('is-active'));
    announce('Automation started. Step 1: Enquiry Received.');

    // Step 2 timer (650ms)
    const t1 = setTimeout(() => {
      step1Els.forEach(el => {
        el.classList.remove('is-active');
        el.classList.add('is-finished');
      });

      const step2Els = section.querySelectorAll('.eg-auto-step[data-step="2"]');
      step2Els.forEach(el => el.classList.add('is-active'));
      autoStatusEls.forEach(el => { el.textContent = 'Step 2/3: Instant Notification...'; });
      announce('Step 2: Instant Notification Sent to Team.');

      // Step 3 timer (+650ms)
      const t2 = setTimeout(() => {
        step2Els.forEach(el => {
          el.classList.remove('is-active');
          el.classList.add('is-finished');
        });

        const step3Els = section.querySelectorAll('.eg-auto-step[data-step="3"]');
        step3Els.forEach(el => el.classList.add('is-active'));
        autoStatusEls.forEach(el => { el.textContent = 'Step 3/3: Smart Follow-up...'; });
        announce('Step 3: Smart Follow-up Scheduled.');

        // Completion timer (+550ms)
        const t3 = setTimeout(() => {
          step3Els.forEach(el => {
            el.classList.remove('is-active');
            el.classList.add('is-finished');
          });

          autoStatusEls.forEach(el => {
            el.textContent = 'Demo complete.';
            el.classList.add('is-complete');
          });

          autoRunBtns.forEach(btn => {
            btn.textContent = 'Replay demo ↺';
            btn.disabled = false;
          });

          state.automationRunning = false;
          announce('Automation demo complete.');
        }, 550);

        state.automationTimers.push(t3);
      }, 650);

      state.automationTimers.push(t2);
    }, 650);

    state.automationTimers.push(t1);
  }

  autoRunBtns.forEach(btn => {
    btn.addEventListener('click', runAutomation);
    cleanups.push(() => btn.removeEventListener('click', runAutomation));
  });

  // -------------------------------------------------------------------------
  // 6. Subtle Fine-Pointer Device Tilt
  // -------------------------------------------------------------------------
  if (stage && devices && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let rafId = null;
    let targetRotateX = 1;
    let targetRotateY = -2;

    const onPointerMove = (e) => {
      if (!isMotionAllowed()) return;
      const rect = stage.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const relY = (e.clientY - rect.top) / rect.height - 0.5;

      targetRotateY = relX * 4;
      targetRotateX = -relY * 3;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          devices.style.transform = `rotateX(${targetRotateX.toFixed(2)}deg) rotateY(${targetRotateY.toFixed(2)}deg)`;
          rafId = null;
        });
      }
    };

    const onPointerLeave = () => {
      if (!isMotionAllowed()) return;
      devices.style.transform = '';
    };

    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerleave', onPointerLeave);

    cleanups.push(() => {
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerleave', onPointerLeave);
      if (rafId) cancelAnimationFrame(rafId);
    });
  }

  // Initialize default active state
  setActiveTab('webdev', false);

  // Return cleanup function
  return () => {
    clearAutomationTimers();
    cleanups.forEach(fn => fn());
  };
}
