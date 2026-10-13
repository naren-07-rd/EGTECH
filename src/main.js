import './style.css';
import './redesign.css';
import './studio.css';
import './motion.css';
import './reference-motion.css';
import './minimal-loader.css';
import './typography.css';
import { startReferenceMotion } from './reference-motion.js';
import { startMotion } from './motion.js';
import { startExpressiveMotion } from './expressive-motion.js';
import { createBrief, makeEmailLink, isContactEmail, validateBriefInput } from './brief.js';
import { createLogoLoader, startLogoIntro } from './loader.js';

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
matchMedia('(min-width: 1001px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

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
const contactEmail = (import.meta.env.VITE_CONTACT_EMAIL || '').trim();
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
formError.className = 'form-privacy';
formError.setAttribute('role', 'alert');
formError.style.color = '#e04848';
formError.hidden = true;
formLoader.after(formError);

form.addEventListener('submit', event => {
  event.preventDefault();
  if (preparingBrief) return;

  // Clear previous validation alerts
  formError.hidden = true;
  formError.textContent = '';
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));

  const data = new FormData(form);
  const validation = validateBriefInput(data);

  if (!validation.valid) {
    formError.textContent = validation.message;
    formError.hidden = false;
    const invalidField = form.querySelector(`[name="${validation.field}"]`);
    if (invalidField) {
      invalidField.setAttribute('aria-invalid', 'true');
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
  }
  if (!document.querySelector('.form-result').hidden) {
    document.querySelector('.form-result').hidden = true;
    currentBrief = '';
  }
  formError.hidden = true;
});

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

// Motions
const disposeMotion = startMotion(reducedMotion);
const disposeExpressiveMotion = startExpressiveMotion(reducedMotion);
const disposeReferenceMotion = startReferenceMotion(reducedMotion);

document.querySelector('#year').textContent = new Date().getFullYear();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeIntro();
    disposeReferenceMotion();
    disposeExpressiveMotion();
    disposeMotion();
  });
}
