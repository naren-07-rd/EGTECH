// Minimal brand entrance and loader. No fake percentage or simulated progress.
export function createLogoLoader(kind, label) {
  const element = document.createElement('div');
  element.className = `logo-loader logo-loader--${kind} minimal-loader`;
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  element.innerHTML = `
    <div class="intro-meta" aria-hidden="true"><span>EG TECH</span><span>IDEAS TODAY / IMPACT TOMORROW</span></div>
    <div class="intro-symbol" aria-hidden="true">
      <svg class="intro-frame" viewBox="0 0 160 160"><path class="intro-outline" pathLength="1" d="M24 48V24H48M112 24H136V48M136 112V136H112M48 136H24V112"/><path class="intro-signal" pathLength="1" d="M24 48V24H48M112 24H136V48M136 112V136H112M48 136H24V112"/></svg>
      <img src="/eg-tech-logo.jpeg" alt="" width="84" height="84" fetchpriority="high" />
      <span class="intro-scan"></span>
    </div>
    <div class="intro-caption"><span class="intro-status"></span></div>
    <div class="intro-baseline" aria-hidden="true"><span></span></div>`;
  element.querySelector('.intro-status').textContent = label;
  return element;
}

export const wait = duration => new Promise(resolve => setTimeout(resolve, duration));

export function startLogoIntro(reducedMotion) {
  // If reduced motion is requested, do not display the intro curtain at all
  if (reducedMotion.matches) {
    return () => {};
  }

  const loader = createLogoLoader('startup', 'Connecting strategy, design & engineering');
  document.body.append(loader);
  let stopped = false;

  const remove = () => {
    if (stopped) return;
    stopped = true;
    loader.remove();
    document.removeEventListener('keydown', onInteraction);
    loader.removeEventListener('pointerdown', onInteraction);
  };

  const onInteraction = () => remove();
  document.addEventListener('keydown', onInteraction, { once: true });
  loader.addEventListener('pointerdown', onInteraction, { once: true });

  // Brief, non-intrusive brand entrance; exits quickly so main content is usable immediately.
  const timer = setTimeout(async () => {
    if (stopped) return;
    try {
      const exit = loader.animate(
        [{ opacity: '1', transform: 'scale(1)' }, { opacity: '0', transform: 'scale(0.98)' }],
        { duration: 350, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }
      );
      await exit.finished;
    } catch {
      // animation error or canceled
    }
    remove();
  }, 650);

  return () => {
    clearTimeout(timer);
    remove();
  };
}
