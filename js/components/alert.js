import Modal from './modal.js';
import { t } from '../common/i18n.js';

const MODAL_ID = 'alert-dialog';

let mounted = false;

function ensureMarkup() {
  if (mounted) {
    return;
  }

  mounted = true;

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal" data-modal="${MODAL_ID}" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="alert-dialog-title">
      <div class="modal__backdrop" data-modal-close></div>
      <section class="modal__dialog">
        <button class="modal__close" type="button" data-modal-close data-i18n-aria="common.close">×</button>
        <h2 class="modal__title" id="alert-dialog-title" data-alert-title hidden></h2>
        <p class="modal__message" data-alert-message></p>
        <div class="modal__actions">
          <button type="button" class="btn btn--primary" data-modal-close data-alert-ok></button>
        </div>
      </section>
    </div>
  `);
}

export function alertDialog({
  title = '',
  message = '',
  type = 'info',
  closeText
} = {}) {
  ensureMarkup();

  const modal = document.querySelector(`[data-modal="${MODAL_ID}"]`);
  if (!modal) {
    return;
  }

  modal.className = `modal modal--${type}`;

  const titleEl = modal.querySelector('[data-alert-title]');
  if (title) {
    titleEl.hidden = false;
    titleEl.textContent = title;
  } else {
    titleEl.hidden = true;
    titleEl.textContent = '';
  }

  modal.querySelector('[data-alert-message]').textContent = message || '';
  modal.querySelector('[data-alert-ok]').textContent = closeText || t('common.close');

  Modal.open(MODAL_ID);
}

export default alertDialog;
