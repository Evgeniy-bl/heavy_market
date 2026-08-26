import { api } from '../utils/api.js';
import { getFilters, CATEGORY_TYPES } from '../utils/filter-config.js';
import { t } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';
import { withState } from '../components/load-states.js';
import { renderProductCards } from '../components/product-card.js';
import { buildSellerCatalogUrl } from '../utils/catalog-url.js';
import {
  FEATURED_SELLERS,
  getStaticFilterOptions
} from '../data/static-catalog.js';

let allProducts = [];
let allSellers = [];
let activeCategory = 'transport';
let activeType = 'trucks';
let homeDataPromise = null;

const SEGMENT_CATEGORIES = ['transport', 'agriculture', 'construction'];

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

function getFilteredProducts(category = activeCategory, type = activeType) {
  return allProducts.filter((p) => p.category === category && (!type || p.type === type));
}

function renderFilterFields() {
  const container = document.getElementById('hero-filter-fields');
  if (!container) return;

  const filters = getFilters(activeCategory, activeType, { includeTypeFilters: false });
  const staticOptions = getStaticFilterOptions(activeCategory, activeType);

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
      control = `<select class="form-field__control" name="region">${buildSelectOptions(staticOptions.regions, t('common.any'), (id) => t(`regions.${id}`))}</select>`;
      isSelect = true;
    } else if (filter.dynamic === 'brands') {
      control = `<select class="form-field__control" name="brand">${buildSelectOptions(staticOptions.brands, t('common.any'))}</select>`;
      isSelect = true;
    } else if (filter.dynamic === 'models') {
      control = `<select class="form-field__control" name="model">${buildSelectOptions(staticOptions.models, t('common.any'))}</select>`;
      isSelect = true;
    } else if (filter.dynamic === 'years') {
      control = `<select class="form-field__control" name="yearFrom">${buildSelectOptions(staticOptions.years, t('common.any'))}</select>`;
      isSelect = true;
    } else if (filter.type === 'price-range') {
      control = `<input class="form-field__control" type="number" name="priceTo" min="0" placeholder="${t('filter.priceTo')}">`;
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
  const btn = document.getElementById('hero-search-btn');
  if (!btn) return;

  if (!allProducts.length) {
    btn.textContent = t('hero.searchBtn');
    return;
  }

  const count = getFilteredProducts(activeCategory, activeType).length;
  btn.textContent = `${t('hero.searchBtn')} (${count} ${t('hero.searchResults')})`;
}

function setActiveTab(category) {
  activeCategory = category;
  activeType = CATEGORY_TYPES[category][0];

  const segmentIndex = SEGMENT_CATEGORIES.indexOf(category);
  const segmentTabs = document.querySelector('[data-segment-tabs]');
  if (segmentTabs && segmentIndex >= 0) {
    segmentTabs.style.setProperty('--segment-index', String(segmentIndex));
  }

  document.querySelectorAll('[data-category-tab]').forEach((tab) => {
    const isActive = tab.dataset.categoryTab === category;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  renderFilterFields();
  updateSearchCount();
}

function renderTopAds() {
  const topProducts = allProducts.filter((p) => p.isTop);
  renderProductCards(document.getElementById('top-ads-grid'), topProducts.slice(0, 8), allSellers);
}

function renderSellers() {
  const grid = document.getElementById('sellers-grid');
  if (!grid) return;

  grid.innerHTML = FEATURED_SELLERS.map((seller) => `
    <a
      class="seller-tile"
      href="${buildSellerCatalogUrl(seller.id, null, 'pages/')}"
      role="listitem"
    >
      <span class="seller-tile__city">${seller.city}</span>
      <span class="seller-tile__name">${seller.name}</span>
      <span class="seller-tile__desc">${seller.description}</span>
    </a>
  `).join('');
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

function initFaqAccordion() {
  const list = document.querySelector('.home-faq__list');
  if (!list) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = 400;

  const closeItem = (item) => {
    if (!item.open && !item.classList.contains('is-open')) return;

    if (reduceMotion) {
      item.open = false;
      item.classList.remove('is-open', 'is-animating-open', 'is-animating-close');
      return;
    }

    item.classList.add('is-open', 'is-animating-close');
    item.classList.remove('is-animating-open');
    item.open = true;

    
    void item.offsetHeight;
    requestAnimationFrame(() => {
      item.classList.remove('is-open');
    });

    window.setTimeout(() => {
      item.open = false;
      item.classList.remove('is-animating-close', 'is-open');
    }, duration);
  };

  const openItem = (item) => {
    list.querySelectorAll('details.home-faq__item').forEach((other) => {
      if (other !== item) closeItem(other);
    });

    if (reduceMotion) {
      item.open = true;
      item.classList.add('is-open');
      return;
    }

    item.classList.remove('is-open', 'is-animating-close');
    item.classList.add('is-animating-open');
    item.open = true;

  
    void item.offsetHeight;
    requestAnimationFrame(() => {
      item.classList.add('is-open');
    });

    window.setTimeout(() => {
      item.classList.remove('is-animating-open');
    }, duration);
  };

  list.querySelectorAll('summary.home-faq__question').forEach((summary) => {
    summary.addEventListener('click', (event) => {
      event.preventDefault();
      const item = summary.closest('details.home-faq__item');
      if (!item || item.classList.contains('is-animating-close') || item.classList.contains('is-animating-open')) {
        return;
      }

      if (item.open || item.classList.contains('is-open')) {
        closeItem(item);
      } else {
        openItem(item);
      }
    });
  });
}

async function loadProductBlocks() {
  const topAds = document.getElementById('top-ads-grid');

  await withState(topAds, fetchHomeData, () => {
    renderTopAds();
    updateSearchCount();
  });
}

function initHomeReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const nodes = document.querySelectorAll(
    '.home-mission, .home-directions, .home-values, .home-faq, .home-card, .home-value, .home-stats__item, .seller-tile, .home-faq__item'
  );

  nodes.forEach((node) => {
    node.style.opacity = '0';
    node.style.transform = 'translateY(16px)';
    node.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
  });

  const reveal = (node) => {
    node.style.opacity = '1';
    node.style.transform = 'none';
  };

  if (!('IntersectionObserver' in window)) {
    nodes.forEach(reveal);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  nodes.forEach((node) => observer.observe(node));
}

async function init() {
  initTabs();
  initFaqAccordion();
  setActiveTab(activeCategory);
  renderSellers();
  initHomeReveal();
  markContentReady();

  document.getElementById('hero-filter-form')?.addEventListener('submit', handleSearchSubmit);

  document.addEventListener('languageChanged', () => {
    renderFilterFields();
    updateSearchCount();
    renderSellers();
    if (!allProducts.length) return;
    renderTopAds();
  });

  await loadProductBlocks();
}

init();
