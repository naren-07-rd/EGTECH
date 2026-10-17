import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initFooterCinematic } from '../src/footer-cinematic.js';
import { initServicesCinematic } from '../src/services-cinematic.js';
import { createUnifiedScrollManager } from '../src/premium-motion.js';

// ---------------------------------------------------------------------------
// BUG 1 REGRESSION: Runtime Footer Initialization & Observer Lifecycle
// ---------------------------------------------------------------------------
test('BUG 1 Fix: initFooterCinematic initializes observer with .observe() without throwing TypeError', () => {
  let observedTarget = null;
  let isDisconnected = false;
  let observerCallback = null;

  class MockIntersectionObserver {
    constructor(callback) {
      observerCallback = callback;
    }
    observe(target) {
      observedTarget = target;
    }
    unobserve() {}
    disconnect() {
      isDisconnected = true;
    }
  }

  // Setup mock DOM environment
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalIntersectionObserver = globalThis.IntersectionObserver;

  const mockFooter = {
    dataset: {},
    querySelectorAll(selector) {
      if (selector === '.footer-col') {
        const makeCol = () => ({ animate: () => ({ finished: Promise.resolve() }), style: {} });
        return [makeCol(), makeCol(), makeCol(), makeCol()];
      }
    },
    querySelector(selector) {
      if (selector === '.footer-brand img') return { animate: () => ({ finished: Promise.resolve() }), style: {} };
      if (selector === '.footer-bottom') return { animate: () => ({ finished: Promise.resolve() }), style: {} };
      return null;
    },
    style: {}
  };

  globalThis.IntersectionObserver = MockIntersectionObserver;
  globalThis.window = {
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
  };
  globalThis.document = {
    documentElement: { dataset: { motion: 'on' } },
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector(sel) {
      if (sel === '.footer') return mockFooter;
      return null;
    }
  };

  try {
    // Calling initFooterCinematic must NOT throw "TypeError: footerObserver is not a function"
    const cleanup = initFooterCinematic();
    assert.equal(typeof cleanup, 'function', 'Must return a cleanup function');
    assert.equal(observedTarget, mockFooter, 'Must call footerObserver.observe(footer)');
    assert.equal(mockFooter.dataset.cinematicFooter, 'true');

    // Trigger reveal callback to test animation initiation
    if (observerCallback) {
      observerCallback([{ isIntersecting: true, target: mockFooter }]);
    }

    // Call cleanup and verify disconnect
    cleanup();
    assert.equal(isDisconnected, true, 'Cleanup must call footerObserver.disconnect()');
    assert.equal(mockFooter.dataset.cinematicFooter, undefined, 'Dataset flag must be cleared on cleanup');
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.IntersectionObserver = originalIntersectionObserver;
  }
});

// ---------------------------------------------------------------------------
// BUG 2 REGRESSION: Services Accordion Rapid Click & Lifecycle Integrity
// ---------------------------------------------------------------------------
test('BUG 2 Fix: Cancelled accordion animations do not corrupt open state under rapid clicking', async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalIntersectionObserver = globalThis.IntersectionObserver;

  let activeAnimReject = null;
  let activeAnimResolve = null;

  const mockSummary = {
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k]; },
    listeners: {},
    addEventListener(type, fn) { this.listeners[type] = fn; },
    removeEventListener(type) { delete this.listeners[type]; }
  };

  const mockContent = {
    style: {
      props: {},
      setProperty(k, v) { this.props[k] = v; },
      removeProperty(k) { delete this.props[k]; }
    },
    offsetHeight: 240,
    querySelector() { return null; },
    animate() {
      let isCancelled = false;
      const finished = new Promise((resolve, reject) => {
        activeAnimResolve = resolve;
        activeAnimReject = reject;
      });
      return {
        finished,
        cancel() {
          isCancelled = true;
          if (activeAnimReject) {
            activeAnimReject(new DOMException('Animation aborted', 'AbortError'));
          }
        }
      };
    }
  };

  const mockDetails = {
    open: true,
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = String(v); },
    listeners: {},
    addEventListener(type, fn) { this.listeners[type] = fn; },
    removeEventListener(type) { delete this.listeners[type]; },
    querySelector(sel) {
      if (sel === 'summary') return mockSummary;
      if (sel === '.service-content') return mockContent;
      return null;
    }
  };

  const mockSection = {
    dataset: {},
    removeAttribute(k) { delete this.dataset[k]; },
    querySelector() { return null; },
    querySelectorAll(sel) {
      if (sel === 'details.service') return [mockDetails];
      return [];
    }
  };

  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  globalThis.window = {
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
  };
  globalThis.document = {
    documentElement: { dataset: { motion: 'on' } },
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector(sel) {
      if (sel === '#services') return mockSection;
      return null;
    }
  };

  try {
    const dispose = initServicesCinematic();
    assert.ok(mockSummary.listeners.click, 'Click listener must be attached to summary');

    // Action 1: User initiates closing of details.open = true
    const fakeCloseEvent = { preventDefault() {} };
    mockSummary.listeners.click(fakeCloseEvent);

    // Details is currently still open while closing animation plays
    assert.equal(mockDetails.open, true);

    // Action 2: Rapid user interaction! Before closing finishes, user clicks to REOPEN
    // Simulate user toggling: mockDetails.open is toggled/clicked again
    mockDetails.open = false; // native state transition
    const fakeOpenEvent = { preventDefault() {} };
    mockSummary.listeners.click(fakeOpenEvent);

    // Now mockDetails was opened by the new transition
    assert.equal(mockDetails.open, true, 'Details should be open for the new opening transition');
    assert.equal(mockSummary.attributes['aria-expanded'], 'true');

    // Action 3: Let the old closing animation finish rejecting (which happens when cancelled)
    // Wait for microtasks to flush
    await Promise.resolve();
    await Promise.resolve();

    // Verify that the old cancelled closing animation did NOT force mockDetails.open = false!
    assert.equal(mockDetails.open, true, 'Old cancelled closing animation must NOT overwrite details.open to false!');
    assert.equal(mockSummary.attributes['aria-expanded'], 'true', 'aria-expanded must remain true!');

    // Action 4: Now let the active opening animation finish
    if (activeAnimResolve) {
      activeAnimResolve();
    }
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(mockDetails.open, true, 'Details remains stably open');
    assert.equal(mockSummary.attributes['aria-expanded'], 'true');

    dispose();
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.IntersectionObserver = originalIntersectionObserver;
  }
});

