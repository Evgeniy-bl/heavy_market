import { api } from '../utils/api.js';
import { API } from '../api.js';
import { t } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';
import { checkAuth } from '../auth/session.js';
import { refreshMessagesTabBadge } from '../utils/messages-badge.js';
import { applyProfileTabs } from '../utils/profile-tabs.js';
import { matchesProductQuery } from '../utils/product-search.js';
import { renderCatalogCards } from '../components/catalog-card.js';
import { mountPagination } from '../components/pagination.js';
import { LISTING_LIMIT } from '../utils/listing-form-config.js';
import { isAdmin, isSeller } from '../utils/user-role.js';
import { isProductInactive, getProductStatus, PRODUCT_STATUS } from '../utils/product-status.js';
import { alertDialog } from '../components/alert.js';
import { confirmDialog } from '../components/confirm.js';

const BASE = '../';
const PAGE_SIZE = 6;
const LISTING_FILTER = {
  ACTIVE: 'active',
  PENDING: 'pending'
};

let currentUser = null;
let allProducts = [];
let allSellers = [];
let searchQuery = '';
let searchTimer = null;
let currentPage = 1;
let activeStatusFilter = LISTING_FILTER.ACTIVE;

function getListingSortTime(product) {
  const status = getProductStatus(product);
  if (status === PRODUCT_STATUS.PENDING) {
    return new Date(product.submittedAt || product.publishedAt || 0).getTime();
  }
  return new Date(product.publishedAt || product.moderatedAt || product.submittedAt || 0).getTime();
}

function matchesStatusFilter(product) {
  const status = getProductStatus(product);
  if (activeStatusFilter === LISTING_FILTER.PENDING) {
    return status === PRODUCT_STATUS.PENDING;
  }
  return status === PRODUCT_STATUS.PUBLISHED || status === PRODUCT_STATUS.REJECTED;
}

function getMyProducts() {
  if (!currentUser?.sellerId) return [];
  return allProducts
    .filter((product) => Number(product.sellerId) === Number(currentUser.sellerId))
    .filter((product) => !isProductInactive(product))
    .filter(matchesStatusFilter)
    .filter((product) => matchesProductQuery(product, searchQuery))
    .sort((a, b) => getListingSortTime(b) - getListingSortTime(a));
}

function countMyListings() {
  if (!currentUser?.sellerId) return 0;
  return allProducts.filter(
    (product) => Number(product.sellerId) === Number(currentUser.sellerId) && !isProductInactive(product)
  ).length;
}

function renderUsageCounter(count) {
  const wrap = document.querySelector('[data-listings-usage]');
  const counter = document.querySelector('[data-listings-usage-count]');
  const addBtn = document.querySelector('[data-add-listing]');
  if (!wrap || !counter) return;

  wrap.hidden = false;
  counter.textContent = `${count}/${LISTING_LIMIT}`;

  if (addBtn) {
    const atLimit = count >= LISTING_LIMIT;
    addBtn.classList.toggle('is-disabled', atLimit);
    addBtn.setAttribute('aria-disabled', atLimit ? 'true' : 'false');
  }
}

function getEmptyMessage() {
  if (searchQuery) return t('myListings.emptySearch');
  if (activeStatusFilter === LISTING_FILTER.PENDING) return t('myListings.emptyPending');
  return t('myListings.emptyActive');
}

function updateFilterTabs() {
  document.querySelectorAll('[data-listings-filter]').forEach((button) => {
    const isActive = button.dataset.listingsFilter === activeStatusFilter;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function renderListings() {
  const grid = document.getElementById('listings-grid');
  const empty = document.getElementById('listings-empty');
  const pagination = document.getElementById('listings-pagination');
  if (!grid || !empty) return;

  const products = getMyProducts();
  renderUsageCounter(countMyListings());
  updateFilterTabs();

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  if (!products.length) {
    grid.innerHTML = '';
    empty.hidden = false;
    empty.textContent = getEmptyMessage();
    if (pagination) pagination.innerHTML = '';
    return;
  }

  empty.hidden = true;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = products.slice(start, start + PAGE_SIZE);
  renderCatalogCards(grid, pageItems, allSellers, BASE, {
    hideFavorite: true,
    manageActions: true,
    onDelete: (productId) => {
      deleteListing(productId);
    }
  });

  mountPagination(pagination, {
    page: currentPage,
    totalPages,
    prevLabel: t('catalog.prev'),
    nextLabel: t('catalog.next'),
    onPageChange: (nextPage) => {
      currentPage = nextPage;
      renderListings();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const input = document.getElementById('listings-search');
    searchQuery = input?.value.trim() || '';
    currentPage = 1;
    renderListings();
  }, 220);
}

async function deleteListing(productId) {
  const product = allProducts.find((item) => Number(item.id) === Number(productId));
  if (!product) return;

  if (Number(product.sellerId) !== Number(currentUser.sellerId)) {
    alertDialog({ message: t('myListings.deleteForbidden'), type: 'error' });
    return;
  }

  const confirmed = await confirmDialog({
    title: t('myListings.deleteTitle'),
    message: t('myListings.deleteConfirm'),
    confirmText: t('myListings.delete'),
    cancelText: t('common.cancel'),
    type: 'error'
  });

  if (!confirmed) return;

  try {
    const updated = await API.deactivateProduct(productId);
    allProducts = allProducts.map((item) => (
      Number(item.id) === Number(productId) ? { ...item, ...updated } : item
    ));
    renderListings();
    alertDialog({ message: t('myListings.deleted'), type: 'success' });
  } catch {
    alertDialog({ message: t('myListings.deleteError'), type: 'error' });
  }
}

function bindEvents() {
  document.getElementById('listings-search')?.addEventListener('input', scheduleSearch);

  document.querySelectorAll('[data-listings-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextFilter = button.dataset.listingsFilter;
      if (!nextFilter || nextFilter === activeStatusFilter) return;
      activeStatusFilter = nextFilter;
      currentPage = 1;
      renderListings();
    });
  });

  document.querySelector('[data-add-listing]')?.addEventListener('click', (event) => {
    if (countMyListings() >= LISTING_LIMIT) {
      event.preventDefault();
      alertDialog({ message: t('myListings.limitReached'), type: 'error' });
    }
  });

  document.addEventListener('languageChanged', () => {
    renderListings();
  });
}

async function loadPage() {
  const session = checkAuth();
  if (!session) return;

  if (isAdmin(session)) {
    window.location.href = 'admin.html';
    return;
  }

  currentUser = await API.getUserById(session.id);

  if (!isSeller(currentUser)) {
    window.location.href = 'seller.html';
    return;
  }
  applyProfileTabs();

  const [products, sellers] = await Promise.all([
    api.getProducts({ includeInactive: true }),
    api.getSellers()
  ]);

  allProducts = products;
  allSellers = sellers;
  renderListings();
  await refreshMessagesTabBadge(currentUser);
}

async function init() {
  try {
    bindEvents();
    await loadPage();
  } finally {
    markContentReady();
  }
}

init();
