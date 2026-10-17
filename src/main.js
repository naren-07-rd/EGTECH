import './style.css';
import './redesign.css';
import './studio.css';
import './motion.css';
import './reference-motion.css';
import './minimal-loader.css';
import './typography.css';
import './premium-motion.css';
import './studio-mockup.css';
import { startReferenceMotion } from './reference-motion.js';
import { startMotion } from './motion.js';
import { startExpressiveMotion } from './expressive-motion.js';
import { initPremiumMotion } from './premium-motion.js';
import { createBrief, makeEmailLink, isContactEmail, validateBriefInput } from './brief.js';
import { createLogoLoader, startLogoIntro } from './loader.js';
import { initSeoFeatureCards } from './seo-feature-cards.js';
import { initPricingCards } from './pricing-cards.js';
import { initProcessSteps } from './process-steps.js';
import { initFaqCarousel } from './faq-carousel.js';
import { initServiceAccordionNav } from './service-accordion-nav.js';
import { initServicesCinematic } from './services-cinematic.js';
import { initVisibilityCinematic } from './visibility-cinematic.js';
import { initPortfolioCinematic } from './portfolio-cinematic.js';
import { initProcessAboutManifestoCinematic } from './process-about-manifesto-cinematic.js';
import { initPricingFaqContactCinematic } from './pricing-faq-contact-cinematic.js';
import { initFooterCinematic } from './footer-cinematic.js';
import { initStudioMockup } from './studio-mockup.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const disposeIntro = startLogoIntro(reducedMotion);
const root = document.documentElement;

