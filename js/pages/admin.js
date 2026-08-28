import { api } from '../utils/api.js';
import { t, formatPrice } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';
import { checkRole, logout } from '../auth/session.js';
import {
  getProductStatus,
  PRODUCT_STATUS
} from '../utils/product-status.js';

const BASE = '../';

let allProducts = [];
let allSellers = [];
let activeTab = 'pending';
let searchQuery = '';
let searchTimer = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('../') || path.startsWith('/')) {
    return path;
  }
  return `${BASE}${path}`;
}

function sellerName(sellerId) {
  const seller = allSellers.find((item) => Number(item.id) === Number(sellerId));
  return seller?.name || '';
}

function matchesQuery(product) {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;
  return [product.name, product.city, product.brand, product.model, sellerName(product.sellerId)]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

function getAdminSortTime(product) {
  const status = getProductStatus(product);
  if (status === PRODUCT_STATUS.PENDING) {
    return new Date(product.submittedAt || product.publishedAt || 0).getTime();
  }
  if (status === PRODUCT_STATUS.PUBLISHED) {
    return new Date(product.publishedAt || product.moderatedAt || product.submittedAt || 0).getTime();
  }
  return new Date(product.moderatedAt || product.submittedAt || product.publishedAt || 0).getTime();
}

function getVisibleProducts() {
  return allProducts
    .filter((product) => getProductStatus(product) === activeTab)
    .filter(matchesQuery)
    .sort((a, b) => getAdminSortTime(b) - getAdminSortTime(a));
}

function renderStats() {
  const counts = {
    pending: 0,
    published: 0,
    rejected: 0
  };

  allProducts.forEach((product) => {
    const status = getProductStatus(product);
    if (status in counts) counts[status] += 1;
  });

  document.querySelector('[data-stat-pending]').textContent = String(counts.pending);
  document.querySelector('[data-stat-published]').textContent = String(counts.published);
  document.querySelector('[data-stat-rejected]').textContent = String(counts.rejected);
}

function emptyMessage() {
  if (searchQuery.trim()) return t('admin.emptySearch');
  if (activeTab === PRODUCT_STATUS.PUBLISHED) return t('admin.emptyPublished');
  if (activeTab === PRODUCT_STATUS.REJECTED) return t('admin.emptyRejected');
  return t('admin.emptyPending');
}

function formatAdminPrice(price) {
  return formatPrice(price);
}

function renderList() {
  const list = document.querySelector('[data-admin-list]');
  const empty = document.querySelector('[data-admin-empty]');
  if (!list || !empty) return;

  const products = getVisibleProducts();
  renderStats();

  if (!products.length) {
    list.innerHTML = '';
    empty.hidden = false;
    empty.textContent = emptyMessage();
    return;
  }

  empty.hidden = true;
  list.innerHTML = products.map((product) => {
    const status = getProductStatus(product);
    const image = product.images?.[0] || '';
    const metaParts = [sellerName(product.sellerId), product.city].filter(Boolean);

    return `
      <a class="admin-card" href="product.html?id=${encodeURIComponent(product.id)}" role="listitem">
        <img class="admin-card__image" src="${escapeHtml(assetUrl(image))}" alt="" width="96" height="72" loading="lazy">
        <div class="admin-card__body">
          <h2 class="admin-card__title">${escapeHtml(product.name || '')}</h2>
          <p class="admin-card__meta">
            ${metaParts.length ? `${escapeHtml(metaParts.join(' · '))} · ` : ''}
            <span class="admin-card__price">${formatAdminPrice(product.price)}</span>
          </p>
        </div>
        <div class="admin-card__aside">
          <span class="admin-card__badge admin-card__badge--${status}">${escapeHtml(t(`admin.status.${status}`))}</span>
          <span class="admin-card__action">${escapeHtml(t('admin.review'))}</span>
        </div>
      </a>
    `;
  }).join('');
}

function setTab(tab, { syncUrl = true } = {}) {
  activeTab = tab;
  document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.adminTab === tab);
  });
  if (syncUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
  }
  renderList();
}

async function loadAdminData() {
  const [products, sellers] = await Promise.all([
    api.getProducts({ includeInactive: true }),
    api.getSellers()
  ]);
  allProducts = products || [];
  allSellers = sellers || [];
  renderList();
}

function bindEvents() {
  document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
    btn.addEventListener('click', () => setTab(btn.dataset.adminTab));
  });

  document.querySelector('[data-admin-search]')?.addEventListener('input', (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = event.target.value || '';
      renderList();
    }, 180);
  });

  document.querySelector('[data-admin-logout]')?.addEventListener('click', () => {
    logout();
    window.location.href = 'login.html';
  });

  document.addEventListener('languageChanged', () => {
    renderList();
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      loadAdminData();
    }
  });
}

async function init() {
  try {
    if (!checkRole('admin')) return;
    bindEvents();

    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === PRODUCT_STATUS.PENDING || tab === PRODUCT_STATUS.PUBLISHED || tab === PRODUCT_STATUS.REJECTED) {
      activeTab = tab;
      document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.adminTab === tab);
      });
    }

    await loadAdminData();
  } finally {
    markContentReady();
  }
}

init();
