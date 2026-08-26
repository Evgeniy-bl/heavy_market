const BASE = '../';

const CHECK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17.5 19 7.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function a11yMenuHtml() {
  return `
        <div class="a11y-menu" data-a11y-menu>
          <button
            type="button"
            class="a11y-menu__toggle"
            data-a11y-menu-toggle
            aria-expanded="false"
            aria-haspopup="dialog"
            data-i18n-aria="a11y.menuOpen"
            aria-label="Настройки для слабовидящих"
            title="Настройки для слабовидящих"
          >
            <span class="a11y-menu__toggle-mark" aria-hidden="true"><span>A</span><span>a</span></span>
          </button>
          <div class="a11y-menu__panel" data-a11y-panel hidden role="dialog" aria-label="Настройки для слабовидящих">
            <div class="a11y-sheet__block">
              <p class="a11y-sheet__title" data-i18n="a11y.enable">Версия для слабовидящих</p>
              <button type="button" class="a11y-switch" data-a11y-toggle aria-pressed="false">
                <span class="a11y-switch__track" aria-hidden="true"><span class="a11y-switch__thumb"></span></span>
                <span class="a11y-switch__text">
                  <span class="a11y-switch__label" data-i18n="a11y.enable">Версия для слабовидящих</span>
                  <span class="a11y-switch__status" data-a11y-status>Выключено</span>
                </span>
              </button>
            </div>
            <div data-accessibility-panel hidden>
              <fieldset class="a11y-section">
                <legend class="a11y-section__legend" data-a11y-scheme-label data-i18n="a11y.schemeLabel">Цветовая схема</legend>
                <div class="a11y-options" role="group">
                  <button type="button" class="a11y-option" data-a11y-scheme="white-black" data-i18n-aria="a11y.scheme.whiteBlack" aria-label="Белый / чёрный" title="Белый / чёрный">
                    <span class="a11y-option__swatch a11y-option__swatch--wb" aria-hidden="true"></span>
                    <span class="a11y-option__text" data-a11y-scheme-text>Белый / чёрный</span>
                    <span class="a11y-option__check" aria-hidden="true">${CHECK_ICON}</span>
                  </button>
                  <button type="button" class="a11y-option" data-a11y-scheme="black-yellow" data-i18n-aria="a11y.scheme.blackYellow" aria-label="Чёрный / жёлтый" title="Чёрный / жёлтый">
                    <span class="a11y-option__swatch a11y-option__swatch--by" aria-hidden="true"></span>
                    <span class="a11y-option__text" data-a11y-scheme-text>Чёрный / жёлтый</span>
                    <span class="a11y-option__check" aria-hidden="true">${CHECK_ICON}</span>
                  </button>
                </div>
              </fieldset>
              <fieldset class="a11y-section">
                <legend class="a11y-section__legend" data-a11y-font-label data-i18n="a11y.fontLabel">Размер шрифта</legend>
                <div class="a11y-options" role="group">
                  <button type="button" class="a11y-option a11y-option--font" data-a11y-font="normal" data-i18n-aria="a11y.font.normal" aria-label="Обычный" title="Обычный">
                    <span class="a11y-option__sample a11y-option__sample--normal" aria-hidden="true">A</span>
                    <span class="a11y-option__text" data-a11y-font-text>Обычный</span>
                    <span class="a11y-option__check" aria-hidden="true">${CHECK_ICON}</span>
                  </button>
                  <button type="button" class="a11y-option a11y-option--font" data-a11y-font="large" data-i18n-aria="a11y.font.large" aria-label="Крупный" title="Крупный">
                    <span class="a11y-option__sample a11y-option__sample--large" aria-hidden="true">A</span>
                    <span class="a11y-option__text" data-a11y-font-text>Крупный</span>
                    <span class="a11y-option__check" aria-hidden="true">${CHECK_ICON}</span>
                  </button>
                </div>
              </fieldset>
            </div>
          </div>
        </div>`;
}

