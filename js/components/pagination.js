/**
 * Shared prev/next pagination control.
 * @param {object} options
 * @param {number} options.page - 1-based current page
 * @param {number} options.totalPages
 * @param {string} [options.prevLabel]
 * @param {string} [options.nextLabel]
 * @param {boolean} [options.hideWhenSingle=true]
 */
export function renderPaginationHtml({
  page,
  totalPages,
  prevLabel = 'Previous',
  nextLabel = 'Next',
  hideWhenSingle = true
}) {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  const safePage = Math.min(Math.max(1, Number(page) || 1), safeTotal);

  if (hideWhenSingle && safeTotal <= 1) return '';

  return `
    <nav class="pagination" data-pagination aria-label="pagination">
      <button
        type="button"
        class="pagination__btn"
        data-page-prev
        aria-label="${prevLabel}"
        ${safePage <= 1 ? 'disabled' : ''}
      >
        <span class="pagination__icon pagination__icon--prev" aria-hidden="true"></span>
      </button>
      <span class="pagination__status" aria-live="polite">${safePage} / ${safeTotal}</span>
      <button
        type="button"
        class="pagination__btn"
        data-page-next
        aria-label="${nextLabel}"
        ${safePage >= safeTotal ? 'disabled' : ''}
      >
        <span class="pagination__icon pagination__icon--next" aria-hidden="true"></span>
      </button>
    </nav>
  `;
}

/**
 * Renders pagination into container and binds prev/next clicks.
 * @returns {() => void} cleanup
 */
export function mountPagination(container, options) {
  if (!container) return () => {};

  const {
    page,
    totalPages,
    onPageChange,
    prevLabel,
    nextLabel,
    hideWhenSingle = true
  } = options;

  container.innerHTML = renderPaginationHtml({
    page,
    totalPages,
    prevLabel,
    nextLabel,
    hideWhenSingle
  });

  const onPrev = () => {
    if (page <= 1) return;
    onPageChange?.(page - 1);
  };

  const onNext = () => {
    if (page >= totalPages) return;
    onPageChange?.(page + 1);
  };

  const prevBtn = container.querySelector('[data-page-prev]');
  const nextBtn = container.querySelector('[data-page-next]');
  prevBtn?.addEventListener('click', onPrev);
  nextBtn?.addEventListener('click', onNext);

  return () => {
    prevBtn?.removeEventListener('click', onPrev);
    nextBtn?.removeEventListener('click', onNext);
  };
}
