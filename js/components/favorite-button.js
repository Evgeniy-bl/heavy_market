import { t } from '../common/i18n.js';
import { requireAuth } from '../auth/require-auth.js';
import { isFavorite, toggleFavorite } from '../utils/favorites.js';


export const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

export function renderHeartSvg(size = 20) {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="${HEART_PATH}"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
        fill="none"
      />
    </svg>
  `;
}

export function renderFavoriteButtonHtml(productId, favoriteIds = []) {
  const active = isFavorite(favoriteIds, productId);
  return `
    <button
      type="button"
      class="fav-btn${active ? ' is-active' : ''}"
      data-favorite-toggle
      data-product-id="${productId}"
      aria-pressed="${active ? 'true' : 'false'}"
      aria-label="${t(active ? 'favorites.remove' : 'favorites.add')}"
    >
      ${renderHeartSvg(20)}
    </button>
  `;
}

export function syncFavoriteButton(button, active) {
  if (!button) return;
  button.classList.toggle('is-active', Boolean(active));
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
  button.setAttribute('aria-label', t(active ? 'favorites.remove' : 'favorites.add'));
}


export function bindFavoriteToggles(root, { onChange } = {}) {
  if (!root) return () => {};

  const onClick = async (event) => {
    const button = event.target.closest('[data-favorite-toggle]');
    if (!button || !root.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();

    if (!requireAuth('favorites.authRequired')) return;

    const productId = button.dataset.productId;
    if (!productId) return;

    button.disabled = true;
    try {
      const result = await toggleFavorite(productId);
      if (!result.ok) return;

      syncFavoriteButton(button, result.active);
      onChange?.(result);
    } finally {
      button.disabled = false;
    }
  };

  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
