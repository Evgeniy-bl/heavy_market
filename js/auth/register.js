import '../components/header.js';
import '../components/footer.js';
import '../common/i18n.js';
import { API } from '../api.js';
import { t } from '../common/i18n.js';
import { AccessibilityManager } from '../common/accessibility.js';
import { ThemeManager } from '../common/theme.js';
import {
  clearError,
  validateRequired,
  validateEmailField,
  validatePhoneField,
  validateNameField,
  validateBirthDateField,
  validatePasswordField,
  validatePasswordMatch,
  validateNicknameField,
  validateAgreementField,
  formatPhoneInput,
  phoneToDigits
} from './validation.js';
import { getPasswordRuleErrors } from './register-rules.js';
import { saveFullUser, resolveAuthPath, getCurrentUser, getProfilePath } from './session.js';
import Modal from '../components/modal.js';

const form = document.getElementById('registerForm');
const submitBtn = document.getElementById('registerSubmit');
const successName = document.querySelector('[data-register-success-name]');
const goToProfileBtn = document.getElementById('goToProfile');

const ADJECTIVES = ['happy', 'swift', 'bold', 'calm', 'bright', 'lucky', 'smart', 'rapid'];
const NOUNS = ['wolf', 'bear', 'eagle', 'tiger', 'fox', 'hawk', 'lion', 'panda'];

let nicknameAttempts = 0;
let passwordMethod = 'manual';
let registrationSucceeded = false;

function init() {
  Modal.init();
  AccessibilityManager.init();
  ThemeManager.init();

  const counter = document.getElementById('nicknameAttempts');
  if (counter) {
    counter.textContent = t('auth.register.nicknameAttempts').replace('{count}', '0');
  }

  togglePasswordMethod('manual');
  bindEvents();
}

function bindEvents() {
  form?.addEventListener('submit', handleSubmit);

  form?.querySelectorAll('input, select, textarea').forEach((input) => {
    input.addEventListener('blur', () => {
      if (input.name === 'birthDate') return;
      validateField(input);
    });
    input.addEventListener('input', () => {
      clearError(input);
      if (input.name === 'phone') {
        input.value = formatPhoneInput(input.value);
      }
      if (input.name === 'password') {
        updatePasswordRequirements(input.value);
      }
    });
  });

  form?.querySelectorAll('[name="passwordMethod"]').forEach((radio) => {
    radio.addEventListener('change', () => togglePasswordMethod(radio.value));
  });

  form?.querySelectorAll('[data-password-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.password-input-wrapper')?.querySelector('input');
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  document.getElementById('regeneratePassword')?.addEventListener('click', generateAutoPassword);
  document.getElementById('copyPassword')?.addEventListener('click', copyAutoPassword);
  document.getElementById('generateNickname')?.addEventListener('click', generateNickname);

  goToProfileBtn?.addEventListener('click', () => {
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    const user = getCurrentUser();
    window.location.href = redirect
      ? resolveAuthPath(redirect)
      : getProfilePath(user);
  });

  document.querySelector('[data-register-success-close]')?.addEventListener('click', () => {
    goToProfileBtn?.click();
  });
}

function shouldValidateField(field) {
  if (passwordMethod === 'auto' && (field.name === 'password' || field.name === 'passwordConfirm')) {
    return false;
  }
  if (field.name === 'patronymic' && !field.value.trim()) return false;
  return true;
}

function validateField(field) {
  if (!shouldValidateField(field)) return true;

  switch (field.name) {
    case 'firstName':
    case 'lastName':
      return validateNameField(field);
    case 'patronymic':
      return field.value.trim() ? validateNameField(field) : true;
    case 'birthDate':
      return validateBirthDateField(field);
    case 'phone':
      return validatePhoneField(field);
    case 'email':
      return validateEmailField(field);
    case 'password':
      return validatePasswordField(field);
    case 'passwordConfirm': {
      const password = form.querySelector('[name="password"]');
      return validatePasswordMatch(password, field);
    }
    case 'nickname':
      return validateNicknameField(field);
    case 'agreement':
      return validateAgreementField(field);
    default:
      return validateRequired(field);
  }
}

