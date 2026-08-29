import { API } from '../api.js';
import { t } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';
import {
  checkAuth,
  logout,
  saveLoginSession,
  saveFullUser,
  resolveAuthPath
} from '../auth/session.js';
import { formatPhoneInput, phoneToDigits, validateEmailField, validatePasswordField } from '../auth/validation.js';
import { refreshMessagesTabBadge } from '../utils/messages-badge.js';
import { applyProfileTabs } from '../utils/profile-tabs.js';
import { isAdmin, isSeller, getSellerDisplayName } from '../utils/user-role.js';
import { alertDialog } from '../components/alert.js';

let currentUser = null;

function formatPhoneDisplay(digits) {
  if (!digits) return '';
  return formatPhoneInput(digits.startsWith('375') ? `+${digits}` : digits);
}

function getDisplayName(user) {
  if (isSeller(user)) return getSellerDisplayName(user);
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.nickname || user.email;
}

function bindAccordions() {
  document.querySelectorAll('[data-profile-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('.profile-card');
      const isOpen = card?.classList.toggle('is-open');
      button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });
}

function bindLogout() {
  document.querySelector('[data-profile-logout]')?.addEventListener('click', () => {
    logout();
    window.location.href = resolveAuthPath('login.html');
  });
}

function fillForm(user) {
  const title = document.querySelector('.profile-head__title');
  if (title) {
    title.textContent = `${t('profile.profileLabel')} ${getDisplayName(user)}`;
  }
  document.getElementById('profile-current-email').textContent = user.email || '';
  document.getElementById('profile-email-input').value = user.email || '';
  document.getElementById('profile-first-name').value = user.firstName || '';
  document.getElementById('profile-last-name').value = user.lastName || '';

  const phoneField = document.getElementById('profile-phone');
  if (phoneField) {
    phoneField.value = formatPhoneDisplay(user.phone || '');
  }

  const companyGroup = document.getElementById('profile-company-group');
  const companyField = document.getElementById('profile-company-name');
  const hint = document.querySelector('.profile-card__hint');
  const isCompany = isSeller(user) && user.sellerType === 'company';

  if (companyGroup) {
    companyGroup.hidden = !isCompany;
  }
  if (companyField) {
    if (isCompany) {
      companyField.value = user.companyName || '';
    } else {
      companyField.value = '';
    }
  }
  if (hint) {
    hint.dataset.i18n = isSeller(user) ? 'profile.sellerContactHint' : 'profile.contactHint';
    hint.textContent = t(hint.dataset.i18n);
  }
}

async function persistUser(updated) {
  currentUser = updated;
  fillForm(updated);
  applyProfileTabs();

  const remember = Boolean(localStorage.getItem('currentUser'));
  if (remember) {
    saveFullUser(updated);
  } else {
    saveLoginSession(updated, false);
  }
}

async function loadProfile() {
  const session = checkAuth();
  if (!session) return null;

  if (isAdmin(session)) {
    window.location.href = 'admin.html';
    return null;
  }

  currentUser = await API.getUserById(session.id);
  applyProfileTabs();
  fillForm(currentUser);
  await refreshMessagesTabBadge(currentUser);
  return currentUser;
}

async function saveEmail() {
  const input = document.getElementById('profile-email-input');
  if (!validateEmailField(input)) return;

  const email = input.value.trim();
  const updated = await API.updateUser(currentUser.id, { email });
  await persistUser(updated);
  alertDialog({ message: t('profile.saved'), type: 'success' });
}

async function savePassword() {
  const input = document.getElementById('profile-password-input');
  if (!validatePasswordField(input)) return;

  const password = input.value;
  const updated = await API.updateUser(currentUser.id, { password });
  currentUser = updated;
  input.value = '';
  alertDialog({ message: t('profile.saved'), type: 'success' });
}

async function saveContact() {
  const firstName = document.getElementById('profile-first-name').value.trim();
  const lastName = document.getElementById('profile-last-name').value.trim();
  const phoneInput = document.getElementById('profile-phone');
  const phone = phoneInput ? phoneToDigits(phoneInput.value) : currentUser.phone;
  const companyField = document.getElementById('profile-company-name');
  const isCompany = isSeller(currentUser) && currentUser.sellerType === 'company';
  const companyName = isCompany ? companyField?.value.trim() || '' : null;

  if (!firstName || !lastName) {
    alertDialog({ message: t('validation.required'), type: 'error' });
    return;
  }

  if (isCompany && !companyName) {
    alertDialog({ message: t('validation.required'), type: 'error' });
    return;
  }

  const patch = { firstName, lastName, phone };
  if (isCompany) patch.companyName = companyName;

  const updated = await API.updateUser(currentUser.id, patch);

  if (currentUser.sellerId) {
    await API.updateSeller(currentUser.sellerId, {
      name: getSellerDisplayName({ ...updated, companyName: companyName ?? updated.companyName }),
      phone: formatPhoneDisplay(phone)
    });
  }

  await persistUser(updated);
  alertDialog({ message: t('profile.saved'), type: 'success' });
}

function bindForms() {
  document.querySelector('[data-save-email]')?.addEventListener('click', async () => {
    try {
      await saveEmail();
    } catch {
      alertDialog({ message: t('profile.saveError'), type: 'error' });
    }
  });

  document.querySelector('[data-save-password]')?.addEventListener('click', async () => {
    try {
      await savePassword();
    } catch {
      alertDialog({ message: t('profile.saveError'), type: 'error' });
    }
  });

  document.querySelector('[data-save-contact]')?.addEventListener('click', async () => {
    try {
      await saveContact();
    } catch {
      alertDialog({ message: t('profile.saveError'), type: 'error' });
    }
  });

  document.getElementById('profile-phone')?.addEventListener('input', (event) => {
    event.target.value = formatPhoneInput(event.target.value);
  });
}

async function init() {
  try {
    await loadProfile();
    bindAccordions();
    bindLogout();
    bindForms();
  } finally {
    markContentReady();
  }
}

init();
