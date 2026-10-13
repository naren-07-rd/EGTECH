export function startExpressiveMotion(preference) {
  const root = document.documentElement;
  const removers = [];
  const headings = new Map();
  const active = new Set();
  const enabled = () => root.dataset.motion === 'on' && !preference.matches && !document.hidden;
  let frame = 0;
  function on(target, event, fn, options) {
    target.addEventListener(event, fn, options);
    removers.push(() => target.removeEventListener(event, fn, options));
  }
  document.querySelectorAll('main h2').forEach(heading => {
    const original = heading.innerHTML;
    const label = heading.innerText.replace(/\s+/g, ' ').trim();
    heading.setAttribute('aria-label', label);
    const lines = original.split(/<br\s*\/?\s*>/i);
    heading.innerHTML = '';
    const words = lines.map(markup => {
      const line = document.createElement('span');
      line.className = 'motion-line';
      line.setAttribute('aria-hidden', 'true');
      line.innerHTML = markup;
      heading.append(line);
      return line;
    });
    headings.set(heading, { original, words });
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting ? active.add(entry.target) : active.delete(entry.target));
    schedule();
  }, { rootMargin: '0px 0px 15% 0px' });
  headings.forEach((_, heading) => observer.observe(heading));
  function draw() {
    frame = 0;
    if (!enabled()) return;
    active.forEach(heading => {
      const bounds = heading.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (innerHeight * .92 - bounds.top) / (innerHeight * .4)));
      const { words } = headings.get(heading);
      words.forEach((word, index) => {
        const amount = Math.max(0, Math.min(1, progress * 1.65 - index / words.length * .65));
        word.style.opacity = String(.55 + amount * .45);
        word.style.transform = `translateY(${(1 - amount) * 16}px)`;
      });
    });
  }
  function schedule() { if (!frame && enabled()) frame = requestAnimationFrame(draw); }
  function reset() {
    if (!enabled()) {
      cancelAnimationFrame(frame); frame = 0;
      headings.forEach(({ words }) => words.forEach(word => word.removeAttribute('style')));
      document.querySelectorAll('.magnetic').forEach(button => button.style.removeProperty('translate'));
    } else schedule();
  }
  const settings = new MutationObserver(reset);
  settings.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  on(window, 'scroll', schedule, { passive: true });
  on(window, 'resize', schedule, { passive: true });
  on(document, 'visibilitychange', reset);

  const pointer = matchMedia('(hover:hover) and (pointer:fine)');
  document.querySelectorAll('.button,.case-open').forEach(button => {
    button.classList.add('magnetic');
    on(button, 'pointermove', event => {
      if (!enabled() || !pointer.matches) return;
      const box = button.getBoundingClientRect();
      button.style.translate = `${(event.clientX - box.left - box.width / 2) * .16}px ${(event.clientY - box.top - box.height / 2) * .25}px`;
    });
    on(button, 'pointerleave', () => button.style.removeProperty('translate'));
    on(button, 'blur', () => button.style.removeProperty('translate'));
  });
  document.querySelectorAll('.system-showcase,.case-cover,.studio-art').forEach(card => {
    card.classList.add('glow-surface');
    const glow = document.createElement('span'); glow.className = 'pointer-glow'; glow.setAttribute('aria-hidden', 'true'); card.append(glow);
    on(card, 'pointermove', event => {
      if (!enabled() || !pointer.matches) return;
      const box = card.getBoundingClientRect();
      glow.style.transform = `translate(${event.clientX - box.left - 150}px,${event.clientY - box.top - 150}px)`;
    });
    removers.push(() => glow.remove());
  });
  // Draw a second solid path above the existing network; this is purely decorative.
  const path = document.querySelector('.architecture-map path');
  if (path) {
    const signal = path.cloneNode(); signal.classList.add('network-signal');
    signal.setAttribute('pathLength', '1'); path.after(signal);
    removers.push(() => signal.remove());
  }
  schedule();
  return () => {
    observer.disconnect(); settings.disconnect(); cancelAnimationFrame(frame);
    removers.forEach(remove => remove());
    headings.forEach(({ original }, heading) => { heading.innerHTML = original; heading.removeAttribute('aria-label'); });
  };
}

