import Modal from './modal.js';
import { t } from '../common/i18n.js';

const MODAL_ID = 'confirm-dialog';

let mounted = false;
let pending = null;

function ensureMarkup() {
  if (mounted) {
    return;
  }

  mounted = true;

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal" data-modal="${MODAL_ID}" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div class="modal__backdrop" data-modal-close></div>
      <section class="modal__dialog">
        <button class="modal__close" type="button" data-modal-close data-i18n-aria="common.close">×</button>
        <h2 class="modal__title" id="confirm-dialog-title" data-confirm-title></h2>
        <p class="modal__message" data-confirm-message></p>
        <div class="modal__actions">
          <button type="button" class="btn btn--secondary" data-confirm-cancel data-modal-close></button>
          <button type="button" class="btn btn--primary" data-confirm-ok></button>
        </div>
      </section>
    </div>
  `);

  const modal = document.querySelector(`[data-modal="${MODAL_ID}"]`);
  modal?.querySelector('[data-confirm-ok]')?.addEventListener('click', () => {
    if (!pending) {
      return;
    }

    const resolve = pending.resolve;
    pending = null;
    Modal.close({ silent: true });
    resolve(true);
    document.dispatchEvent(new CustomEvent('modal:closed', {
      detail: { id: MODAL_ID, modal, confirmed: true }
    }));
  });

  document.addEventListener('modal:closed', (event) => {
    if (!pending || event.detail?.id !== MODAL_ID || event.detail?.confirmed) {
      return;
    }

    const resolve = pending.resolve;
    pending = null;
    resolve(false);
  });
}

export function confirmDialog({
  title,
  message,
  confirmText,
  cancelText,
  type = 'info'
} = {}) {
  ensureMarkup();

  const modal = document.querySelector(`[data-modal="${MODAL_ID}"]`);
  if (!modal) {
    return Promise.resolve(false);
  }

  modal.className = `modal modal--${type}`;
  modal.querySelector('[data-confirm-title]').textContent = title || t('common.confirmTitle');
  modal.querySelector('[data-confirm-message]').textContent = message || '';
  modal.querySelector('[data-confirm-ok]').textContent = confirmText || t('common.confirm');
  modal.querySelector('[data-confirm-cancel]').textContent = cancelText || t('common.cancel');

  return new Promise((resolve) => {
    pending = { resolve };
    Modal.open(MODAL_ID);
  });
}

export default confirmDialog;
