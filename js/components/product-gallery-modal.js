import Modal from './modal.js';
import { APP_CONFIG } from '../config/constants.js';

const BASE = APP_CONFIG.paths.pagesAssetsBase;
let images = [];
let index = 0;
let bound = false;
let scrollLocked = false;

function getModal() {
  return document.querySelector('[data-modal="product-gallery"]');
}

function preventBackgroundScroll(event) {
  if (!getModal()?.classList.contains('is-open')) return;
  event.preventDefault();
}

function lockPageScroll() {
  if (scrollLocked) return;
  scrollLocked = true;
  document.body.classList.add('gallery-scroll-lock');
  document.addEventListener('wheel', preventBackgroundScroll, { passive: false });
  document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
}

function unlockPageScroll() {
  if (!scrollLocked) return;
  scrollLocked = false;
  document.body.classList.remove('gallery-scroll-lock');
  document.removeEventListener('wheel', preventBackgroundScroll);
  document.removeEventListener('touchmove', preventBackgroundScroll);
}

function populateHeader(modal, meta = {}) {
  const titleEl = modal.querySelector('[data-gallery-lightbox-title]');
  if (titleEl) titleEl.textContent = meta.title || '';
}

function renderThumbs(modal) {
  const container = modal.querySelector('[data-gallery-lightbox-thumbs]');
  if (!container) return;

  container.innerHTML = images.map((src, i) => `
    <button
      type="button"
      class="product-gallery-lightbox__thumb${i === index ? ' is-active' : ''}"
      data-gallery-lightbox-thumb
      data-index="${i}"
      aria-label="${i + 1}/${images.length}"
    >
      <img src="${BASE}${src}" alt="" width="88" height="70">
    </button>
  `).join('');
}

function setIndex(nextIndex) {
  if (!images.length) return;

  index = (nextIndex + images.length) % images.length;

  const modal = getModal();
  if (!modal) return;

  const main = modal.querySelector('[data-gallery-lightbox-image]');
  const counter = modal.querySelector('[data-gallery-lightbox-counter]');

  if (main) {
    main.src = `${BASE}${images[index]}`;
    main.alt = `${index + 1}/${images.length}`;
  }
  if (counter) counter.textContent = `${index + 1}/${images.length}`;

  modal.querySelectorAll('[data-gallery-lightbox-thumb]').forEach((btn, i) => {
    const active = i === index;
    btn.classList.toggle('is-active', active);
    if (active) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
}

function bindEvents() {
  if (bound) return;
  bound = true;

  const modal = getModal();
  if (!modal) return;

  modal.addEventListener('click', (event) => {
    if (event.target.closest('[data-gallery-lightbox-prev]')) {
      event.preventDefault();
      setIndex(index - 1);
      return;
    }

    if (event.target.closest('[data-gallery-lightbox-next]')) {
      event.preventDefault();
      setIndex(index + 1);
      return;
    }

    const thumb = event.target.closest('[data-gallery-lightbox-thumb]');
    if (thumb) {
      event.preventDefault();
      const next = Number(thumb.dataset.index);
      if (Number.isFinite(next)) setIndex(next);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!Modal.isOpen || Modal.root?.dataset.modal !== 'product-gallery') return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setIndex(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      setIndex(index + 1);
    }
  });

  document.addEventListener('modal:closed', (event) => {
    if (event.detail?.id !== 'product-gallery') return;
    unlockPageScroll();
  });
}

export function openProductGalleryModal({
  images: nextImages,
  startIndex = 0,
  meta = {}
}) {
  const modal = getModal();
  if (!modal || !nextImages?.length) return;

  images = nextImages;
  index = Math.min(Math.max(startIndex, 0), images.length - 1);

  bindEvents();
  populateHeader(modal, meta);
  renderThumbs(modal);
  setIndex(index);

  const prev = modal.querySelector('[data-gallery-lightbox-prev]');
  const next = modal.querySelector('[data-gallery-lightbox-next]');
  const counter = modal.querySelector('[data-gallery-lightbox-counter]');
  const thumbs = modal.querySelector('[data-gallery-lightbox-thumbs]');
  const hideNav = images.length <= 1;

  if (prev) prev.hidden = hideNav;
  if (next) next.hidden = hideNav;
  if (counter) counter.hidden = hideNav;
  if (thumbs) thumbs.hidden = hideNav;

  lockPageScroll();
  Modal.open('product-gallery');
}
