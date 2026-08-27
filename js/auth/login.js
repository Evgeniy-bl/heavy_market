import '../components/header.js';
import '../components/footer.js';
import '../common/i18n.js';
import { API } from '../api.js';
import { t } from '../common/i18n.js';
import Modal from '../components/modal.js';
import { AccessibilityManager } from '../common/accessibility.js';
import { ThemeManager } from '../common/theme.js';
import {
  clearError,
  validateIdentifierField,
  validateRequired,
  phoneToDigits
} from './validation.js';
import { saveLoginSession, getRedirectPath } from './session.js';

const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('loginSubmit');
const errorText = document.querySelector('[data-login-error-text]');

function init() {
  Modal.init();
  AccessibilityManager.init();
  ThemeManager.init();
  bindEvents();
}

function bindEvents() {
  form?.addEventListener('submit', handleSubmit);

  form?.querySelectorAll('input').forEach((input) => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => clearError(input));
  });

  form?.querySelectorAll('[data-password-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.password-input-wrapper')?.querySelector('input');
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(isPassword));
    });
  });
}

function validateField(field) {
  if (field.name === 'identifier') return validateIdentifierField(field);
  if (field.name === 'password') return validateRequired(field);
  return true;
}

function validateForm() {
  const identifier = form.querySelector('[name="identifier"]');
  const password = form.querySelector('[name="password"]');
  const okId = validateIdentifierField(identifier);
  const okPass = validateRequired(password);
  return okId && okPass;
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!validateForm()) return;

  const identifier = form.identifier.value.trim();
  const password = form.password.value;
  const remember = form.rememberMe.checked;

  submitBtn.disabled = true;

  try {
    const users = await API.getUsers();
    const phoneDigits = phoneToDigits(identifier);
    const user = users.find((item) => {
      const matchEmail = item.email === identifier;
      const matchPhone = item.phone === phoneDigits || item.phone === identifier.replace(/\D/g, '');
      return (matchEmail || matchPhone) && item.password === password;
    });

    if (!user) {
      showLoginError(t('auth.login.errorText'));
      return;
    }

    saveLoginSession(user, remember);
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    if (redirect && !redirect.includes('://') && !redirect.startsWith('/')) {
      window.location.href = redirect;
      return;
    }
    window.location.href = getRedirectPath(user, true);
  } catch {
    showLoginError(t('auth.login.errorText'));
  } finally {
    submitBtn.disabled = false;
  }
}

function showLoginError(message) {
  if (errorText) errorText.textContent = message;
  Modal.open('login-error');
}

init();
