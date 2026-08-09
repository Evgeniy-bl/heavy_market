const MIN_VISIBLE_MS = 280;
const FAILSAFE_MS = 12000;

let settled = false;
let domReady = false;
let contentReady = false;
let minDone = false;
let shownAt = 0;
let minTimer = 0;

document.documentElement.classList.add('is-preload');

function ensureMounted() {
  let root = document.getElementById('preloader');

  if (!root) {
    root = document.createElement('div');
    root.id = 'preloader';
    root.className = 'preloader';
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-busy', 'true');
    root.innerHTML = `
      <div class="preloader__inner">
        <div class="preloader__logo" aria-hidden="true">HEAVY</div>
        <div class="preloader__spinner" aria-hidden="true"></div>
        <p class="preloader__text">Загрузка...</p>
      </div>
    `;
    document.body.prepend(root);
  }

  root.classList.remove('is-hidden');
  root.setAttribute('aria-busy', 'true');
  return root;
}

function startMinTimer() {
  shownAt = performance.now();
  minDone = false;
  window.clearTimeout(minTimer);
  minTimer = window.setTimeout(() => {
    minDone = true;
    tryHide();
  }, MIN_VISIBLE_MS);
}

function tryHide() {
  if (settled || !domReady || !contentReady || !minDone) {
    return;
  }

  const elapsed = performance.now() - shownAt;
  if (elapsed < MIN_VISIBLE_MS) {
    window.setTimeout(tryHide, MIN_VISIBLE_MS - elapsed);
    return;
  }

  hidePreloader();
}

function hidePreloader() {
  if (settled) {
    return;
  }

  settled = true;
  const root = document.getElementById('preloader');
  document.documentElement.classList.remove('is-preload');

  if (!root) {
    return;
  }

  root.setAttribute('aria-busy', 'false');
  root.classList.add('is-hidden');

  const remove = () => {
    if (root.parentNode) {
      root.remove();
    }
  };

  root.addEventListener('transitionend', remove, { once: true });
  window.setTimeout(remove, 500);
}

export function markContentReady() {
  contentReady = true;
  tryHide();
}

export { hidePreloader };

function onDomReady() {
  ensureMounted();
  startMinTimer();
  domReady = true;
  tryHide();
}

if (document.body) {
  onDomReady();
} else {
  document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
}

window.setTimeout(() => {
  contentReady = true;
  tryHide();
}, FAILSAFE_MS);

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    contentReady = true;
    domReady = true;
    minDone = true;
    hidePreloader();
  }
});

if (typeof window !== 'undefined') {
  window.markContentReady = markContentReady;
}
