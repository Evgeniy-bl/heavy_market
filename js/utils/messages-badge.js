import { API } from '../api.js';
import { t } from '../common/i18n.js';

let cachedUnread = 0;

export function getTotalUnreadCount(messages = []) {
  return messages.reduce((sum, item) => sum + (Number(item.unreadCount) || 0), 0);
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

  const wrap = document.querySelector('[data-messages-badge]');
  const full = document.querySelector('[data-messages-badge-full]');
  const short = document.querySelector('[data-messages-badge-short]');

  if (!wrap) return;

  if (cachedUnread <= 0) {
    wrap.hidden = true;
    if (full) full.textContent = '';
    if (short) short.textContent = '';
    return;
  }

  wrap.hidden = false;
  if (full) full.textContent = formatUnreadLabel(cachedUnread);
  if (short) short.textContent = String(cachedUnread);
}

export async function refreshMessagesTabBadge(userId) {
  if (!userId) {
    updateMessagesTabBadge(0);
    return 0;
  }

  const messages = await API.getMessagesByUserId(userId);
  updateMessagesTabBadge(getTotalUnreadCount(messages));
  return cachedUnread;
}

export function bindMessagesBadgeLanguageRefresh() {
  document.addEventListener('languageChanged', () => {
    updateMessagesTabBadge(cachedUnread);
  });
}
