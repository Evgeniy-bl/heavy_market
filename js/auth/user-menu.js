import { getCurrentUser, resolveAuthPath, getProfilePath } from './session.js';
import { t } from '../common/i18n.js';
import { isAdmin, isSeller } from '../utils/user-role.js';
import { openAuthModal } from './require-auth.js';

function getProfileUrl(user) {
  return getProfilePath(user);
}

export function initUserMenu() {
  document.querySelectorAll('[data-user-menu]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const user = getCurrentUser();
      if (user) {
        window.location.href = getProfileUrl(user);
        return;
      }

      openAuthModal();
    });
  });
}

export function initBecomeSellerCta() {
  document.querySelectorAll('[data-become-seller]').forEach((link) => {
    const user = getCurrentUser();

    if (isAdmin(user)) {
      link.hidden = true;
      link.setAttribute('aria-hidden', 'true');
      return;
    }

    link.hidden = false;
    link.removeAttribute('aria-hidden');

    if (isSeller(user)) {
      link.href = resolveAuthPath('create-listing.html');
      link.textContent = t('header.addListing');
      link.dataset.i18n = 'header.addListing';
      return;
    }

    link.href = resolveAuthPath('seller.html');
    link.textContent = t('header.becomeSeller');
    link.dataset.i18n = 'header.becomeSeller';
  });
}