// Mobile navigation
const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('#mobile-nav');
function closeMenu() {
  menu.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.querySelector('span').textContent = '+';
}
menuButton.addEventListener('click', () => {
  const open = menu.hidden;
  menu.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.querySelector('span').textContent = open ? '−' : '+';
});
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !menu.hidden) {
    closeMenu();
    menuButton.focus();
  }
});
matchMedia('(min-width: 961px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

// Scroll state for subtle header elevation
const headerEl = document.querySelector('.header');
function updateHeaderElevation() {
  if (headerEl) {
    if (window.scrollY > 8) {
      headerEl.classList.add('is-scrolled');
    } else {
      headerEl.classList.remove('is-scrolled');
    }
  }
}
window.addEventListener('scroll', updateHeaderElevation, { passive: true });
updateHeaderElevation();

// Animated border navigation
// Visual reference inspired by Uiverse.io by SelfMadeSystem
function startAnimatedNavbar() {
  const nav = document.querySelector('.eg-navbar');
  if (!nav) return () => {};
  const rect = nav.querySelector('.eg-navbar__rect');
  const links = Array.from(nav.querySelectorAll('.eg-navbar__link'));
  if (!rect || links.length === 0) return () => {};

  let selectedLink = null;
  let hoveredLink = null;
  let focusedLink = null;
  let activeLink = null;

  function getEffectiveTarget() {
    return hoveredLink || focusedLink || selectedLink;
  }

  function renderIndicator(target) {
    if (!target) {
      nav.style.setProperty('--indicator-opacity', '0');
      rect.style.opacity = '0';
      return;
    }
    const navBounds = nav.getBoundingClientRect();
    const linkBounds = target.getBoundingClientRect();
    const x = Math.round(linkBounds.left - navBounds.left);
    const y = Math.round(linkBounds.top - navBounds.top);
    const w = Math.round(linkBounds.width);
    const h = Math.round(linkBounds.height);
    const r = Math.round(h / 2);

    nav.style.setProperty('--indicator-x', `${x}px`);
    nav.style.setProperty('--indicator-y', `${y}px`);
    nav.style.setProperty('--indicator-w', `${w}px`);
    nav.style.setProperty('--indicator-h', `${h}px`);
    nav.style.setProperty('--indicator-r', `${r}px`);
    nav.style.setProperty('--indicator-opacity', '1');

    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx', String(r));
    rect.setAttribute('ry', String(r));
    rect.style.width = `${w}px`;
    rect.style.height = `${h}px`;
    rect.style.rx = `${r}px`;
    rect.style.ry = `${r}px`;
    rect.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    rect.style.opacity = '1';
  }

  function updateLinkAttributes() {
    links.forEach(l => {
      if (l === selectedLink) {
        l.setAttribute('aria-current', 'location');
        l.classList.add('is-active');
      } else {
        l.removeAttribute('aria-current');
        l.classList.remove('is-active');
      }
    });
  }

  function setSelectedLink(link) {
    selectedLink = link;
    updateLinkAttributes();
    renderIndicator(getEffectiveTarget());
  }

  // Pointer & keyboard interactions on links
  links.forEach(link => {
    link.addEventListener('pointerenter', () => {
      hoveredLink = link;
      renderIndicator(getEffectiveTarget());
    });

    link.addEventListener('focus', () => {
      focusedLink = link;
      renderIndicator(getEffectiveTarget());
    });

    link.addEventListener('blur', () => {
      if (focusedLink === link) {
        focusedLink = null;
        renderIndicator(getEffectiveTarget());
      }
    });

    link.addEventListener('click', () => {
      setSelectedLink(link);
    });

    link.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        setSelectedLink(link);
      }
    });
  });

  // When pointer leaves the navbar, return indicator to selected link (or hide if none)
  nav.addEventListener('pointerleave', () => {
    hoveredLink = null;
    renderIndicator(getEffectiveTarget());
  });

  // Also synchronize when mobile navigation links are activated
  const mobileNavLinks = Array.from(document.querySelectorAll('#mobile-nav a'));
  mobileNavLinks.forEach(mLink => {
    mLink.addEventListener('click', () => {
      const href = mLink.getAttribute('href');
      const matching = links.find(l => l.getAttribute('href') === href);
      if (matching) {
        setSelectedLink(matching);
      }
    });
  });

  // Track reading-position for compatibility and section metadata
  const readingLine = 120; // 72px sticky header + reading offset
  const trackedMap = new Map();
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) {
        trackedMap.set(target, link);
      }
    }
  });

  function syncActiveSection() {
    let currentMatch = null;
    for (const [section, link] of trackedMap.entries()) {
      const bounds = section.getBoundingClientRect();
      if (bounds.top <= readingLine && bounds.bottom > readingLine) {
        currentMatch = link;
        break;
      }
    }
    activeLink = currentMatch;
    // NOTE: Selection indicator is strictly controlled by explicit click/activation per user requirements.
    // Scroll tracking does NOT move or show the indicator and does NOT override selectedLink.
  }

  let scrollTicking = false;
  const onScroll = () => {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(() => {
        scrollTicking = false;
        syncActiveSection();
      });
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  const onResize = () => {
    const target = getEffectiveTarget();
    if (target) {
      renderIndicator(target);
    }
  };
  window.addEventListener('resize', onResize, { passive: true });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      const target = getEffectiveTarget();
      if (target) {
        renderIndicator(target);
      }
    });
  }

  // Initial page load: no item has the blue rounded selection indicator
  renderIndicator(null);

  return () => {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onScroll);
  };
}

const disposeAnimatedNavbar = startAnimatedNavbar();

// Theme switcher
const themeButton = document.querySelector('.theme-toggle');
function applyTheme(theme) {
  root.dataset.theme = theme;
  themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#0b1018' : '#f5f7fb';
}
try {
  const saved = localStorage.getItem('eg-theme-v2');
  if (saved === 'light' || saved === 'dark') applyTheme(saved);
} catch {
  // Storage is optional.
}
themeButton.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try {
    localStorage.setItem('eg-theme-v2', theme);
  } catch {
    // Private browsing may disable storage.
  }
});

