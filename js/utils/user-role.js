

export function isAdmin(user) {
  return user?.role === 'admin';
}

export function isSeller(user) {
  return Boolean(user?.sellerId);
}

export function isProductOwner(user, product, seller = null) {
  if (!user?.sellerId || !product) return false;
  const ownerId = seller?.id ?? product.sellerId;
  return ownerId != null && Number(user.sellerId) === Number(ownerId);
}

export function isSelfConversation(conversation, user) {
  if (!conversation || !user?.sellerId) return false;
  return Number(conversation.userId) === Number(user.id)
    && Number(conversation.sellerId) === Number(user.sellerId);
}

export function getSellerDisplayName(user) {
  if (!user) return '';
  if (user.sellerType === 'company' && user.companyName) {
    return user.companyName;
  }
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.nickname || user.email || '';
}

export function formatPhoneForSeller(digits) {
  if (!digits) return '';
  const raw = String(digits).replace(/\D/g, '');
  const normalized = raw.startsWith('375') ? raw : `375${raw}`;
  if (normalized.length < 12) return `+${normalized}`;
  return `+${normalized.slice(0, 3)} ${normalized.slice(3, 5)} ${normalized.slice(5, 8)}-${normalized.slice(8, 10)}-${normalized.slice(10, 12)}`;
}
