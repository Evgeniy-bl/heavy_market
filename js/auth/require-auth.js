import { getCurrentUser } from './session.js';
import { t } from '../common/i18n.js';
import Modal from '../components/modal.js';

export function openAuthModal(messageKey = 'auth.profileModal.message') {
  const messageEl = document.querySelector('[data-auth-modal-message]');
  if (messageEl) {
    messageEl.textContent = t(messageKey);
  }

  Modal.open('auth-required');
}

export function requireAuth(messageKey = 'favorites.authRequired') {
  const user = getCurrentUser();
  if (user) return user;

  openAuthModal(messageKey);
  return null;
}
