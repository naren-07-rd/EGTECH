import { scrollToTarget } from './smooth-scroll.js';

// Service Accordion Navigation Controller
// Opens corresponding <details> accordion item and scrolls smoothly into view
// when triggered by footer service links or direct hash navigation.

export function initServiceAccordionNav() {
  const serviceDetails = Array.from(document.querySelectorAll('#services details.service'));
  if (serviceDetails.length === 0) return () => {};

  function openAndScrollTo(index) {
    if (index < 0 || index >= serviceDetails.length) return;
    const item = serviceDetails[index];
    if (!item) return;

    item.open = true;
    const summary = item.querySelector('summary');
    if (summary) {
      summary.setAttribute('aria-expanded', 'true');
    }

    scrollToTarget(item, { focusTarget: true });
  }

  function handleLinkClick(event) {
    const link = event.target.closest('a[href*="#service-"]');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    let targetIdx = -1;

    // Both 'Web development' and 'E-commerce' share panel 0 ('Web & commerce')
    if (href.endsWith('#service-web')) {
      targetIdx = 0;
    } else if (href.endsWith('#service-brand')) {
      targetIdx = 1;
    } else if (href.endsWith('#service-software')) {
      targetIdx = 2;
    } else if (href.endsWith('#service-growth')) {
      targetIdx = 3;
    }

    if (targetIdx !== -1) {
      const isHomepage =
        window.location.pathname === '/' ||
        window.location.pathname.endsWith('index.html') ||
        window.location.pathname === '';

      if (isHomepage) {
        event.preventDefault();
        openAndScrollTo(targetIdx);
        const hash = href.substring(href.indexOf('#'));
        try {
          history.pushState(null, '', hash);
        } catch {
          // Ignore
        }
      }
    }
  }

  function checkHash() {
    const hash = window.location.hash;
    if (!hash) return;
    if (hash === '#service-web') openAndScrollTo(0);
    else if (hash === '#service-brand') openAndScrollTo(1);
    else if (hash === '#service-software') openAndScrollTo(2);
    else if (hash === '#service-growth') openAndScrollTo(3);
  }

  document.addEventListener('click', handleLinkClick);
  window.addEventListener('hashchange', checkHash);

  // Initial load check
  if (window.location.hash) {
    setTimeout(checkHash, 150);
  }

  return function cleanup() {
    document.removeEventListener('click', handleLinkClick);
    window.removeEventListener('hashchange', checkHash);
  };
}
