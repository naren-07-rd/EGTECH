import { getLenis, scrollToTarget } from './smooth-scroll.js';

/**
 * Animated Circular Mobile Navigation Menu
 *
 * Implements a radial expanding menu centered within a full-viewport navy overlay.
 * Replaces the legacy "Menu +" control with a compact 44-48px circular hamburger button,
 * morphing lines into an "X", six circular destination items with staggered transitions,
 * accessible keyboard trapping, backdrop click-to-close, body scroll locking, and smooth
 * destination routing via scrollToTarget.
 */
export function initMobileMenu() {
  const triggerBtn = document.querySelector('.menu-toggle');
  const overlay = document.querySelector('#mobile-nav');
  if (!triggerBtn || !overlay) return () => {};

  const centerBtn = overlay.querySelector('.eg-radial-center-btn');
  const backdrop = overlay.querySelector('.eg-radial-backdrop');
  const scroller = overlay.querySelector('.eg-radial-scroller');
  const links = Array.from(overlay.querySelectorAll('.eg-radial-item'));
  const focusable = [centerBtn, ...links].filter(Boolean);

  let isOpen = false;
  let lastFocusedElement = null;
  let closeTimeout = null;

  function lockScroll() {
    getLenis()?.stop();
    document.documentElement.classList.add('mobile-nav-open');
    document.body.style.overflow = 'hidden';
  }

  function unlockScroll() {
    document.body.style.overflow = '';
    document.documentElement.classList.remove('mobile-nav-open');
    getLenis()?.start();
    getLenis()?.resize();
  }

  function openMenu() {
    if (isOpen) return;
    isOpen = true;
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }

    lastFocusedElement = document.activeElement;
    lockScroll();

    overlay.hidden = false;
    triggerBtn.setAttribute('aria-expanded', 'true');
    triggerBtn.setAttribute('aria-label', 'Close navigation menu');

    // Trigger open animation on next frame
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
    });

    // Move focus into the overlay
    if (centerBtn) {
      setTimeout(() => {
        centerBtn.focus();
      }, 80);
    }
  }

  function closeMenu(restoreFocus = true) {
    if (!isOpen) return;
    isOpen = false;

    triggerBtn.setAttribute('aria-expanded', 'false');
    triggerBtn.setAttribute('aria-label', 'Open navigation menu');
    overlay.classList.remove('is-open');

    unlockScroll();

    const isReducedMotion = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
                            document.documentElement.dataset.motion === 'off';
    const duration = isReducedMotion ? 0 : 280;

    closeTimeout = setTimeout(() => {
      overlay.hidden = true;
      closeTimeout = null;
    }, duration);

    if (restoreFocus) {
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      } else {
        triggerBtn.focus();
      }
    }
  }

  // Header trigger toggle
  const onTriggerClick = () => {
    if (isOpen) {
      closeMenu(true);
    } else {
      openMenu();
    }
  };
  triggerBtn.addEventListener('click', onTriggerClick);

  // Center hub button in overlay
  const onCenterClick = () => {
    closeMenu(true);
  };
  if (centerBtn) centerBtn.addEventListener('click', onCenterClick);

  // Backdrop click closes without navigation
  const onBackdropClick = (e) => {
    if (e.target === backdrop || e.target === scroller) {
      closeMenu(true);
    }
  };
  if (backdrop) backdrop.addEventListener('click', onBackdropClick);
  if (scroller) scroller.addEventListener('click', onBackdropClick);

  // Destination links
  const onLinkClick = (e) => {
    const link = e.currentTarget;
    const href = link.getAttribute('href');
    closeMenu(false);

    if (href && href.startsWith('#')) {
      e.preventDefault();
      setTimeout(() => {
        scrollToTarget(href, {
          updateHash: true,
          focusTarget: true
        });
      }, 100);
    }
  };
  links.forEach(l => l.addEventListener('click', onLinkClick));

  // Keyboard navigation & focus trap
  const onKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu(true);
      return;
    }

    if (e.key === 'Tab' && focusable.length > 0) {
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', onKeyDown);

  // Close when resized to desktop width
  const desktopQuery = window.matchMedia('(min-width: 961px)');
  const onBreakpointChange = (e) => {
    if (e.matches && isOpen) {
      closeMenu(false);
    }
  };
  desktopQuery.addEventListener('change', onBreakpointChange);

  return function cleanup() {
    if (closeTimeout) clearTimeout(closeTimeout);
    unlockScroll();
    triggerBtn.removeEventListener('click', onTriggerClick);
    if (centerBtn) centerBtn.removeEventListener('click', onCenterClick);
    if (backdrop) backdrop.removeEventListener('click', onBackdropClick);
    if (scroller) scroller.removeEventListener('click', onBackdropClick);
    links.forEach(l => l.removeEventListener('click', onLinkClick));
    document.removeEventListener('keydown', onKeyDown);
    desktopQuery.removeEventListener('change', onBreakpointChange);
  };
}
