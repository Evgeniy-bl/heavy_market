export function buildSellerCatalogUrl(sellerId, product = null, base = '') {
  const params = new URLSearchParams();
  params.set('sellerId', String(sellerId));
  if (product?.category) params.set('category', product.category);
  if (product?.type) params.set('type', product.type);
  return `${base}catalog.html?${params.toString()}`;
}
