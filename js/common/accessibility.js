import { t } from './i18n.js';
import { MOBILE_NAV_MQ } from '../config/constants.js';

const STORAGE_KEY = 'accessibility';

const DEFAULT_STATE = {
  enabled: false,
  colorScheme: 'white-black',
  fontSize: 'normal'
};

const COLOR_SCHEMES = ['white-black', 'black-yellow'];
const FONT_SIZES = ['normal', 'large'];

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };

    const parsed = JSON.parse(raw);

    return {
      enabled: Boolean(parsed.enabled),
      colorScheme: COLOR_SCHEMES.includes(parsed.colorScheme)
        ? parsed.colorScheme
        : DEFAULT_STATE.colorScheme,
      fontSize: FONT_SIZES.includes(parsed.fontSize)
        ? parsed.fontSize
        : DEFAULT_STATE.fontSize
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writeState(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        enabled: state.enabled,
        colorScheme: state.colorScheme,
        fontSize: state.fontSize
      })
    );
      } catch {
      }
}

function bindTabFocusOutline() {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    document.body.classList.add('user-is-tabbing');
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('user-is-tabbing');
  });
}

function isMobileViewport() {
  return window.matchMedia(MOBILE_NAV_MQ).matches;
}

function getPanel(menu) {
  return menu?._a11yPanel || menu?.querySelector('[data-a11y-panel]') || null;
}

function syncBodyPanelState() {
  const hasOpenPanel = Boolean(document.querySelector('[data-a11y-panel]:not([hidden])'));
  document.body.classList.toggle('is-a11y-panel-open', hasOpenPanel);
}

