// Only startup and valid brief submissions call this component.
export function createLogoLoader(kind, label) {
  const element = document.createElement('div');
  element.className = `logo-loader logo-loader--${kind}`;
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  element.classList.add('minimal-loader');
  element.innerHTML = `
    <div class="intro-meta" aria-hidden="true"><span>EG TECH</span><span>IDEAS TODAY / IMPACT TOMORROW</span></div>
    <div class="intro-symbol" aria-hidden="true">
      <svg class="intro-frame" viewBox="0 0 160 160"><path class="intro-outline" pathLength="1" d="M24 48V24H48M112 24H136V48M136 112V136H112M48 136H24V112"/><path class="intro-signal" pathLength="1" d="M24 48V24H48M112 24H136V48M136 112V136H112M48 136H24V112"/></svg>
      <img src="/eg-tech-logo.jpeg" alt="" width="84" height="84" fetchpriority="high" />
      <span class="intro-scan"></span>
    </div>
    <div class="intro-caption"><span class="intro-status"></span><span class="intro-count" aria-hidden="true">000 <i>/ 100</i></span></div>
    <div class="intro-baseline" aria-hidden="true"><span></span></div>`;
  element.querySelector('.intro-status').textContent = label;
  if (kind === 'form') element.querySelector('.intro-count').remove();
  return element;
}

export const wait = duration => new Promise(resolve => setTimeout(resolve, duration));

export function startLogoIntro(reducedMotion) {
  // A new document gets one intro. Anchor navigation and other interactions don't.
  const loader = createLogoLoader('startup', 'Bringing ideas to life');
  document.body.append(loader);
  let stopped = false;
  let counterFrame = 0;
  const start = performance.now();
  function count(now) {
    if (stopped) return;
    const value = Math.min(100, Math.floor((now - start) / 1650 * 100));
    loader.querySelector('.intro-count').innerHTML = `${String(value).padStart(3, '0')} <i>/ 100</i>`;
    if (value < 100) counterFrame = requestAnimationFrame(count);
  }
  if (!reducedMotion.matches) counterFrame = requestAnimationFrame(count);
  const remove = () => { stopped = true; cancelAnimationFrame(counterFrame); loader.remove(); };
  // Fail open independently of image decoding and all optional 3D work.
  const deadline = setTimeout(remove, 2700);
  const onInteraction = () => { clearTimeout(deadline); remove(); };
  document.addEventListener('keydown', onInteraction, { once: true });
  loader.addEventListener('pointerdown', onInteraction, { once: true });
  void (async () => {
    await wait(reducedMotion.matches ? 100 : 1650);
    if (!stopped && !reducedMotion.matches) {
      const exit = loader.animate(
        [{ clipPath: 'inset(0 0 0 0 round 0px)' }, { clipPath: 'inset(0 0 100% 0 round 0px)' }],
        { duration: 650, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' },
      );
      await exit.finished.catch(() => {});
    }
    clearTimeout(deadline);
    remove();
    document.removeEventListener('keydown', onInteraction);
  })();
  return () => { clearTimeout(deadline); remove(); document.removeEventListener('keydown', onInteraction); };
}

