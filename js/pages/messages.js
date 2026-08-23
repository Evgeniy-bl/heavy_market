import { API } from '../api.js';
import { api } from '../utils/api.js';
import { buildSellerCatalogUrl } from '../utils/catalog-url.js';
import { t, formatPrice } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';
import { checkAuth } from '../auth/session.js';
import Modal from '../components/modal.js';
import {
  getTotalUnreadCount,
  updateMessagesTabBadge
} from '../utils/messages-badge.js';

let currentUser = null;
let allMessages = [];
let selectedIds = new Set();
let activeConversation = null;
let chatMessages = [];
let selectMode = false;
let productsById = new Map();

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

function updateUnreadTabBadge() {
  updateMessagesTabBadge(getTotalUnreadCount(allMessages));
}

function shouldShowConversationStatus(conversation) {
  return !conversation.unreadCount && conversation.lastSender === 'user';
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
  if (status === 'read') {
    return `<img src="../assets/icons/check-double.svg" alt="" width="18" height="16" aria-hidden="true">`;
  }
  return `<img src="../assets/icons/check-single.svg" alt="" width="16" height="16" aria-hidden="true">`;
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

function renderConversationList() {
  const list = document.getElementById('messenger-list');
  if (!list) return;

  if (!allMessages.length) {
    list.innerHTML = `<p class="messenger-empty-list">${escapeHtml(t('messages.empty'))}</p>`;
    updateUnreadTabBadge();
    updateSelectUi();
    return;
  }

  list.innerHTML = allMessages.map((conversation) => {
    const isActive = activeConversation?.id === conversation.id;
    const isUnread = conversation.unreadCount > 0;
    const checked = selectedIds.has(conversation.id);
    const productSrc = assetUrl(conversation.productImage);
    const badge = isUnread
      ? `<span class="messenger-item__badge">${conversation.unreadCount}</span>`
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
            <span class="messenger-item__listing">${escapeHtml(conversation.productTitle)}</span>
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

    const isOutgoing = message.sender === 'user';
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

function showEmptyChat() {
  activeConversation = null;
  chatMessages = [];

  document.querySelector('[data-messenger]')?.classList.remove('is-chat-open');
  document.querySelector('[data-chat-empty]')?.removeAttribute('hidden');
  document.querySelector('[data-chat-panel]')?.setAttribute('hidden', '');

  const url = new URL(window.location.href);
  url.searchParams.delete('id');
  window.history.replaceState({}, '', url.pathname + url.search);
  renderConversationList();
}

function getConversationProduct(conversation) {
  return productsById.get(conversation?.productId) || null;
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

  const productLink = document.querySelector('[data-chat-product]');
  if (productLink) {
    productLink.href = conversation.productId
      ? `product.html?id=${encodeURIComponent(conversation.productId)}`
      : '#';
  }

  const product = getConversationProduct(conversation);
  const sellerLink = document.querySelector('[data-chat-seller-link]');
  if (sellerLink) {
    if (product?.sellerId) {
      sellerLink.href = buildSellerCatalogUrl(product.sellerId, product);
      sellerLink.textContent = t('product.viewSellerAds');
      sellerLink.hidden = false;
    } else {
      sellerLink.hidden = true;
      sellerLink.removeAttribute('href');
    }
  }
}

async function openConversation(conversation) {
  if (!conversation) return;

  activeConversation = conversation;
  document.querySelector('[data-messenger]')?.classList.add('is-chat-open');
  document.querySelector('[data-chat-empty]')?.setAttribute('hidden', '');
  document.querySelector('[data-chat-panel]')?.removeAttribute('hidden');
  fillChatHeader(conversation);
  renderConversationList();

  const url = new URL(window.location.href);
  url.searchParams.set('id', String(conversation.id));
  window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);

  chatMessages = await API.getChatMessages(conversation.id);
  renderChatMessages();

  if (conversation.unreadCount > 0) {
    try {
      await API.updateMessage(conversation.id, { unreadCount: 0 });
      conversation.unreadCount = 0;
      const index = allMessages.findIndex((item) => item.id === conversation.id);
      if (index >= 0) allMessages[index].unreadCount = 0;
      renderConversationList();
    } catch {
      /* ignore */
    }
  }

  document.querySelector('[data-chat-input]')?.focus();
}

async function sendChatMessage(event) {
  event.preventDefault();
  if (!activeConversation) return;

  const input = document.querySelector('[data-chat-input]');
  const sendBtn = document.querySelector('[data-chat-send]');
  const text = input?.value.trim() || '';
  if (!text) return;

  sendBtn.disabled = true;

  try {
    const created = await API.createChatMessage({
      conversationId: activeConversation.id,
      sender: 'user',
      text,
      status: 'sent',
      sentAt: new Date().toISOString()
    });

    chatMessages.push(created);
    renderChatMessages();
    input.value = '';

    const updated = await API.updateMessage(activeConversation.id, {
      sentAt: created.sentAt,
      lastMessage: text,
      lastSender: 'user',
      status: 'sent'
    });

    activeConversation = { ...activeConversation, ...updated };
    const index = allMessages.findIndex((item) => item.id === activeConversation.id);
    if (index >= 0) {
      allMessages[index] = { ...allMessages[index], ...updated };
      allMessages.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
    }
    renderConversationList();
  } catch {
    Modal.showError(t('messages.sendError'));
  } finally {
    sendBtn.disabled = false;
    input?.focus();
  }
}

async function loadMessages() {
  currentUser = checkAuth();
  if (!currentUser) return;

  if (currentUser.role === 'landlord') {
    window.location.href = 'landlord-profile.html';
    return;
  }

  if (currentUser.role === 'admin') {
    window.location.href = 'admin.html';
    return;
  }

  const [messages, products] = await Promise.all([
    API.getMessagesByUserId(currentUser.id),
    api.getProducts()
  ]);
  productsById = new Map(products.map((product) => [product.id, product]));
  allMessages = messages;
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

  document.querySelector('[data-messages-delete]')?.addEventListener('click', async () => {
    if (!selectedIds.size) return;

    try {
      const ids = [...selectedIds];
      await Promise.all(ids.map((id) => API.deleteChatMessagesByConversation(id)));
      await API.deleteMessages(ids);
      allMessages = allMessages.filter((message) => !selectedIds.has(message.id));
      selectedIds.clear();
      selectMode = false;

      if (activeConversation && ids.includes(activeConversation.id)) {
        showEmptyChat();
      } else {
        renderConversationList();
      }
    } catch {
      Modal.showError(t('messages.deleteError'));
    }
  });

  document.getElementById('messenger-list')?.addEventListener('click', (event) => {
    const checkbox = event.target.closest('[data-message-check]');
    if (checkbox) return;

    if (selectMode) return;

    const openBtn = event.target.closest('[data-open-chat]');
    if (!openBtn) return;

    const conversation = allMessages.find((entry) => entry.id === Number(openBtn.dataset.openChat));
    openConversation(conversation);
  });

  document.querySelector('[data-chat-back]')?.addEventListener('click', () => {
    showEmptyChat();
  });

  document.querySelector('[data-chat-menu]')?.addEventListener('click', () => {
    Modal.open({ type: 'info', message: t('messages.menuStub') });
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
