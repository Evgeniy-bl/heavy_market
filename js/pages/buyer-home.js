import { api } from '../utils/api.js';
import { getFilters, CATEGORY_TYPES } from '../utils/filter-config.js';
import { getAvailableRegions } from '../utils/belarus-regions.js';
import { t, formatPrice } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';
import { withState } from '../components/load-states.js';
import { renderProductCards } from '../components/product-card.js';

let allProducts = [];
let allSellers = [];
let activeCategory = 'transport';
let activeType = 'trucks';
let homeDataPromise = null;

function uniqueValues(products, field) {
  return [...new Set(products.map((p) => p[field]).filter(Boolean))].sort();
}

function getFilteredProducts(category = activeCategory, type = activeType) {
  return allProducts.filter((p) => p.category === category && (!type || p.type === type));
}

function buildSelectOptions(values, anyLabel, labelFn = (value) => value) {
  const options = [`<option value="">${anyLabel}</option>`];
  values.forEach((value) => {
    options.push(`<option value="${value}">${labelFn(value)}</option>`);
  });
  return options.join('');
}

function fetchHomeData() {
  if (!homeDataPromise) {
    homeDataPromise = Promise.all([api.getProducts(), api.getSellers()])
      .then(([products, sellers]) => {
        allProducts = products;
        allSellers = sellers;
        return { products, sellers };
      })
      .catch((error) => {
        homeDataPromise = null;
        throw error;
      });
  }

  return homeDataPromise;
}

function renderFilterFields() {
  const container = document.getElementById('hero-filter-fields');
  if (!container) return;

  const filters = getFilters(activeCategory, activeType);
  const products = getFilteredProducts(activeCategory, activeType);

  container.innerHTML = filters.map((filter) => {
    let control = '';
    let isSelect = false;

    if (filter.dynamic === 'types') {
      const types = CATEGORY_TYPES[activeCategory] ?? [];
      const opts = types.map((typeSlug) =>
        `<option value="${typeSlug}"${typeSlug === activeType ? ' selected' : ''}>${t(`types.${typeSlug}`)}</option>`
      ).join('');
      control = `<select class="form-field__control" name="type" id="filter-type">${opts}</select>`;
      isSelect = true;
    } else if (filter.dynamic === 'regions') {
      control = `<select class="form-field__control" name="region">${buildSelectOptions(getAvailableRegions(products), t('common.any'), (id) => t(`regions.${id}`))}</select>`;
      isSelect = true;
    } else if (filter.dynamic === 'brands') {
      control = `<select class="form-field__control" name="brand">${buildSelectOptions(uniqueValues(products, 'brand'), t('common.any'))}</select>`;
      isSelect = true;
    } else if (filter.dynamic === 'models') {
      control = `<select class="form-field__control" name="model">${buildSelectOptions(uniqueValues(products, 'model'), t('common.any'))}</select>`;
      isSelect = true;
    } else if (filter.dynamic === 'years') {
      const years = uniqueValues(products, 'year').sort((a, b) => b - a);
      control = `<select class="form-field__control" name="yearFrom">${buildSelectOptions(years, t('common.any'))}</select>`;
      isSelect = true;
    } else if (filter.type === 'number') {
      control = `<input class="form-field__control" type="number" name="${filter.field}" min="0">`;
    } else {
      control = `<input class="form-field__control" type="text" name="${filter.field}">`;
    }

    const fieldClass = isSelect ? 'form-field form-field--select' : 'form-field';
    const arrow = isSelect
      ? '<img class="form-field__arrow" src="assets/icons/select-arrow.svg" alt="" aria-hidden="true">'
      : '';

    return `
      <div class="${fieldClass}">
        <label class="form-field__label" for="filter-${filter.field}">${t(filter.labelKey)}</label>
        ${control.replace('name=', `id="filter-${filter.field}" name=`)}
        ${arrow}
      </div>
    `;
  }).join('');

  const typeSelect = container.querySelector('[name="type"]');
  typeSelect?.addEventListener('change', (event) => {
    activeType = event.target.value;
    renderFilterFields();
    updateSearchCount();
  });
}

function updateSearchCount() {
  const count = getFilteredProducts(activeCategory, activeType).length;
  const btn = document.getElementById('hero-search-btn');
  if (btn) {
    btn.textContent = `${t('hero.searchBtn')} (${count} ${t('hero.searchResults')})`;
  }
}

