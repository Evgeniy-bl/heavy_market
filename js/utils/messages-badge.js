import { API } from '../api.js';
import { api } from './api.js';
import { t } from '../common/i18n.js';
import { isSeller, isSelfConversation } from './user-role.js';

let cachedUnread = 0;

export function normalizeConversationUnread(conversation) {
  if (!conversation) return conversation;

  const hasBuyer = conversation.buyerUnreadCount != null;
  const hasSeller = conversation.sellerUnreadCount != null;
  const legacy = Number(conversation.unreadCount) || 0;

  if (hasBuyer || hasSeller) {
    let buyerUnreadCount = hasBuyer ? Number(conversation.buyerUnreadCount) || 0 : 0;
    let sellerUnreadCount = hasSeller ? Number(conversation.sellerUnreadCount) || 0 : 0;

    if (!hasBuyer && conversation.lastSender === 'contact') {
      buyerUnreadCount = legacy > 0 ? legacy : (conversation.status === 'sent' ? 1 : 0);
    }
    if (!hasSeller && conversation.lastSender === 'user') {
      sellerUnreadCount = legacy > 0 ? legacy : (conversation.status === 'sent' ? 1 : 0);
    }

    return { ...conversation, buyerUnreadCount, sellerUnreadCount };
  }

  if (conversation.lastSender === 'contact') {
    const buyerUnreadCount = legacy > 0 ? legacy : (conversation.status === 'sent' ? 1 : 0);
    return { ...conversation, buyerUnreadCount, sellerUnreadCount: 0 };
  }

  if (conversation.lastSender === 'user') {
    const sellerUnreadCount = legacy > 0 ? legacy : (conversation.status === 'sent' ? 1 : 0);
    return { ...conversation, buyerUnreadCount: 0, sellerUnreadCount };
  }

  return { ...conversation, buyerUnreadCount: 0, sellerUnreadCount: 0 };
}

export function getUnreadForRole(conversation, role) {
  const normalized = normalizeConversationUnread(conversation);
  return role === 'seller'
    ? Number(normalized.sellerUnreadCount) || 0
    : Number(normalized.buyerUnreadCount) || 0;
}

export function getTotalUnreadCount(messages = [], roleResolver = () => 'buyer') {
  return messages.reduce((sum, item) => {
    const role = roleResolver(item);
    return sum + getUnreadForRole(item, role);
  }, 0);
}

export function formatUnreadLabel(count) {
  if (!count) return '';

  const mod10 = count % 10;
  const mod100 = count % 100;
  let suffixKey = 'messages.newMany';

  if (mod10 === 1 && mod100 !== 11) {
    suffixKey = 'messages.newOne';
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    suffixKey = 'messages.newFew';
  }

  return `${count} ${t(suffixKey)}`;
}

export function updateMessagesTabBadge(count = cachedUnread) {
  cachedUnread = Math.max(0, Number(count) || 0);

  const wraps = document.querySelectorAll('[data-messages-badge]');
  if (!wraps.length) return;

  wraps.forEach((wrap) => {
    const full = wrap.querySelector('[data-messages-badge-full]');
    const short = wrap.querySelector('[data-messages-badge-short]');

    if (cachedUnread <= 0) {
      wrap.hidden = true;
      wrap.setAttribute('aria-hidden', 'true');
      if (full) full.textContent = '';
      if (short) short.textContent = '';
      return;
    }

    wrap.hidden = false;
    wrap.removeAttribute('aria-hidden');
    wrap.setAttribute('aria-label', formatUnreadLabel(cachedUnread));
    if (full) full.textContent = String(cachedUnread);
    if (short) short.textContent = String(cachedUnread);
  });
}

function conversationRoleForUser(conversation, user) {
  if (!conversation || !user) return 'buyer';
  if (Number(conversation.userId) === Number(user.id)) return 'buyer';
  if (
    user.sellerId != null
    && Number(conversation.sellerId) === Number(user.sellerId)
  ) {
    return 'seller';
  }
  return 'buyer';
}

export async function refreshMessagesTabBadge(userOrId) {
  const user = typeof userOrId === 'object' && userOrId !== null ? userOrId : null;
  const userId = user?.id ?? userOrId;

  if (isSeller(user)) {
    const [allRaw, buyerMessages, products] = await Promise.all([
      API.getAllMessages(),
      API.getMessagesByUserId(user.id),
      api.getProducts({ includeInactive: true })
    ]);

    const sellerProductIds = new Set(
      products
        .filter((product) => Number(product.sellerId) === Number(user.sellerId))
        .map((product) => Number(product.id))
    );
    const merged = new Map();

    buyerMessages.forEach((message) => {
      if (isSelfConversation(message, user)) return;
      merged.set(message.id, normalizeConversationUnread(message));
    });

    allRaw
      .filter((message) => {
        if (isSelfConversation(message, user)) return false;
        return Number(message.sellerId) === Number(user.sellerId)
          || sellerProductIds.has(Number(message.productId));
      })
      .forEach((message) => {
        if (merged.has(message.id)) return;
        merged.set(message.id, normalizeConversationUnread(message));
      });

    const count = getTotalUnreadCount([...merged.values()], (item) => conversationRoleForUser(item, user));
    updateMessagesTabBadge(count);
    return count;
  }

  if (!userId) {
    updateMessagesTabBadge(0);
    return 0;
  }

  const messages = (await API.getMessagesByUserId(userId))
    .filter((message) => !isSelfConversation(message, user))
    .map(normalizeConversationUnread);
  updateMessagesTabBadge(getTotalUnreadCount(messages, () => 'buyer'));
  return cachedUnread;
}

export function bindMessagesBadgeLanguageRefresh() {
  document.addEventListener('languageChanged', () => {
    updateMessagesTabBadge(cachedUnread);
  });
}
