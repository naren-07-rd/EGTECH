import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBrief } from '../src/brief.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const redesignCss = readFileSync(new URL('../src/redesign.css', import.meta.url), 'utf8');

test('exactly three website package cards exist with correct content and no prohibited claims', () => {
  // Eyebrow and heading
  assert.match(html, /WEBSITE PACKAGES/);
  assert.match(html, /Choose the right website/);
  assert.match(html, /Start with a simple website, build something custom, or take your store online\./);

  // Card 1
  assert.match(html, /Basic Website/);
  assert.match(html, /A clear, professional online presence for your business\./);
  assert.match(html, /Small businesses, personal brands and portfolios\./);
  assert.match(html, /Responsive desktop and mobile layouts\./);
  assert.match(html, /Essential business pages\./);
  assert.match(html, /Contact form and enquiry links\./);
  assert.match(html, /Basic on-page SEO setup\./);
  assert.match(html, /Deployment and handover\./);
  assert.match(html, /Choose Basic/);

  // Card 2
  assert.match(html, /Custom Website/);
  assert.match(html, /A website designed around your brand and business requirements\./);
  assert.match(html, /Businesses needing distinctive design or tailored functionality\./);
  assert.match(html, /Custom page layouts and visual design\./);
  assert.match(html, /Interactive features tailored to your needs\./);
  assert.match(html, /Content management where required\./);
  assert.match(html, /Integrations agreed during scoping\./);
  assert.match(html, /Performance and accessibility checks\./);
  assert.match(html, /Choose Custom/);

  // Card 3
  assert.match(html, /E-commerce/);
  assert.match(html, /An online store that helps customers browse products and place orders\./);
  assert.match(html, /Retailers and brands selling products online\./);
  assert.match(html, /Product catalog and category pages\./);
  assert.match(html, /Shopping cart and checkout\./);
  assert.match(html, /Payment-provider integration\./);
  assert.match(html, /Product and order management\./);
  assert.match(html, /Responsive shopping experience\./);
  assert.match(html, /Choose E-commerce/);

  // Note below cards
  assert.match(html, /Final features, pricing and delivery timelines are agreed after reviewing your requirements\./);

  // Card count
  const cardMatches = [...html.matchAll(/class="eg-package-card\s+reveal"/g)];
  assert.equal(cardMatches.length, 3, 'Must have exactly three package cards');

  // Attribution comment preserved
  assert.match(html, /Card design inspired by Uiverse\.io by dylanharriscameron/);
  assert.match(redesignCss, /Card design inspired by Uiverse\.io by dylanharriscameron/);

  // No prohibited marketing claims
  const packageSection = html.slice(html.indexOf('class="website-packages'), html.indexOf('class="manifesto'));
  assert.doesNotMatch(packageSection, /Most popular|Unlimited revisions|Free hosting|Guarantee|100% money back/i);
});

test('website package select field and buttons integration', () => {
  // Labelled select in form
  assert.match(html, /<label for="field-package">Website package/);
  assert.match(html, /<select id="field-package" name="package">/);
  assert.match(html, /<option value="Not sure yet">Not sure yet<\/option>/);
  assert.match(html, /<option value="Basic Website">Basic Website<\/option>/);
  assert.match(html, /<option value="Custom Website">Custom Website<\/option>/);
  assert.match(html, /<option value="E-commerce">E-commerce<\/option>/);

  // Package select button interaction in main.js
  assert.match(mainJs, /\.eg-package-card__btn/);
  assert.match(mainJs, /#field-package/);
  assert.match(mainJs, /packageSelect\.value = pkg/);
  assert.match(mainJs, /packageSelect\.dispatchEvent\(new Event\('change'/);

  // Brief integration
  const data = new FormData();
  data.set('name', 'Priya Sharma');
  data.set('email', 'priya@example.com');
  data.set('package', 'Custom Website');
  data.set('idea', 'A tailored platform for educational resources.');
  const brief = createBrief(data);
  assert.match(brief, /Website package: Custom Website/);
  assert.match(brief, /Name: Priya Sharma/);
});
