// Native motion: one reveal observer, offscreen suspension and no scroll hijacking.
export function startMotion(preference) {
  const root = document.documentElement;
  const cleanups = [];
  const animations = new Set();
  const visible = new Set();
  let paused = false;
  let frame = 0;
  const enabled = () => !paused && !preference.matches && !document.hidden;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'motion-control';
  document.querySelector('.header-actions').prepend(button);

  function listen(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    cleanups.push(() => target.removeEventListener(type, callback, options));
  }
  function animate(element, keyframes, options = {}) {
    if (!element || !enabled()) return;
    const animation = element.animate(keyframes, {
      duration: 750, easing: 'cubic-bezier(.16,1,.3,1)', ...options,
    });
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  }
  function sync() {
    root.dataset.motion = enabled() ? 'on' : 'off';
    button.disabled = preference.matches;
    button.textContent = paused || preference.matches ? '▷' : 'Ⅱ';
    button.setAttribute('aria-label', preference.matches ? 'Motion reduced by device preference' : paused ? 'Resume animations' : 'Pause animations');
    button.setAttribute('aria-pressed', String(paused || preference.matches));
    button.title = button.getAttribute('aria-label');
    if (!enabled()) {
      animations.forEach(animation => animation.cancel());
      document.querySelectorAll('.case-cover').forEach(card => card.style.removeProperty('transform'));
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }
  listen(button, 'click', () => { paused = !paused; sync(); });
  listen(preference, 'change', sync);
  listen(document, 'visibilitychange', sync);

  const rise = [{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'translateY(0)' }];
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      // Replay on re-entry; background tabs must not consume their reveals.
      if (!enabled()) continue;
      const element = entry.target;
      if (element.matches('.service')) {
        animate(element, [{ opacity: 0, transform: 'translateX(-28px)' }, { opacity: 1, transform: 'translateX(0)' }]);
      } else if (element.matches('.case-study')) {
        animate(element.querySelector('.case-cover'), [{ opacity: .2, clipPath: 'inset(12% 0 0 0 round 22px)', transform: 'translateY(35px) scale(.96)' }, { opacity: 1, clipPath: 'inset(0 round 22px)', transform: 'translateY(0) scale(1)' }], { duration: 1000 });
        animate(element.querySelector('.case-meta'), rise, { delay: 160 });
      } else if (element.matches('.search-blueprint')) {
        animate(element, [{ opacity: 0, transform: 'perspective(900px) rotateX(8deg) translateY(20px)' }, { opacity: 1, transform: 'perspective(900px) rotateX(0) translateY(0)' }]);
        element.querySelectorAll('li').forEach((row, index) => animate(row, rise, { delay: 100 + index * 130 }));
      } else if (element.matches('.studio-art')) {
        animate(element, [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 1000 });
        animate(element.querySelector('.studio-monogram'), [{ transform: 'translateY(45px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { delay: 180, duration: 1100 });
      } else if (element.matches('.standards-grid article')) {
        const index = [...element.parentElement.children].indexOf(element);
        animate(element, rise, { delay: index * 85 });
      } else if (element.matches('.eg-package-card') || element.matches('.eg-process-card') || element.matches('.delivery-steps li') || element.matches('.seo-card') || element.matches('.seo-feature-card')) {
        const index = [...element.parentElement.children].indexOf(element);
        animate(element, rise, { delay: index * 90 });
      } else animate(element, rise);
    }
  }, { threshold: .12 });
  // Split headings own their motion. Never clip a heading or animate its container.
  document.querySelectorAll('.reveal,.manifesto-principles p,.brief-form,.footer-statement').forEach(element => {
    if (element.matches('h2') || element.querySelector('h2')) return;
    observer.observe(element);
  });

  const ambient = new IntersectionObserver(entries => {
    for (const entry of entries) {
      entry.target.classList.toggle('motion-visible', entry.isIntersecting);
      if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
    }
  }, { threshold: 0 });
  document.querySelectorAll('.system-showcase,.case-cover,.search-blueprint,.studio-art').forEach(element => ambient.observe(element));

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll('.case-cover').forEach(card => {
    let tiltFrame = 0;
    listen(card, 'pointermove', event => {
      if (!enabled() || !finePointer.matches || tiltFrame) return;
      const { clientX, clientY } = event;
      tiltFrame = requestAnimationFrame(() => {
        tiltFrame = 0;
        if (!enabled()) return;
        const bounds = card.getBoundingClientRect();
        const x = (clientX - bounds.left) / bounds.width - .5;
        const y = (clientY - bounds.top) / bounds.height - .5;
        card.style.transform = `perspective(1000px) rotateX(${-y * 5}deg) rotateY(${x * 6}deg)`;
      });
    });
    listen(card, 'pointerleave', () => { cancelAnimationFrame(tiltFrame); tiltFrame = 0; card.style.removeProperty('transform'); });
    cleanups.push(() => cancelAnimationFrame(tiltFrame));
  });
  document.querySelectorAll('.service').forEach(details => {
    const summary = details.querySelector('summary');
    if (summary) summary.setAttribute('aria-expanded', String(details.open));
    listen(details, 'toggle', () => {
      if (summary) summary.setAttribute('aria-expanded', String(details.open));
      if (details.open) animate(details.querySelector('.service-content'), [{ opacity: 0, transform: 'translateY(-9px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 380 });
    });
  });
  const menu = document.querySelector('#mobile-nav');
  const dialog = document.querySelector('#project-dialog');
  const result = document.querySelector('.form-result');
  const mutations = new MutationObserver(records => {
    for (const { target, attributeName } of records) {
      if (target === menu && attributeName === 'hidden' && !menu.hidden) {
        [...menu.children].forEach((link, i) => animate(link, rise, { delay: i * 35, duration: 380 }));
      } else if (target === dialog && attributeName === 'open' && dialog.open) {
        animate(dialog, [{ opacity: 0, transform: 'translateY(18px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 380 });
      } else if (target === result && !result.hidden) animate(result, rise, { duration: 500 });
    }
  });
  mutations.observe(menu, { attributes: true, attributeFilter: ['hidden'] });
  mutations.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  mutations.observe(result, { attributes: true, attributeFilter: ['hidden'] });
  sync();
  return () => {
    observer.disconnect(); ambient.disconnect(); mutations.disconnect();
    cleanups.forEach(cleanup => cleanup());
    animations.forEach(animation => animation.cancel());
    cancelAnimationFrame(frame); button.remove();
    root.dataset.motion = 'off';
  };
}
