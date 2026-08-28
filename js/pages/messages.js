import { API } from '../api.js';
import { api } from '../utils/api.js';

import { buildSellerCatalogUrl } from '../utils/catalog-url.js';
import { t, formatPrice } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';

import { checkAuth } from '../auth/session.js';
import { alertDialog } from '../components/alert.js';
import { confirmDialog } from '../components/confirm.js';
import {
  updateMessagesTabBadge,
  normalizeConversationUnread,
  getUnreadForRole
} from '../utils/messages-badge.js';
import { applyProfileTabs } from '../utils/profile-tabs.js';
import { isAdmin, isSeller, isSelfConversation } from '../utils/user-role.js';
import { isProductActive } from '../utils/product-status.js';

let currentUser = null;
let allMessages = [];
let selectedIds = new Set();
let activeConversation = null;
let chatMessages = [];
let selectMode = false;
let productsById = new Map();

function getConversationRole(conversation) {
  if (!conversation || !currentUser) return 'buyer';
  if (Number(conversation.userId) === Number(currentUser.id)) return 'buyer';

  if (
    currentUser.sellerId != null
    && Number(conversation.sellerId) === Number(currentUser.sellerId)
  ) {
    return 'seller';
  }

  return 'buyer';
}

function getMyUnread(conversation) {
  return getUnreadForRole(conversation, getConversationRole(conversation));
}

function updateUnreadTabBadge() {
  const total = allMessages.reduce(
    (sum, item) => sum + getUnreadForRole(item, getConversationRole(item)),
    0
  );
  updateMessagesTabBadge(total);
}

function shouldShowConversationStatus(conversation) {
  const outgoingSender = getConversationRole(conversation) === 'seller' ? 'contact' : 'user';
  return getMyUnread(conversation) === 0 && conversation.lastSender === outgoingSender;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('../') || path.startsWith('/')) {
    return path;
  }
  return `../${path}`;
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';
}

function getBuyerDisplayName(user) {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.nickname || user.email;
}

function isOutgoingMessage(message) {
  if (!activeConversation) return message.sender === 'user';
  return getConversationRole(activeConversation) === 'seller'
    ? message.sender === 'contact'
    : message.sender === 'user';
}

function getOutgoingSender() {
  if (!activeConversation) return 'user';
  return getConversationRole(activeConversation) === 'seller' ? 'contact' : 'user';
}

