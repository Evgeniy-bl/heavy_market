import { formatPrice, t } from '../common/i18n.js';
import { renderFavoriteButtonHtml } from './favorite-button.js';
import { getProductStatus, PRODUCT_STATUS } from '../utils/product-status.js';

const SLIDE_INTERVAL = 900;

function getMetaChips(product) {
  const chips = [];

  if (product.year) {
    chips.push(String(product.year));
  }

  if (product.category === 'transport') {
    if (product.payload != null) {
      chips.push(`${product.payload} ${t('product.unitTons')}`);
    } else if (product.seats != null) {
      chips.push(`${product.seats}`);
    }
    if (product.mileage != null) {
      chips.push(`${Number(product.mileage).toLocaleString('ru-RU')} km`);
    }
  } else if (product.category === 'agriculture') {
    if (product.power != null) {
      chips.push(`${product.power} ${t('product.unitHp')}`);
    }
    if (product.engineHours != null) {
      chips.push(`${Number(product.engineHours).toLocaleString('ru-RU')}`);
    }
  } else if (product.category === 'construction') {
    if (product.payload != null) {
      chips.push(`${product.payload} ${t('product.unitTons')}`);
    } else if (product.bucketVolume != null) {
      chips.push(`${product.bucketVolume} ${t('product.unitCubic')}`);
    }
    if (product.engineHours != null) {
      chips.push(`${Number(product.engineHours).toLocaleString('ru-RU')}`);
    }
  }

  return chips.slice(0, 3);
}

function bindCardGallery(card) {
  const wrap = card.querySelector('[data-card-gallery]');
  if (!wrap) return;

  const slider = wrap.querySelector('[data-card-slider]');
  const dots = [...wrap.querySelectorAll('[data-card-dot]')];
  const total = Number(wrap.dataset.slides) || dots.length;
  if (!slider || total < 2) return;

  let index = 0;
  let timer = null;

  const goTo = (next) => {
    index = (next + total) % total;
    slider.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
    });
  };

  const start = () => {
    if (timer) return;
    timer = window.setInterval(() => goTo(index + 1), SLIDE_INTERVAL);
  };

  const stop = () => {
    if (!timer) return;
    window.clearInterval(timer);
    timer = null;
  };

  card.addEventListener('mouseenter', start);
  card.addEventListener('mouseleave', () => {
    stop();
    goTo(0);
  });

  wrap.addEventListener('click', (event) => {
    const dot = event.target.closest('[data-card-dot]');
    if (!dot) return;
    event.preventDefault();
    event.stopPropagation();
    stop();
    goTo(dots.indexOf(dot));
    start();
  });
}

export function createCatalogCard(product, sellersMap = {}, basePath = '', options = {}) {
  const seller = sellersMap[product.sellerId];
  const locationText = product.city || seller?.city || '';
  const sellerName = seller?.name || '';
  const chips = getMetaChips(product);
  const images = product.images?.length ? product.images : [''];
  const hasGallery = images.length > 1;
  const favoriteIds = options.favoriteIds || [];
  const manageActions = Boolean(options.manageActions || options.showEdit);
  const status = getProductStatus(product);
  const statusBadge = manageActions && (status === PRODUCT_STATUS.PENDING || status === PRODUCT_STATUS.REJECTED)
    ? `<span class="catalog-card__status catalog-card__status--${status}">${t(`myListings.status.${status}`)}</span>`
    : '';

  const article = document.createElement('article');
  article.className = `catalog-card${manageActions ? ' catalog-card--manage' : ''}`;
  article.dataset.productId = String(product.id);
  article.innerHTML = `
    <a href="${basePath}pages/product.html?id=${product.id}" class="catalog-card__link">
      <div class="catalog-card__image-wrap" data-card-gallery data-slides="${images.length}">
        ${statusBadge}
        <div class="catalog-card__slider" data-card-slider>
          ${images.map((src, i) => `
            <img class="catalog-card__image" src="${basePath}${src}" alt="${product.name}" width="360" height="204" ${i === 0 ? '' : 'loading="lazy"'}>
          `).join('')}
        </div>
        ${hasGallery ? `
          <div class="catalog-card__dots">
            ${images.map((_, i) => `
              <span class="catalog-card__dot${i === 0 ? ' is-active' : ''}" data-card-dot></span>
            `).join('')}
          </div>
        ` : ''}
        ${options.hideFavorite ? '' : renderFavoriteButtonHtml(product.id, favoriteIds)}
      </div>
      <div class="catalog-card__body">
        <p class="catalog-card__type">${t(`types.${product.type}`)}</p>
        <h3 class="catalog-card__title">${product.name}</h3>
        <div class="catalog-card__chips">
          ${chips.map((chip) => `<span class="catalog-card__chip">${chip}</span>`).join('')}
        </div>
      </div>
      <div class="catalog-card__footer">
        <div class="catalog-card__footer-meta">
          <div class="catalog-card__location">
            <img src="${basePath}assets/icons/location.svg" alt="" width="24" height="24" aria-hidden="true">
            <span>
              ${sellerName ? `<strong>${sellerName}</strong>` : ''}
              ${locationText ? `<em>${locationText}</em>` : ''}
            </span>
          </div>
          <p class="catalog-card__price">${formatPrice(product.price)}</p>
        </div>
      </div>
    </a>
    ${manageActions ? `
      <div class="catalog-card__manage">
        <a
          class="catalog-card__manage-link catalog-card__manage-link--edit"
          href="${basePath}pages/create-listing.html?id=${encodeURIComponent(product.id)}"
          data-edit-listing="${product.id}"
        >${t('myListings.edit')}</a>
        <button
          type="button"
          class="catalog-card__manage-link catalog-card__manage-link--delete"
          data-delete-listing="${product.id}"
        >${t('myListings.delete')}</button>
      </div>
    ` : ''}
  `;

  bindCardGallery(article);

  if (manageActions) {
    const deleteBtn = article.querySelector('[data-delete-listing]');
    deleteBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof options.onDelete === 'function') {
        options.onDelete(product.id);
      }
    });
  }

  return article;
}

export function renderCatalogCards(container, products, sellers = [], basePath = '', options = {}) {
  const sellersMap = Object.fromEntries(sellers.map((s) => [s.id, s]));
  container.innerHTML = '';

  products.forEach((product) => {
    container.appendChild(createCatalogCard(product, sellersMap, basePath, options));
  });
}
