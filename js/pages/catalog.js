import { api } from '../utils/api.js';
import { getFilters, CATEGORY_TYPES } from '../utils/filter-config.js';
import { BELARUS_REGIONS, getRegionByCity } from '../utils/belarus-regions.js';
import { t, getLang } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';
import { withState } from '../components/load-states.js';
import { renderCatalogCards } from '../components/catalog-card.js';
import { matchesProductQuery } from '../utils/product-search.js';
import { loadFavoriteIds } from '../utils/favorites.js';
import { bindFavoriteToggles } from '../components/favorite-button.js';
import { mountPagination } from '../components/pagination.js';
import { getCurrentUser } from '../auth/session.js';

const BASE = '../';
const PAGE_SIZE = 6;
const SEGMENT_CATEGORIES = ['transport', 'agriculture', 'construction'];
const CATEGORY_ICONS = {
  transport: 'delivery-truck-trailer-svgrepo-com.svg',
  agriculture: 'tractor-svgrepo-com.svg',
  construction: 'building-construction-crane-svgrepo-com.svg'
};
const SORT_OPTIONS = ['', 'price-asc', 'price-desc', 'year-asc', 'year-desc'];
const SORT_ITEMS = [
  { value: '', labelKey: 'catalog.sortDefault' },
  { value: 'price-asc', labelKey: 'catalog.sortPriceAsc' },
  { value: 'price-desc', labelKey: 'catalog.sortPriceDesc' },
  { value: 'year-asc', labelKey: 'catalog.sortYearAsc' },
  { value: 'year-desc', labelKey: 'catalog.sortYearDesc' }
];

let allProducts = [];
let allSellers = [];
let activeCategory = 'transport';
let activeType = 'trucks';
let draftType = 'trucks';
let appliedFilters = {};
let currentSort = '';
let currentPage = 1;
let filteredProducts = [];
let openSections = new Set(['type', 'price', 'brand', 'region']);
let priceBounds = { min: 0, max: 0 };
let searchTimer = null;
let priceTimer = null;
let favoriteIds = [];
let unbindFavorites = null;

function uniqueValues(products, field) {
  return [...new Set(products.map((p) => p[field]).filter(Boolean))].sort();
}

function getCategoryProducts(category = activeCategory, type = draftType) {
  return allProducts.filter((p) => p.category === category && (!type || p.type === type));
}

function getPriceBounds(products) {
  if (!products.length) {
    return { min: 0, max: 100000 };
  }
  const prices = products.map((p) => Number(p.price) || 0);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max: max === min ? min + 1 : max };
}

function buildSelectOptions(values, anyLabel, labelFn = (value) => value, selected = '') {
  const options = [`<option value="">${anyLabel}</option>`];
  values.forEach((value) => {
    const isSelected = String(value) === String(selected) ? ' selected' : '';
    options.push(`<option value="${value}"${isSelected}>${labelFn(value)}</option>`);
  });
  return options.join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getActiveSeller() {
  const sellerId = appliedFilters.sellerId;
  if (!sellerId) return null;
  return allSellers.find((seller) => String(seller.id) === String(sellerId)) || null;
}

function countSellerProducts(sellerId) {
  return allProducts.filter((product) => String(product.sellerId) === String(sellerId)).length;
}

function preserveSellerFilter() {
  const sellerId = appliedFilters.sellerId;
  appliedFilters = {};
  if (sellerId) appliedFilters.sellerId = sellerId;
}

function formatNumber(value) {
  return Number(value).toLocaleString('ru-RU');
}

function getSortLabel(value = currentSort) {
  const item = SORT_ITEMS.find((entry) => entry.value === value) || SORT_ITEMS[0];
  return t(item.labelKey);
}

function renderSortDropdownHtml(variant = 'desktop') {
  const isMobile = variant === 'mobile';
  return `
    <div class="catalog-sort${isMobile ? ' catalog-sort--mobile' : ''}" data-sort-dropdown>
      ${isMobile ? '' : `<span class="catalog-sort__label">${t('catalog.sort')}:</span>`}
      <div class="catalog-sort__wrap">
        <button type="button" class="catalog-sort__toggle" aria-expanded="false" aria-haspopup="listbox">
          ${isMobile ? `
            <span class="catalog-sort__icon" aria-hidden="true"></span>
          ` : ''}
          <span class="catalog-sort__current" data-sort-current>${getSortLabel()}</span>
          ${isMobile ? '' : '<span class="catalog-sort__chevron" aria-hidden="true"></span>'}
        </button>
        <div class="catalog-sort__panel" hidden role="listbox">
          ${SORT_ITEMS.map((item) => `
            <button
              type="button"
              class="catalog-sort__option${item.value === currentSort ? ' is-active' : ''}"
              role="option"
              data-sort-value="${item.value}"
              aria-selected="${item.value === currentSort}"
            >${t(item.labelKey)}</button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function closeSortDropdown() {
  document.querySelectorAll('[data-sort-dropdown]').forEach((root) => {
    const toggle = root.querySelector('.catalog-sort__toggle');
    const panel = root.querySelector('.catalog-sort__panel');
    root.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
  });
}

function updateSortDropdownUI() {
  document.querySelectorAll('[data-sort-dropdown]').forEach((root) => {
    const current = root.querySelector('[data-sort-current]');
    if (current) current.textContent = getSortLabel();

    root.querySelectorAll('[data-sort-value]').forEach((btn) => {
      const active = btn.dataset.sortValue === currentSort;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
  });
}

function bindSortDropdown() {
  document.querySelectorAll('[data-sort-dropdown]').forEach((root) => {
    if (root.dataset.bound === 'true') return;
    root.dataset.bound = 'true';

    const toggle = root.querySelector('.catalog-sort__toggle');
    const panel = root.querySelector('.catalog-sort__panel');

    toggle?.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = root.classList.contains('is-open');
      closeSortDropdown();
      if (isOpen) return;
      root.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      if (panel) panel.hidden = false;
    });

    root.querySelectorAll('[data-sort-value]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentSort = btn.dataset.sortValue;
        currentPage = 1;
        updateSortDropdownUI();
        closeSortDropdown();
        applyFiltersAndRender();
      });
    });
  });

  if (!document.body.dataset.catalogSortBound) {
    document.body.dataset.catalogSortBound = 'true';
    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-sort-dropdown]')) {
        closeSortDropdown();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeSortDropdown();
        closeFiltersDrawer();
      }
    });
  }
}

