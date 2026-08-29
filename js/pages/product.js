import { api } from '../utils/api.js';
import { formatPrice, t, getLang } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';
import { withState } from '../components/load-states.js';

import { getOverviewSpecs, getQuickStats, formatProductAddress, formatPublishedAt } from '../utils/product-specs.js';
import { buildSellerCatalogUrl } from '../utils/catalog-url.js';
import { isFavorite, loadFavoriteIds, toggleFavorite } from '../utils/favorites.js';
import { openOrCreateSellerConversation } from '../utils/conversations.js';
import {
  fetchSimilarProducts,
  mountSimilarListings,
  renderSimilarSectionHtml
} from '../utils/similar-products.js';

import { renderHeartSvg } from '../components/favorite-button.js';
import { alertDialog } from '../components/alert.js';
import { confirmDialog } from '../components/confirm.js';
import { openSellerPhoneModal } from '../components/seller-phone-modal.js';
import { openProductGalleryModal } from '../components/product-gallery-modal.js';

import { requireAuth } from '../auth/require-auth.js';
import { getCurrentUser } from '../auth/session.js';
import { API } from '../api.js';
import { isAdmin, isProductOwner } from '../utils/user-role.js';
import {
  getProductStatus,
  isProductPublished,
  isProductInactive,
  PRODUCT_STATUS
} from '../utils/product-status.js';

const BASE = '../';

let favoriteIds = [];
let similarListings = null;

function getProductId() {
  return new URLSearchParams(window.location.search).get('id');
}

function renderBreadcrumbs(product) {
  return `
    <nav class="breadcrumbs" aria-label="breadcrumb">
      <a href="catalog.html?category=${product.category}&type=${product.type}" class="breadcrumbs__back" data-i18n-fallback>
        <span class="breadcrumbs__back-icon" aria-hidden="true"></span>
        <span class="breadcrumbs__back-text">${t(`types.${product.type}`)}</span>
      </a>
      <div class="breadcrumbs__trail">
        <a href="../index.html" class="breadcrumbs__item">${t('product.home')}</a>
        <span class="breadcrumbs__sep" aria-hidden="true"></span>
        <a href="catalog.html?category=${product.category}" class="breadcrumbs__item">${t(`categories.${product.category}`)}</a>
        <span class="breadcrumbs__sep" aria-hidden="true"></span>
        <a href="catalog.html?category=${product.category}&type=${product.type}" class="breadcrumbs__item">${t(`types.${product.type}`)}</a>
        <span class="breadcrumbs__sep" aria-hidden="true"></span>
        <span class="breadcrumbs__item breadcrumbs__item--current">${product.brand}</span>
      </div>
    </nav>
  `;
}

