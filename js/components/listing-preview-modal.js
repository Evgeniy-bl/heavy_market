import Modal from './modal.js';

export function openListingPreviewModal(contentHtml) {
  const body = document.querySelector('[data-listing-preview-body]');
  if (body) {
    body.innerHTML = contentHtml;
  }

  Modal.open('listing-preview');
}
