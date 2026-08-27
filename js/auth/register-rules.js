import { isCommonPassword } from './common-passwords.js';

export const MIN_REGISTRATION_AGE = 16;

const PASSWORD_ERROR_CODES = {
  required: 'required',
  length: 'passwordLength',
  uppercase: 'passwordUppercase',
  lowercase: 'passwordLowercase',
  number: 'passwordNumber',
  special: 'passwordSpecial',
  common: 'passwordCommon'
};

export function getAgeFromBirthDate(birthDate) {
  const parts = String(birthDate || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [year, month, day] = parts;
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  const dayDiff = today.getDate() - day;

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

export function isOldEnough(birthDate, minAge = MIN_REGISTRATION_AGE) {
  const age = getAgeFromBirthDate(birthDate);
  return Number.isFinite(age) && age >= minAge;
}

export function getMaxBirthDate(minAge = MIN_REGISTRATION_AGE) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - minAge);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPasswordRuleErrors(password) {
  const value = String(password || '');
  const errors = [];

  if (!value) {
    errors.push('required');
    return errors;
  }
  if (value.length < 8 || value.length > 20) errors.push('length');
  if (!/[A-Z]/.test(value)) errors.push('uppercase');
  if (!/[a-z]/.test(value)) errors.push('lowercase');
  if (!/\d/.test(value)) errors.push('number');
  if (!/[^A-Za-z0-9]/.test(value)) errors.push('special');
  if (isCommonPassword(value)) errors.push('common');

  return errors;
}

export function mapPasswordErrorCode(code) {
  return PASSWORD_ERROR_CODES[code] || PASSWORD_ERROR_CODES.length;
}

export function validateRegistrationPayload(data = {}) {
  if (!data.birthDate) return 'required';
  if (!isOldEnough(data.birthDate)) return 'ageRequirement';

  const passwordErrors = getPasswordRuleErrors(data.password);
  if (passwordErrors.length) {
    return mapPasswordErrorCode(passwordErrors[0]);
  }

  return null;
}