function validateForm() {
  const fields = [...form.querySelectorAll('input, select, textarea')];
  let firstInvalid = null;
  let valid = true;

  fields.forEach((field) => {
    if (!shouldValidateField(field)) return;
    const ok = validateField(field);
    if (!ok && !firstInvalid) firstInvalid = field;
    if (!ok) valid = false;
  });

  if (firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstInvalid.focus();
  }

  return valid;
}

function togglePasswordMethod(method) {
  passwordMethod = method;
  const manual = document.getElementById('manualPasswordFields');
  const auto = document.getElementById('autoPasswordFields');
  const password = form.querySelector('[name="password"]');
  const confirm = form.querySelector('[name="passwordConfirm"]');

  if (method === 'manual') {
    manual?.removeAttribute('hidden');
    auto?.setAttribute('hidden', '');
    password?.setAttribute('required', '');
    confirm?.setAttribute('required', '');
  } else {
    manual?.setAttribute('hidden', '');
    auto?.removeAttribute('hidden');
    password?.removeAttribute('required');
    confirm?.removeAttribute('required');
    generateAutoPassword();
  }
}

function updatePasswordRequirements(value) {
  const errors = new Set(getPasswordRuleErrors(value));

  const rules = {
    length: !errors.has('length') && !errors.has('required'),
    uppercase: !errors.has('uppercase') && !errors.has('required'),
    lowercase: !errors.has('lowercase') && !errors.has('required'),
    number: !errors.has('number') && !errors.has('required'),
    special: !errors.has('special') && !errors.has('required'),
    common: !errors.has('common') && !errors.has('required')
  };

  Object.entries(rules).forEach(([key, ok]) => {
    const el = document.querySelector(`[data-requirement="${key}"]`);
    el?.classList.toggle('valid', ok);
  });
}

function generateAutoPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!&*?';
  const all = upper + lower + digits + special;

  const chars = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)]
  ];

  while (chars.length < 12) {
    chars.push(all[Math.floor(Math.random() * all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  const password = chars.join('');
  const field = document.getElementById('autoPassword');
  if (field) field.value = password;
  return password;
}

function copyAutoPassword() {
  const field = document.getElementById('autoPassword');
  if (!field) return;
  field.select();
  document.execCommand('copy');
}

function generateNickname() {
  if (nicknameAttempts >= 5) return;
  nicknameAttempts += 1;
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = String(Math.floor(Math.random() * 900) + 100);
  const field = form.querySelector('[name="nickname"]');
  if (field) {
    field.value = `${adj}${noun}${num}`;
    clearError(field);
  }
  const counter = document.getElementById('nicknameAttempts');
  if (counter) counter.textContent = t('auth.register.nicknameAttempts').replace('{count}', String(nicknameAttempts));
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!validateForm()) return;

  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = t('auth.register.loading');

  try {
    const password = passwordMethod === 'auto'
      ? generateAutoPassword()
      : form.password.value;

    const userData = {
      firstName: form.firstName.value.trim(),
      lastName: form.lastName.value.trim(),
      patronymic: form.patronymic.value.trim() || null,
      birthDate: form.birthDate.value,
      phone: phoneToDigits(form.phone.value),
      email: form.email.value.trim(),
      nickname: form.nickname.value.trim(),
      role: 'user',
      password,
      createdAt: new Date().toISOString(),
      favorites: [],
      bookings: [],
      sellerId: null,
      sellerType: null,
      companyName: null
    };

    const createdUser = await API.createUser(userData);
    saveFullUser(createdUser);
    registrationSucceeded = true;
    showSuccessModal(createdUser.firstName);
  } catch (error) {
    alert(error.message || t('auth.register.error'));
  } finally {
    if (!registrationSucceeded) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}

function showSuccessModal(name) {
  if (successName) {
    successName.removeAttribute('data-i18n');
    successName.textContent = t('auth.register.successText').replace('{name}', name);
  }

  form?.setAttribute('inert', '');
  submitBtn.disabled = true;

  window.setTimeout(() => {
    Modal.open('register-success');
  }, 0);
}

init();
