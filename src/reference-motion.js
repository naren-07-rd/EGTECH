// Reference-inspired choreography. Content stays visible without JavaScript.
export function startReferenceMotion(preference) {
  const root = document.documentElement;
  const enabled = () => root.dataset.motion === 'on' && !preference.matches;
  const cleanups = [];
  const running = new Set();
  let frame = 0;
  const listen = (target, event, handler) => {
    target.addEventListener(event, handler, { passive: true });
    cleanups.push(() => target.removeEventListener(event, handler));
  };
  const play = (element, keyframes, options) => {
    if (!element || !enabled()) return;
    const animation = element.animate(keyframes, { duration: 1000, easing: 'cubic-bezier(.16,1,.3,1)', ...options });
    running.add(animation);
    animation.finished.catch(() => {}).finally(() => running.delete(animation));
  };

  // Hero arrives after the startup curtain, rather than playing behind it.
  const title = document.querySelector('.hero h1');
  const originalTitle = title.innerHTML;
  title.innerHTML = '<span class="hero-line">Big ideas.</span><span class="hero-line">Beautifully built.</span><span class="hero-line">Real <em>impact.</em></span>';
  let introduced = false;
  function introduce() {
    if (introduced || document.querySelector('.logo-loader--startup')) return;
    introduced = true;
    introObserver.disconnect();
    title.querySelectorAll('.hero-line').forEach((line, i) => play(line,
      [{ opacity: 0, transform: 'translateY(52px) rotate(2deg)' }, { opacity: 1, transform: 'translateY(0) rotate(0)' }],
      { delay: i * 130, duration: 1100 }));
    play(document.querySelector('.hero-intro'), [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { delay: 350 });
    play(document.querySelector('.system-display'), [{ opacity: 0, transform: 'scale(.88) translateY(45px)' }, { opacity: 1, transform: 'none' }], { delay: 180, duration: 1400 });
  }
  const introObserver = new MutationObserver(introduce);
  introObserver.observe(document.body, { childList: true });
  introduce();

  const belt = document.querySelector('.capability-belt');
  const beltText = belt.querySelector('p');
  const beltParent = beltText.parentNode;
  const viewport = document.createElement('div');
  viewport.className = 'discipline-viewport';
  const track = document.createElement('div');
  track.className = 'discipline-track';
  beltText.before(viewport);
  viewport.append(track);
  track.append(beltText);
  const copy = beltText.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  track.append(copy);

  const about = document.querySelector('.studio-profile-copy > p:not(.eyebrow):not(.studio-lead)');
  const originalAbout = about.innerHTML;
  const words = []; // Body copy remains stable and fully readable.

  const art = document.querySelector('.studio-art');
  const visible = new Set();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      entry.target.classList.toggle('reference-visible', entry.isIntersecting);
      entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
    });
    schedule();
  });
  [belt, about, art].forEach(element => observer.observe(element));
  const clamp = value => Math.max(0, Math.min(1, value));
  function draw() {
    frame = 0;
    if (!enabled() || document.hidden) return;
    if (visible.has(about)) {
      const progress = clamp((innerHeight * .86 - about.getBoundingClientRect().top) / (innerHeight * .5));
      words.forEach((word, i) => { word.style.opacity = String(.35 + .65 * clamp(progress * 1.8 - i / words.length * .8)); });
    }
    if (visible.has(art)) {
      const progress = clamp((innerHeight - art.getBoundingClientRect().top) / (innerHeight + art.offsetHeight));
      art.style.setProperty('--art-travel', `${(progress - .5) * -65}px`);
    }
  }
  function schedule() { if (!frame && enabled() && !document.hidden) frame = requestAnimationFrame(draw); }
  function sync() {
    if (!enabled()) {
      running.forEach(animation => animation.cancel());
      words.forEach(word => word.style.removeProperty('opacity'));
      art.style.removeProperty('--art-travel');
      cancelAnimationFrame(frame); frame = 0;
    } else schedule();
  }
  const settings = new MutationObserver(sync);
  settings.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  listen(window, 'scroll', schedule);
  listen(window, 'resize', schedule);
  listen(document, 'visibilitychange', sync);
  sync();
  return () => {
    cleanups.forEach(fn => fn());
    observer.disconnect(); settings.disconnect(); introObserver.disconnect();
    cancelAnimationFrame(frame); running.forEach(animation => animation.cancel());
    title.innerHTML = originalTitle;
    about.innerHTML = originalAbout; about.removeAttribute('aria-label');
    beltParent.append(beltText); viewport.remove();
  };
}