// Project dialogs & focus retention
const projects = [
  {
    label: 'SELECTED WORK / COMMERCE',
    title: 'Tiruttani Quick',
    description: 'A local grocery-delivery website and ordering platform connecting households in Tiruttani with Renuka Store, its grocery catalog and customer app.',
    list: [
      'Local grocery catalog covering daily staples, fresh produce and household goods.',
      'Published ordering guide and customer-app access.',
      'Live storefront preview linked to the real production website.'
    ]
  },
  {
    label: 'SELECTED WORK / AI SOFTWARE',
    title: 'BidVerify AI',
    description: 'An AI-assisted document evaluation and tender verification platform in active development.',
    list: [
      'Project focus: Automated contract & tender document analysis.',
      'Architecture highlights: Input verification, requirement extraction, and decision guidance.',
      'Full case study and verified benchmark results will be published upon release.'
    ]
  },
];

let lastFocusedTrigger = null;
const dialog = document.querySelector('#project-dialog');
const dialogCta = document.querySelector('#dialog-cta');
const dialogClose = document.querySelector('.dialog-close');

function showDialog(content, triggerElement) {
  lastFocusedTrigger = triggerElement || document.activeElement;
  document.querySelector('#dialog-label').textContent = content.label;
  document.querySelector('#dialog-title').textContent = content.title;
  document.querySelector('#dialog-description').textContent = content.description;
  const list = document.querySelector('#dialog-list');
  list.replaceChildren(...content.list.map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  dialogCta.hidden = Boolean(content.privacy);
  dialog.showModal();
  document.body.style.overflow = 'hidden';
  dialogClose.focus();
}

document.querySelectorAll('[data-project]').forEach(button => {
  button.addEventListener('click', () => showDialog(projects[Number(button.dataset.project)], button));
});

dialogClose.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  document.body.style.overflow = '';
  if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
    lastFocusedTrigger.focus();
  }
});
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) {
    dialog.close();
  }
});
dialogCta.addEventListener('click', () => {
  dialog.close();
  const nameField = document.querySelector('#field-name') || document.querySelector('#brief input[name="name"]');
  if (nameField) nameField.focus({ preventScroll: true });
});

document.querySelector('.privacy-button').addEventListener('click', function() {
  showDialog({
    privacy: true,
    label: 'PRIVACY NOTICE',
    title: 'Your project brief stays on your device.',
    description: 'This website does not transmit your form input to any external server. Your project brief is generated locally in your browser, and only sent when you choose to share or email it.',
    list: [
      'No tracking scripts, cross-site analytics, or external font trackers are loaded.',
      'Theme preference is saved in local storage on this browser only.',
      'Brief details are not permanently stored; reloading the page clears form entries.',
      'Standard web server access logs may be maintained by the hosting provider for security and reliability.'
    ]
  }, this);
});

// Enquiry & brief workflow
const form = document.querySelector('#brief-form');
const contactEmail = (import.meta.env.VITE_CONTACT_EMAIL || '').trim() || 'narenthiranath703@gmail.com';
const emailReady = isContactEmail(contactEmail);

if (emailReady) {
  document.querySelector('#form-help').textContent = 'Prepare your brief, then review and draft an email directly to EG TECH. Nothing is sent automatically.';
}

let currentBrief = '';
let preparingBrief = false;
const formLoader = createLogoLoader('form', 'Formatting your brief');
formLoader.hidden = true;
document.querySelector('.form-submit').after(formLoader);

const formError = document.createElement('p');
formError.id = 'brief-form-error';
formError.className = 'form-privacy';
formError.setAttribute('role', 'alert');
formError.setAttribute('aria-live', 'assertive');
formError.style.color = '#e04848';
formError.hidden = true;
formLoader.after(formError);

