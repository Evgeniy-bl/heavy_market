const BASE = '../';

export function getFooterHtml(page = '') {
  if (page === 'login' || page === 'register') {
    return getAuthFooterHtml();
  }

  if (page === 'admin') {
    return '';
  }

  return getStandardFooterHtml();
}

function getStandardFooterHtml() {
  return `
  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div>
          <p class="footer__brand-name">HEAVY</p>
          <p class="footer__brand-desc" data-i18n="footer.brandDesc">Маркетплейс коммерческого транспорта и тяжёлой техники</p>
        </div>
        <div class="footer__col">
          <p class="footer__col-title" data-i18n="footer.buyer">Покупателю</p>
          <div class="footer__links-row">
            <a href="about.html" class="footer__link" data-i18n="footer.about">Контакты</a>
            <a href="about.html#contacts" class="footer__link" data-i18n="footer.support">Служба поддержки</a>
            <a href="seller.html" class="footer__link" data-i18n="footer.seller">Стать продавцом</a>
          </div>
        </div>
        <div>
          <p class="footer__col-title" data-i18n="footer.follow">Следите за нами</p>
          <div class="footer__socials">
            <a href="#" aria-label="Facebook"><img src="${BASE}assets/icons/facebook.svg" alt="" width="32" height="32"></a>
            <a href="#" aria-label="Instagram"><img src="${BASE}assets/icons/instagram.svg" alt="" width="32" height="32"></a>
            <a href="#" aria-label="YouTube"><img src="${BASE}assets/icons/youtube.svg" alt="" width="32" height="32"></a>
          </div>
        </div>
      </div>
      <div class="footer__bottom">
        <p data-i18n="footer.copy">© 2019–2026 Группа компаний «Heavy Market»</p>
      </div>
    </div>
  </footer>`;
}

function getAuthFooterHtml() {
  return `
  <footer class="footer footer--auth">
    <div class="container">
      <div class="footer__bottom">
        <p data-i18n="footer.copy">© 2019–2026 Группа компаний «Heavy Market»</p>
      </div>
    </div>
  </footer>`;
}

export function injectFooter() {
  const placeholder = document.querySelector('[data-site-footer]');
  if (!placeholder) return;

  const page = document.body?.dataset?.page || '';
  const html = getFooterHtml(page);
  if (!html) {
    placeholder.remove();
    return;
  }

  placeholder.outerHTML = html;
}

injectFooter();
