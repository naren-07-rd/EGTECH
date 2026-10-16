import './style.css';
import './redesign.css';
import './studio.css';
import './typography.css';
import './legal.css';

// Set current year
const yearEl = document.querySelector('#year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// Theme toggle
const themeBtn = document.querySelector('.theme-toggle');
const root = document.documentElement;

// Initialize theme from storage
try {
  const savedTheme = localStorage.getItem('eg-theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    root.dataset.theme = savedTheme;
  }
} catch {
  // Ignore localStorage issues
}

function updateThemeToggleAria() {
  if (!themeBtn) return;
  const current = root.dataset.theme === 'dark' ? 'dark' : 'light';
  themeBtn.setAttribute('aria-label', current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  themeBtn.title = themeBtn.getAttribute('aria-label');
}

if (themeBtn) {
  updateThemeToggleAria();
  themeBtn.addEventListener('click', () => {
    const isDark = root.dataset.theme === 'dark';
    const next = isDark ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('eg-theme', next);
    } catch {
      // Storage quota or private browsing
    }
    updateThemeToggleAria();
  });
}

// Privacy Dialog
const dialog = document.querySelector('#project-dialog');
const dialogClose = dialog?.querySelector('.dialog-close');
const dialogLabel = dialog?.querySelector('#dialog-label');
const dialogTitle = dialog?.querySelector('#dialog-title');
const dialogDescription = dialog?.querySelector('#dialog-description');
const dialogList = dialog?.querySelector('#dialog-list');
const dialogCta = dialog?.querySelector('#dialog-cta');
const privacyBtn = document.querySelector('.privacy-button');

if (dialog && privacyBtn) {
  privacyBtn.addEventListener('click', () => {
    if (dialogLabel) dialogLabel.textContent = 'PRIVACY NOTICE';
    if (dialogTitle) dialogTitle.textContent = 'Your project brief stays on your device.';
    if (dialogDescription) {
      dialogDescription.textContent =
        'This website does not transmit your form input to any external server. Your project brief is generated locally in your browser, and only sent when you choose to share or email it.';
    }
    if (dialogList) {
      dialogList.innerHTML = '';
      const items = [
        'No tracking scripts, cross-site analytics, or external font trackers are loaded.',
        'Theme preference is saved in local storage on this browser only.',
        'Brief details are not permanently stored; reloading the page clears form entries.',
        'Standard web server access logs may be maintained by the hosting provider for security and reliability.'
      ];
      items.forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        dialogList.appendChild(li);
      });
    }
    if (dialogCta) dialogCta.hidden = true;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    dialogClose?.focus();
  });

  dialogClose?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    privacyBtn.focus();
  });
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom)
    ) {
      dialog.close();
    }
  });
}