function getActiveFilterCount() {
  return getAppliedFilterChips().length;
}

function updateFiltersBadge() {
  const badge = document.querySelector('[data-filters-badge]');
  if (!badge) return;
  const count = getActiveFilterCount();
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

function openFiltersDrawer() {
  const layout = document.querySelector('.catalog-page__layout');
  if (!layout) return;
  layout.classList.add('is-filters-open');
  document.body.classList.add('is-filters-drawer-open');
  document.querySelector('[data-filters-open]')?.setAttribute('aria-expanded', 'true');
  closeSortDropdown();
  syncSidebarHeight();
}

function closeFiltersDrawer() {
  const layout = document.querySelector('.catalog-page__layout');
  if (!layout) return;
  layout.classList.remove('is-filters-open');
  document.body.classList.remove('is-filters-drawer-open');
  document.querySelector('[data-filters-open]')?.setAttribute('aria-expanded', 'false');
  syncSidebarHeight();
}

function bindFiltersDrawer() {
  document.querySelector('[data-filters-open]')?.addEventListener('click', () => {
    const layout = document.querySelector('.catalog-page__layout');
    if (layout?.classList.contains('is-filters-open')) {
      closeFiltersDrawer();
      return;
    }
    openFiltersDrawer();
  });

  document.querySelector('[data-filters-close]')?.addEventListener('click', closeFiltersDrawer);
  document.querySelector('[data-filters-backdrop]')?.addEventListener('click', closeFiltersDrawer);
}

const SIDEBAR_DESKTOP_MQ = window.matchMedia('(min-width: 1101px)');
let sidebarHeightFrame = null;

function getViewportMetrics() {
  const vv = window.visualViewport;
  if (vv) {
    return {
      height: Math.floor(vv.height),
      offsetTop: Math.floor(vv.offsetTop || 0),
      bottomInset: Math.max(0, Math.floor(window.innerHeight - vv.offsetTop - vv.height))
    };
  }

  const height = Math.floor(window.innerHeight || document.documentElement.clientHeight);
  return { height, offsetTop: 0, bottomInset: 0 };
}

function syncSidebarHeight() {
  const sidebar = document.querySelector('.catalog-sidebar');
  const slot = document.querySelector('.catalog-sidebar-slot');
  const layout = document.querySelector('.catalog-page__layout');
  if (!sidebar) return;

  const viewport = getViewportMetrics();

  if (SIDEBAR_DESKTOP_MQ.matches) {
    if (slot) {
      slot.style.removeProperty('height');
      slot.style.removeProperty('max-height');
      slot.style.removeProperty('top');
      slot.style.removeProperty('bottom');
      slot.style.removeProperty('left');
      slot.style.removeProperty('right');
      slot.style.removeProperty('position');
      slot.style.removeProperty('z-index');
    }

    const styles = getComputedStyle(document.documentElement);
    const headerHeight = Number.parseFloat(styles.getPropertyValue('--header-height')) || 88;
    const stickyOffset = Number.parseFloat(styles.getPropertyValue('--catalog-sidebar-sticky-offset')) || 16;
    const bottomGap = Number.parseFloat(styles.getPropertyValue('--catalog-sidebar-bottom-gap')) || 24;
    const stickyTop = headerHeight + stickyOffset;
    const currentTop = sidebar.getBoundingClientRect().top;
    const top = Math.max(currentTop, stickyTop);
    const available = Math.max(280, Math.floor(viewport.height - Math.max(0, top - viewport.offsetTop) - bottomGap));

    sidebar.style.height = `${available}px`;
    sidebar.style.maxHeight = `${available}px`;
    return;
  }

  if (layout?.classList.contains('is-filters-open')) {
    if (slot) {
      slot.style.removeProperty('position');
      slot.style.removeProperty('left');
      slot.style.removeProperty('right');
      slot.style.removeProperty('top');
      slot.style.removeProperty('bottom');
      slot.style.removeProperty('height');
      slot.style.removeProperty('max-height');
      slot.style.removeProperty('width');
      slot.style.removeProperty('transform');
      slot.style.removeProperty('z-index');
    }
    sidebar.style.removeProperty('height');
    sidebar.style.removeProperty('max-height');
    sidebar.style.removeProperty('top');
    return;
  }

  sidebar.style.removeProperty('height');
  sidebar.style.removeProperty('max-height');
  sidebar.style.removeProperty('top');
  if (slot) {
    slot.style.removeProperty('height');
    slot.style.removeProperty('max-height');
    slot.style.removeProperty('top');
    slot.style.removeProperty('bottom');
    slot.style.removeProperty('left');
    slot.style.removeProperty('right');
    slot.style.removeProperty('position');
    slot.style.removeProperty('z-index');
  }
}

function scheduleSidebarHeightSync() {
  if (sidebarHeightFrame) return;
  sidebarHeightFrame = window.requestAnimationFrame(() => {
    sidebarHeightFrame = null;
    syncSidebarHeight();
  });
}

function bindSidebarHeightSync() {
  if (document.body.dataset.catalogSidebarHeightBound) return;
  document.body.dataset.catalogSidebarHeightBound = 'true';

  window.addEventListener('resize', scheduleSidebarHeightSync, { passive: true });
  window.addEventListener('scroll', scheduleSidebarHeightSync, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleSidebarHeightSync, { passive: true });
  window.visualViewport?.addEventListener('scroll', scheduleSidebarHeightSync, { passive: true });
  SIDEBAR_DESKTOP_MQ.addEventListener('change', scheduleSidebarHeightSync);
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const type = params.get('type');

  if (category && CATEGORY_TYPES[category]) {
    activeCategory = category;
  }

  const types = CATEGORY_TYPES[activeCategory] || [];
  if (type && types.includes(type)) {
    activeType = type;
  } else {
    activeType = types[0] || '';
  }
  draftType = activeType;

  appliedFilters = {};
  getFilters(activeCategory, activeType).forEach((filter) => {
    if (filter.field === 'type' || filter.type === 'price-range') return;
    const value = params.get(filter.field);
    if (value) {
      appliedFilters[filter.field] = value;
    }
  });

  if (params.get('priceFrom')) appliedFilters.priceFrom = params.get('priceFrom');
  if (params.get('priceTo')) appliedFilters.priceTo = params.get('priceTo');
  if (params.get('q')) appliedFilters.q = params.get('q');
  if (params.get('sellerId')) appliedFilters.sellerId = params.get('sellerId');

  const sort = params.get('sort') || '';
  currentSort = SORT_OPTIONS.includes(sort) ? sort : '';

  const page = Number(params.get('page'));
  currentPage = Number.isFinite(page) && page > 0 ? page : 1;
}

function writeUrlState() {
  const params = new URLSearchParams();
  params.set('category', activeCategory);
  if (activeType) params.set('type', activeType);

  Object.entries(appliedFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });

  if (currentSort) params.set('sort', currentSort);
  if (currentPage > 1) params.set('page', String(currentPage));

  const query = params.toString();
  window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

function matchesFilters(product) {
  if (product.category !== activeCategory) return false;
  if (activeType && product.type !== activeType) return false;

  const {
    brand,
    model,
    yearFrom,
    priceFrom,
    priceTo,
    mileageTo,
    powerFrom,
    engineHoursTo,
    engineVolumeFrom,
    payloadTo,
    seatsFrom,
    bucketVolumeFrom,
    boomReachFrom,
    region,
    sellerId,
    q
  } = appliedFilters;

  if (sellerId && String(product.sellerId) !== String(sellerId)) return false;
  if (brand && product.brand !== brand) return false;
  if (model && product.model !== model) return false;
  if (yearFrom && Number(product.year) < Number(yearFrom)) return false;
  if (priceFrom && Number(product.price) < Number(priceFrom)) return false;
  if (priceTo && Number(product.price) > Number(priceTo)) return false;
  if (mileageTo && Number(product.mileage) > Number(mileageTo)) return false;
  if (powerFrom && Number(product.power) < Number(powerFrom)) return false;
  if (engineHoursTo && Number(product.engineHours) > Number(engineHoursTo)) return false;
  if (engineVolumeFrom && Number(product.engineVolume) < Number(engineVolumeFrom)) return false;
  if (payloadTo && Number(product.payload) > Number(payloadTo)) return false;
  if (seatsFrom && Number(product.seats) < Number(seatsFrom)) return false;
  if (bucketVolumeFrom && Number(product.bucketVolume) < Number(bucketVolumeFrom)) return false;
  if (boomReachFrom && Number(product.boomReach) < Number(boomReachFrom)) return false;
  if (region && getRegionByCity(product.city) !== region) return false;
  if (!matchesProductQuery(product, q)) return false;

  return true;
}

function sortProducts(products) {
  const list = [...products];
  switch (currentSort) {
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price);
    case 'year-asc':
      return list.sort((a, b) => a.year - b.year);
    case 'year-desc':
      return list.sort((a, b) => b.year - a.year);
    default:
      return list;
  }
}

