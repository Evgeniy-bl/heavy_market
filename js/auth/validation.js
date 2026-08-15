import { t } from '../common/i18n.js';

export const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PHONE_RE = /^\+375\s?\(?(29|33|25|44)\)?\s?\d{3}-?\d{2}-?\d{2}$/;
export const NAME_RE = /^[А-Яа-яA-Za-zЁё]{2,}$/;
export const NICKNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function showError(field, message) {
  const group = field.closest('.form-group');
  const errorEl = group?.querySelector(`[data-error="${field.name}"]`);
  if (errorEl) errorEl.textContent = message || '';
  if (group) group.classList.add('form-group--error');
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
}

export function clearError(field) {
  showError(field, '');
  field.closest('.form-group')?.classList.remove('form-group--error');
}

export function validateRequired(field) {
  const value = field.type === 'checkbox' ? field.checked : String(field.value || '').trim();
  if (field.required && !value) {
    showError(field, t('validation.required'));
    return false;
  }
  clearError(field);
  return true;
}

export function validateEmailField(field) {
  const value = field.value.trim();
  if (!value) {
    showError(field, t('validation.required'));
    return false;
  }
  if (!EMAIL_RE.test(value)) {
    showError(field, t('validation.invalidEmail'));
    return false;
  }
  clearError(field);
  return true;
}

export function validatePhoneField(field) {
  const value = field.value.trim();
  if (!value) {
    showError(field, t('validation.required'));
    return false;
  }
  if (!PHONE_RE.test(value)) {
    showError(field, t('validation.invalidPhone'));
    return false;
  }
  clearError(field);
  return true;
}

export function validateIdentifierField(field) {
  const value = field.value.trim();
  if (!value) {
    showError(field, t('validation.required'));
    return false;
  }
  const digits = value.replace(/\D/g, '');
  const isPhone = digits.startsWith('375') && digits.length >= 12;
  if (EMAIL_RE.test(value) || PHONE_RE.test(value) || isPhone) {
    clearError(field);
    return true;
  }
  showError(field, t('validation.invalidEmail'));
  return false;
}

export function validateNameField(field) {
  const value = field.value.trim();
  if (!value && field.required) {
    showError(field, t('validation.required'));
    return false;
  }
  if (value && !NAME_RE.test(value)) {
    showError(field, t('validation.invalidName'));
    return false;
  }
  clearError(field);
  return true;
}

export function validateBirthDateField(field) {
  const value = field.value;
  if (!value) {
    showError(field, t('validation.required'));
    return false;
  }
  const birth = new Date(value);
  const today = new Date();
  const minAge = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
  if (birth > minAge) {
    showError(field, t('validation.ageRequirement'));
    return false;
  }
  clearError(field);
  return true;
}

export function validatePasswordField(field) {
  const value = field.value;
  if (!value) {
    showError(field, t('validation.required'));
    return false;
  }
  if (value.length < 8 || value.length > 20) {
    showError(field, t('validation.passwordLength'));
    return false;
  }
  if (!/[A-Z]/.test(value)) {
    showError(field, t('validation.passwordUppercase'));
    return false;
  }
  if (!/[a-z]/.test(value)) {
    showError(field, t('validation.passwordLowercase'));
    return false;
  }
  if (!/\d/.test(value)) {
    showError(field, t('validation.passwordNumber'));
    return false;
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    showError(field, t('validation.passwordSpecial'));
    return false;
  }
  clearError(field);
  return true;
}

export function validatePasswordMatch(passwordField, confirmField) {
  if (passwordField.value !== confirmField.value) {
    showError(confirmField, t('validation.passwordMatch'));
    return false;
  }
  clearError(confirmField);
  return true;
}

export function validateNicknameField(field) {
  const value = field.value.trim();
  if (!value) {
    showError(field, t('validation.required'));
    return false;
  }
  if (!NICKNAME_RE.test(value)) {
    showError(field, t('validation.nicknameFormat'));
    return false;
  }
  clearError(field);
  return true;
}

export function validateAgreementField(field) {
  if (!field.checked) {
    showError(field, t('validation.agreementRequired'));
    return false;
  }
  clearError(field);
  return true;
}

export function formatPhoneInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  if (!digits.length) return '';

  let rest = digits;
  if (rest.startsWith('375')) {
    rest = rest.slice(3);
  }

  const op = rest.slice(0, 2);
  const p1 = rest.slice(2, 5);
  const p2 = rest.slice(5, 7);
  const p3 = rest.slice(7, 9);

  let out = '+375';
  if (op) out += ` (${op}`;
  if (op.length === 2) out += ')';
  if (p1) out += ` ${p1}`;
  if (p2) out += `-${p2}`;
  if (p3) out += `-${p3}`;
  return out;
}

export function phoneToDigits(value) {
  return value.replace(/\D/g, '');
}

export function getMaxBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 16);
  return d.toISOString().slice(0, 10);
}
