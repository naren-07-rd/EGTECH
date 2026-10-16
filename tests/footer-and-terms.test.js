import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const termsHtml = readFileSync(new URL('../terms.html', import.meta.url), 'utf8');
const redesignCss = readFileSync(new URL('../src/redesign.css', import.meta.url), 'utf8');
const legalCss = readFileSync(new URL('../src/legal.css', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const serviceNavJs = readFileSync(new URL('../src/service-accordion-nav.js', import.meta.url), 'utf8');
const viteConfig = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');

test('closing call to action block is completely removed while footer columns and slogans removal are preserved', () => {
  // footer-cta block removed from index.html and terms.html
  assert.doesNotMatch(indexHtml, /class="[^"]*footer-cta/);
  assert.doesNotMatch(indexHtml, /Your next big idea\./);
  assert.doesNotMatch(indexHtml, /START A PROJECT/);
  assert.doesNotMatch(indexHtml, /Tell us what you’re planning\./);

  assert.doesNotMatch(termsHtml, /class="[^"]*footer-cta/);
  assert.doesNotMatch(termsHtml, /Your next big idea\./);
  assert.doesNotMatch(termsHtml, /START A PROJECT/);
  assert.doesNotMatch(termsHtml, /Tell us what you’re planning\./);

  // Exclusive footer-cta CSS removed
  assert.doesNotMatch(redesignCss, /\.footer-cta/);

  // Slogans still removed
  assert.doesNotMatch(indexHtml, /IDEAS TODAY \| IMPACT TOMORROW/);
  assert.doesNotMatch(indexHtml, /Strategy\. Creativity\. Technology\. Impact\./);
});

test('four footer columns contain EG TECH brand, Explore, Services, and Contact details', () => {
  // Column 1: Brand
  assert.match(indexHtml, /<div class="footer-col footer-col--brand">/);
  assert.match(indexHtml, /<img src="\/eg-tech-logo\.jpeg" alt="EG TECH official logo" width="44" height="44"/);
  assert.match(indexHtml, /Websites, digital experiences, and automation for growing businesses\./);

  // Column 2: Explore links
  const exploreMatches = [...indexHtml.matchAll(/<div class="footer-col">\s*<h3 class="footer-col__title">Explore<\/h3>\s*<ul class="footer-col__list">(.*?)<\/ul>/gs)];
  assert.ok(exploreMatches.length > 0, 'Explore column exists');
  const exploreContent = exploreMatches[0][1];
  assert.match(exploreContent, /href="#work"[^>]*>Work<\/a>/);
  assert.match(exploreContent, /href="#services"[^>]*>Services<\/a>/);
  assert.match(exploreContent, /href="#process"[^>]*>Process<\/a>/);
  assert.match(exploreContent, /href="#about"[^>]*>About<\/a>/);
  assert.match(exploreContent, /href="#faq"[^>]*>FAQ<\/a>/);

  // Column 3: Services links
  const servicesMatches = [...indexHtml.matchAll(/<div class="footer-col">\s*<h3 class="footer-col__title">Services<\/h3>\s*<ul class="footer-col__list">(.*?)<\/ul>/gs)];
  assert.ok(servicesMatches.length > 0, 'Services column exists');
  const servicesContent = servicesMatches[0][1];
  assert.match(servicesContent, /href="#service-web"[^>]*>Web development<\/a>/);
  assert.match(servicesContent, /href="#service-web"[^>]*>E-commerce<\/a>/);
  assert.match(servicesContent, /href="#service-brand"[^>]*>Brand &amp; product design<\/a>/);
  assert.match(servicesContent, /href="#service-software"[^>]*>Software &amp; automation<\/a>/);
  assert.match(servicesContent, /href="#service-growth"[^>]*>SEO &amp; digital growth<\/a>/);

  // Column 4: Contact details (no invented profiles or promises)
  assert.match(indexHtml, /href="tel:\+917604921213"[^>]*>\+91 7604921213<\/a>/);
  assert.match(indexHtml, /href="mailto:narenthiranath703@gmail\.com"[^>]*>narenthiranath703@gmail\.com<\/a>/);
  assert.doesNotMatch(indexHtml, /twitter\.com|facebook\.com|instagram\.com|linkedin\.com\/in\/fake/);
});

