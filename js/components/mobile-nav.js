import { t } from '../common/i18n.js';
import { getCurrentUser, resolveAuthPath } from '../auth/session.js';
import { openAuthModal } from '../auth/require-auth.js';
import { isAdmin, isSeller } from '../utils/user-role.js';
import { refreshMessagesTabBadge } from '../utils/messages-badge.js';

import { MOBILE_NAV_MQ } from '../config/constants.js';

const SKIP_PAGES = new Set(['admin', 'login', 'register']);

const ICONS = {
  home: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  heart: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20.5s-6.5-4.1-9-7.8C1.3 10.3 2.2 7 5.2 6.2c1.8-.5 3.5.2 4.5 1.5C10.7 6.4 12.4 5.7 14.2 6.2c3 .8 3.9 4.1 2.2 6.5-2.5 3.7-9 7.8-9 7.8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  catalog: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><g clip-path="url(#clip0_category_nav)"><circle cx="17" cy="7" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="17" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 14H20V19C20 19.5523 19.5523 20 19 20H15C14.4477 20 14 19.5523 14 19V14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 4H10V9C10 9.55228 9.55228 10 9 10H5C4.44772 10 4 9.55228 4 9V4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="clip0_category_nav"><rect width="24" height="24" fill="white"/></clipPath></defs></svg>',
  messages: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H14l5 5v8.5A2.5 2.5 0 0 1 16.5 20h-9A2.5 2.5 0 0 1 5 17.5v-11Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 4v4h4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 13h7M8.5 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  profile: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 19.2c.8-3.2 3.3-5 6.5-5s5.7 1.8 6.5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  plus: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
};

function getBasePath() {
  const path = window.location.pathname || '';
  return /\/pages\//.test(path) || path.endsWith('/pages') ? '../' : '';
}

function ensureStyles(basePath) {
  if (document.querySelector('link[data-mobile-nav-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${basePath}css/mobile-nav.css`;
  link.dataset.mobileNavCss = '1';
  document.head.appendChild(link);
}

function detectActiveKey() {
  const page = document.body?.dataset?.page || '';
  const path = window.location.pathname || '';

  if (page === 'home' || /(?:^|\/)index\.html$/.test(path) || /\/$/.test(path)) return 'home';
  if (page === 'favorites' || path.includes('favorites')) return 'favorites';
  if (page === 'catalog' || path.includes('catalog') || path.includes('product')) return 'catalog';
  if (page === 'messages' || path.includes('messages')) return 'messages';
  if (
    page === 'profile'
    || page === 'profile-settings'
    || path.includes('profile')
    || path.includes('my-listings')
    || path.includes('create-listing')
    || path.includes('seller')
  ) {
    return 'profile';
  }
  return '';
}

function shouldShowFab() {
  const page = document.body?.dataset?.page || '';
  const path = window.location.pathname || '';
  return page === 'my-listings' || path.includes('my-listings');
}

function fabHref(user) {
  if (isSeller(user)) return resolveAuthPath('create-listing.html');
  return resolveAuthPath('seller.html');
}

function buildNavHtml(user, activeKey) {
  const items = [
    { key: 'home', href: `${getBasePath()}index.html`, icon: 'home', labelKey: 'nav.home' },
    { key: 'favorites', href: resolveAuthPath('favorites.html'), icon: 'heart', labelKey: 'nav.favorites', auth: true },
    { key: 'catalog', href: resolveAuthPath('catalog.html'), icon: 'catalog', labelKey: 'nav.catalog' },
    { key: 'messages', href: resolveAuthPath('messages.html'), icon: 'messages', labelKey: 'nav.messages', auth: true, badge: true },
    { key: 'profile', href: resolveAuthPath('profile.html'), icon: 'profile', labelKey: 'nav.profile', auth: true }
  ];

  const itemsHtml = items.map((item) => {
    const isActive = item.key === activeKey;
    const badge = item.badge
      ? `
        <span class="mobile-nav__badge" data-messages-badge hidden aria-hidden="true">
          <span data-messages-badge-short></span>
        </span>
      `
      : '';

    return `
      <a
        class="mobile-nav__item${isActive ? ' is-active' : ''}"
        href="${item.href}"
        data-mobile-nav-item="${item.key}"
        ${item.auth ? 'data-mobile-nav-auth="true"' : ''}
        ${isActive ? 'aria-current="page"' : ''}
      >
        <span class="mobile-nav__icon-wrap">
          <span class="mobile-nav__icon" aria-hidden="true">${ICONS[item.icon]}</span>
          ${badge}
        </span>
        <span class="mobile-nav__label" data-i18n="${item.labelKey}">${t(item.labelKey)}</span>
      </a>
    `;
  }).join('');

  const showFab = shouldShowFab();
  const fabLabel = isSeller(user) ? t('nav.fabAdd') : t('nav.fabSell');
  const fabHtml = showFab
    ? `
    <a
      class="mobile-fab"
      href="${fabHref(user)}"
      data-mobile-fab
      aria-label="${fabLabel}"
      title="${fabLabel}"
    >
      <span class="mobile-fab__icon" aria-hidden="true">${ICONS.plus}</span>
    </a>`
    : '';

  return `
    ${fabHtml}
    <nav class="mobile-nav" data-mobile-nav aria-label="${t('nav.aria')}">
      ${itemsHtml}
    </nav>
  `;
}

function bindAuthGuards(root) {
  root.querySelectorAll('[data-mobile-nav-auth]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (getCurrentUser()) return;
      event.preventDefault();
      openAuthModal();
    });
  });
}

function applyI18nLabels(root) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  const fab = root.querySelector('[data-mobile-fab]');
  if (fab) {
    const user = getCurrentUser();
    const label = isSeller(user) ? t('nav.fabAdd') : t('nav.fabSell');
    fab.setAttribute('aria-label', label);
    fab.title = label;
  }
}

function mount() {
  const page = document.body?.dataset?.page || '';
  if (SKIP_PAGES.has(page)) return null;

  const user = getCurrentUser();
  if (isAdmin(user)) return null;

  ensureStyles(getBasePath());
  document.body.classList.add('has-mobile-nav');

  let root = document.querySelector('[data-mobile-nav-root]');
  if (!root) {
    root = document.createElement('div');
    root.className = 'mobile-nav-root';
    root.dataset.mobileNavRoot = '1';
    document.body.appendChild(root);
  }

  root.innerHTML = buildNavHtml(user, detectActiveKey());
  bindAuthGuards(root);
  applyI18nLabels(root);
  return root;
}

export function initMobileNav() {
  const root = mount();
  if (!root) return;

  const user = getCurrentUser();
  if (user) {
    refreshMessagesTabBadge(user).catch(() => {});
  }

  document.addEventListener('languageChanged', () => {
    applyI18nLabels(root);
  });

  const mql = window.matchMedia(MOBILE_NAV_MQ);
  const syncBodyClass = () => {
    if (SKIP_PAGES.has(document.body?.dataset?.page || '') || isAdmin(getCurrentUser())) {
      document.body.classList.remove('has-mobile-nav');
      return;
    }
    document.body.classList.toggle('has-mobile-nav', mql.matches);
  };
  syncBodyClass();
  mql.addEventListener?.('change', syncBodyClass);
}
