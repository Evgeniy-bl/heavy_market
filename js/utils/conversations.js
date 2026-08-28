import { API } from '../api.js';
import { isProductPublished } from './product-status.js';
import { isProductOwner } from './user-role.js';

function sameId(a, b) {
  return String(a) === String(b);
}


export async function openOrCreateSellerConversation({ userId, product, seller, user }) {
  if (!userId || !product || !seller) {
    throw new Error('Missing conversation data');
  }

  if (user && isProductOwner(user, product, seller)) {
    const error = new Error('Cannot message your own listing');
    error.code = 'SELF_CONVERSATION';
    throw error;
  }

  if (!isProductPublished(product)) {
    const error = new Error('Listing is not published');
    error.code = 'LISTING_INACTIVE';
    throw error;
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
    buyerUnreadCount: 0,
    sellerUnreadCount: 0,
    unreadCount: 0,
    status: 'sent',
    sentAt: new Date().toISOString()
  });
}
