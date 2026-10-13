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
import { createBrief, makeEmailLink, isContactEmail } from './brief.js';
import { createLogoLoader, startLogoIntro, wait } from './loader.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const disposeIntro = startLogoIntro(reducedMotion);
const root = document.documentElement;
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
  if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); }
});
matchMedia('(min-width: 1001px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

const themeButton = document.querySelector('.theme-toggle');
function applyTheme(theme) {
  root.dataset.theme = theme;
  themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#0b1018' : '#f5f7fb';
}
try { const saved = localStorage.getItem('eg-theme-v2'); if (saved === 'light' || saved === 'dark') applyTheme(saved); } catch { /* Storage is optional. */ }
themeButton.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try { localStorage.setItem('eg-theme-v2', theme); } catch { /* Private browsing may disable storage. */ }
});

const projects = [
  { label: 'SELECTED WORK / COMMERCE', title: 'Tiruttani Quick', description: 'A local grocery-delivery website for Tiruttani Quick, operated by Renuka Store in Tiruttani, Tamil Nadu. The public site introduces the grocery catalog and connects visitors to its customer app.', list: ['Local grocery catalog covering staples, dairy and household essentials.', 'A published ordering guide and customer-app download links.', 'Commercial outcome figures have not been published for this case study.'] },
  { label: 'SELECTED WORK / AI SOFTWARE', title: 'BidVerify AI', description: 'An AI software project in the EG TECH portfolio. The detailed case study is being prepared for publication.', list: ['Project focus: AI software', 'The full case study will document the problem, implementation and deployed experience.', 'Operational results will be published once the supporting evidence is available.'] },
];
const dialog = document.querySelector('#project-dialog');
const dialogCta = document.querySelector('#dialog-cta');
function showDialog(content) {
  document.querySelector('#dialog-label').textContent = content.label;
  document.querySelector('#dialog-title').textContent = content.title;
  document.querySelector('#dialog-description').textContent = content.description;
  const list = document.querySelector('#dialog-list');
  list.replaceChildren(...content.list.map(text => { const item = document.createElement('li'); item.textContent = text; return item; }));
  dialogCta.hidden = Boolean(content.privacy);
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}
document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => showDialog(projects[Number(button.dataset.project)])));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});
dialogCta.addEventListener('click', () => { dialog.close(); document.querySelector('#brief input[name="name"]').focus({ preventScroll: true }); });
document.querySelector('.privacy-button').addEventListener('click', () => showDialog({ privacy: true, label: 'PRIVACY', title: 'Your ideas stay yours.', description: 'This website does not send project form details to a server. Your brief is prepared in your browser, and only shared when you choose to send it using your own email application.', list: ['No analytics, advertising trackers or external font requests are included.', 'Your theme preference is saved on this device. Form details are not saved after you leave or reload.', 'Downloaded briefs remain on your device. Hosting providers may maintain standard access logs.'] }));

const form = document.querySelector('#brief-form');
const contactEmail = (import.meta.env.VITE_CONTACT_EMAIL || '').trim();
const emailReady = isContactEmail(contactEmail);
if (emailReady) document.querySelector('#form-help').textContent = 'Prepare your brief, then review and send it using your email app. Nothing is sent automatically.';
let currentBrief = '';
let preparingBrief = false;
const formLoader = createLogoLoader('form', 'Preparing your brief');
formLoader.hidden = true;
document.querySelector('.form-submit').after(formLoader);
const formError = document.createElement('p');
formError.className = 'form-privacy';
formError.setAttribute('role', 'alert');
formError.hidden = true;
formLoader.after(formError);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (preparingBrief || !form.reportValidity()) return;
  const data = new FormData(form);
  const controls = [...form.elements].filter(control => !control.disabled);
  const submitButton = document.querySelector('.form-submit');
  preparingBrief = true;
  currentBrief = '';
  document.querySelector('.form-result').hidden = true;
  formError.hidden = true;
  controls.forEach(control => { control.disabled = true; });
  form.setAttribute('aria-busy', 'true');
  submitButton.textContent = 'Preparing your brief…';
  formLoader.hidden = false;
  try {
    // One short brand transition; no simulated upload or invented progress.
    await wait(reducedMotion.matches ? 0 : 850);
    currentBrief = createBrief(data);
    document.querySelector('#brief-preview').textContent = currentBrief;
    const emailLink = makeEmailLink(contactEmail, currentBrief);
    const emailButton = document.querySelector('#email-brief');
    emailButton.hidden = !emailLink;
    if (emailLink) {
      emailButton.href = emailLink;
      document.querySelector('#result-description').textContent = 'Your brief is ready. Open an email draft to review and send it, or download a copy. Nothing has been sent yet.';
    }
    document.querySelector('.form-result').hidden = false;
    document.querySelector('.form-submit').innerHTML = 'Update project brief <span aria-hidden="true">↗</span>';

  } catch {
    currentBrief = '';
    formError.textContent = 'We couldn’t prepare your brief. Your details are still here. Please try again.';
    formError.hidden = false;
    submitButton.innerHTML = 'Prepare project brief <span aria-hidden="true">↗</span>';
  } finally {
    formLoader.hidden = true;
    form.removeAttribute('aria-busy');
    controls.forEach(control => { control.disabled = false; });
    preparingBrief = false;
    if (currentBrief) document.querySelector('.form-result').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest' });
  }
});
form.addEventListener('input', () => {
  if (!document.querySelector('.form-result').hidden) {
    document.querySelector('.form-result').hidden = true;
    currentBrief = '';
  }
});
document.querySelector('#download-brief').addEventListener('click', () => {
  if (!currentBrief) return;
  const url = URL.createObjectURL(new Blob([currentBrief], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'EG-TECH-project-brief.txt'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
const disposeMotion = startMotion(reducedMotion);
const disposeExpressiveMotion = startExpressiveMotion(reducedMotion);
const disposeReferenceMotion = startReferenceMotion(reducedMotion);

document.querySelector('#year').textContent = new Date().getFullYear();
if (import.meta.hot) import.meta.hot.dispose(() => {
  disposeIntro();
  disposeReferenceMotion();
  disposeExpressiveMotion();
  disposeMotion();
});
