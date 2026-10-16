// Animated Pricing Card Component
// Handles card selection, Choose -> Chosen text morphing, enquiry preselection,
// and save-plan hearts with pop and 8-particle burst

const SAVED_PLANS_KEY = 'eg-saved-plans-v1';

export function getSavedPlans() {
  try {
    const raw = localStorage.getItem(SAVED_PLANS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePlan(planId) {
  try {
    const plans = getSavedPlans();
    if (!plans.includes(planId)) {
      plans.push(planId);
      localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(plans));
    }
  } catch {
    // Storage quota or private browsing
  }
}

export function unsavePlan(planId) {
  try {
    let plans = getSavedPlans();
    plans = plans.filter(id => id !== planId);
    localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(plans));
  } catch {
    // Storage quota or private browsing
  }
}

function getChooseText(planName) {
  if (planName === 'Basic Website') return 'Choose Basic';
  if (planName === 'Custom Website') return 'Choose Custom';
  if (planName === 'E-commerce') return 'Choose E-commerce';
  return `Choose ${planName}`;
}

export function initPricingCards() {
  const section = document.querySelector('#feedback');
  if (!section || section.dataset.pricingInitialized === 'true') return () => {};
  section.dataset.pricingInitialized = 'true';

  const grid = section.querySelector('.eg-package-grid');
  if (!grid) return () => {};

  const cards = Array.from(grid.querySelectorAll('.eg-package-card'));
  if (cards.length === 0) return () => {};

  cards.forEach(card => card.classList.add('pricing-card'));

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function isMotionAllowed() {
    if (reducedMotion.matches) return false;
    if (document.documentElement.dataset.motion === 'off') return false;
    return true;
  }

  // Helper to read scoped CSS variables from the component element
  function getScopedDuration(element, property, fallback) {
    const style = getComputedStyle(element);
    const val = style.getPropertyValue(property).trim();
    if (val.endsWith('ms')) return parseFloat(val) || fallback;
    if (val.endsWith('s')) return (parseFloat(val) || 0) * 1000;
    return fallback;
  }

  // Touch press state with 150ms reset for quick taps
  function bindTouchPress(el) {
    if (!el) return;
    let touchTimer = null;
    const pressDur = getScopedDuration(el, '--press-dur', 150);
    el.addEventListener('touchstart', () => {
      clearTimeout(touchTimer);
      el.classList.add('is-pressed');
    }, { passive: true });
    el.addEventListener('touchend', () => {
      clearTimeout(touchTimer);
      touchTimer = setTimeout(() => {
        el.classList.remove('is-pressed');
      }, pressDur);
    }, { passive: true });
    el.addEventListener('touchcancel', () => {
      clearTimeout(touchTimer);
      el.classList.remove('is-pressed');
    }, { passive: true });
  }

  // Restore saved heart states
  const savedPlans = getSavedPlans();
  cards.forEach(card => {
    const heartBtn = card.querySelector('.pricing-card__heart-btn');
    if (!heartBtn) return;
    const planId = heartBtn.dataset.planId || card.dataset.package || '';
    const planTitle = card.querySelector('.eg-package-card__title')?.textContent.trim() || 'plan';
    const isSaved = savedPlans.includes(planId);

    heartBtn.setAttribute('aria-pressed', String(isSaved));
    heartBtn.setAttribute('aria-label', `${isSaved ? 'Unsave' : 'Save'} ${planTitle}`);
    if (isSaved) {
      heartBtn.classList.add('is-saved');
    } else {
      heartBtn.classList.remove('is-saved');
    }
  });

  // Track active animation timers to handle rapid clicks safely
  const activeTimers = new Map();
  const morphTimers = new Map();

  const packageSelect = document.querySelector('#field-package');
  let selectedPackage = packageSelect?.value && packageSelect.value !== 'Not sure yet'
    ? packageSelect.value
    : 'Custom Website';

  function morphButtonLabel(btn, targetText, isSelected, animate = true) {
    const morph = btn.querySelector('.pricing-card__btn-morph');
    if (!morph) return;

    if (morphTimers.has(btn)) {
      clearTimeout(morphTimers.get(btn));
      morphTimers.delete(btn);
    }

    const currentTextEl = morph.querySelector('.pricing-card__btn-text:not(.pricing-card__btn-text--outgoing)');
    const currentText = currentTextEl ? currentTextEl.textContent.trim() : '';

    if (currentText === targetText && morph.children.length === 1) {
      return;
    }

    // Under reduced motion or when animation is disabled, replace immediately
    if (!animate || !isMotionAllowed() || !currentText) {
      morph.innerHTML = `<span class="pricing-card__btn-text ${isSelected ? 'pricing-card__btn-text--chosen' : 'pricing-card__btn-text--choose'}">${targetText}</span>`;
      morph.style.width = '';
      morph.style.transition = '';
      return;
    }

    const startWidth = morph.offsetWidth;

    morph.innerHTML = '';

    const outgoing = document.createElement('span');
    outgoing.className = 'pricing-card__btn-text pricing-card__btn-text--outgoing';
    outgoing.textContent = currentText;

    const incoming = document.createElement('span');
    incoming.className = 'pricing-card__btn-text pricing-card__btn-text--incoming';
    incoming.textContent = targetText;

    morph.appendChild(outgoing);
    morph.appendChild(incoming);

    const targetWidth = incoming.offsetWidth;

    morph.style.width = `${startWidth}px`;
    morph.style.transition = 'width var(--text-morph-resize-dur) var(--text-morph-ease)';

    // Force reflow
    void morph.offsetWidth;

    morph.style.width = `${targetWidth}px`;
    outgoing.classList.add('is-animating');
    incoming.classList.add('is-animating');

    const resizeDur = getScopedDuration(btn, '--text-morph-resize-dur', 240);
    const timer = setTimeout(() => {
      morph.innerHTML = `<span class="pricing-card__btn-text ${isSelected ? 'pricing-card__btn-text--chosen' : 'pricing-card__btn-text--choose'}">${targetText}</span>`;
      morph.style.width = '';
      morph.style.transition = '';
      morphTimers.delete(btn);
    }, resizeDur);

    morphTimers.set(btn, timer);
  }

  function updateSelectedCard(pkgName, shouldScroll = false, isInitial = false) {
    selectedPackage = pkgName;

    cards.forEach(card => {
      const btn = card.querySelector('.eg-package-card__btn');
      const planName = card.dataset.package || btn?.dataset.package || 'package';
      const isCardSelected = (planName === pkgName);
      card.classList.toggle('is-selected', isCardSelected);

      if (btn) {
        btn.setAttribute('aria-pressed', String(isCardSelected));
        const srText = btn.querySelector('.pricing-card__btn-sr');
        if (srText) {
          srText.textContent = isCardSelected ? `${planName} chosen` : `Choose ${planName}`;
        }
        btn.setAttribute('aria-label', isCardSelected ? `${planName} chosen` : `Choose ${planName}`);

        const targetText = isCardSelected ? 'Chosen' : getChooseText(planName);
        morphButtonLabel(btn, targetText, isCardSelected, !isInitial);
      }
    });

    if (packageSelect && packageSelect.value !== pkgName) {
      packageSelect.value = pkgName;
      packageSelect.dispatchEvent(new Event('change', { bubbles: true }));
      packageSelect.dispatchEvent(new Event('input', { bubbles: true }));
      packageSelect.classList.add('is-highlighted');
      setTimeout(() => {
        packageSelect.classList.remove('is-highlighted');
      }, 1600);
    }

    if (shouldScroll) {
      const targetElement = document.querySelector('#brief-form') || document.querySelector('#brief');
      if (targetElement) {
        const header = document.querySelector('.header');
        const headerHeight = header ? header.offsetHeight : 84;
        const targetY = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 16;
        window.scrollTo({
          top: Math.max(0, targetY),
          behavior: reducedMotion.matches ? 'instant' : 'smooth'
        });
      }
      if (packageSelect) {
        packageSelect.focus({ preventScroll: true });
      }
    }
  }

  // Set initial selection without animation
  updateSelectedCard(selectedPackage, false, true);

  cards.forEach(card => {
    // Non-interactive card clicking selects plan without scrolling
    card.addEventListener('click', event => {
      if (event.target.closest('button') || event.target.closest('a') || event.target.closest('input') || event.target.closest('select')) {
        return;
      }
      const btn = card.querySelector('.eg-package-card__btn');
      const pkg = card.dataset.package || btn?.dataset.package;
      if (pkg) {
        updateSelectedCard(pkg, false, false);
      }
    });

    // Choose button selects plan, updates form, and scrolls
    const chooseBtn = card.querySelector('.eg-package-card__btn');
    if (chooseBtn) {
      bindTouchPress(chooseBtn);
      chooseBtn.addEventListener('click', event => {
        event.stopPropagation();
        const pkg = chooseBtn.dataset.package || card.dataset.package;
        if (pkg) {
          updateSelectedCard(pkg, true, false);
        }
      });
    }

    // Heart button saves/unsaves plan
    const heartBtn = card.querySelector('.pricing-card__heart-btn');
    if (heartBtn) {
      bindTouchPress(heartBtn);
      heartBtn.addEventListener('click', event => {
        event.stopPropagation();
        event.preventDefault();

        const planId = heartBtn.dataset.planId || card.dataset.package || '';
        const planTitle = card.querySelector('.eg-package-card__title')?.textContent.trim() || 'plan';
        const isCurrentlySaved = heartBtn.getAttribute('aria-pressed') === 'true';

        // Clear any ongoing animation timers for this heart button
        if (activeTimers.has(heartBtn)) {
          activeTimers.get(heartBtn).forEach(t => clearTimeout(t));
          activeTimers.delete(heartBtn);
        }

        if (isCurrentlySaved) {
          // Unsave without pop or burst
          unsavePlan(planId);
          heartBtn.setAttribute('aria-pressed', 'false');
          heartBtn.setAttribute('aria-label', `Save ${planTitle}`);
          heartBtn.classList.remove('is-saved');
          heartBtn.classList.remove('is-popping');
          const particlesContainer = heartBtn.querySelector('.pricing-card__particles');
          if (particlesContainer) particlesContainer.innerHTML = '';
        } else {
          // Save with pop and 8-particle burst
          savePlan(planId);
          heartBtn.setAttribute('aria-pressed', 'true');
          heartBtn.setAttribute('aria-label', `Unsave ${planTitle}`);
          heartBtn.classList.add('is-saved');

          if (isMotionAllowed()) {
            const timers = [];
            heartBtn.classList.add('is-popping');
            const popDur = getScopedDuration(heartBtn, '--like-pop', 350);
            timers.push(setTimeout(() => {
              heartBtn.classList.remove('is-popping');
            }, popDur));

            // Generate 8 particles
            const particlesContainer = heartBtn.querySelector('.pricing-card__particles');
            if (particlesContainer) {
              particlesContainer.innerHTML = '';
              const angles = [0, 45, 90, 135, 180, 225, 270, 315];
              angles.forEach((angle, i) => {
                const particle = document.createElement('span');
                particle.className = 'pricing-card__particle';
                particle.setAttribute('aria-hidden', 'true');
                particle.style.setProperty('--angle', `${angle}deg`);
                particle.style.animationDelay = `${i * 12}ms`;
                particlesContainer.appendChild(particle);
              });

              const particleDur = getScopedDuration(heartBtn, '--like-particle-dur', 600) + 120;
              timers.push(setTimeout(() => {
                particlesContainer.innerHTML = '';
              }, particleDur));
            }

            activeTimers.set(heartBtn, timers);
          }
        }
      });
    }
  });

  return () => {
    activeTimers.forEach(timers => timers.forEach(t => clearTimeout(t)));
    activeTimers.clear();
    morphTimers.forEach(t => clearTimeout(t));
    morphTimers.clear();
  };
}
