import { getCurrentUser, resolveAuthPath } from './session.js';
import { t } from '../common/i18n.js';
import Modal from '../components/modal.js';

export function requireAuth(messageKey = 'favorites.authRequired') {
  const user = getCurrentUser();
  if (user) return user;

  Modal.open({
    content: `
      <p class="modal__text">${t(messageKey)}</p>
      <div class="modal__actions modal__actions--stack">
        <a href="${resolveAuthPath('login.html')}" class="btn btn--primary btn--full">${t('auth.login.submit')}</a>
        <a href="${resolveAuthPath('register.html')}" class="btn btn--secondary btn--full">${t('auth.register.submit')}</a>
      </div>
    `,
    raw: true,
    closeLabel: t('common.close'),
    onReady(root) {
      const dialog = root.querySelector('.modal__dialog');
      const title = document.createElement('h2');
      title.className = 'modal__title';
      title.textContent = t('auth.profileModal.title');
      const body = root.querySelector('[data-modal-body]');
      dialog.insertBefore(title, body);
    }
  });

  return null;
}
