import Modal from './modal.js';
import { t } from '../common/i18n.js';

/**
 * Confirm dialog — как showConfirm в PASCAL VENT.
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
  title,
  message,
  confirmText,
  cancelText,
  type = 'info'
} = {}) {
  return Modal.confirm(message || '', {
    title: title || t('common.confirmTitle'),
    type,
    confirmLabel: confirmText || t('common.confirm'),
    cancelLabel: cancelText || t('common.cancel')
  });
}

export function showConfirm(message, options = {}) {
  return confirmDialog({
    message,
    title: options.title,
    confirmText: options.confirmLabel || options.confirmText,
    cancelText: options.cancelLabel || options.cancelText,
    type: options.type
  });
}

export default confirmDialog;
