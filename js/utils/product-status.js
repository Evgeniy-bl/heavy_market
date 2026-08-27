export const PRODUCT_STATUS = {
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  INACTIVE: 'inactive'
};

export function getProductStatus(product) {
  if (!product) return PRODUCT_STATUS.INACTIVE;

  if (product.active === false || product.status === PRODUCT_STATUS.INACTIVE) {
    return PRODUCT_STATUS.INACTIVE;
  }

  if (product.status === PRODUCT_STATUS.PENDING) return PRODUCT_STATUS.PENDING;
  if (product.status === PRODUCT_STATUS.REJECTED) return PRODUCT_STATUS.REJECTED;
  if (product.status === PRODUCT_STATUS.PUBLISHED) return PRODUCT_STATUS.PUBLISHED;

  return PRODUCT_STATUS.PUBLISHED;
}

export function isProductPublished(product) {
  return getProductStatus(product) === PRODUCT_STATUS.PUBLISHED;
}

export function isProductPending(product) {
  return getProductStatus(product) === PRODUCT_STATUS.PENDING;
}

export function isProductRejected(product) {
  return getProductStatus(product) === PRODUCT_STATUS.REJECTED;
}

export function isProductInactive(product) {
  return getProductStatus(product) === PRODUCT_STATUS.INACTIVE;
}

export function isProductActive(product) {
  return Boolean(product) && !isProductInactive(product);
}

export function filterPublishedProducts(products = []) {
  return products.filter(isProductPublished);
}

export function filterActiveProducts(products = []) {
  return products.filter(isProductActive);
}