// ---------------------------------------------------------------------------
// BUG 4 REGRESSION: motion.js Observer Loop Processes All Entries (continue not return)
// ---------------------------------------------------------------------------
test('BUG 4 Fix: motion.js IntersectionObserver loop uses continue to process subsequent entries', () => {
  const motionJs = readFileSync('src/motion.js', 'utf-8');

  // Verify that inside the IntersectionObserver loop, section exclusions use continue, not return
  const observerLoopMatch = motionJs.match(/for\s*\(\s*const\s+entry\s+of\s+entries\s*\)\s*\{([\s\S]*?)\}\s*\}\s*,\s*\{\s*threshold/);
  assert.ok(observerLoopMatch, 'IntersectionObserver for-of loop must be present in motion.js');

  const loopBody = observerLoopMatch[1];

  // In the loop body, checking .service, .case-study, etc. must use continue;
  assert.match(loopBody, /if\s*\(element\.matches\('\.service'\)\)\s*\{\s*\/\/[^\n]*\n\s*continue;/);
  assert.match(loopBody, /else if\s*\(element\.matches\('\.case-study'\)\)\s*\{\s*\/\/[^\n]*\n\s*continue;/);
  assert.match(loopBody, /else if\s*\(element\.closest\('#process'\)[^}]*\{\s*\/\/[^\n]*\n\s*continue;/);
  assert.match(loopBody, /else if\s*\(element\.closest\('#feedback'\)[^}]*\{\s*\/\/[^\n]*\n\s*continue;/);
  assert.match(loopBody, /else if\s*\(element\.closest\('\.footer'\)\)\s*\{\s*\/\/[^\n]*\n\s*continue;/);

  // Must NOT have return; inside the loop body for section exclusions
  assert.doesNotMatch(loopBody, /element\.matches\('\.service'\)\)\s*\{\s*return;/);
  assert.doesNotMatch(loopBody, /element\.closest\('\.footer'\)\)\s*\{\s*return;/);
});

// ---------------------------------------------------------------------------
// BUG 5 REGRESSION: createUnifiedScrollManager Shares Single Window Listener
// ---------------------------------------------------------------------------
test('BUG 5 Fix: createUnifiedScrollManager shares a single window scroll/resize listener', () => {
  let scrollListenerCount = 0;
  let resizeListenerCount = 0;

  const mockWindow = {
    scrollY: 100,
    innerHeight: 900,
    innerWidth: 1440,
    addEventListener(event) {
      if (event === 'scroll') scrollListenerCount++;
      if (event === 'resize') resizeListenerCount++;
    },
    removeEventListener(event) {
      if (event === 'scroll') scrollListenerCount--;
      if (event === 'resize') resizeListenerCount--;
    },
    requestAnimationFrame(fn) {
      return setTimeout(fn, 16);
    },
    cancelAnimationFrame(id) {
      clearTimeout(id);
    }
  };

  // Create multiple scroll manager instances with the same window
  const managerA = createUnifiedScrollManager(mockWindow);
  const managerB = createUnifiedScrollManager(mockWindow);
  const managerC = createUnifiedScrollManager(mockWindow);

  let callsA = 0;
  let callsB = 0;
  let callsC = 0;

  const unregA = managerA.register(() => { callsA++; });
  const unregB = managerB.register(() => { callsB++; });
  const unregC = managerC.register(() => { callsC++; });

  // Each subscriber received synchronous initial invocation
  assert.equal(callsA, 1);
  assert.equal(callsB, 1);
  assert.equal(callsC, 1);

  // CRITICAL CHECK: Exactly 1 scroll listener and 1 resize listener attached to window despite 3 managers!
  assert.equal(scrollListenerCount, 1, 'Only 1 scroll listener should be attached across all instances');
  assert.equal(resizeListenerCount, 1, 'Only 1 resize listener should be attached across all instances');

  // Unregister subscribers one by one
  unregA();
  assert.equal(scrollListenerCount, 1, 'Listeners remain while other subscribers are active');

  unregB();
  assert.equal(scrollListenerCount, 1, 'Listeners remain while manager C is active');

  unregC();
  // When all subscribers are removed, listeners must be detached from window
  assert.equal(scrollListenerCount, 0, 'Scroll listener must be detached when all subscribers unregister');
  assert.equal(resizeListenerCount, 0, 'Resize listener must be detached when all subscribers unregister');

  managerA.destroy();
  managerB.destroy();
  managerC.destroy();
});
