import { API } from '../api.js';

function sameId(a, b) {
  return String(a) === String(b);
}

/**
 * Find existing chat for this product/seller or create a new conversation.
 */
export async function openOrCreateSellerConversation({ userId, product, seller }) {
  if (!userId || !product || !seller) {
    throw new Error('Missing conversation data');
  }

  const list = await API.getMessagesByUserId(userId);
  const existing = list.find((item) => {
    if (!sameId(item.productId, product.id)) return false;
    if (item.sellerId != null && sameId(item.sellerId, seller.id)) return true;
    return item.contactName === seller.name;
  });

  if (existing) return existing;

  return API.createMessage({
    userId,
    sellerId: seller.id,
    contactName: seller.name,
    productId: product.id,
    productTitle: product.name,
    productImage: product.images?.[0] || '',
    productPrice: product.price,
    lastMessage: '',
    lastSender: null,
    unreadCount: 0,
    status: 'sent',
    sentAt: new Date().toISOString()
  });
}