function updateBreadcrumbs() {
  const crumb = document.querySelector('.breadcrumbs__item--current');
  if (!crumb) return;

  const seller = getActiveSeller();
  crumb.textContent = seller ? seller.name : t(`categories.${activeCategory}`);
}

function renderSellerBanner() {
  const banner = document.getElementById('catalog-seller-banner');
  if (!banner) return;

  const seller = getActiveSeller();
  if (!seller) {
    banner.hidden = true;
    banner.innerHTML = '';
    return;
  }

  const total = countSellerProducts(seller.id);
  const listingsLabel = t('catalog.sellerListings').replace('{count}', String(total));

  banner.hidden = false;
  banner.innerHTML = `
    <div class="catalog-seller-banner__inner">
      <img class="catalog-seller-banner__logo" src="${BASE}${escapeHtml(seller.logo)}" alt="" width="56" height="56" loading="lazy">
      <div class="catalog-seller-banner__info">
        <p class="catalog-seller-banner__title">${escapeHtml(seller.name)}</p>
        <p class="catalog-seller-banner__meta">${escapeHtml(seller.city)} · ${escapeHtml(listingsLabel)}</p>
      </div>
      <button
        type="button"
        class="catalog-seller-banner__clear"
        data-seller-clear
        aria-label="${escapeHtml(t('catalog.sellerBannerClear'))}"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  `;

  banner.querySelector('[data-seller-clear]')?.addEventListener('click', () => clearFilterChip('sellerId'));
}