function setActiveTab(category) {
  activeCategory = category;
  activeType = CATEGORY_TYPES[category][0];

  document.querySelectorAll('[data-category-tab]').forEach((tab) => {
    const isActive = tab.dataset.categoryTab === category;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  renderFilterFields();
  updateSearchCount();
}

function renderDealOfDay() {
  const deal = allProducts.find((p) => p.isDealOfDay);
  const card = document.getElementById('deal-of-day');

  if (!deal || !card) {
    card?.setAttribute('hidden', '');
    return;
  }

  const seller = allSellers.find((s) => s.id === deal.sellerId);
  const sellerLine = seller
    ? `${seller.name}<br>${seller.city}`
    : deal.city;

  card.removeAttribute('hidden');
  card.innerHTML = `
    <a href="pages/product.html?id=${deal.id}">
      <div class="deal-card__image-wrap">
        <img class="deal-card__image" src="${deal.images[0]}" alt="${deal.name}" width="344" height="276" loading="lazy">
        <div class="deal-card__badge">
          <div class="deal-badge">
            <span class="deal-badge__ribbon" data-i18n="deal.badge">${t('deal.badge')}</span>
          </div>
        </div>
      </div>
      <h2 class="deal-card__title">${deal.name}</h2>
      <p class="deal-card__subtitle">${deal.description || ''}</p>
      <div class="deal-card__seller">
        <div class="deal-card__seller-info">
          <img src="assets/icons/location.svg" alt="" width="32" height="32">
          <span>${sellerLine}</span>
        </div>
        <p class="deal-card__price">${formatPrice(deal.price)}</p>
      </div>
    </a>
  `;
}

function renderTopAds() {
  const topProducts = allProducts.filter((p) => p.isTop);
  renderProductCards(document.getElementById('top-ads-grid'), topProducts.slice(0, 8), allSellers);
}

function renderSellersLogos() {
  const logosWrap = document.getElementById('sellers-logos');
  if (!logosWrap) return;

  logosWrap.innerHTML = allSellers.slice(0, 4).map((seller) =>
    `<img class="seller-logo" src="${seller.logo}" alt="${seller.name}" loading="lazy">`
  ).join('');
}

function renderRecent() {
  renderProductCards(document.getElementById('recent-track'), allProducts.slice(0, 4), allSellers);
}

function handleSearchSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const params = new URLSearchParams();
  params.set('category', activeCategory);

  formData.forEach((value, key) => {
    if (value) {
      params.set(key, value);
    }
  });

  window.location.href = `pages/catalog.html?${params.toString()}`;
}

function initTabs() {
  document.querySelectorAll('[data-category-tab]').forEach((tab) => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.categoryTab));
  });
}

function initRecentNav() {
  const track = document.getElementById('recent-track');
  const prev = document.querySelector('[data-recent-prev]');
  const next = document.querySelector('[data-recent-next]');
  if (!track) return;

  const getStep = () => {
    const card = track.querySelector('.product-card');
    if (!card) return 309;
    const gap = parseFloat(getComputedStyle(track).gap) || 20;
    return card.getBoundingClientRect().width + gap;
  };

  let offset = 0;

  const updateTransform = () => {
    const maxOffset = Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
    offset = Math.min(offset, maxOffset);
    track.style.transform = `translateX(-${offset}px)`;
  };

  next?.addEventListener('click', () => {
    offset = Math.min(offset + getStep(), track.scrollWidth - track.parentElement.clientWidth);
    updateTransform();
  });

  prev?.addEventListener('click', () => {
    offset = Math.max(offset - getStep(), 0);
    updateTransform();
  });

  window.addEventListener('resize', updateTransform);
}

async function loadHomeBlocks() {
  const fields = document.getElementById('hero-filter-fields');
  const deal = document.getElementById('deal-of-day');
  const topAds = document.getElementById('top-ads-grid');
  const logos = document.getElementById('sellers-logos');
  const recent = document.getElementById('recent-track');

  if (deal) {
    deal.removeAttribute('hidden');
  }

  await Promise.all([
    withState(fields, fetchHomeData, () => {
      setActiveTab(activeCategory);
    }),
    withState(deal, fetchHomeData, () => {
      renderDealOfDay();
    }),
    withState(topAds, fetchHomeData, () => {
      renderTopAds();
    }),
    withState(logos, fetchHomeData, () => {
      renderSellersLogos();
    }),
    withState(recent, fetchHomeData, () => {
      renderRecent();
    })
  ]);
}

async function init() {
  initTabs();
  initRecentNav();
  document.getElementById('hero-filter-form')?.addEventListener('submit', handleSearchSubmit);

  document.addEventListener('languageChanged', () => {
    if (!allProducts.length) return;
    renderFilterFields();
    updateSearchCount();
    renderDealOfDay();
    renderTopAds();
    renderSellersLogos();
    renderRecent();
  });

  await loadHomeBlocks();
  markContentReady();
}

init();
