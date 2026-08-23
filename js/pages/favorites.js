import { api } from '../utils/api.js';
import { t } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';
import { checkAuth } from '../auth/session.js';
import { refreshMessagesTabBadge } from '../utils/messages-badge.js';
import { loadFavoriteIds } from '../utils/favorites.js';
import { matchesProductQuery } from '../utils/product-search.js';
import { renderCatalogCards } from '../components/catalog-card.js';
import { bindFavoriteToggles } from '../components/favorite-button.js';
import { mountPagination } from '../components/pagination.js';

const BASE = '../';
const PAGE_SIZE = 6;

let currentUser = null;
let allProducts = [];
let allSellers = [];
let favoriteIds = [];
let searchQuery = '';
let searchTimer = null;
let currentPage = 1;

function getFavoriteProducts() {
  const idSet = new Set(favoriteIds.map(Number));
  return allProducts
    .filter((product) => idSet.has(Number(product.id)))
    .filter((product) => matchesProductQuery(product, searchQuery));
}

function renderFavorites() {
  const grid = document.getElementById('favorites-grid');
  const empty = document.getElementById('favorites-empty');
  const pagination = document.getElementById('favorites-pagination');
  if (!grid || !empty) return;

  const products = getFavoriteProducts();
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  if (!favoriteIds.length) {
    grid.innerHTML = '';
    empty.hidden = false;
    empty.textContent = t('favorites.empty');
    if (pagination) pagination.innerHTML = '';
    return;
  }

  if (!products.length) {
    grid.innerHTML = '';
    empty.hidden = false;
    empty.textContent = t('favorites.emptySearch');
    if (pagination) pagination.innerHTML = '';
    return;
  }

  empty.hidden = true;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = products.slice(start, start + PAGE_SIZE);
  renderCatalogCards(grid, pageItems, allSellers, BASE, { favoriteIds });

  mountPagination(pagination, {
    page: currentPage,
    totalPages,
    prevLabel: t('catalog.prev'),
    nextLabel: t('catalog.next'),
    onPageChange: (nextPage) => {
      currentPage = nextPage;
      renderFavorites();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const input = document.getElementById('favorites-search');
    searchQuery = input?.value.trim() || '';
    currentPage = 1;
    renderFavorites();
  }, 220);
}

function bindEvents() {
  document.getElementById('favorites-search')?.addEventListener('input', scheduleSearch);

  bindFavoriteToggles(document.getElementById('favorites-grid'), {
    onChange: (result) => {
      favoriteIds = result.favoriteIds;
      renderFavorites();
    }
  });

  document.addEventListener('languageChanged', () => {
    renderFavorites();
  });
}

async function loadFavoritesPage() {
  currentUser = checkAuth();
  if (!currentUser) return;

  if (currentUser.role === 'landlord') {
    window.location.href = 'landlord-profile.html';
    return;
  }

  if (currentUser.role === 'admin') {
    window.location.href = 'admin.html';
    return;
  }

  const [products, sellers, favorites] = await Promise.all([
    api.getProducts(),
    api.getSellers(),
    loadFavoriteIds(currentUser.id)
  ]);

  allProducts = products;
  allSellers = sellers;
  favoriteIds = favorites;
  renderFavorites();
  await refreshMessagesTabBadge(currentUser.id);
}

async function init() {
  try {
    bindEvents();
    await loadFavoritesPage();
  } finally {
    markContentReady();
  }
}

init();
