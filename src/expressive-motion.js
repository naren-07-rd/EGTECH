export function startExpressiveMotion(preference) {
  const root = document.documentElement;
  const removers = [];
  const enabled = () => root.dataset.motion === 'on' && !preference.matches && !document.hidden;

  function on(target, event, fn, options) {
    target.addEventListener(event, fn, options);
    removers.push(() => target.removeEventListener(event, fn, options));
  }

  // Headings are preserved structurally intact without innerHTML splitting on <br>.
  // Text remains stable and legible while reading.

  const pointer = matchMedia('(hover:hover) and (pointer:fine)');
  if (pointer.matches && !preference.matches) {
    document.querySelectorAll('.button, .case-open').forEach(button => {
      button.classList.add('magnetic');
      on(button, 'pointermove', event => {
        if (!enabled() || !pointer.matches) return;
        const box = button.getBoundingClientRect();
        const offsetX = (event.clientX - box.left - box.width / 2) * 0.12;
        const offsetY = (event.clientY - box.top - box.height / 2) * 0.18;
        button.style.translate = `${offsetX}px ${offsetY}px`;
      });
      on(button, 'pointerleave', () => button.style.removeProperty('translate'));
      on(button, 'blur', () => button.style.removeProperty('translate'));
    });

    document.querySelectorAll('.system-showcase, .case-cover, .studio-art').forEach(card => {
      card.classList.add('glow-surface');
      const glow = document.createElement('span');
      glow.className = 'pointer-glow';
      glow.setAttribute('aria-hidden', 'true');
      card.append(glow);
      on(card, 'pointermove', event => {
        if (!enabled() || !pointer.matches) return;
        const box = card.getBoundingClientRect();
        glow.style.transform = `translate(${event.clientX - box.left - 150}px,${event.clientY - box.top - 150}px)`;
      });
      removers.push(() => glow.remove());
    });
  }

  // Draw a subtle animated signal line for the systems map
  const path = document.querySelector('.architecture-map path');
  if (path) {
    const signal = path.cloneNode();
    signal.classList.add('network-signal');
    signal.setAttribute('pathLength', '1');
    path.after(signal);
    removers.push(() => signal.remove());
  }

  function reset() {
    if (!enabled()) {
      document.querySelectorAll('.magnetic').forEach(button => button.style.removeProperty('translate'));
    }
  }

  const settings = new MutationObserver(reset);
  settings.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  on(document, 'visibilitychange', reset);

  return () => {
    settings.disconnect();
    removers.forEach(remove => remove());
    document.querySelectorAll('.magnetic').forEach(button => button.style.removeProperty('translate'));
  };
}