form.addEventListener('submit', event => {
  event.preventDefault();
  if (preparingBrief) return;

  // Clear previous validation alerts
  formError.hidden = true;
  formError.textContent = '';
  form.querySelectorAll('[aria-invalid]').forEach(el => {
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  });

  const data = new FormData(form);
  const validation = validateBriefInput(data);

  if (!validation.valid) {
    formError.textContent = validation.message;
    formError.hidden = false;
    const invalidField = form.querySelector(`[name="${validation.field}"]`);
    if (invalidField) {
      invalidField.setAttribute('aria-invalid', 'true');
      invalidField.setAttribute('aria-describedby', 'brief-form-error');
      invalidField.focus();
    }
    return;
  }

  const controls = [...form.elements].filter(control => !control.disabled);
  const submitButton = document.querySelector('.form-submit');
  preparingBrief = true;
  currentBrief = '';
  document.querySelector('.form-result').hidden = true;
  controls.forEach(control => { control.disabled = true; });
  submitButton.disabled = true;
  form.setAttribute('aria-busy', 'true');

  try {
    // Generate brief instantaneously without artificial delay
    currentBrief = createBrief(data);
    document.querySelector('#brief-preview').textContent = currentBrief;

    const emailLink = makeEmailLink(contactEmail, currentBrief);
    const emailButton = document.querySelector('#email-brief');
    emailButton.hidden = !emailLink;
    if (emailLink) {
      emailButton.href = emailLink;
      document.querySelector('#result-description').textContent = 'Your brief is ready. Open an email draft to review and send through your mail client, or copy/download it below. Nothing has been sent automatically.';
    } else {
      document.querySelector('#result-description').textContent = 'Your brief is ready in your browser. Copy or download a copy to share with EG TECH. No data has been sent over the network.';
    }

    document.querySelector('.form-result').hidden = false;
    submitButton.innerHTML = 'Update project brief <span aria-hidden="true">↗</span>';
  } catch {
    currentBrief = '';
    formError.textContent = 'Could not prepare the project brief. Your entered details have been preserved. Please try again.';
    formError.hidden = false;
    submitButton.innerHTML = 'Prepare project brief <span aria-hidden="true">↗</span>';
  } finally {
    formLoader.hidden = true;
    form.removeAttribute('aria-busy');
    controls.forEach(control => { control.disabled = false; });
    submitButton.disabled = false;
    preparingBrief = false;
    if (currentBrief) {
      document.querySelector('.form-result').scrollIntoView({
        behavior: reducedMotion.matches ? 'instant' : 'smooth',
        block: 'nearest'
      });
    }
  }
});

form.addEventListener('input', event => {
  if (event.target && event.target.hasAttribute('aria-invalid')) {
    event.target.removeAttribute('aria-invalid');
    event.target.removeAttribute('aria-describedby');
  }
  if (!document.querySelector('.form-result').hidden) {
    document.querySelector('.form-result').hidden = true;
    currentBrief = '';
  }
  formError.hidden = true;
});

form.addEventListener('change', event => {
  if (event.target && event.target.hasAttribute('aria-invalid')) {
    event.target.removeAttribute('aria-invalid');
    event.target.removeAttribute('aria-describedby');
  }
  if (!document.querySelector('.form-result').hidden) {
    document.querySelector('.form-result').hidden = true;
    currentBrief = '';
  }
  formError.hidden = true;
});

// Optional online enquiry endpoint support
const enquiryApiEndpoint = (import.meta.env.VITE_ENQUIRY_API_ENDPOINT || '').trim();
const submitApiBtn = document.querySelector('#submit-api-brief');
if (submitApiBtn && enquiryApiEndpoint) {
  submitApiBtn.hidden = false;
  submitApiBtn.addEventListener('click', async () => {
    if (!currentBrief || submitApiBtn.disabled) return;
    submitApiBtn.disabled = true;
    const origText = submitApiBtn.innerHTML;
    submitApiBtn.textContent = 'Sending...';
    try {
      const response = await fetch(enquiryApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: form.querySelector('#field-name')?.value.trim(),
          email: form.querySelector('#field-email')?.value.trim(),
          company: form.querySelector('#field-company')?.value.trim(),
          package: form.querySelector('#field-package')?.value,
          budget: form.querySelector('#field-budget')?.value,
          timeline: form.querySelector('#field-timeline')?.value,
          idea: form.querySelector('#field-idea')?.value.trim(),
          brief: currentBrief
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      document.querySelector('#result-description').textContent = 'Your enquiry was successfully sent to EG TECH! We will review your project brief and follow up promptly.';
      submitApiBtn.textContent = 'Sent! ✓';
    } catch {
      formError.textContent = 'Could not send online. Please use the "Open email draft" or "Copy brief" options below to send your brief.';
      formError.hidden = false;
      submitApiBtn.innerHTML = origText;
      submitApiBtn.disabled = false;
    }
  });
}

// Website package enquiry card selection & animated pricing cards
// Preserves: packageSelect.value = pkg; packageSelect.dispatchEvent(new Event('change', { bubbles: true }));
// for .eg-package-card__btn and #field-package integration
const disposePricingCards = initPricingCards();

// Copy brief action
const copyButton = document.querySelector('#copy-brief');
if (copyButton) {
  copyButton.addEventListener('click', async () => {
    if (!currentBrief) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentBrief);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = currentBrief;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.append(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied! ✓';
      setTimeout(() => { copyButton.textContent = originalText; }, 2500);
    } catch {
      // Copy fallback
    }
  });
}

