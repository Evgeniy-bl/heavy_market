function initHeaderScroll() {
  const header = document.querySelector('.header');

  if (!header || header.dataset.scrollReady === 'true') {
    return;
  }

  header.dataset.scrollReady = 'true';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const topReveal = 24;
  const deltaMin = 6;

  let lastY = window.scrollY;
  let ticking = false;

  const isLangOpen = () => document.querySelector('.lang-dropdown--open');

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const delta = y - lastY;

    if (isLangOpen() || y <= topReveal) {
      header.classList.remove('is-hidden');
      lastY = y;
      return;
    }

    if (Math.abs(delta) < deltaMin) {
      return;
    }

    if (delta > 0) {
      header.classList.add('is-hidden');
    } else {
      header.classList.remove('is-hidden');
    }

    lastY = y;
  };

  const onScroll = () => {
    if (ticking) {
      return;
    }

    ticking = true;

    if (reduceMotion) {
      update();
      return;
    }

    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  update();
}

initHeaderScroll();
