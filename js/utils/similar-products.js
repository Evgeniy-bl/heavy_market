import { t } from '../common/i18n.js';
import { renderCatalogCards } from '../components/catalog-card.js';
import { bindFavoriteToggles } from '../components/favorite-button.js';
import { mountPagination } from '../components/pagination.js';

const PAGE_SIZE = 4;
const PRICE_TOLERANCE = 0.25;

function isSimilarPrice(itemPrice, referencePrice) {
  const price = Number(referencePrice) || 0;
  const value = Number(itemPrice) || 0;
  if (price <= 0) return true;
  const min = price * (1 - PRICE_TOLERANCE);
  const max = price * (1 + PRICE_TOLERANCE);
  return value >= min && value <= max;
}

export function findSimilarProducts(allProducts, product) {
  const productPrice = Number(product.price) || 0;

  return allProducts
    .filter((item) => {
      if (String(item.id) === String(product.id)) return false;
      if (item.category !== product.category) return false;
      if (item.type !== product.type) return false;
      if (item.brand !== product.brand) return false;
      return isSimilarPrice(item.price, productPrice);
    })
    .sort((a, b) => {
      const diffA = Math.abs((Number(a.price) || 0) - productPrice);
      const diffB = Math.abs((Number(b.price) || 0) - productPrice);
      return diffA - diffB;
    });
}

export async function fetchSimilarProducts(api, product) {
  const candidates = await api.getProducts({
    category: product.category,
    brand: product.brand
  });
  return findSimilarProducts(candidates, product);
}

export function renderSimilarSectionHtml() {
  return `
    <section class="product-similar" aria-labelledby="product-similar-title">
      <h2 class="product-section-title" id="product-similar-title">${t('product.similar')}</h2>
      <div class="product-similar__grid" id="similar-grid" role="list"></div>
      <div class="product-similar__pagination" id="similar-pagination"></div>
    </section>
  `;
}

export function mountSimilarListings({
  products = [],
  sellers = [],
  basePath = '../',
  favoriteIds = []
} = {}) {
  let items = products;
  let sellersList = sellers;
  let favorites = favoriteIds;
  let page = 1;
  let unbindPagination = null;
  let unbindFavorites = null;

  function render() {
    const section = document.querySelector('.product-similar');
    const grid = document.getElementById('similar-grid');
    const pagination = document.getElementById('similar-pagination');
    if (!section || !grid) return;

    unbindPagination?.();
    unbindPagination = null;
    unbindFavorites?.();
    unbindFavorites = null;

    if (!items.length) {
      section.hidden = true;
      grid.innerHTML = '';
      if (pagination) pagination.innerHTML = '';
      return;
    }

    section.hidden = false;
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    page = Math.min(Math.max(1, page), totalPages);

    const start = (page - 1) * PAGE_SIZE;
    const pageItems = items.slice(start, start + PAGE_SIZE);

    renderCatalogCards(grid, pageItems, sellersList, basePath, { favoriteIds: favorites });

    unbindFavorites = bindFavoriteToggles(section, {
      onChange: (result) => {
        favorites = result.favoriteIds;
      }
    });

    if (!pagination) return;

    unbindPagination = mountPagination(pagination, {
      page,
      totalPages,
      prevLabel: t('catalog.prev'),
      nextLabel: t('catalog.next'),
      onPageChange: (nextPage) => {
        page = nextPage;
        render();
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  return {
    setData(nextProducts, nextSellers) {
      items = nextProducts;
      sellersList = nextSellers;
      page = 1;
    },
    setFavoriteIds(nextFavoriteIds) {
      favorites = nextFavoriteIds;
    },
    render,
    destroy() {
      unbindPagination?.();
      unbindFavorites?.();
      unbindPagination = null;
      unbindFavorites = null;
    }
  };
}
