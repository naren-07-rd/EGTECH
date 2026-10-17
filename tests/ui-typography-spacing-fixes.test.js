import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const motionJs = readFileSync(new URL('../src/motion.js', import.meta.url), 'utf8');
const premiumMotionJs = readFileSync(new URL('../src/premium-motion.js', import.meta.url), 'utf8');
const premiumMotionCss = readFileSync(new URL('../src/premium-motion.css', import.meta.url), 'utf8');
const styleCss = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const redesignCss = readFileSync(new URL('../src/redesign.css', import.meta.url), 'utf8');
const typographyCss = readFileSync(new URL('../src/typography.css', import.meta.url), 'utf8');
const visibilityCinematicJs = readFileSync(new URL('../src/visibility-cinematic.js', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// 1. Heading line gap bug regression
// ---------------------------------------------------------------------------
test('Fix 1: revealHeadingMask wraps lines without inserting extra br tags between block wrappers', () => {
  // Heading mask inner wraps must NOT insert redundant <br> elements
  assert.doesNotMatch(
    premiumMotionJs,
    /headingEl\.appendChild\(document\.createElement\('br'\)\)/,
    'revealHeadingMask must not append <br> between block .motion-mask-wrap containers'
  );
  // .motion-mask-wrap should be display: block with descender padding
  assert.match(premiumMotionCss, /\.motion-mask-wrap\s*\{[^}]*display:\s*block/);
  assert.match(premiumMotionCss, /\.motion-mask-wrap\s*\{[^}]*padding-bottom:\s*0\.15em/);
});

// ---------------------------------------------------------------------------
// 2. Services accordion grid repair
// ---------------------------------------------------------------------------
test('Fix 2: Services accordion summary has explicit grid placement, no empty span, and mobile hint hidden', () => {
  // index.html summaries must NOT contain empty anchor spans
  assert.doesNotMatch(html, /<summary[^>]*>\s*<span id="service-/);
  // Deep-link IDs exist on the service elements/hints
  assert.match(html, /id="service-web"/);
  assert.match(html, /id="service-brand"/);
  assert.match(html, /id="service-software"/);
  assert.match(html, /id="service-growth"/);

  // Explicit grid column assignment
  assert.match(styleCss, /\.service-number\{grid-column:1/);
  assert.match(styleCss, /\.service h3\{grid-column:2/);
  assert.match(styleCss, /\.service-hint\{grid-column:3/);
  assert.match(styleCss, /\.expand\{grid-column:4;justify-self:end/);

  // Mobile 3-column grid and hidden hint
  assert.match(styleCss, /@media\(max-width:1100px\)\{[\s\S]*?\.service-hint\{display:none\}/);
  assert.match(styleCss, /@media\(max-width:767px\)\{[\s\S]*?\.service-number\{grid-column:1\}/);
  assert.match(styleCss, /@media\(max-width:767px\)\{[\s\S]*?\.expand\{grid-column:3;justify-self:end\}/);
});

// ---------------------------------------------------------------------------
// 3. Contact heading styling
// ---------------------------------------------------------------------------
test('Fix 3: Contact heading uses dedicated .contact-accent class and protects mask spans', () => {
  // HTML has .contact-accent on the accent phrase
  assert.match(html, /Have a project in mind\?<br \/><span class="contact-accent">Let’s discuss the details\.<\/span>/);
  // CSS targets .contact-accent explicitly
  assert.match(typographyCss, /\.brief h2 \.contact-accent/);
  assert.match(redesignCss, /\.brief-header h2 \.contact-accent/);
  // Heading text color remains normal text
  assert.match(redesignCss, /\.brief-header h2\{[^}]*color:var\(--text\)/);
});

// ---------------------------------------------------------------------------
// 4. Contact form field vertical alignment
// ---------------------------------------------------------------------------
test('Fix 4: Company optional label is wrapped to align vertically with package select', () => {
  // Label text is wrapped in a container span alongside optional indicator
  assert.match(html, /<label for="field-company"><span>Company <span class="optional">\(optional\)<\/span><\/span>/);
  // CSS ensures flex row alignment for label text without height hacks
  assert.match(redesignCss, /\.brief-form label>span,\s*\.brief-form \.field-label/);
  assert.match(redesignCss, /\.brief-form \.form-row>label\{display:flex;flex-direction:column;gap:8px;justify-content:flex-start\}/);
});

// ---------------------------------------------------------------------------
// 5. Single ownership of SEO feature card animations
// ---------------------------------------------------------------------------
test('Fix 5: SEO feature cards have single entrance animation owner and motion-off handling', () => {
  // motion.js yields #visibility and .seo-feature-card
  assert.match(motionJs, /element\.closest\('#visibility'\)/);
  assert.match(motionJs, /element\.matches\('\.seo-feature-card'\)/);
  // visibility-cinematic.js manages lifecycle and onMotionStateChange
  assert.match(visibilityCinematicJs, /onMotionStateChange/);
  assert.match(visibilityCinematicJs, /activeAnimations/);
});

// ---------------------------------------------------------------------------
// 6. Contact section gutters
// ---------------------------------------------------------------------------
test('Fix 6: Contact section preserves responsive gutters and email wrap', () => {
  // .brief has horizontal padding of var(--gutter)
  assert.match(redesignCss, /\.brief\{[^}]*padding:96px var\(--gutter\)/);
  // email link safely breaks long addresses
  assert.match(redesignCss, /\.brief-contact-link\{[^}]*overflow-wrap:anywhere/);
  assert.match(redesignCss, /\.brief-contact-link\{[^}]*word-break:break-word/);
});

// ---------------------------------------------------------------------------
// 7. Typography normalization without altering Hero
// ---------------------------------------------------------------------------
test('Fix 7: Post-hero font-weights standardized to 400, 500, 600, hero unchanged', () => {
  // No font-weight: 550 outside hero
  assert.doesNotMatch(redesignCss, /\.eg-process-card__title\{[^}]*font-weight:\s*550/);
  assert.doesNotMatch(redesignCss, /\.eg-package-card__title\s*\{[^}]*font-weight:\s*550/);
  assert.doesNotMatch(redesignCss, /\.faq__heading\s*\{[^}]*font-weight:\s*550/);
  assert.doesNotMatch(redesignCss, /#visibility \.visibility-copy h2\s*\{[^}]*font-weight:\s*550/);
  // Hero remains strictly protected
  assert.match(styleCss, /\.hero h1\{[^}]*font-weight:450/);
  assert.match(html, /<section id="home" class="hero section-pad">/);
});

// ---------------------------------------------------------------------------
// 8. Navbar active-section tracking
// ---------------------------------------------------------------------------
test('Fix 8: Navbar active tracking uses single reading-position owner and clears in untracked sections', () => {
  // Uses readingLine tracking and trackedMap in main.js
  assert.match(mainJs, /const readingLine = 120;/);
  assert.match(mainJs, /trackedMap/);
  assert.match(mainJs, /syncActiveSection/);
  // Clears activeLink when currentMatch is null
  assert.match(mainJs, /activeLink = currentMatch;/);
});

// ---------------------------------------------------------------------------
// 9. Anchor scroll offset resolution
// ---------------------------------------------------------------------------
test('Fix 9: Resolves dual scroll offset, cancelling duplicate scroll-margin-top on sections', () => {
  assert.match(redesignCss, /section\{scroll-margin-top:0\}/);
  assert.match(redesignCss, /@media\(max-width:960px\)\{html\{scroll-padding-top:74px\}/);
});

// ---------------------------------------------------------------------------
// 10. Post-hero spacing scale & preservation
// ---------------------------------------------------------------------------
test('Fix 10: Post-hero spacing scale is consistent, terms.html and dialogs preserved', () => {
  assert.match(redesignCss, /#process\.engineering-process\s*\{[^}]*padding-top:\s*96px/);
  assert.match(html, /<dialog id="project-dialog"/);
  assert.match(html, /href="\/terms\.html"/);
});