export const AccessibilityManager = {
  state: { ...DEFAULT_STATE },
  _bound: false,

  init() {
    bindTabFocusOutline();
    this.state = readState();
    this.applySettings();
    this.bindEvents();
    this.syncControls();
  },

  isEnabled() {
    return Boolean(this.state.enabled);
  },

  applySettings() {
    const root = document.documentElement;

    if (!this.state.enabled) {
      root.removeAttribute('data-accessibility');
      root.removeAttribute('data-color-scheme');
      root.removeAttribute('data-font-size');
      document.dispatchEvent(new CustomEvent('accessibilityChanged', {
        detail: { enabled: false }
      }));
      return;
    }

    root.setAttribute('data-accessibility', 'active');
    root.setAttribute('data-color-scheme', this.state.colorScheme);
    root.setAttribute('data-font-size', this.state.fontSize);
    document.dispatchEvent(new CustomEvent('accessibilityChanged', {
      detail: { enabled: true, ...this.state }
    }));
  },

  persist() {
    writeState(this.state);
    this.applySettings();
    this.syncControls();
  },

  setEnabled(enabled) {
    this.state.enabled = Boolean(enabled);
    this.persist();
  },

  toggleEnabled() {
    this.setEnabled(!this.state.enabled);
  },

  setColorScheme(scheme) {
    if (!COLOR_SCHEMES.includes(scheme)) return;
    this.state.colorScheme = scheme;
    if (!this.state.enabled) this.state.enabled = true;
    this.persist();
  },

  setFontSize(size) {
    if (!FONT_SIZES.includes(size)) return;
    this.state.fontSize = size;
    if (!this.state.enabled) this.state.enabled = true;
    this.persist();
  },

  openPanel(menu) {
    const panel = getPanel(menu);
    const toggle = menu?.querySelector('[data-a11y-menu-toggle]');
    if (!panel || !toggle) return;

    document.querySelectorAll('[data-a11y-menu]').forEach((other) => {
      if (other === menu) return;
      this.closePanel(other);
    });

    if (isMobileViewport()) {
      this.ensureMobilePanel(menu, panel);
    }

    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    menu.classList.add('is-open');
    syncBodyPanelState();
  },

  closePanel(menu) {
    const panel = getPanel(menu);
    const toggle = menu?.querySelector('[data-a11y-menu-toggle]');
    if (panel) panel.hidden = true;
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    menu?.classList.remove('is-open');
    syncBodyPanelState();
  },

  ensureMobilePanel(menu, panel) {
    if (!menu || !panel || panel.dataset.a11yPortaled === 'true') return;

    menu._a11yPanel = panel;
    menu._a11yPanelHome = {
      parent: panel.parentNode,
      nextSibling: panel.nextSibling
    };

    document.body.appendChild(panel);
    panel.dataset.a11yPortaled = 'true';
    panel.classList.add('a11y-menu__panel--mobile');
  },

  togglePanel(menu) {
    const panel = getPanel(menu);
    if (!panel) return;
    if (panel.hidden) this.openPanel(menu);
    else this.closePanel(menu);
  },

  bindMenuToggles() {
    document.querySelectorAll('[data-a11y-menu-toggle]').forEach((toggle) => {
      if (toggle.dataset.a11yMenuBound === 'true') return;
      toggle.dataset.a11yMenuBound = 'true';

      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const menu = toggle.closest('[data-a11y-menu]');
        this.togglePanel(menu);
      });
    });
  },

  bindEvents() {
    if (this._bound) return;
    this._bound = true;

    this.bindMenuToggles();

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-a11y-menu-toggle]')) {
        return;
      }

      const enableBtn = event.target.closest('[data-a11y-toggle]');
      if (enableBtn) {
        event.preventDefault();
        this.toggleEnabled();
        return;
      }

      const schemeBtn = event.target.closest('[data-a11y-scheme]');
      if (schemeBtn) {
        event.preventDefault();
        this.setColorScheme(schemeBtn.getAttribute('data-a11y-scheme'));
        return;
      }

      const fontBtn = event.target.closest('[data-a11y-font]');
      if (fontBtn) {
        event.preventDefault();
        this.setFontSize(fontBtn.getAttribute('data-a11y-font'));
        return;
      }

      if (!event.target.closest('[data-a11y-menu]') && !event.target.closest('[data-a11y-panel]')) {
        document.querySelectorAll('[data-a11y-menu]').forEach((menu) => {
          this.closePanel(menu);
        });
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('[data-a11y-menu]').forEach((menu) => {
        this.closePanel(menu);
      });
    });

    document.addEventListener('languageChanged', () => this.syncControls());
  },

  syncControls() {
    const { enabled, colorScheme, fontSize } = this.state;
    const statusText = enabled ? t('a11y.statusOn') : t('a11y.statusOff');
    const menuLabel = t('a11y.menuOpen');

    document.querySelectorAll('[data-a11y-menu-toggle]').forEach((button) => {
      button.setAttribute('aria-label', menuLabel);
      button.title = menuLabel;
      button.setAttribute('data-i18n-aria', 'a11y.menuOpen');
    });

    document.querySelectorAll('[data-a11y-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', String(enabled));
      button.classList.toggle('is-active', enabled);

      const label = button.querySelector('[data-i18n="a11y.enable"]');
      if (label) label.textContent = t('a11y.enable');

      const status = button.querySelector('[data-a11y-status]');
      if (status) status.textContent = statusText;
    });

    document.querySelectorAll('[data-accessibility-panel]').forEach((block) => {
      block.hidden = !enabled;
    });

    document.querySelectorAll('[data-a11y-scheme]').forEach((button) => {
      const scheme = button.getAttribute('data-a11y-scheme');
      const isActive = enabled && scheme === colorScheme;
      button.setAttribute('aria-pressed', String(isActive));
      button.classList.toggle('is-active', isActive);

      const labelKey =
        scheme === 'black-yellow'
          ? 'a11y.scheme.blackYellow'
          : 'a11y.scheme.whiteBlack';
      const label = t(labelKey);
      button.setAttribute('aria-label', label);
      button.title = label;
      button.setAttribute('data-i18n-aria', labelKey);

      const text = button.querySelector('[data-a11y-scheme-text]');
      if (text) text.textContent = label;
    });

    document.querySelectorAll('[data-a11y-font]').forEach((button) => {
      const size = button.getAttribute('data-a11y-font');
      const isActive = enabled && size === fontSize;
      button.setAttribute('aria-pressed', String(isActive));
      button.classList.toggle('is-active', isActive);

      const labelKey = size === 'large' ? 'a11y.font.large' : 'a11y.font.normal';
      const label = t(labelKey);
      button.setAttribute('aria-label', label);
      button.title = label;
      button.setAttribute('data-i18n-aria', labelKey);

      const text = button.querySelector('[data-a11y-font-text]');
      if (text) text.textContent = label;
    });

    document.querySelectorAll('[data-a11y-scheme-label]').forEach((el) => {
      el.textContent = t('a11y.schemeLabel');
    });
    document.querySelectorAll('[data-a11y-font-label]').forEach((el) => {
      el.textContent = t('a11y.fontLabel');
    });
  }
};
