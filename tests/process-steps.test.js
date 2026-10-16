import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const redesignCss = readFileSync(new URL('../src/redesign.css', import.meta.url), 'utf8');
const processStepsJs = readFileSync(new URL('../src/process-steps.js', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

const processSection = html.slice(html.indexOf('id="process"'), html.indexOf('id="about"'));

test('Process section contains vertical list with numbered circles, chevrons, and connecting line', () => {
  // Heading and eyebrow preserved with accent treatment
  assert.match(processSection, /05 \/ ENGINEERING METHODOLOGY/);
  assert.match(processSection, /From requirements<br \/>to <em>verified release\.<\/em>/);

  // Old cards and blobs replaced in this section
  assert.doesNotMatch(processSection, /class="eg-process-card/);
  assert.doesNotMatch(processSection, /class="eg-process-card__blob"/);

  // Process steps container and vertical rail
  assert.match(processSection, /class="process-steps"/);
  assert.match(processSection, /class="process-steps__rail"/);
  assert.match(processSection, /class="process-steps__line-track"/);
  assert.match(processSection, /class="process-steps__line-fill"/);

  // Exactly 5 steps
  const steps = [...processSection.matchAll(/class="process-step"/g)];
  assert.equal(steps.length, 5, 'Must have exactly five process steps');

  // Numbered circles 1 through 5
  for (let i = 1; i <= 5; i++) {
    assert.match(processSection, new RegExp(`<span class="process-step__circle">${i}</span>`));
  }

  // Exactly 5 buttons with native type="button", aria-expanded="false", aria-controls
  const buttons = [...processSection.matchAll(/<button type="button" class="process-step__header" id="([^"]+)" aria-expanded="false" aria-controls="([^"]+)">/g)];
  assert.equal(buttons.length, 5, 'Must have exactly five button controls');

  // Verify matched pairs of aria-controls and panel IDs
  buttons.forEach((btn, index) => {
    assert.equal(btn[1], `process-header-${index}`);
    assert.equal(btn[2], `process-panel-${index}`);
    assert.match(processSection, new RegExp(`id="process-panel-${index}" role="region" aria-labelledby="process-header-${index}" hidden`));
  });

  // All 5 step titles visible
  assert.match(processSection, /Discovery &amp; scope/);
  assert.match(processSection, /Architecture &amp; design/);
  assert.match(processSection, /Engineering &amp; review/);
  assert.match(processSection, /Testing &amp; hardening/);
  assert.match(processSection, /Deployment &amp; handover/);

  // All 5 deliverable badges present
  assert.match(processSection, /BRIEF \+ SCOPE/);
  assert.match(processSection, /SYSTEM PLAN \+ PROTOTYPE/);
  assert.match(processSection, /WORKING PRODUCT \+ REVIEWS/);
  assert.match(processSection, /TEST PASS \+ RELEASE PLAN/);
  assert.match(processSection, /DEPLOYMENT \+ HANDOVER/);

  // Chevrons present in each button
  const chevrons = [...processSection.matchAll(/class="process-step__chevron"/g)];
  assert.equal(chevrons.length, 5, 'Must have five chevron icons');
});

test('Process steps CSS enforces exact motion tokens, theme tokens, and typography', () => {
  // Exact motion values specified in instructions
  assert.match(redesignCss, /--acc-expand-dur:\s*250ms;/);
  assert.match(redesignCss, /--acc-collapse-dur:\s*250ms;/);
  assert.match(redesignCss, /--acc-chevron-dur:\s*250ms;/);
  assert.match(redesignCss, /--acc-ease:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\);/);
  assert.match(redesignCss, /--acc-blur:\s*2px;/);
  assert.match(redesignCss, /--line-dur:\s*400ms;/);
  assert.match(redesignCss, /--line-ease:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\);/);
  assert.match(redesignCss, /--ease-smooth-out:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\);/);
  assert.match(redesignCss, /--press-scale:\s*0\.99;/);
  assert.match(redesignCss, /--press-dur:\s*150ms;/);

  // Theme tokens mapped locally
  assert.match(redesignCss, /--stage-bg:\s*var\(--bg\);/);
  assert.match(redesignCss, /--stage-fg:\s*var\(--text\);/);
  assert.match(redesignCss, /--stage-muted:\s*var\(--muted\);/);
  assert.match(redesignCss, /--stage-border:\s*var\(--line\);/);
  assert.match(redesignCss, /--stage-surface:\s*var\(--surface\);/);
  assert.match(redesignCss, /--stage-accent:\s*var\(--accent\);/);
  assert.match(redesignCss, /--stage-on-accent:\s*#ffffff;/);
  assert.match(redesignCss, /--stage-accent-text:\s*var\(--accent-text\);/);

  // Sizing specifications for broad layout and Services scale
  assert.match(redesignCss, /width:\s*100%;/);
  assert.match(redesignCss, /min-height:\s*124px;/);
  assert.match(redesignCss, /min-height:\s*48px;/);
  assert.match(redesignCss, /width:\s*42px;/);
  assert.match(redesignCss, /height:\s*42px;/);
  assert.match(redesignCss, /font-size:\s*clamp\(38px/);
  assert.match(redesignCss, /font-size:\s*18px;/);
  assert.match(redesignCss, /font-size:\s*16px;/);
  assert.match(redesignCss, /line-height:\s*1\.6;/);
  assert.match(redesignCss, /font-size:\s*13\.5px;/);

  // Reduced motion overrides
  assert.match(redesignCss, /--acc-expand-dur:\s*1ms\s*!important;/);
  assert.match(redesignCss, /--acc-collapse-dur:\s*1ms\s*!important;/);
  assert.match(redesignCss, /--acc-chevron-dur:\s*1ms\s*!important;/);
  assert.match(redesignCss, /--line-dur:\s*1ms\s*!important;/);
  assert.match(redesignCss, /--press-scale:\s*1\s*!important;/);
  assert.match(redesignCss, /--press-dur:\s*1ms\s*!important;/);
  assert.match(redesignCss, /--acc-blur:\s*0px\s*!important;/);
});

test('Process steps JS module exports initProcessSteps and integrates into main.js', () => {
  // Export check
  assert.match(processStepsJs, /export function initProcessSteps\(\)/);

  // Protection against stationary pointer layout shift cascade
  assert.match(processStepsJs, /hasPointerPhysicallyMoved/);

  // Touch press feedback implementation
  assert.match(processStepsJs, /clearPress/);
  assert.match(processStepsJs, /is-pressed/);

  // Imported and initialized in main.js
  assert.match(mainJs, /import \{ initProcessSteps \} from '\.\/process-steps\.js';/);
  assert.match(mainJs, /const disposeProcessSteps = initProcessSteps\(\);/);
  assert.match(mainJs, /disposeProcessSteps\(\);/);
});
