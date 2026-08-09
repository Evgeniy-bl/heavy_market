import { formatPrice } from '../common/i18n.js';

export function createProductCard(product, sellersMap = {}, basePath = '') {
  const seller = sellersMap[product.sellerId];
  const locationText = product.city || seller?.city || '';

  const article = document.createElement('article');
  article.className = 'product-card';
  article.innerHTML = `
    <a href="${basePath}pages/product.html?id=${product.id}" class="product-card__link">
      <div class="product-card__image-wrap">
        <img class="product-card__image" src="${basePath}${product.images?.[0] || ''}" alt="${product.name}" width="289" height="244" loading="lazy">
      </div>
      <div class="product-card__body">
        <h3 class="product-card__title">${product.name}</h3>
        <div class="product-card__footer">
          <div class="product-card__location">
            <img src="${basePath}assets/icons/location.svg" alt="" width="24" height="24" aria-hidden="true">
            <span>${locationText}</span>
          </div>
          <p class="product-card__price">${formatPrice(product.price)}</p>
        </div>
      </div>
    </a>
  `;

  return article;
}

export function renderProductCards(container, products, sellers = [], basePath = '') {
  const sellersMap = Object.fromEntries(sellers.map((s) => [s.id, s]));
  container.innerHTML = '';

  products.forEach((product) => {
    container.appendChild(createProductCard(product, sellersMap, basePath));
  });
}
