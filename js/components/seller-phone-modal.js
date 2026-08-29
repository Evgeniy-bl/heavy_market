import Modal from './modal.js';

export function openSellerPhoneModal({ name, phone, telHref }) {
  const modal = document.querySelector('[data-modal="seller-phone"]');
  if (!modal) {
    return;
  }

  const nameEl = modal.querySelector('[data-seller-phone-name]');
  const linkEl = modal.querySelector('[data-seller-phone-link]');
  const numberEl = modal.querySelector('[data-seller-phone-number]');

  if (nameEl) nameEl.textContent = name || '';
  if (linkEl) linkEl.href = telHref || '';
  if (numberEl) numberEl.textContent = phone || '';

  Modal.open('seller-phone');
}