function themeToggleHtml() {
  return `
        <button
          type="button"
          class="theme-toggle"
          data-theme-toggle
          data-theme="light"
          aria-pressed="false"
          data-i18n-aria="header.themeToDark"
          aria-label="Включить тёмную тему"
          title="Включить тёмную тему"
        >
          <span class="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
              <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 7 7 0 1 0 20.5 14.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
            </svg>
          </span>
          <span class="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/>
              <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.05 5.05l1.56 1.56M17.39 17.39l1.56 1.56M18.95 5.05l-1.56 1.56M6.61 17.39l-1.56 1.56" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
          </span>
        </button>`;
}

function langDropdownHtml() {
  return `
        <div class="lang-dropdown" data-lang-dropdown>
          <button type="button" class="lang-dropdown__toggle" aria-expanded="false" aria-haspopup="listbox" data-i18n-aria="header.langAria">
            <img class="lang-dropdown__icon" src="${BASE}assets/icons/globe.svg" alt="" width="20" height="20" aria-hidden="true">
            <span class="lang-dropdown__current" data-lang-current>RU</span>
          </button>
          <div class="lang-dropdown__panel" hidden role="listbox">
            <button type="button" class="lang-dropdown__option lang-dropdown__option--active" data-lang="ru" role="option" aria-pressed="true">RU</button>
            <button type="button" class="lang-dropdown__option" data-lang="be" role="option" aria-pressed="false">BE</button>
            <button type="button" class="lang-dropdown__option" data-lang="en" role="option" aria-pressed="false">EN</button>
          </div>
        </div>`;
}

function standardNavLinksHtml(page) {
  const aboutActive = page === 'about'
    ? ' header__link--contacts is-active" aria-current="page"'
    : ' header__link--contacts"';

  return `
        <a href="catalog.html" class="header__link" data-i18n="header.catalog">Каталог</a>
        <a href="about.html" class="header__link${aboutActive} data-i18n="header.about">Контакты</a>
        <a href="#" class="header__link header__link--accent" data-user-menu data-i18n="header.profile">Мой профиль</a>`;
}

export function getHeaderHtml(page = '') {
  if (page === 'login' || page === 'register') {
    return getAuthHeaderHtml(page);
  }

  if (page === 'admin') {
    return getAdminHeaderHtml();
  }

  return getStandardHeaderHtml(page);
}

function getStandardHeaderHtml(page) {
  return `
  <header class="header">
    <div class="container header__inner">
      <a href="${BASE}index.html" class="header__logo">HEAVY</a>
      <nav class="header__nav">
        ${a11yMenuHtml()}
        ${themeToggleHtml()}
        ${langDropdownHtml()}
        ${standardNavLinksHtml(page)}
      </nav>
      <div class="header__actions">
        <a href="seller.html" class="btn btn--secondary" data-become-seller data-i18n="header.becomeSeller">Стать продавцом</a>
      </div>
    </div>
  </header>`;
}

function getAdminHeaderHtml() {
  return `
  <header class="header">
    <div class="container header__inner">
      <a href="${BASE}index.html" class="header__logo">HEAVY</a>
      <nav class="header__nav">
        ${a11yMenuHtml()}
        ${themeToggleHtml()}
        ${langDropdownHtml()}
        <a href="catalog.html" class="header__link" data-i18n="header.catalog">Каталог</a>
        <a href="admin.html" class="header__link header__link--accent" data-i18n="admin.nav">Админ</a>
        <button type="button" class="header__link" data-admin-logout data-i18n="admin.logout">Выйти</button>
      </nav>
    </div>
  </header>`;
}

function getAuthHeaderHtml(page) {
  const authLink = page === 'login'
    ? `<a href="register.html" class="header__auth-link" data-i18n="auth.login.noAccount">Нет аккаунта? Регистрация</a>`
    : '';

  return `
  <header class="header header--auth">
    <div class="container header__inner">
      <a href="${BASE}index.html" class="header__logo">HEAVY</a>
      ${a11yMenuHtml()}
      ${themeToggleHtml()}
      ${authLink}
    </div>
  </header>`;
}

export function injectHeader() {
  const placeholder = document.querySelector('[data-site-header]');
  if (!placeholder) return;

  const page = document.body?.dataset?.page || '';
  placeholder.outerHTML = getHeaderHtml(page);
}

injectHeader();
