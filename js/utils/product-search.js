export function matchesProductQuery(product, q) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return true;

  const haystack = [product.name, product.brand, product.model]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}