function applyFiltersAndRender() {
  filteredProducts = sortProducts(allProducts.filter(matchesFilters));
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  writeUrlState();
  renderSellerBanner();
  updateBreadcrumbs();
  renderResults();
  renderSidebarActiveFilters();
  updateFiltersBadge();
  updateTabs();
  scheduleSidebarHeightSync();
}

function formatChipValue(field, value) {
  if (field === 'type') return t(`types.${value}`);
  if (field === 'region') return t(`regions.${value}`);
  if (field === 'price') return value;
  return value;
}

function rememberOpenSections() {
  const next = new Set();
  document.querySelectorAll('[data-filter-acc].is-open').forEach((el) => {
    next.add(el.dataset.filterAcc);
  });
  if (next.size) openSections = next;
}

function wrapAccordion(id, title, bodyHtml, extraClass = '') {
  const isOpen = openSections.has(id);
  return `
    <div class="filter-acc ${isOpen ? 'is-open' : ''} ${extraClass}" data-filter-acc="${id}">
      <button type="button" class="filter-acc__toggle" aria-expanded="${isOpen}">
        <span class="filter-acc__icon" aria-hidden="true"></span>
        <span class="filter-acc__title">${title}</span>
      </button>
      <div class="filter-acc__panel">
        <div class="filter-acc__inner">${bodyHtml}</div>
      </div>
    </div>
  `;
}

function renderPriceRangeControl(draft) {
  const products = getCategoryProducts(activeCategory, draftType);
  priceBounds = getPriceBounds(products);
  const min = priceBounds.min;
  const max = priceBounds.max;
  const from = draft.priceFrom !== undefined && draft.priceFrom !== ''
    ? Number(draft.priceFrom)
    : min;
  const to = draft.priceTo !== undefined && draft.priceTo !== ''
    ? Number(draft.priceTo)
    : max;

  return `
    <div class="price-range" data-price-range data-min="${min}" data-max="${max}">
      <div class="price-range__inputs">
        <label class="price-range__field">
          <span>${t('filter.priceFrom')}</span>
          <input type="number" name="priceFrom" id="catalog-filter-priceFrom" min="${min}" max="${max}" value="${from}">
        </label>
        <label class="price-range__field">
          <span>${t('filter.priceUntil')}</span>
          <input type="number" name="priceTo" id="catalog-filter-priceTo" min="${min}" max="${max}" value="${to}">
        </label>
      </div>
      <div class="price-range__slider">
        <div class="price-range__track"></div>
        <div class="price-range__progress" data-price-progress></div>
        <input type="range" class="price-range__thumb" data-price-min min="${min}" max="${max}" value="${from}" step="1" aria-label="${t('filter.priceFrom')}">
        <input type="range" class="price-range__thumb" data-price-max min="${min}" max="${max}" value="${to}" step="1" aria-label="${t('filter.priceUntil')}">
      </div>
    </div>
  `;
}

