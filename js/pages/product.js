import { api } from '../utils/api.js';
import { formatPrice, t, getLang } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';
import { withState } from '../components/load-states.js';
import { renderProductCards } from '../components/product-card.js';
import { getOverviewSpecs, getQuickStats, formatProductAddress, formatPublishedAt } from '../utils/product-specs.js';
import Modal from '../components/modal.js';
import { requireAuth } from '../auth/require-auth.js';

const BASE = '../';

function getProductId() {
  return new URLSearchParams(window.location.search).get('id');
}

function renderBreadcrumbs(product) {
  return `
    <nav class="breadcrumbs" aria-label="breadcrumb">
      <a href="../index.html" class="breadcrumbs__item">${t('product.home')}</a>
      <span class="breadcrumbs__sep" aria-hidden="true"></span>
      <a href="catalog.html?category=${product.category}" class="breadcrumbs__item">${t(`categories.${product.category}`)}</a>
      <span class="breadcrumbs__sep" aria-hidden="true"></span>
      <a href="catalog.html?category=${product.category}&type=${product.type}" class="breadcrumbs__item">${t(`types.${product.type}`)}</a>
      <span class="breadcrumbs__sep" aria-hidden="true"></span>
      <span class="breadcrumbs__item breadcrumbs__item--current">${product.brand}</span>
    </nav>
  `;
}

function renderGallery(product) {
  const images = product.images?.length ? product.images : [''];
  const main = images[0];
  const thumbs = images.slice(0, 4);

  return `
    <div class="product-gallery">
      <div class="product-gallery__main">
        <img src="${BASE}${main}" alt="${product.name}" width="701" height="439">
      </div>
      <div class="product-gallery__thumbs" role="list">
        ${thumbs.map((src, index) => {
          const isLast = index === thumbs.length - 1 && images.length > 4;
          return `
            <button type="button" class="product-gallery__thumb${index === 0 ? ' is-active' : ''}" data-gallery-src="${BASE}${src}" role="listitem">
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

function renderSummary(product, seller) {
  const sellerName = seller?.name || '';
  const phone = seller?.phone || '';
  const telHref = toTelHref(phone);
  return `
    <aside class="product-summary">
      <div class="product-summary__card">
        <div class="product-summary__head">
          <div class="product-summary__titles">
            <h1 class="product-summary__title">${product.name}</h1>
            <p class="product-summary__type">${t(`types.${product.type}`)}</p>
          </div>
          <button type="button" class="product-summary__fav" aria-label="${t('product.favorite')}" data-favorite>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 27s-9.5-5.8-12.7-10.6C1.1 13.4 2.4 9 6.2 8c2.2-.6 4.5.3 5.8 2.1C13.3 8.3 15.6 7.4 17.8 8c3.8 1 5.1 5.4 2.9 8.4C25.5 21.2 16 27 16 27z" stroke="currentColor" stroke-width="1.8" fill="none"/>
            </svg>
          </button>
        </div>
        ${renderQuickStats(product)}
        ${sellerName ? `<a class="product-summary__seller-link" href="catalog.html?sellerId=${seller.id}">${t('product.viewSellerAds')} ${sellerName}</a>` : ''}
      </div>
      <div class="product-summary__contact">
        <p class="product-summary__price">${formatPrice(product.price)}</p>
        <div class="product-summary__actions">
          ${telHref ? `<a class="btn btn--secondary" href="${telHref}">${t('product.call')}</a>` : ''}
          <button type="button" class="btn btn--primary" data-contact-seller>${t('product.contactSeller')}</button>
        </div>
      </div>
    </aside>
  `;
}

function renderOverview(product) {
  const rows = getOverviewSpecs(product, t);
  return `
    <section class="product-overview" aria-labelledby="product-overview-title">
      <h2 class="product-section-title" id="product-overview-title">${t('product.overview')}</h2>
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
  const { product, seller, similar } = data;
  const container = document.getElementById('product-content');

  document.title = `${product.name} — Heavy Market`;

  container.innerHTML = `
    ${renderBreadcrumbs(product)}
    <div class="product-page__top">
      ${renderGallery(product)}
      ${renderSummary(product, seller)}
    </div>
    ${renderOverview(product)}
    ${renderDescription(product)}
    <section class="product-similar" aria-labelledby="product-similar-title">
      <h2 class="product-section-title" id="product-similar-title">${t('product.similar')}</h2>
      <div class="product-similar__grid" id="similar-grid" role="list"></div>
    </section>
  `;

  renderProductCards(document.getElementById('similar-grid'), similar, data.sellers, BASE);
  bindProductEvents(product, seller);
}

function bindProductEvents(product, seller) {
  const root = document.getElementById('product-content');

  root.querySelectorAll('[data-gallery-src]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const main = root.querySelector('.product-gallery__main img');
      if (main) {
        main.src = btn.dataset.gallerySrc;
      }
      root.querySelectorAll('.product-gallery__thumb').forEach((el) => el.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });

  root.querySelector('[data-description-toggle]')?.addEventListener('click', (event) => {
    const body = root.querySelector('[data-description-body]');
    const collapsed = body?.classList.toggle('is-collapsed');
    event.currentTarget.textContent = collapsed ? t('product.showMore') : t('product.showLess');
  });

  root.querySelector('[data-contact-seller]')?.addEventListener('click', () => {
    const phone = seller?.phone || '';
    const name = seller?.name || '';
    Modal.open({
      type: 'info',
      title: t('product.contactSeller'),
      message: phone
        ? `${name}\n${phone}`
        : t('product.contactUnavailable'),
      closeLabel: t('common.close')
    });
  });

  root.querySelector('[data-favorite]')?.addEventListener('click', (event) => {
    if (!requireAuth('favorites.authRequired')) return;
    event.currentTarget.classList.toggle('is-active');
  });
}

async function fetchProductPageData() {
  const id = getProductId();
  if (!id) {
    throw new Error('Product id is missing');
  }

  const [product, sellers] = await Promise.all([
    api.getProductById(id),
    api.getSellers()
  ]);

  const seller = sellers.find((item) => item.id === product.sellerId);
  const allProducts = await api.getProducts({
    category: product.category,
    type: product.type
  });

  const similar = allProducts
    .filter((item) => String(item.id) !== String(product.id))
    .sort((a, b) => {
      const aBrand = a.brand === product.brand ? 0 : 1;
      const bBrand = b.brand === product.brand ? 0 : 1;
      return aBrand - bBrand;
    })
    .slice(0, 4);

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
