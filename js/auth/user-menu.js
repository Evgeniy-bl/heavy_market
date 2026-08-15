import Modal from '../components/modal.js';
import { t } from '../common/i18n.js';
import { getCurrentUser, resolveAuthPath } from './session.js';

function getProfileUrl(user) {
  switch (user.role) {
    case 'landlord':
      return resolveAuthPath('landlord-profile.html');
    case 'admin':
      return resolveAuthPath('admin.html');
    default:
      return resolveAuthPath('profile.html');
  }
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

      const loginUrl = resolveAuthPath('login.html');
      const registerUrl = resolveAuthPath('register.html');

      Modal.open({
        content: `
          <p class="modal__text">${t('auth.profileModal.message')}</p>
          <div class="modal__actions modal__actions--stack">
            <a href="${loginUrl}" class="btn btn--primary btn--full">${t('auth.login.submit')}</a>
            <a href="${registerUrl}" class="btn btn--secondary btn--full">${t('auth.register.submit')}</a>
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
    });
  });
}
