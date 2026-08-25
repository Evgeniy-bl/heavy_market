import { t } from './i18n.js';
import { AccessibilityManager } from './accessibility.js';

const STORAGE_KEY = 'theme';

function normalizeTheme(value) {
  return value === 'dark' ? 'dark' : 'light';
}

export const ThemeManager = {
  get() {
    return normalizeTheme(document.documentElement.dataset.theme);
  },

  isLocked() {
    return (
      document.documentElement.dataset.accessibility === 'active' ||
      AccessibilityManager.isEnabled()
    );
  },

  apply(theme, { persist = true } = {}) {
    if (this.isLocked()) {
      this.syncToggles();
      return this.get();
    }

    const next = normalizeTheme(theme);
    document.documentElement.dataset.theme = next;
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
      }
    }
    this.syncToggles();
    document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: next } }));
    return next;
  },

  toggle() {
    if (this.isLocked()) return this.get();
    return this.apply(this.get() === 'dark' ? 'light' : 'dark');
  },

  syncToggles() {
    const theme = this.get();
    const isDark = theme === 'dark';
    const locked = this.isLocked();
    const labelKey = isDark ? 'header.themeToLight' : 'header.themeToDark';
    const label = t(labelKey);

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(isDark));
      btn.dataset.theme = theme;
      btn.setAttribute('data-i18n-aria', labelKey);
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.disabled = locked;
      btn.setAttribute('aria-disabled', String(locked));
    });
  },

  bindToggles() {
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      if (btn.dataset.themeBound === 'true') return;
      btn.dataset.themeBound = 'true';
      btn.addEventListener('click', () => this.toggle());
    });
  },

  init() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }

    if (saved === 'dark' || saved === 'light') {
      document.documentElement.dataset.theme = saved;
    } else if (!document.documentElement.dataset.theme) {
      document.documentElement.dataset.theme = 'light';
    }

    this.bindToggles();
    this.syncToggles();

    document.addEventListener('languageChanged', () => this.syncToggles());
    document.addEventListener('accessibilityChanged', () => this.syncToggles());
  }
};