function renderGallery(product, { favoriteActive = false } = {}) {
  const images = product.images?.length ? product.images : [''];
  const main = images[0];
  const thumbs = images.slice(0, 4);
  const total = images.length;

  return `
    <div class="product-gallery" data-product-gallery data-gallery-total="${total}">
      <div class="product-gallery__main">
        <img src="${BASE}${main}" alt="${product.name}" width="701" height="439" data-gallery-image>
        <button type="button" class="product-gallery__nav product-gallery__nav--prev" data-gallery-prev aria-label="Previous" ${total <= 1 ? 'hidden' : ''}></button>
        <button type="button" class="product-gallery__nav product-gallery__nav--next" data-gallery-next aria-label="Next" ${total <= 1 ? 'hidden' : ''}></button>
        <span class="product-gallery__counter" data-gallery-counter ${total <= 1 ? 'hidden' : ''}>1/${total}</span>
        <button
          type="button"
          class="product-gallery__fav${favoriteActive ? ' is-active' : ''}"
          aria-label="${t(favoriteActive ? 'favorites.remove' : 'favorites.add')}"
          aria-pressed="${favoriteActive ? 'true' : 'false'}"
          data-favorite
          data-product-id="${product.id}"
        >
          ${renderHeartSvg(28)}
        </button>
      </div>
      <div class="product-gallery__thumbs" role="list">
        ${thumbs.map((src, index) => {
          const isLast = index === thumbs.length - 1 && images.length > 4;
          return `
            <button type="button" class="product-gallery__thumb${index === 0 ? ' is-active' : ''}" data-gallery-src="${BASE}${src}" data-gallery-index="${index}"${isLast ? ' data-gallery-more' : ''} role="listitem">
              <img src="${BASE}${src}" alt="" width="151" height="120">
              ${isLast ? `<span class="product-gallery__more">${t('product.morePhotos')}</span>` : ''}
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function toTelHref(phone) {
  if (!phone) return '';
  return `tel:${String(phone).replace(/[^\d+]/g, '')}`;
}

function normalizePhoneDigits(phone) {
  let digits = String(phone || '').replace(/\D/g, '');

  if (digits.startsWith('80') && digits.length === 11) {
    digits = `375${digits.slice(2)}`;
  }
  if (digits.length === 9 && /^(25|29|33|44)/.test(digits)) {
    digits = `375${digits}`;
  }

  return digits;
}

function formatPhoneDisplay(phone) {
  const raw = String(phone || '').trim();
  const digits = normalizePhoneDigits(raw);

  if (digits.startsWith('375') && digits.length === 12) {
    const code = digits.slice(3, 5);
    const partA = digits.slice(5, 8);
    const partB = digits.slice(8, 10);
    const partC = digits.slice(10, 12);
    return `+375 (${code}) ${partA}-${partB}-${partC}`;
  }

  return raw || digits;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderQuickStats(product) {
  const stats = getQuickStats(product, t);
  const address = formatProductAddress(product);
  const posted = formatPublishedAt(product.publishedAt, t, getLang());

  return `
    ${address || posted ? `
      <div class="product-summary__meta">
        ${address ? `<p class="product-summary__address">${address}</p>` : ''}
        ${posted ? `<p class="product-summary__posted">${posted}</p>` : ''}
      </div>
    ` : ''}
    <div class="product-summary__stats">
      ${stats.map((stat) => `
        <div class="product-summary__stat">
          <span class="product-summary__stat-label">${stat.label}</span>
          <span class="product-summary__stat-value">${stat.value}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAdminModerationBar(product) {
  if (!isAdmin(getCurrentUser())) return '';

  const status = getProductStatus(product);

  return `
    <div class="product-admin-bar" data-admin-moderation>
      <div class="product-admin-bar__inner">
        <a class="btn btn--secondary product-admin-bar__back" href="admin.html">${t('admin.backToQueue')}</a>
        <span class="product-admin-bar__status product-admin-bar__status--${status}">${t(`admin.status.${status}`)}</span>
        <div class="product-admin-bar__actions">
          ${status !== PRODUCT_STATUS.PUBLISHED ? `
            <button type="button" class="btn btn--primary" data-admin-approve>${t('admin.approve')}</button>
          ` : ''}
          ${status !== PRODUCT_STATUS.REJECTED && status !== PRODUCT_STATUS.INACTIVE ? `
            <button type="button" class="btn btn--secondary" data-admin-reject>${t('admin.reject')}</button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderSummary(product, seller) {
  const sellerName = seller?.name || '';
  const phone = product.phone || seller?.phone || '';
  const active = isFavorite(favoriteIds, product.id);
  const listingPublished = isProductPublished(product);
  const listingInactive = isProductInactive(product);
  const status = getProductStatus(product);
  const adminView = isAdmin(getCurrentUser());
  const isOwnListing = isProductOwner(getCurrentUser(), product, seller);

  let contactBlock = '';

  if (listingPublished && !isOwnListing) {
    contactBlock = `
      <div class="product-summary__actions">
        ${phone ? `<button type="button" class="btn btn--secondary" data-call-seller>${t('product.call')}</button>` : ''}
        <button type="button" class="btn btn--primary" data-contact-seller>${t('product.contactSeller')}</button>
      </div>
    `;
  } else if (listingPublished && isOwnListing) {
    contactBlock = `<p class="product-summary__inactive-hint">${t('product.ownListingHint')}</p>`;
  } else if (listingInactive) {
    contactBlock = `<p class="product-summary__inactive-hint">${t('product.inactiveHint')}</p>`;
  } else if (!adminView) {
    contactBlock = `<p class="product-summary__inactive-hint">${t(`product.statusHint.${status}`)}</p>`;
  } else {
    contactBlock = `<p class="product-summary__inactive-hint">${t(`admin.status.${status}`)}</p>`;
  }

  return `
    <aside class="product-summary">
      <div class="product-summary__card">
        <p class="product-summary__price product-summary__price--mobile">${formatPrice(product.price)}</p>
        <div class="product-summary__head">
          <div class="product-summary__titles">
            <h1 class="product-summary__title">${product.name}</h1>
            <p class="product-summary__type">${t(`types.${product.type}`)}</p>
            ${listingPublished ? '' : `<p class="product-summary__inactive-badge">${t(`admin.status.${status}`)}</p>`}
          </div>
          <button
            type="button"
            class="product-summary__fav${active ? ' is-active' : ''}"
            aria-label="${t(active ? 'favorites.remove' : 'favorites.add')}"
            aria-pressed="${active ? 'true' : 'false'}"
            data-favorite
            data-product-id="${product.id}"
          >
            ${renderHeartSvg(32)}
          </button>
        </div>
        ${renderQuickStats(product)}
        ${sellerName && listingPublished ? `<a class="product-summary__seller-link" href="catalog.html?sellerId=${seller.id}">${t('product.viewSellerAds')} ${sellerName}</a>` : ''}
      </div>
      <div class="product-summary__contact">
        <p class="product-summary__price product-summary__price--desktop">${formatPrice(product.price)}</p>
        ${contactBlock}
      </div>
    </aside>
  `;
}

function renderStickyCta(product, seller) {
  if (!isProductPublished(product)) return '';
  if (isProductOwner(getCurrentUser(), product, seller)) return '';

  const phone = product.phone || seller?.phone || '';

  return `
    <div class="product-sticky-cta" data-product-sticky-cta>
      <div class="product-sticky-cta__actions">
        ${phone ? `<button type="button" class="btn btn--secondary product-sticky-cta__btn product-sticky-cta__btn--call" data-call-seller>${t('product.call')}</button>` : ''}
        <button type="button" class="btn btn--primary product-sticky-cta__btn product-sticky-cta__btn--write" data-contact-seller>${t('product.write')}</button>
      </div>
    </div>
  `;
}

function renderOverview(product) {
  const rows = getOverviewSpecs(product, t);

  return `
    <section class="product-overview" aria-labelledby="product-overview-title">
      <h2 class="product-section-title" id="product-overview-title">
        <span class="product-section-title__desktop">${t('product.overview')}</span>
        <span class="product-section-title__mobile">${t('product.specs')}</span>
      </h2>
      <div class="product-overview__list">
        ${rows.map((row, index) => `
          <div class="product-overview__row${index % 2 === 0 ? ' product-overview__row--muted' : ''}">
            <span class="product-overview__label">${row.label}</span>
            <span class="product-overview__value">${row.value}</span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderDescription(product) {
  const text = product.description || '';

  return `
    <section class="product-description" aria-labelledby="product-description-title">
      <h2 class="product-section-title" id="product-description-title">${t('product.description')}</h2>
      <div class="product-description__body${text.length > 280 ? ' is-collapsed' : ''}" data-description-body>
        <p class="product-description__text">${text}</p>
      </div>
      ${text.length > 280 ? `<button type="button" class="product-description__more" data-description-toggle>${t('product.showMore')}</button>` : ''}
    </section>
  `;
}

function renderProductPage(data) {
  const { product, seller, similar, sellers } = data;
  const container = document.getElementById('product-content');

  similarListings?.destroy();
  similarListings = mountSimilarListings({
    products: similar,
    sellers,
    basePath: BASE,
    favoriteIds
  });

  document.title = `${product.name} — Heavy Market`;

  container.innerHTML = `
    ${renderAdminModerationBar(product)}
    ${renderBreadcrumbs(product)}
    <div class="product-page__top">
      ${renderGallery(product, { favoriteActive: isFavorite(favoriteIds, product.id) })}
      ${renderSummary(product, seller)}
    </div>
    ${renderOverview(product)}
    ${renderDescription(product)}
    ${renderSimilarSectionHtml()}
  `;

  document.querySelector('[data-product-sticky-cta]')?.remove();
  const stickyHtml = renderStickyCta(product, seller);
  if (stickyHtml) {
    document.body.insertAdjacentHTML('beforeend', stickyHtml);
  }

  similarListings.render();
  bindProductEvents(product, seller);
}

function bindProductEvents(product, seller) {
  const root = document.getElementById('product-content');
  const images = product.images?.length ? product.images : [''];
  let galleryIndex = 0;

  const setGalleryIndex = (nextIndex) => {
    if (!images.length) return;

    galleryIndex = (nextIndex + images.length) % images.length;

    const main = root.querySelector('[data-gallery-image]');
    const counter = root.querySelector('[data-gallery-counter]');
    if (main) main.src = `${BASE}${images[galleryIndex]}`;
    if (counter) counter.textContent = `${galleryIndex + 1}/${images.length}`;

    root.querySelectorAll('.product-gallery__thumb').forEach((el, i) => {
      el.classList.toggle('is-active', i === galleryIndex || (galleryIndex >= 4 && i === 3));
    });
  };

  root.querySelector('[data-gallery-prev]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    setGalleryIndex(galleryIndex - 1);
  });
  root.querySelector('[data-gallery-next]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    setGalleryIndex(galleryIndex + 1);
  });

  const openGalleryAt = (startIndex) => {
    if (!images.length || (images.length === 1 && !images[0])) return;

    openProductGalleryModal({
      images,
      startIndex,
      meta: {
        title: product.name
      }
    });
  };

  root.querySelector('.product-gallery__main')?.addEventListener('click', (event) => {
    if (event.target.closest('[data-gallery-prev], [data-gallery-next], [data-favorite], [data-gallery-counter]')) {
      return;
    }
    openGalleryAt(galleryIndex);
  });

  root.querySelectorAll('[data-gallery-src]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.hasAttribute('data-gallery-more')) {
        openGalleryAt(3);
        return;
      }

      const idx = Number(btn.dataset.galleryIndex);
      if (Number.isFinite(idx)) setGalleryIndex(idx);
      else {
        const main = root.querySelector('[data-gallery-image]');
        if (main) main.src = btn.dataset.gallerySrc;
        root.querySelectorAll('.product-gallery__thumb').forEach((el) => el.classList.remove('is-active'));
        btn.classList.add('is-active');
      }
    });
  });

  root.querySelector('[data-description-toggle]')?.addEventListener('click', (event) => {
    const body = root.querySelector('[data-description-body]');
    const collapsed = body?.classList.toggle('is-collapsed');
    event.currentTarget.textContent = collapsed ? t('product.showMore') : t('product.showLess');
  });

  const handleCallSeller = () => {
    if (!requireAuth('product.callAuthRequired')) return;

    const phone = product.phone || seller?.phone || '';
    const telHref = toTelHref(phone);
    const sellerName = seller?.name || t('product.seller');

    if (!phone || !telHref) {
      alertDialog({ message: t('product.contactUnavailable'), type: 'error' });
      return;
    }

    openSellerPhoneModal({
      name: sellerName,
      phone: formatPhoneDisplay(phone),
      telHref
    });
  };

  root.querySelectorAll('[data-call-seller]').forEach((btn) => {
    btn.addEventListener('click', handleCallSeller);
  });

  root.querySelectorAll('[data-contact-seller]').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      const user = requireAuth('messages.authRequired');
      if (!user) return;

      if (!isProductPublished(product)) {
        alertDialog({ message: t('product.inactiveHint'), type: 'error' });
        return;
      }

      if (!seller?.id) {
        alertDialog({
          title: t('product.contactSeller'),
          message: t('product.contactUnavailable')
        });
        return;
      }

      if (isProductOwner(user, product, seller)) {
        alertDialog({ message: t('product.ownListingHint'), type: 'error' });
        return;
      }

      const button = event.currentTarget;
      button.disabled = true;

      try {
        const conversation = await openOrCreateSellerConversation({
          userId: user.id,
          product,
          seller,
          user
        });
        window.location.href = `messages.html?id=${encodeURIComponent(conversation.id)}`;
      } catch (error) {
        alertDialog({
          message: error?.code === 'SELF_CONVERSATION'
            ? t('product.ownListingHint')
            : error?.code === 'LISTING_INACTIVE'
              ? t('product.inactiveHint')
              : t('messages.openError'),
          type: 'error'
        });
        button.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-product-sticky-cta] [data-contact-seller]').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {
      root.querySelector('.product-summary__actions [data-contact-seller]')?.click();
    });
  });

  document.querySelectorAll('[data-product-sticky-cta] [data-call-seller]').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', handleCallSeller);
  });

  root.querySelector('[data-admin-approve]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;

    try {
      await API.approveProduct(product.id);
      window.location.href = 'admin.html?tab=pending';
    } catch {
      alertDialog({ message: t('admin.moderateError'), type: 'error' });
      button.disabled = false;
    }
  });

  root.querySelector('[data-admin-reject]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const confirmed = await confirmDialog({
      title: t('admin.rejectTitle'),
      message: t('admin.rejectConfirm'),
      confirmText: t('admin.reject'),
      cancelText: t('common.cancel'),
      type: 'error'
    });
    if (!confirmed) return;

    button.disabled = true;

    try {
      await API.rejectProduct(product.id);
      window.location.href = 'admin.html?tab=pending';
    } catch {
      alertDialog({ message: t('admin.moderateError'), type: 'error' });
      button.disabled = false;
    }
  });

  root.querySelectorAll('[data-favorite]').forEach((favBtn) => {
    favBtn.addEventListener('click', async (event) => {
      if (!requireAuth('favorites.authRequired')) return;

      const button = event.currentTarget;
      button.disabled = true;

      try {
        const result = await toggleFavorite(button.dataset.productId);
        if (!result.ok) return;

        favoriteIds = result.favoriteIds;
        similarListings?.setFavoriteIds(favoriteIds);
        root.querySelectorAll('[data-favorite]').forEach((el) => {
          el.classList.toggle('is-active', result.active);
          el.setAttribute('aria-pressed', result.active ? 'true' : 'false');
          el.setAttribute('aria-label', t(result.active ? 'favorites.remove' : 'favorites.add'));
        });
      } finally {
        button.disabled = false;
      }
    });
  });
}

async function fetchProductPageData() {
  const id = getProductId();
  if (!id) {
    throw new Error('Product id is missing');
  }

  const session = getCurrentUser();
  const [product, sellers, favorites] = await Promise.all([
    api.getProductById(id),
    api.getSellers(),
    session?.id ? loadFavoriteIds(session.id) : Promise.resolve([])
  ]);

  favoriteIds = favorites;

  const seller = sellers.find((item) => item.id === product.sellerId);
  const similar = await fetchSimilarProducts(api, product);

  return { product, seller, sellers, similar };
}

async function init() {
  const container = document.getElementById('product-content');

  await withState(container, fetchProductPageData, renderProductPage);
  markContentReady();

  document.addEventListener('languageChanged', async () => {
    await withState(container, fetchProductPageData, renderProductPage);
  });
}

init();