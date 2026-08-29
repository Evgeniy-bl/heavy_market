import { API } from '../api.js';
import { t } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';
import { checkAuth, logout, resolveAuthPath, getProfilePath } from '../auth/session.js';
import { PROFILE_DESKTOP_MQ } from '../config/constants.js';
import { refreshMessagesTabBadge } from '../utils/messages-badge.js';
import { isAdmin, isSeller, getSellerDisplayName } from '../utils/user-role.js';
import { openAuthModal } from '../auth/require-auth.js';

function getDisplayName(user) {
  if (isSeller(user)) return getSellerDisplayName(user);
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.nickname || user.email;
}

function getInitials(user) {
  const name = getDisplayName(user).trim();
  if (!name) return 'HM';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function bindLogout() {
  document.querySelector('[data-profile-logout]')?.addEventListener('click', () => {
    logout();
    window.location.href = resolveAuthPath('login.html');
  });
}

function updateSellerActions(user) {
  const listingsLink = document.querySelector('[data-profile-hub-listings]');
  const addListingLink = document.querySelector('[data-profile-hub-add-listing]');
  const becomeSellerLink = document.querySelector('[data-profile-hub-become-seller]');
  const isUserSeller = isSeller(user);

  if (listingsLink) {
    listingsLink.hidden = !isUserSeller;
  }

  if (addListingLink) {
    addListingLink.hidden = !isUserSeller;
    if (isUserSeller) {
      addListingLink.href = resolveAuthPath('create-listing.html');
    }
  }

  if (becomeSellerLink) {
    becomeSellerLink.hidden = isUserSeller;
    if (!isUserSeller) {
      becomeSellerLink.href = resolveAuthPath('seller.html');
    }
  }
}

function fillHub(user) {
  const nameEl = document.querySelector('[data-profile-hub-name]');
  const metaEl = document.querySelector('[data-profile-hub-meta]');
  const initialsEl = document.querySelector('[data-profile-hub-initials]');

  const displayName = getDisplayName(user);

  if (nameEl) {
    nameEl.textContent = displayName;
    nameEl.removeAttribute('data-i18n');
  }

  if (metaEl) {
    metaEl.textContent = user.email || user.phone || user.nickname || '';
  }

  if (initialsEl) {
    initialsEl.textContent = getInitials(user);
  }

  updateSellerActions(user);
}

async function init() {
  try {
    const session = checkAuth();
    if (!session) {
      openAuthModal();
      return;
    }

    if (isAdmin(session)) {
      window.location.href = resolveAuthPath('admin.html');
      return;
    }

    if (window.matchMedia(PROFILE_DESKTOP_MQ).matches) {
      window.location.href = getProfilePath(session);
      return;
    }

    const user = await API.getUserById(session.id);
    fillHub(user);
    bindLogout();
    await refreshMessagesTabBadge(user);
  } finally {
    markContentReady();
  }
}

init();
