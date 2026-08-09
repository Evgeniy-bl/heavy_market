const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

function focusWithoutScroll(element) {
  if (!element || typeof element.focus !== 'function') {
    return;
  }

  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

const Modal = {
  root: null,
  lastFocused: null,
  onClose: null,
  onKeyDown: null,
  isDynamic: false,
  bound: false,

  init() {
    if (this.bound) {
      return;
    }

    this.bound = true;
    this.bindEvents();
  },

  get isOpen() {
    return Boolean(this.root);
  },

  get element() {
    return this.root;
  },

  /**
   * Как в PASCAL VENT:
   * - Modal.open({ title, message, type, confirmLabel, cancelLabel, onConfirm, onClose })
   * - Modal.open(htmlString | HTMLElement, options?)
   * - Modal.open('modal-id') — существующая разметка в HTML
   */
  open(content, options = {}) {
    if (this.isContentOptions(content)) {
      options = { ...content, ...options };
      content = options.body ?? options.content ?? null;
    }

    const existing = this.resolveExistingModal(content);
    if (existing) {
      return this.openExisting(existing, options);
    }

    this.close({ silent: true });

    this.lastFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.onClose = typeof options.onClose === 'function' ? options.onClose : null;
    this.isDynamic = true;

    const root = document.createElement('div');
    root.dataset.modalDynamic = 'true';

    if (typeof options.onConfirm === 'function' || options.confirmLabel) {
      this.renderAlertShell(root, {
        ...options,
        message: options.message ?? (typeof content === 'string' ? content : ''),
        title: options.title
      });
    } else if (content instanceof Node || (typeof content === 'string' && options.raw)) {
      this.renderCustomShell(root, content, options);
    } else {
      this.renderAlertShell(root, {
        ...options,
        message: options.message ?? (typeof content === 'string' ? content : ''),
        title: options.title
      });
    }

    this.root = root;
    this.bindChrome(root, options);
    document.body.append(root);
    document.body.classList.add('modal-open');

    requestAnimationFrame(() => {
      if (this.root !== root) {
        return;
      }

      root.classList.add('is-open');

      const dialog = root.querySelector('.modal__dialog');
      if (dialog) {
        dialog.setAttribute('tabindex', '-1');
        focusWithoutScroll(dialog.querySelector(FOCUSABLE_SELECTOR) || dialog);
      }

      options.onReady?.(root);
    });

    return root;
  },

  close(options = {}) {
    if (!this.root) {
      if (!options.silent) {
        const callback = this.onClose;
        this.onClose = null;
        callback?.();
      }
      return;
    }

    if (this.onKeyDown) {
      document.removeEventListener('keydown', this.onKeyDown);
      this.onKeyDown = null;
    }

    const root = this.root;
    const restoreFocus = this.lastFocused;
    const callback = this.onClose;
    const dynamic = this.isDynamic;

    this.root = null;
    this.onClose = null;
    this.lastFocused = null;
    this.isDynamic = false;

    root.classList.remove('is-open');
    document.body.classList.remove('modal-open');

    if (dynamic) {
      const remove = () => {
        root.remove();
      };
      root.addEventListener('transitionend', remove, { once: true });
      window.setTimeout(remove, 320);
    } else {
      root.setAttribute('aria-hidden', 'true');
      window.setTimeout(() => {
        if (!root.classList.contains('is-open')) {
          root.hidden = true;
        }
      }, 300);
    }

    if (restoreFocus instanceof HTMLElement && document.contains(restoreFocus)) {
      focusWithoutScroll(restoreFocus);
    }

    if (!options.silent) {
      callback?.();
    }
  },

  closeAll() {
    this.close({ silent: true });
    document.body.classList.remove('modal-open');
  },

  showSuccess(message, options = {}) {
    return this.open({
      ...options,
      type: 'success',
      title: options.title || '',
      message
    });
  },

  showError(message, options = {}) {
    return this.open({
      ...options,
      type: 'error',
      title: options.title || '',
      message
    });
  },

  confirm(message, options = {}) {
    return new Promise((resolve) => {
      let decided = false;

      this.open({
        title: options.title || '',
        message,
        type: options.type || 'info',
        confirmLabel: options.confirmLabel || options.confirmText || '',
        cancelLabel: options.cancelLabel || options.cancelText || '',
        onConfirm: () => {
          decided = true;
          resolve(true);
        },
        onClose: () => {
          if (!decided) {
            resolve(false);
          }
        }
      });
    });
  },

  trapFocus(event) {
    if (event.key !== 'Tab' || !this.root) {
      return;
    }

    const focusable = [...this.root.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
    );

    if (!focusable.length) {
      event.preventDefault();
      focusWithoutScroll(this.root.querySelector('.modal__dialog'));
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !this.root.contains(active))) {
      event.preventDefault();
      focusWithoutScroll(last);
      return;
    }

    if (!event.shiftKey && (active === last || !this.root.contains(active))) {
      event.preventDefault();
      focusWithoutScroll(first);
    }
  },

  bindEvents() {
    document.addEventListener('click', (event) => {
      const openTrigger = event.target.closest('[data-modal-open]');
      if (openTrigger) {
        event.preventDefault();
        this.open(openTrigger.getAttribute('data-modal-open'));
        return;
      }

      const closeTrigger = event.target.closest('[data-modal-close], [data-action="close"]');
      if (closeTrigger && this.root && (closeTrigger === this.root || this.root.contains(closeTrigger))) {
        event.preventDefault();
        this.close();
      }
    });
  },

  bindChrome(root, options) {
    this.onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
        return;
      }

      this.trapFocus(event);
    };

    document.addEventListener('keydown', this.onKeyDown);

    root.querySelectorAll('[data-action="confirm"]').forEach((element) => {
      element.addEventListener('click', (event) => {
        event.preventDefault();
        const onConfirm = options.onConfirm;
        this.onClose = null;
        this.close({ silent: true });
        onConfirm?.();
      });
    });
  },

  openExisting(modal, options = {}) {
    this.close({ silent: true });

    this.lastFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.onClose = typeof options.onClose === 'function' ? options.onClose : null;
    this.isDynamic = false;
    this.root = modal;

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    this.bindChrome(modal, options);

    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      const dialog = modal.querySelector('.modal__dialog') || modal;
      focusWithoutScroll(dialog.querySelector(FOCUSABLE_SELECTOR) || dialog);
    });

    return modal;
  },

  resolveExistingModal(content) {
    if (typeof content === 'string') {
      const id = content.replace(/^#/, '');
      const byId = document.getElementById(id);
      if (byId?.classList.contains('modal') && !byId.dataset.modalDynamic) {
        return byId;
      }
    }

    if (content instanceof HTMLElement && content.classList.contains('modal') && content.isConnected) {
      return content;
    }

    return null;
  },

  isContentOptions(value) {
    return Boolean(
      value
      && typeof value === 'object'
      && !(value instanceof Node)
      && (
        'title' in value
        || 'message' in value
        || 'body' in value
        || 'content' in value
        || 'onConfirm' in value
        || 'type' in value
      )
    );
  },

  renderAlertShell(root, options) {
    const type = options.type || 'info';
    const title = options.title || '';
    const message = options.message || '';
    const hasConfirm = typeof options.onConfirm === 'function' || Boolean(options.confirmLabel);
    const confirmLabel = options.confirmLabel || 'OK';
    const cancelLabel = options.cancelLabel || '';
    const closeLabel = options.closeLabel || 'OK';

    const actionsHtml = hasConfirm
      ? `
        <div class="modal__actions">
          <button class="btn btn--secondary" type="button" data-action="close" data-modal-close>${cancelLabel}</button>
          <button class="btn btn--primary" type="button" data-action="confirm">${confirmLabel}</button>
        </div>
      `
      : `
        <div class="modal__actions">
          <button class="btn btn--primary" type="button" data-action="close" data-modal-close>${closeLabel}</button>
        </div>
      `;

    root.className = `modal modal--${type}`;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'app-modal-title');
    root.innerHTML = `
      <div class="modal__backdrop" data-action="close" data-modal-close></div>
      <section class="modal__dialog">
        <button class="modal__close" type="button" data-action="close" data-modal-close aria-label="${closeLabel}">×</button>
        <h2 class="modal__title" id="app-modal-title"></h2>
        <p class="modal__message"></p>
        ${actionsHtml}
      </section>
    `;

    root.querySelector('.modal__title').textContent = title;
    root.querySelector('.modal__message').textContent = message;
  },

  renderCustomShell(root, content, options) {
    root.className = options.className || 'modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML = `
      <div class="modal__backdrop" data-action="close" data-modal-close></div>
      <section class="modal__dialog">
        <button class="modal__close" type="button" data-action="close" data-modal-close aria-label="×">×</button>
        <div data-modal-body></div>
      </section>
    `;

    const body = root.querySelector('[data-modal-body]');

    if (content instanceof Node) {
      body.append(content);
    } else {
      body.innerHTML = content;
    }
  }
};

export default Modal;