async function loadSellerInbox(products) {
  const sellerProductIds = new Set(
    products
      .filter((product) => Number(product.sellerId) === Number(currentUser.sellerId))
      .map((product) => Number(product.id))
  );

  const [allRaw, buyerMessages, users] = await Promise.all([
    API.getAllMessages(),
    API.getMessagesByUserId(currentUser.id),
    API.getUsers()
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const merged = new Map();

  buyerMessages.forEach((message) => {
    if (isSelfConversation(message, currentUser)) return;
    merged.set(message.id, normalizeConversationUnread(message));
  });

  allRaw
    .filter((message) => {
      if (isSelfConversation(message, currentUser)) return false;
      const matchesSeller = Number(message.sellerId) === Number(currentUser.sellerId);
      const matchesProduct = sellerProductIds.has(Number(message.productId));
      return matchesSeller || matchesProduct;
    })
    .forEach((message) => {
      if (merged.has(message.id)) return;
      merged.set(message.id, {
        ...normalizeConversationUnread(message),
        contactName: getBuyerDisplayName(usersById.get(message.userId)) || message.contactName
      });
    });

  return [...merged.values()].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatListTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return formatTime(isoString);
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

function formatChatDay(isoString) {
  const date = new Date(isoString);
  return `${date.getDate()} ${t(`messages.month${date.getMonth() + 1}`)}`;
}

function getDayKey(isoString) {
  const date = new Date(isoString);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function statusIcon(status) {
  const isRead = status === 'read';
  const icon = isRead
    ? '../assets/icons/check-double.svg'
    : '../assets/icons/check-single.svg';
  return `<span class="chat-read-status chat-read-status--${isRead ? 'read' : 'sent'}" title="${isRead ? 'Прочитано' : 'Отправлено'}"><img src="${icon}" alt="" width="${isRead ? 18 : 16}" height="16" aria-hidden="true"></span>`;
}

function toggleConversationSelection(conversationId) {
  const id = Number(conversationId);
  if (!Number.isFinite(id)) return;

  const input = document.querySelector(`[data-message-check][value="${id}"]`);

  if (selectedIds.has(id)) {
    selectedIds.delete(id);
    if (input) input.checked = false;
  } else {
    selectedIds.add(id);
    if (input) input.checked = true;
  }

  updateSelectUi();
}

async function reloadConversations() {
  const products = await api.getProducts({ includeInactive: true });
  productsById = new Map(products.map((product) => [Number(product.id), product]));

  if (isSeller(currentUser)) {
    allMessages = await loadSellerInbox(products);
  } else {
    allMessages = (await API.getMessagesByUserId(currentUser.id))
      .filter((message) => !isSelfConversation(message, currentUser))
      .map(normalizeConversationUnread);
  }

  updateUnreadTabBadge();
  renderConversationList();
}

async function deleteSelectedConversations() {
  if (!selectedIds.size) return;

  const confirmed = await confirmDialog({
    title: t('messages.delete'),
    message: t('messages.deleteConfirm'),
    confirmText: t('messages.delete'),
    type: 'warning'
  });

  if (!confirmed) return;

  const ids = [...selectedIds];
  const hadActiveChat = activeConversation && ids.includes(activeConversation.id);

  try {
    await Promise.all(ids.map((id) => API.deleteChatMessagesByConversation(id)));
    await API.deleteMessages(ids);

    if (hadActiveChat) {
      activeConversation = null;
      chatMessages = [];
    }

    selectedIds.clear();
    selectMode = false;

    await reloadConversations();
    updateSelectUi();

    if (hadActiveChat) {
      showEmptyChat();
    }
  } catch {
    alertDialog({ message: t('messages.deleteError'), type: 'error' });
  }
}

function updateSelectUi() {
  const root = document.querySelector('[data-messenger]');
  const actions = document.querySelector('[data-select-actions]');
  const selectBtn = document.querySelector('[data-select-mode]');
  const deleteBtn = document.querySelector('[data-messages-delete]');

  root?.classList.toggle('is-selecting', selectMode);
  if (actions) actions.hidden = !selectMode;
  if (selectBtn) selectBtn.hidden = selectMode;
  if (deleteBtn) deleteBtn.disabled = selectedIds.size === 0;
}

function sortConversations(list) {
  return [...list].sort((a, b) => {
    const unreadA = getMyUnread(a) > 0 ? 1 : 0;
    const unreadB = getMyUnread(b) > 0 ? 1 : 0;
    if (unreadA !== unreadB) return unreadB - unreadA;
    return new Date(b.sentAt) - new Date(a.sentAt);
  });
}

function renderConversationList() {
  const list = document.getElementById('messenger-list');
  if (!list) return;

  if (!allMessages.length) {
    list.innerHTML = `<p class="messenger-empty-list">${escapeHtml(t('messages.empty'))}</p>`;
    updateUnreadTabBadge();
    updateSelectUi();
    return;
  }

  const sorted = sortConversations(allMessages);

  list.innerHTML = sorted.map((conversation) => {
    const isActive = activeConversation?.id === conversation.id;
    const unread = getMyUnread(conversation);
    const isUnread = unread > 0;
    const checked = selectedIds.has(conversation.id);
    const productSrc = assetUrl(conversation.productImage);
    const badge = isUnread
      ? `<span class="messenger-item__badge" aria-label="${unread}">${unread}</span>`
      : shouldShowConversationStatus(conversation)
        ? `<span class="messenger-item__status">${statusIcon(conversation.status || 'sent')}</span>`
        : '';

    const checkMarkup = selectMode
      ? `
        <label class="messenger-item__check messages-check" onclick="event.stopPropagation()">
          <input type="checkbox" class="messages-check__input" data-message-check value="${conversation.id}"${checked ? ' checked' : ''}>
          <span class="messages-check__box" aria-hidden="true"></span>
        </label>
      `
      : '';

    return `
      <div
        class="messenger-item${isActive ? ' is-active' : ''}${isUnread ? ' is-unread' : ''}"
        data-message-id="${conversation.id}"
        role="listitem"
      >
        ${checkMarkup}
        <button type="button" class="messenger-item__open" data-open-chat="${conversation.id}">
          <span class="messenger-item__media">
            <img class="messenger-item__product" src="${escapeHtml(productSrc)}" alt="" width="48" height="48" loading="lazy">
            <span class="messenger-item__avatar">${escapeHtml(initials(conversation.contactName))}</span>
          </span>
          <span class="messenger-item__body">
            <span class="messenger-item__top">
              <span class="messenger-item__name">${escapeHtml(conversation.contactName)}</span>
              <span class="messenger-item__time">${escapeHtml(formatListTime(conversation.sentAt))}</span>
            </span>
            <span class="messenger-item__listing-row">
              <span class="messenger-item__listing">${escapeHtml(conversation.productTitle)}</span>
              ${isConversationListingActive(conversation)
                ? ''
                : `<span class="messenger-item__inactive">${escapeHtml(t('messages.listingInactiveBadge'))}</span>`}
            </span>
            <span class="messenger-item__preview-row">
              <span class="messenger-item__preview">${escapeHtml(conversation.lastMessage || '')}</span>
              ${badge}
            </span>
          </span>
        </button>
      </div>
    `;
  }).join('');

  updateUnreadTabBadge();
  updateSelectUi();
}

function renderChatMessages() {
  const body = document.querySelector('[data-chat-body]');
  if (!body) return;

  if (!chatMessages.length) {
    body.innerHTML = `<p class="chat-empty">${escapeHtml(t('messages.chatEmpty'))}</p>`;
    return;
  }

  const avatar = initials(activeConversation?.contactName);
  let lastDayKey = '';

  body.innerHTML = chatMessages.map((message) => {
    const dayKey = getDayKey(message.sentAt);
    const daySeparator = dayKey !== lastDayKey
      ? `<p class="chat-day">${escapeHtml(formatChatDay(message.sentAt))}</p>`
      : '';
    lastDayKey = dayKey;

    const isOutgoing = isOutgoingMessage(message);
    const meta = `
      <div class="chat-bubble__meta">
        <span class="chat-time">${escapeHtml(formatTime(message.sentAt))}</span>
        ${isOutgoing ? statusIcon(message.status || 'sent') : ''}
      </div>
    `;

    if (isOutgoing) {
      return `
        ${daySeparator}
        <div class="chat-row chat-row--outgoing">
          <div class="chat-bubble">
            <div>${escapeHtml(message.text || '')}</div>
            ${meta}
          </div>
        </div>
      `;
    }

    return `
      ${daySeparator}
      <div class="chat-row chat-row--incoming">
        <span class="chat-row__avatar" aria-hidden="true">${escapeHtml(avatar)}</span>
        <div class="chat-bubble">
          <div>${escapeHtml(message.text || '')}</div>
          ${meta}
        </div>
      </div>
    `;
  }).join('');

  body.scrollTop = body.scrollHeight;
}

function setMessagesChatOpen(isOpen) {
  document.querySelector('[data-messenger]')?.classList.toggle('is-chat-open', isOpen);
  document.body.classList.toggle('is-messages-chat-open', isOpen);
}

function showEmptyChat() {
  activeConversation = null;
  chatMessages = [];

  setMessagesChatOpen(false);
  document.querySelector('[data-chat-empty]')?.removeAttribute('hidden');
  document.querySelector('[data-chat-panel]')?.setAttribute('hidden', '');

  const url = new URL(window.location.href);
  url.searchParams.delete('id');
  window.history.replaceState({}, '', url.pathname + url.search);
  renderConversationList();
}

function getConversationProduct(conversation) {
  if (!conversation?.productId && conversation?.productId !== 0) return null;
  return productsById.get(Number(conversation.productId))
    || productsById.get(conversation.productId)
    || null;
}

function isConversationListingActive(conversation) {
  const product = getConversationProduct(conversation);
  if (!product) {
    return false;
  }
  return isProductActive(product);
}

function setComposerLocked(locked) {
  const form = document.querySelector('[data-chat-form]');
  const inactive = document.querySelector('[data-chat-inactive]');
  const input = document.querySelector('[data-chat-input]');
  const sendBtn = document.querySelector('[data-chat-send]');

  if (form) form.hidden = locked;
  if (inactive) inactive.hidden = !locked;
  if (input) {
    input.disabled = locked;
    input.placeholder = locked ? t('messages.listingInactiveShort') : t('messages.placeholder');
  }
  if (sendBtn) sendBtn.disabled = locked;
}

function fillChatHeader(conversation) {
  document.querySelector('[data-chat-contact]').textContent = conversation.contactName;
  document.querySelector('[data-chat-avatar]').textContent = initials(conversation.contactName);
  document.querySelector('[data-chat-product-title]').textContent = conversation.productTitle;
  document.querySelector('[data-chat-product-price]').innerHTML = formatPrice(conversation.productPrice || 0);

  const image = document.querySelector('[data-chat-product-image]');
  if (image) {
    image.src = assetUrl(conversation.productImage);
    image.alt = conversation.productTitle || '';
  }

  const listingActive = isConversationListingActive(conversation);
  const productLink = document.querySelector('[data-chat-product]');
  if (productLink) {
    productLink.classList.toggle('is-inactive', !listingActive);
    if (listingActive && conversation.productId) {
      productLink.href = `product.html?id=${encodeURIComponent(conversation.productId)}`;
      productLink.removeAttribute('aria-disabled');
    } else {
      productLink.href = '#';
      productLink.setAttribute('aria-disabled', 'true');
    }
  }

  const badge = document.querySelector('[data-chat-product-badge]');
  if (badge) {
    if (listingActive) {
      badge.hidden = true;
      badge.textContent = '';
    } else {
      badge.hidden = false;
      badge.textContent = t('messages.listingInactiveBadge');
    }
  }

  const product = getConversationProduct(conversation);
  const sellerLink = document.querySelector('[data-chat-seller-link]');
  if (sellerLink) {
    if (getConversationRole(conversation) === 'seller' || !product?.sellerId || !listingActive) {
      sellerLink.hidden = true;
      sellerLink.removeAttribute('href');
    } else {
      sellerLink.href = buildSellerCatalogUrl(product.sellerId, product);
      sellerLink.textContent = t('product.viewSellerAds');
      sellerLink.hidden = false;
    }
  }

  setComposerLocked(!listingActive);
}

function patchLocalConversation(conversationId, patch) {
  const index = allMessages.findIndex((item) => item.id === conversationId);
  if (index >= 0) {
    allMessages[index] = normalizeConversationUnread({ ...allMessages[index], ...patch });
  }
  if (activeConversation?.id === conversationId) {
    activeConversation = normalizeConversationUnread({ ...activeConversation, ...patch });
  }
}

async function markConversationRead(conversation) {
  const role = getConversationRole(conversation);
  const incomingSender = role === 'seller' ? 'user' : 'contact';
  const myUnread = getMyUnread(conversation);
  const lastWasIncoming = conversation.lastSender === incomingSender;
  const needsStatusUpdate = lastWasIncoming && conversation.status !== 'read';

  const pendingIncoming = chatMessages.filter(
    (item) => item.sender === incomingSender && item.status !== 'read'
  );

  if (myUnread <= 0 && !needsStatusUpdate && pendingIncoming.length === 0) {
    return;
  }

  const normalized = normalizeConversationUnread(conversation);
  const patch = {
    buyerUnreadCount: role === 'buyer' ? 0 : Number(normalized.buyerUnreadCount) || 0,
    sellerUnreadCount: role === 'seller' ? 0 : Number(normalized.sellerUnreadCount) || 0,
    unreadCount: 0
  };

  if (needsStatusUpdate) {
    patch.status = 'read';
  }

  try {
    const requests = [];

    if (myUnread > 0 || needsStatusUpdate) {
      requests.push(API.updateMessage(conversation.id, patch));
    } else {
      requests.push(Promise.resolve(conversation));
    }

    if (pendingIncoming.length) {
      requests.push(API.markChatMessagesRead(conversation.id, incomingSender));
    } else {
      requests.push(Promise.resolve(chatMessages));
    }

    const [updated, markedMessages] = await Promise.all(requests);

    chatMessages = markedMessages;
    patchLocalConversation(conversation.id, {
      ...updated,
      ...(myUnread > 0 || needsStatusUpdate ? patch : {})
    });
  } catch {
  }
}

async function openConversation(conversation) {
  if (!conversation) return;

  activeConversation = normalizeConversationUnread(conversation);
  setMessagesChatOpen(true);
  document.querySelector('[data-chat-empty]')?.setAttribute('hidden', '');
  document.querySelector('[data-chat-panel]')?.removeAttribute('hidden');
  fillChatHeader(activeConversation);
  renderConversationList();
  window.scrollTo(0, 0);

  const url = new URL(window.location.href);
  url.searchParams.set('id', String(conversation.id));
  window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);

  chatMessages = await API.getChatMessages(conversation.id);
  renderChatMessages();

  await markConversationRead(activeConversation);
  renderChatMessages();
  renderConversationList();

  if (isConversationListingActive(activeConversation)) {
    document.querySelector('[data-chat-input]')?.focus();
  }
}

async function sendChatMessage(event) {
  event.preventDefault();
  if (!activeConversation) return;

  if (!isConversationListingActive(activeConversation)) {
    setComposerLocked(true);
    alertDialog({ message: t('messages.listingInactive'), type: 'error' });
    return;
  }

  const input = document.querySelector('[data-chat-input]');
  const sendBtn = document.querySelector('[data-chat-send]');
  const text = input?.value.trim() || '';
  if (!text) return;

  sendBtn.disabled = true;

  try {
    const outgoing = getOutgoingSender();
    const role = getConversationRole(activeConversation);
    const current = normalizeConversationUnread(activeConversation);
    const nextBuyerUnread = role === 'buyer'
      ? Number(current.buyerUnreadCount) || 0
      : (Number(current.buyerUnreadCount) || 0) + 1;
    const nextSellerUnread = role === 'seller'
      ? Number(current.sellerUnreadCount) || 0
      : (Number(current.sellerUnreadCount) || 0) + 1;

    const created = await API.createChatMessage({
      conversationId: activeConversation.id,
      sender: outgoing,
      text,
      status: 'sent',
      sentAt: new Date().toISOString()
    });

    chatMessages.push(created);
    renderChatMessages();
    input.value = '';

    const patch = {
      sentAt: created.sentAt,
      lastMessage: text,
      lastSender: outgoing,
      status: 'sent',
      buyerUnreadCount: nextBuyerUnread,
      sellerUnreadCount: nextSellerUnread,
      unreadCount: 0
    };

    const updated = await API.updateMessage(activeConversation.id, patch);

    activeConversation = normalizeConversationUnread({ ...activeConversation, ...updated, ...patch });
    const index = allMessages.findIndex((item) => item.id === activeConversation.id);
    if (index >= 0) {
      allMessages[index] = { ...allMessages[index], ...activeConversation };
      allMessages.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
    }
    renderConversationList();
  } catch {
    alertDialog({ message: t('messages.sendError'), type: 'error' });
  } finally {
    sendBtn.disabled = false;
    input?.focus();
  }
}

async function loadMessages() {
  currentUser = checkAuth();
  if (!currentUser) return;

  if (isAdmin(currentUser)) {
    window.location.href = 'admin.html';
    return;
  }

  currentUser = await API.getUserById(currentUser.id);
  applyProfileTabs();

  const products = await api.getProducts({ includeInactive: true });
  productsById = new Map(products.map((product) => [Number(product.id), product]));

  if (isSeller(currentUser)) {
    allMessages = await loadSellerInbox(products);
  } else {
    allMessages = (await API.getMessagesByUserId(currentUser.id))
      .filter((message) => !isSelfConversation(message, currentUser))
      .map(normalizeConversationUnread);
  }

  updateUnreadTabBadge();
  renderConversationList();

  const conversationId = Number(new URLSearchParams(window.location.search).get('id'));
  if (conversationId) {
    const conversation = allMessages.find((item) => item.id === conversationId);
    if (conversation) await openConversation(conversation);
  } else {
    showEmptyChat();
  }
}

function bindEvents() {
  document.querySelector('[data-select-mode]')?.addEventListener('click', () => {
    selectMode = true;
    updateSelectUi();
    renderConversationList();
  });

  document.querySelector('[data-select-cancel]')?.addEventListener('click', () => {
    selectMode = false;
    selectedIds.clear();
    updateSelectUi();
    renderConversationList();
  });

  document.getElementById('messenger-list')?.addEventListener('change', (event) => {
    const checkbox = event.target.closest('[data-message-check]');
    if (!checkbox) return;
    const id = Number(checkbox.value);
    if (checkbox.checked) selectedIds.add(id);
    else selectedIds.delete(id);
    updateSelectUi();
  });

  document.querySelector('[data-messages-delete]')?.addEventListener('click', () => {
    deleteSelectedConversations();
  });

  document.getElementById('messenger-list')?.addEventListener('click', (event) => {
    if (event.target.closest('[data-message-check]')) return;

    if (selectMode) {
      const item = event.target.closest('.messenger-item');
      if (!item) return;
      event.preventDefault();
      toggleConversationSelection(item.dataset.messageId);
      return;
    }

    const openBtn = event.target.closest('[data-open-chat]');
    if (!openBtn) return;

    const conversation = allMessages.find((entry) => entry.id === Number(openBtn.dataset.openChat));
    openConversation(conversation);
  });

  document.querySelector('[data-chat-back]')?.addEventListener('click', () => {
    showEmptyChat();
  });

  document.querySelector('[data-chat-form]')?.addEventListener('submit', sendChatMessage);

  document.querySelector('[data-chat-input]')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      document.querySelector('[data-chat-form]')?.requestSubmit();
    }
  });

  document.addEventListener('languageChanged', () => {
    renderConversationList();
    if (activeConversation) {
      fillChatHeader(activeConversation);
      renderChatMessages();
    }
  });
}

async function init() {
  try {
    bindEvents();
    await loadMessages();
  } finally {
    markContentReady();
  }
}

init();