function bindPriceRange(root) {
  const wrap = root.querySelector('[data-price-range]');
  if (!wrap) return;

  const minBound = Number(wrap.dataset.min);
  const maxBound = Number(wrap.dataset.max);
  const fromInput = wrap.querySelector('[name="priceFrom"]');
  const toInput = wrap.querySelector('[name="priceTo"]');
  const minRange = wrap.querySelector('[data-price-min]');
  const maxRange = wrap.querySelector('[data-price-max]');
  const progress = wrap.querySelector('[data-price-progress]');

  const syncProgress = () => {
    const from = Number(minRange.value);
    const to = Number(maxRange.value);
    const span = maxBound - minBound || 1;
    const left = ((from - minBound) / span) * 100;
    const right = ((to - minBound) / span) * 100;
    progress.style.left = `${left}%`;
    progress.style.width = `${Math.max(0, right - left)}%`;
  };

  const syncFromRange = () => {
    let from = Number(minRange.value);
    let to = Number(maxRange.value);
    if (from > to) {
      from = to;
      minRange.value = from;
    }
    fromInput.value = from;
    toInput.value = to;
    syncProgress();
  };

  const syncFromInputs = () => {
    let from = Math.min(maxBound, Math.max(minBound, Number(fromInput.value) || minBound));
    let to = Math.min(maxBound, Math.max(minBound, Number(toInput.value) || maxBound));
    if (from > to) [from, to] = [to, from];
    fromInput.value = from;
    toInput.value = to;
    minRange.value = from;
    maxRange.value = to;
    syncProgress();
  };

  minRange.addEventListener('input', () => {
    syncFromRange();
    schedulePriceCommit();
  });
  maxRange.addEventListener('input', () => {
    syncFromRange();
    schedulePriceCommit();
  });
  fromInput.addEventListener('change', () => {
    syncFromInputs();
    commitFiltersFromForm();
  });
  toInput.addEventListener('change', () => {
    syncFromInputs();
    commitFiltersFromForm();
  });
  syncProgress();
}

function schedulePriceCommit() {
  clearTimeout(priceTimer);
  priceTimer = setTimeout(() => commitFiltersFromForm(), 120);
}

