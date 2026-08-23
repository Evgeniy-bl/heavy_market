import { translations } from './translations.js';

const i18n = {
  currentLang: 'ru',
  translations,

  init() {
    const savedLang = localStorage.getItem('language') || 'ru';
    this.currentLang = savedLang;
    document.documentElement.lang = savedLang;
    this.translatePage();
    this.bindLangSwitcher();
    this.bindLangDropdown();
    this.updateLangSwitcher();
  },

  setLanguage(lang) {
    if (!this.translations[lang]) return;
    this.currentLang = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    this.translatePage();
    this.updateLangSwitcher();
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  },

  t(key) {
    const dict = this.translations[this.currentLang] || {};
    return dict[key] ?? this.translations.ru[key] ?? key;
  },

  translatePage() {
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.t(key);
    });

    document.querySelectorAll('[data-i18n-html]').forEach((element) => {
      const key = element.getAttribute('data-i18n-html');
      element.innerHTML = this.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
    });

    document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
      const key = element.getAttribute('data-i18n-aria');
      element.setAttribute('aria-label', this.t(key));
    });

    document.querySelectorAll('[data-i18n-title]').forEach((element) => {
      const key = element.getAttribute('data-i18n-title');
      element.setAttribute('title', this.t(key));
    });

    document.querySelectorAll('[data-i18n-alt]').forEach((element) => {
      const key = element.getAttribute('data-i18n-alt');
      element.setAttribute('alt', this.t(key));
    });

    document.querySelectorAll('[data-i18n-cat]').forEach((element) => {
      const key = element.getAttribute('data-i18n-cat');
      element.textContent = this.t(key);
    });

    const pageTitleMeta = document.querySelector('[data-i18n-page-title]');
    if (pageTitleMeta) {
      document.title = this.t(pageTitleMeta.getAttribute('data-i18n-page-title'));
    } else {
      const page = document.body?.dataset?.page;
      if (page === 'catalog') {
        document.title = this.t('page.catalogTitle');
      } else if (page === 'home') {
        document.title = this.t('page.title');
      } else if (page === 'product') {
        document.title = this.t('page.productTitle');
      } else if (page === 'cart') {
        document.title = this.t('page.cartTitle');
      } else if (page === 'seller') {
        document.title = this.t('page.sellerTitle');
      } else if (page === 'profile') {
        document.title = this.t('page.profileTitle');
      } else if (page === 'messages') {
        document.title = this.t('page.messagesTitle');
      } else if (page === 'favorites') {
        document.title = this.t('page.favoritesTitle');
      } else if (page === 'about') {
        document.title = this.t('page.aboutTitle');
      }
    }
  },

  bindLangSwitcher() {
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      if (btn.dataset.i18nBound === 'true') {
        return;
      }

      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        this.setLanguage(lang);
        this.closeLangDropdowns();
      });
      btn.dataset.i18nBound = 'true';
    });
  },

  bindLangDropdown() {
    document.querySelectorAll('[data-lang-dropdown]').forEach((root) => {
      if (root.dataset.langDropdownReady === 'true') {
        return;
      }

      root.dataset.langDropdownReady = 'true';

      const toggle = root.querySelector('.lang-dropdown__toggle');
      const panel = root.querySelector('.lang-dropdown__panel');

      if (!toggle || !panel) {
        return;
      }

      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        this.closeLangDropdowns(isOpen ? null : root);

        if (!isOpen) {
          toggle.setAttribute('aria-expanded', 'true');
          panel.hidden = false;
          root.classList.add('lang-dropdown--open');
        }
      });
    });

    if (this.langDropdownBound) {
      return;
    }

    this.langDropdownBound = true;

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-lang-dropdown]')) {
        return;
      }

      this.closeLangDropdowns();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeLangDropdowns();
      }
    });
  },

  closeLangDropdowns(except = null) {
    document.querySelectorAll('[data-lang-dropdown]').forEach((root) => {
      if (root === except) {
        return;
      }

      const toggle = root.querySelector('.lang-dropdown__toggle');
      const panel = root.querySelector('.lang-dropdown__panel');

      toggle?.setAttribute('aria-expanded', 'false');
      if (panel) {
        panel.hidden = true;
      }
      root.classList.remove('lang-dropdown--open');
    });
  },

  updateLangSwitcher() {
    const current = this.currentLang.toUpperCase();

    document.querySelectorAll('[data-lang-current]').forEach((el) => {
      el.textContent = current;
    });

    document.querySelectorAll('[data-lang]').forEach((btn) => {
      const isActive = btn.getAttribute('data-lang') === this.currentLang;
      btn.setAttribute('aria-pressed', String(isActive));
      btn.classList.toggle('lang-dropdown__option--active', isActive);
    });
  }
};

export function t(key) {
  return i18n.t(key);
}

export function getLang() {
  return i18n.currentLang;
}

export function formatPrice(price) {
  const formatted = Number(price).toLocaleString('ru-RU').replace(/\s/g, ' ');
  return `${formatted}${i18n.t('common.currency')}`;
}

export default i18n;

if (typeof window !== 'undefined') {
  window.i18n = i18n;
  i18n.init();
}
