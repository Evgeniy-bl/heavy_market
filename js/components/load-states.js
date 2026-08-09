const ERROR_TEXT = 'Данные не загрузились. Запустите JSON Server и обновите страницу';
const RETRY_TEXT = 'Повторить';

export function showLoading(container) {
  if (!container) return;
  container.dataset.loadState = 'loading';
  container.innerHTML = '';
}

export function showError(container, onRetry) {
  if (!container) return;

  container.dataset.loadState = 'error';
  container.innerHTML = `
    <div class="error-state" role="alert">
      <p class="error-state__text">${ERROR_TEXT}</p>
      <button type="button" class="btn btn--secondary error-state__retry">${RETRY_TEXT}</button>
    </div>
  `;

  const retryBtn = container.querySelector('.error-state__retry');
  retryBtn?.addEventListener('click', () => {
    if (typeof onRetry === 'function') {
      onRetry();
    }
  });
}

export async function withState(container, fetchFn, renderFn) {
  if (!container) {
    return null;
  }

  showLoading(container);

  try {
    const data = await fetchFn();
    container.innerHTML = '';
    delete container.dataset.loadState;
    await renderFn(data);
    return data;
  } catch (error) {
    console.error(error);
    showError(container, () => withState(container, fetchFn, renderFn));
    return null;
  }
}

export default { showLoading, showError, withState };