function bindAccordions(root) {
  root.querySelectorAll('[data-filter-acc]').forEach((section) => {
    const toggle = section.querySelector('.filter-acc__toggle');
    toggle?.addEventListener('click', () => {
      section.classList.toggle('is-open');
      const open = section.classList.contains('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      if (open) openSections.add(section.dataset.filterAcc);
      else openSections.delete(section.dataset.filterAcc);
    });
  });
}

function getAppliedFilterChips() {
  const chips = [];

  if (appliedFilters.q) {
    chips.push({ key: 'q', label: t('catalog.search'), value: appliedFilters.q });
  }

  if (activeType) {
    chips.push({
      key: 'type',
      label: t('filter.type'),
      value: formatChipValue('type', activeType)
    });
  }

  if (appliedFilters.priceFrom || appliedFilters.priceTo) {
    const from = appliedFilters.priceFrom ? formatNumber(appliedFilters.priceFrom) : '…';
    const to = appliedFilters.priceTo ? formatNumber(appliedFilters.priceTo) : '…';
    chips.push({
      key: 'price',
      label: t('filter.price'),
      value: `${from} – ${to}`
    });
  }

  const seller = getActiveSeller();
  if (seller) {
    chips.push({
      key: 'sellerId',
      label: t('catalog.sellerFilter'),
      value: seller.name
    });
  }

  Object.entries(appliedFilters).forEach(([key, value]) => {
    if (['type', 'sellerId', 'q', 'priceFrom', 'priceTo'].includes(key) || !value) return;
    const filter = getFilters(activeCategory, activeType).find((item) => item.field === key);
    chips.push({
      key,
      label: filter ? t(filter.labelKey) : key,
      value: formatChipValue(key, value)
    });
  });

  return chips;
}

function clearFilterChip(key) {
  if (key === 'type') {
    activeType = (CATEGORY_TYPES[activeCategory] || [])[0] || '';
    draftType = activeType;
  } else if (key === 'price') {
    delete appliedFilters.priceFrom;
    delete appliedFilters.priceTo;
  } else if (key === 'q') {
    delete appliedFilters.q;
    const searchInput = document.getElementById('catalog-search');
    if (searchInput) searchInput.value = '';
  } else {
    delete appliedFilters[key];
  }
  currentPage = 1;
  renderFilterFields();
  applyFiltersAndRender();
}

function clearAllFilters() {
  appliedFilters = {};
  activeType = (CATEGORY_TYPES[activeCategory] || [])[0] || '';
  draftType = activeType;
  currentPage = 1;
  const searchInput = document.getElementById('catalog-search');
  if (searchInput) searchInput.value = '';
  renderFilterFields();
  applyFiltersAndRender();
}

function bindSidebarFilterActions(root) {
  root.querySelectorAll('[data-chip-clear]').forEach((btn) => {
    btn.addEventListener('click', () => clearFilterChip(btn.dataset.chipClear));
  });
}

function getPluralWord(count) {
  const lang = getLang();
  const n = Math.abs(Number(count)) || 0;

  if (lang === 'en') {
    const many = t('catalog.wordMany');
    if (many === 'listings' || !/[а-яё]/i.test(many)) {
      return n === 1 ? t('catalog.wordOne') : many;
    }
  }

  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return t('catalog.wordOne');
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t('catalog.wordFew');
  return t('catalog.wordMany');
}

function getViewResultsLabel(count = filteredProducts.length) {
  return t('catalog.viewResults')
    .replace('{count}', String(count))
    .replace('{word}', getPluralWord(count));
}

function updateSidebarFooter() {
  const footer = document.querySelector('.catalog-sidebar__footer');
  const topClear = document.querySelector('[data-clear-all-top]');
  const viewBtn = document.querySelector('[data-filters-view]');
  const hasChips = getAppliedFilterChips().length > 0;

  if (footer) footer.hidden = false;
  if (topClear) topClear.hidden = !hasChips;
  if (viewBtn) {
    viewBtn.textContent = getViewResultsLabel();
  }
}

function renderSidebarActiveFilters() {
  const activeWrap = document.getElementById('catalog-sidebar-active');
  if (!activeWrap) return;

  const chips = getAppliedFilterChips();
  const hasChips = chips.length > 0;

  activeWrap.innerHTML = hasChips
    ? chips.map((chip) => `
        <div class="filter-tag">
          <span class="filter-tag__text">${chip.label}: ${chip.value}</span>
          <button
            type="button"
            class="filter-tag__remove"
            data-chip-clear="${chip.key}"
            aria-label="${t('catalog.removeFilter')}: ${chip.label}"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      `).join('')
    : '';

  activeWrap.hidden = !hasChips;
  updateSidebarFooter();
  bindSidebarFilterActions(activeWrap);
}

function bindSidebarClearButtons() {
  document.querySelectorAll('[data-clear-all-top]').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', clearAllFilters);
  });

  const viewBtn = document.querySelector('[data-filters-view]');
  if (viewBtn && viewBtn.dataset.bound !== 'true') {
    viewBtn.dataset.bound = 'true';
    viewBtn.addEventListener('click', () => {
      closeFiltersDrawer();
      document.getElementById('catalog-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function renderFilterControl(filter, draft, products) {
  const selected = draft[filter.field] || '';
  let control = '';
  let isSelect = false;

  if (filter.dynamic === 'types') {
    const types = CATEGORY_TYPES[activeCategory] ?? [];
    const opts = types.map((typeSlug) =>
      `<option value="${typeSlug}"${typeSlug === draftType ? ' selected' : ''}>${t(`types.${typeSlug}`)}</option>`
    ).join('');
    control = `<select class="form-field__control" name="type" id="catalog-filter-type">${opts}</select>`;
    isSelect = true;
  } else if (filter.dynamic === 'regions') {
    control = `<select class="form-field__control" name="region" id="catalog-filter-region">${buildSelectOptions(BELARUS_REGIONS, t('common.any'), (id) => t(`regions.${id}`), selected)}</select>`;
    isSelect = true;
  } else if (filter.dynamic === 'brands') {
    control = `<select class="form-field__control" name="brand" id="catalog-filter-brand">${buildSelectOptions(uniqueValues(products, 'brand'), t('common.any'), (v) => v, selected)}</select>`;
    isSelect = true;
  } else if (filter.dynamic === 'models') {
    const brand = draft.brand || '';
    const modelsSource = brand ? products.filter((p) => p.brand === brand) : products;
    control = `<select class="form-field__control" name="model" id="catalog-filter-model">${buildSelectOptions(uniqueValues(modelsSource, 'model'), t('common.any'), (v) => v, selected)}</select>`;
    isSelect = true;
  } else if (filter.dynamic === 'years') {
    const years = uniqueValues(products, 'year').sort((a, b) => b - a);
    control = `<select class="form-field__control" name="yearFrom" id="catalog-filter-yearFrom">${buildSelectOptions(years, t('common.any'), (v) => v, selected)}</select>`;
    isSelect = true;
  } else if (filter.type === 'number') {
    control = `<input class="form-field__control" type="number" name="${filter.field}" id="catalog-filter-${filter.field}" min="0" value="${selected}">`;
  } else {
    control = `<input class="form-field__control" type="text" name="${filter.field}" id="catalog-filter-${filter.field}" value="${selected}">`;
  }

  const arrow = isSelect
    ? `<img class="form-field__arrow" src="${BASE}assets/icons/select-arrow.svg" alt="" aria-hidden="true">`
    : '';

  return `
    <div class="form-field ${isSelect ? 'form-field--select' : ''}">
      ${control}
      ${arrow}
    </div>
  `;
}

function renderFilterFields() {
  const container = document.getElementById('catalog-filter-fields');
  if (!container) return;

  rememberOpenSections();

  const filters = getFilters(activeCategory, draftType);
  const products = getCategoryProducts(activeCategory, draftType);
  const draft = { ...appliedFilters, type: draftType };

  const sections = filters.map((filter) => {
    if (filter.type === 'price-range') {
      return wrapAccordion('price', t(filter.labelKey), renderPriceRangeControl(draft));
    }
    return wrapAccordion(
      filter.field,
      t(filter.labelKey),
      renderFilterControl(filter, draft, products)
    );
  });

  container.innerHTML = sections.join('<div class="filter-acc__divider"></div>');

  bindAccordions(container);
  bindPriceRange(container);
  bindLiveFilters(container);

  container.querySelector('[name="type"]')?.addEventListener('change', (event) => {
    draftType = event.target.value;
    delete appliedFilters.model;
    renderFilterFields();
    commitFiltersFromForm();
  });

  container.querySelector('[name="brand"]')?.addEventListener('change', () => {
    const modelSelect = container.querySelector('[name="model"]');
    if (!modelSelect) return;
    const brand = container.querySelector('[name="brand"]').value;
    const productsForBrand = getCategoryProducts(activeCategory, draftType)
      .filter((item) => !brand || item.brand === brand);
    modelSelect.innerHTML = buildSelectOptions(uniqueValues(productsForBrand, 'model'), t('common.any'));
    commitFiltersFromForm();
  });
}

function bindLiveFilters(root) {
  root.querySelectorAll('select, input').forEach((el) => {
    if (el.closest('[data-price-range]')) return;
    const eventName = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(eventName, () => {
      if (el.name === 'type' || el.name === 'brand') return;
      commitFiltersFromForm();
    });
  });
}

function commitFiltersFromForm() {
  const sellerId = appliedFilters.sellerId;
  const draft = readFormDraft();
  const searchInput = document.getElementById('catalog-search');
  if (searchInput) {
    const q = searchInput.value.trim();
    if (q) draft.q = q;
    else delete draft.q;
  }

  if (draft.type) {
    activeType = draft.type;
    draftType = draft.type;
  }

  appliedFilters = { ...draft };
  delete appliedFilters.type;
  if (sellerId) appliedFilters.sellerId = sellerId;
  currentPage = 1;
  applyFiltersAndRender();
}

function scheduleSearchCommit() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => commitFiltersFromForm(), 220);
}

function readFormDraft() {
  const form = document.getElementById('catalog-filter-form');
  const data = {};
  if (!form) return data;

  new FormData(form).forEach((value, key) => {
    if (value !== '') data[key] = value;
  });

  if (data.priceFrom !== undefined || data.priceTo !== undefined) {
    const min = priceBounds.min;
    const max = priceBounds.max;
    const from = data.priceFrom !== undefined ? Number(data.priceFrom) : min;
    const to = data.priceTo !== undefined ? Number(data.priceTo) : max;
    if (from <= min && to >= max) {
      delete data.priceFrom;
      delete data.priceTo;
    }
  }

  return data;
}

function syncSearchInput() {
  const searchInput = document.getElementById('catalog-search');
  if (searchInput) {
    searchInput.value = appliedFilters.q || '';
  }
}

function updateTabs() {
  const segmentIndex = SEGMENT_CATEGORIES.indexOf(activeCategory);
  const segmentTabs = document.querySelector('[data-segment-tabs]');
  if (segmentTabs && segmentIndex >= 0) {
    segmentTabs.style.setProperty('--segment-index', String(segmentIndex));
  }

  document.querySelectorAll('[data-category-tab]').forEach((tab) => {
    const isActive = tab.dataset.categoryTab === activeCategory;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
}

function renderCategoryTabsHtml() {
  return `
    <nav class="catalog-tabs" role="tablist" aria-label="${t('header.catalog')}" data-segment-tabs style="--segment-index: 0">
      <div class="catalog-tabs__segment-thumb" aria-hidden="true"></div>
      ${SEGMENT_CATEGORIES.map((category) => `
        <button type="button" class="catalog-tabs__btn" role="tab" data-category-tab="${category}">
          <span class="catalog-tabs__icon" aria-hidden="true">
            <img src="${BASE}assets/icons/${CATEGORY_ICONS[category]}" alt="" width="24" height="24">
          </span>
          <span class="catalog-tabs__label">${t(`categories.${category}`)}</span>
        </button>
      `).join('')}
    </nav>
  `;
}

function renderResults() {
  const grid = document.getElementById('catalog-grid');
  const countEl = document.getElementById('catalog-count');
  const pagination = document.getElementById('catalog-pagination');

  if (!grid) return;

  updateSortDropdownUI();
  syncSearchInput();

  const total = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredProducts.slice(start, start + PAGE_SIZE);

  if (countEl) {
    countEl.textContent = `${total} ${t('catalog.results')}`;
  }

  if (total === 0) {
    grid.innerHTML = `<div class="catalog-empty">${t('catalog.empty')}</div>`;
    if (pagination) pagination.innerHTML = '';
    return;
  }

  renderCatalogCards(grid, pageItems, allSellers, BASE, { favoriteIds });

  if (!pagination) return;

  mountPagination(pagination, {
    page: currentPage,
    totalPages,
    prevLabel: t('catalog.prev'),
    nextLabel: t('catalog.next'),
    onPageChange: (nextPage) => {
      currentPage = nextPage;
      writeUrlState();
      renderResults();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

function renderPageShell() {
  const root = document.getElementById('catalog-root');
  root.innerHTML = `
    <nav class="breadcrumbs" aria-label="breadcrumb">
      <a href="../index.html" class="breadcrumbs__item">${t('product.home')}</a>
      <span class="breadcrumbs__sep" aria-hidden="true"></span>
      <span class="breadcrumbs__item breadcrumbs__item--current">${t(`categories.${activeCategory}`)}</span>
    </nav>

    <div class="catalog-tabs-wrap">
      ${renderCategoryTabsHtml()}
    </div>

    <div id="catalog-seller-banner" class="catalog-seller-banner" hidden></div>

    <div class="catalog-page__layout">
      <div class="catalog-filters-backdrop" data-filters-backdrop></div>
      <div class="catalog-sidebar-slot">
        <aside class="catalog-sidebar" id="catalog-sidebar" aria-label="${t('catalog.filters')}">
          <div class="catalog-sidebar__top">
            <div class="catalog-sidebar__mobile-head">
              <p class="catalog-sidebar__mobile-title">${t('catalog.filters')}</p>
              <button type="button" class="catalog-sidebar__close" data-filters-close aria-label="${t('catalog.closeFilters')}">
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div class="catalog-sidebar__intro">
              <p class="catalog-sidebar__title">${t('catalog.filters')}</p>
              <button type="button" class="catalog-sidebar__clear-link" data-clear-all-top hidden>${t('catalog.clearFilters')}</button>
            </div>
            <div id="catalog-sidebar-active" class="catalog-sidebar__active" hidden></div>
          </div>
          <div class="catalog-sidebar__body">
            <form id="catalog-filter-form" class="catalog-sidebar__form">
              <div id="catalog-filter-fields" class="catalog-sidebar__fields"></div>
            </form>
          </div>
          <div class="catalog-sidebar__footer">
            <button type="button" class="catalog-sidebar__view-btn" data-filters-view>${getViewResultsLabel()}</button>
          </div>
        </aside>
      </div>

      <section class="catalog-results" aria-live="polite">
        <div class="catalog-mobile-bar">
          ${renderSortDropdownHtml('mobile')}
          <button
            type="button"
            class="catalog-mobile-bar__filters"
            data-filters-open
            aria-expanded="false"
            aria-controls="catalog-sidebar"
          >
            <span class="catalog-mobile-bar__filters-icon-wrap">
              <span class="catalog-mobile-bar__icon" aria-hidden="true"></span>
              <span class="catalog-mobile-bar__badge" data-filters-badge hidden>0</span>
            </span>
            <span>${t('catalog.filters')}</span>
          </button>
        </div>
        <div class="catalog-results__toolbar">
          <div class="catalog-results__search">
            <label class="visually-hidden" for="catalog-search">${t('catalog.search')}</label>
            <span class="catalog-search__icon" aria-hidden="true"></span>
            <input
              class="catalog-search__input"
              type="search"
              id="catalog-search"
              value="${appliedFilters.q || ''}"
              placeholder="${t('catalog.searchPlaceholder')}"
              autocomplete="off"
            >
          </div>
          <div class="catalog-results__aside">
            ${renderSortDropdownHtml('desktop')}
          </div>
        </div>
        <div class="catalog-results__meta">
          <p id="catalog-count" class="catalog-results__count"></p>
        </div>
        <div id="catalog-grid" class="catalog-results__grid" role="list"></div>
        <div id="catalog-pagination" class="catalog-pagination"></div>
      </section>
    </div>
  `;

  document.querySelectorAll('[data-category-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeCategory = tab.dataset.categoryTab;
      activeType = (CATEGORY_TYPES[activeCategory] || [])[0] || '';
      draftType = activeType;
      preserveSellerFilter();
      currentPage = 1;
      const searchInput = document.getElementById('catalog-search');
      if (searchInput) searchInput.value = '';
      closeFiltersDrawer();
      renderFilterFields();
      applyFiltersAndRender();
    });
  });

  document.getElementById('catalog-filter-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    commitFiltersFromForm();
  });

  document.getElementById('catalog-search')?.addEventListener('input', scheduleSearchCommit);

  bindSortDropdown();
  bindFiltersDrawer();
  bindSidebarClearButtons();
}

async function fetchCatalogData() {
  const session = getCurrentUser();
  const [products, sellers, favorites] = await Promise.all([
    api.getProducts(),
    api.getSellers(),
    session?.id ? loadFavoriteIds(session.id) : Promise.resolve([])
  ]);
  allProducts = products;
  allSellers = sellers;
  favoriteIds = favorites;
  return { products, sellers };
}

function renderCatalog() {
  readUrlState();
  renderPageShell();
  renderFilterFields();
  applyFiltersAndRender();
  syncSidebarHeight();
  scheduleSidebarHeightSync();

  unbindFavorites?.();
  unbindFavorites = bindFavoriteToggles(document.getElementById('catalog-root'), {
    onChange: (result) => {
      favoriteIds = result.favoriteIds;
    }
  });
}

async function init() {
  const root = document.getElementById('catalog-root');
  bindSidebarHeightSync();
  await withState(root, fetchCatalogData, renderCatalog);
  markContentReady();
  scheduleSidebarHeightSync();

  document.addEventListener('languageChanged', async () => {
    await withState(root, fetchCatalogData, renderCatalog);
    scheduleSidebarHeightSync();
  });
}

init();
