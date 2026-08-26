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
  bound: false,

  init() {
    if (this.bound) {
      return;
    }

    this.bound = true;
    document.addEventListener('click', this.handleClick);
    document.addEventListener('keydown', this.handleKeydown);
  },

  get isOpen() {
    return Boolean(this.root);
  },

  open(id) {
    const modalId = String(id || '').replace(/^#/, '');
    const modal = document.querySelector(`[data-modal="${modalId}"]`);
    if (!modal) {
      return null;
    }

    this.close({ silent: true });

    this.lastFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.root = modal;

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    requestAnimationFrame(() => {
      if (this.root !== modal) {
        return;
      }

      modal.classList.add('is-open');

      const dialog = modal.querySelector('.modal__dialog') || modal;
      dialog.setAttribute('tabindex', '-1');
      focusWithoutScroll(dialog.querySelector(FOCUSABLE_SELECTOR) || dialog);
    });

    return modal;
  },

  close(options = {}) {
    if (!this.root) {
      return;
    }

    const modal = this.root;
    const modalId = modal.dataset.modal || '';
    const restoreFocus = this.lastFocused;

    this.root = null;
    this.lastFocused = null;

    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');

    window.setTimeout(() => {
      if (!modal.classList.contains('is-open')) {
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
      }
    }, 300);

    if (restoreFocus instanceof HTMLElement && document.contains(restoreFocus)) {
      focusWithoutScroll(restoreFocus);
    }

    if (!options.silent) {
      document.dispatchEvent(new CustomEvent('modal:closed', {
        detail: { id: modalId, modal }
      }));
    }
  },

  closeAll() {
    document.querySelectorAll('[data-modal].is-open').forEach((modal) => {
      modal.classList.remove('is-open');
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
    });

    this.root = null;
    this.lastFocused = null;
    document.body.classList.remove('modal-open');
  },

  handleClick(event) {
    const openTrigger = event.target.closest('[data-modal-open]');
    if (openTrigger) {
      event.preventDefault();
      this.lastFocused = openTrigger;
      this.open(openTrigger.getAttribute('data-modal-open'));
      return;
    }

    const closeTrigger = event.target.closest('[data-modal-close]');
    if (!closeTrigger || !this.root) {
      return;
    }

    if (closeTrigger === this.root || this.root.contains(closeTrigger)) {
      event.preventDefault();
      this.close();
    }
  },

  handleKeydown(event) {
    if (!this.root) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    this.trapFocus(event);
  },

  trapFocus(event) {
    if (event.key !== 'Tab' || !this.root) {
      return;
    }

    const focusable = [...this.root.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
      (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
    );

    if (!focusable.length) {
      event.preventDefault();
      focusWithoutScroll(this.root.querySelector('.modal__dialog') || this.root);
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
  }
};

Modal.handleClick = Modal.handleClick.bind(Modal);
Modal.handleKeydown = Modal.handleKeydown.bind(Modal);

export default Modal;
