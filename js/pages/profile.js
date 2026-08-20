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
import Modal from '../components/modal.js';

let currentUser = null;

function formatPhoneDisplay(digits) {
  if (!digits) return '';
  return formatPhoneInput(digits.startsWith('375') ? `+${digits}` : digits);
}

function getDisplayName(user) {
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
}

async function loadProfile() {
  const session = checkAuth();
  if (!session) return null;

  if (session.role === 'landlord') {
    window.location.href = 'landlord-profile.html';
    return null;
  }

  if (session.role === 'admin') {
    window.location.href = 'admin.html';
    return null;
  }

  currentUser = await API.getUserById(session.id);
  fillForm(currentUser);
  return currentUser;
}

async function saveEmail() {
  const input = document.getElementById('profile-email-input');
  if (!validateEmailField(input)) return;

  const email = input.value.trim();
  const updated = await API.updateUser(currentUser.id, { email });
  currentUser = updated;
  document.getElementById('profile-current-email').textContent = updated.email;

  const remember = Boolean(localStorage.getItem('currentUser'));
  if (remember) {
    saveFullUser(updated);
  } else {
    saveLoginSession(updated, false);
  }

  Modal.showSuccess(t('profile.saved'));
}

async function savePassword() {
  const input = document.getElementById('profile-password-input');
  if (!validatePasswordField(input)) return;

  const password = input.value;
  const updated = await API.updateUser(currentUser.id, { password });
  currentUser = updated;
  input.value = '';
  Modal.showSuccess(t('profile.saved'));
}

async function saveContact() {
  const firstName = document.getElementById('profile-first-name').value.trim();
  const lastName = document.getElementById('profile-last-name').value.trim();
  const phoneInput = document.getElementById('profile-phone');
  const phone = phoneInput ? phoneToDigits(phoneInput.value) : currentUser.phone;

  if (!firstName || !lastName) {
    Modal.showError(t('validation.required'));
    return;
  }

  const updated = await API.updateUser(currentUser.id, {
    firstName,
    lastName,
    phone
  });

  currentUser = updated;
  fillForm(updated);

  const remember = Boolean(localStorage.getItem('currentUser'));
  if (remember) {
    saveFullUser(updated);
  } else {
    saveLoginSession(updated, false);
  }

  Modal.showSuccess(t('profile.saved'));
}

function bindForms() {
  document.querySelector('[data-save-email]')?.addEventListener('click', async () => {
    try {
      await saveEmail();
    } catch {
      Modal.showError(t('profile.saveError'));
    }
  });

  document.querySelector('[data-save-password]')?.addEventListener('click', async () => {
    try {
      await savePassword();
    } catch {
      Modal.showError(t('profile.saveError'));
    }
  });

  document.querySelector('[data-save-contact]')?.addEventListener('click', async () => {
    try {
      await saveContact();
    } catch {
      Modal.showError(t('profile.saveError'));
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