test('service accordion targets exist in index.html and service-accordion-nav is integrated', () => {
  assert.match(indexHtml, /id="service-web"/);
  assert.match(indexHtml, /id="service-brand"/);
  assert.match(indexHtml, /id="service-software"/);
  assert.match(indexHtml, /id="service-growth"/);

  assert.match(mainJs, /import \{ initServiceAccordionNav \} from '\.\/service-accordion-nav\.js'/);
  assert.match(mainJs, /initServiceAccordionNav\(\)/);
  assert.match(serviceNavJs, /export function initServiceAccordionNav\(\)/);
});

test('bottom bar contains copyright with dynamic year fallback, privacy modal trigger, and terms link', () => {
  assert.match(indexHtml, /<p class="footer-copyright">© <span class="footer-year" id="year">2026<\/span> EG TECH\. All rights reserved\.<\/p>/);
  assert.match(indexHtml, /<button type="button" class="footer-bottom-link privacy-button" id="footer-privacy-btn">Privacy Policy<\/button>/);
  assert.match(indexHtml, /<a href="\/terms\.html" class="footer-bottom-link">Terms &amp; Conditions<\/a>/);
  assert.match(indexHtml, /<a href="#home" class="footer-bottom-link back-to-top-link">Back to top ↑<\/a>/);
});

test('terms.html exists, is configured for multi-page Vite build, and has required document structure', () => {
  assert.ok(existsSync(new URL('../terms.html', import.meta.url)));
  assert.match(viteConfig, /terms:\s*resolve\(import\.meta\.dirname,\s*['"]terms\.html['"]\)/);
  assert.match(termsHtml, /<title>Terms &amp; Conditions \| EG TECH<\/title>/);
  assert.match(termsHtml, /<h1 class="legal-title">Terms &amp; Conditions<\/h1>/);
  assert.match(termsHtml, /<div class="legal-status-badge">Draft — pending business review<\/div>/);
  assert.match(termsHtml, /class="legal-back-link">← Back to home<\/a>/);
});

test('terms.html contains the ten structured sections and pending review flags', () => {
  const sections = [
    'website-purpose',
    'enquiries-proposals',
    'scope-changes',
    'client-materials',
    'commercial-terms',
    'deliverables-ownership',
    'support-maintenance',
    'cancellations-refunds',
    'external-services',
    'contact-information'
  ];

  for (const id of sections) {
    assert.match(termsHtml, new RegExp(`id="${id}"`), `Section #${id} should exist in terms.html`);
  }

  // Pending business review flags
  assert.match(termsHtml, /\[Pending Business Review: Standard revision limits/);
  assert.match(termsHtml, /\[Pending Business Review: Exact deposit percentages/);
  assert.match(termsHtml, /\[Pending Business Review: Explicit IP assignment mechanisms/);
  assert.match(termsHtml, /\[Pending Business Review: Standard post-launch warranty period/);
  assert.match(termsHtml, /\[Pending Business Review: Formal cancellation notice periods/);

  // Contact details match official records
  assert.match(termsHtml, /\+91 7604921213/);
  assert.match(termsHtml, /narenthiranath703@gmail\.com/);
});

test('scoped CSS implements required layout, responsive columns, and typography', () => {
  // Desktop 4 columns
  assert.match(redesignCss, /\.footer-grid\s*\{[^}]*grid-template-columns:\s*1\.4fr 1fr 1\.2fr 1\.2fr/);
  // Tablet 2 columns
  assert.match(redesignCss, /@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*?\.footer-grid\s*\{[^}]*grid-template-columns:\s*1fr 1fr/);
  // Mobile 1 column
  assert.match(redesignCss, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.footer-grid\s*\{[^}]*grid-template-columns:\s*1fr/);

  // Email wrapping
  assert.match(redesignCss, /\.footer-link--email\s*\{[^}]*word-break:\s*break-all/);

  // Legal body width ~760px and 17px body text
  assert.match(legalCss, /\.legal-container\s*\{[^}]*max-width:\s*760px/);
  assert.match(legalCss, /\.legal-section p\s*\{[^}]*font-size:\s*17px/);
});