// Download brief action
document.querySelector('#download-brief').addEventListener('click', () => {
  if (!currentBrief) return;
  const url = URL.createObjectURL(new Blob([currentBrief], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'EG-TECH-project-brief.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// Highlighted Feature Cards (SEO & Performance)
const disposeSeoFeatureCards = initSeoFeatureCards();

// Process Steps Rows (Engineering Methodology)
const disposeProcessSteps = initProcessSteps();

// FAQ Question & Answer Carousel
const disposeFaqCarousel = initFaqCarousel();

// Service Accordion Footer Navigation
const disposeServiceAccordionNav = initServiceAccordionNav();

// Motions
const disposeMotion = startMotion(reducedMotion);
const disposeExpressiveMotion = startExpressiveMotion(reducedMotion);
const disposeReferenceMotion = startReferenceMotion(reducedMotion);
const disposePremiumMotion = initPremiumMotion();
const disposeServicesCinematic = initServicesCinematic();
const disposeVisibilityCinematic = initVisibilityCinematic();
const disposePortfolioCinematic = initPortfolioCinematic();
const disposeProcessAboutManifestoCinematic = initProcessAboutManifestoCinematic();
const disposePricingFaqContactCinematic = initPricingFaqContactCinematic();
const disposeFooterCinematic = initFooterCinematic();
const disposeStudioMockup = initStudioMockup();

document.querySelector('#year').textContent = new Date().getFullYear();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (typeof disposeStudioMockup === 'function') {
      disposeStudioMockup();
    }
    if (typeof disposeFooterCinematic === 'function') {
      disposeFooterCinematic();
    }
    if (typeof disposePricingFaqContactCinematic === 'function') {
      disposePricingFaqContactCinematic();
    }
    if (typeof disposeProcessAboutManifestoCinematic === 'function') {
      disposeProcessAboutManifestoCinematic();
    }
    if (typeof disposePortfolioCinematic === 'function') {
      disposePortfolioCinematic();
    }
    if (typeof disposeVisibilityCinematic === 'function') {
      disposeVisibilityCinematic();
    }
    if (typeof disposeServicesCinematic === 'function') {
      disposeServicesCinematic();
    }
    if (typeof disposePremiumMotion === 'function') {
      disposePremiumMotion();
    }
    if (typeof disposeServiceAccordionNav === 'function') {
      disposeServiceAccordionNav();
    }
    if (typeof disposeFaqCarousel === 'function') {
      disposeFaqCarousel();
    }
    if (typeof disposeProcessSteps === 'function') {
      disposeProcessSteps();
    }
    if (typeof disposePricingCards === 'function') {
      disposePricingCards();
    }
    if (typeof disposeSeoFeatureCards === 'function') {
      disposeSeoFeatureCards();
    }
    disposeAnimatedNavbar();
    disposeIntro();
    disposeReferenceMotion();
    disposeExpressiveMotion();
    disposeMotion();
  });
}
