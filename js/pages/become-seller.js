import { API } from '../api.js';
import { t } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';
import {
  getCurrentUser,
  saveFullUser,
  saveLoginSession,
  resolveAuthPath
} from '../auth/session.js';
import { clearError, showError } from '../auth/validation.js';
import {
  isAdmin,
  isSeller,
  getSellerDisplayName,
  formatPhoneForSeller
} from '../utils/user-role.js';
import { alertDialog } from '../components/alert.js';

const form = document.getElementById('becomeSellerForm');
const companyGroup = document.getElementById('companyNameGroup');
const companyField = document.getElementById('companyName');
const guestBlock = document.querySelector('[data-seller-guest]');
const upgradeBlock = document.querySelector('[data-seller-upgrade]');

function isCompanyType() {
  return form?.querySelector('[name="sellerType"]:checked')?.value === 'company';
}

function updateCompanyField() {
  const show = isCompanyType();
  companyGroup?.toggleAttribute('hidden', !show);
  if (show) {
    companyField?.setAttribute('required', '');
  } else {
    companyField?.removeAttribute('required');
    if (companyField) clearError(companyField);
  }
}

function validateCompany() {
  if (!isCompanyType()) {
    if (companyField) clearError(companyField);
    return true;
  }
  const value = companyField?.value.trim() || '';
  if (value.length < 2) {
    showError(companyField, t('validation.required'));
    return false;
  }
  clearError(companyField);
  return true;
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!validateCompany()) return;

  const session = getCurrentUser();
  if (!session) {
    window.location.href = resolveAuthPath('login.html') + '?redirect=seller.html';
    return;
  }

  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;

  try {
    const user = await API.getUserById(session.id);
    if (isSeller(user)) {
      window.location.href = resolveAuthPath('my-listings.html');
      return;
    }

    const sellerType = form.querySelector('[name="sellerType"]:checked')?.value || 'individual';
    const companyName = sellerType === 'company' ? companyField.value.trim() : null;
    const patchUser = {
      ...user,
      sellerType,
      companyName
    };

    const seller = await API.createSeller({
      name: getSellerDisplayName(patchUser) || [user.firstName, user.lastName].filter(Boolean).join(' '),
      city: 'Минск',
      logo: 'assets/db-images/seller-logo-1-529132.png',
      description: sellerType === 'company'
        ? t('auth.register.sellerType.companyDesc')
        : t('auth.register.sellerType.individualDesc'),
      phone: formatPhoneForSeller(user.phone)
    });

    const updated = await API.updateUser(user.id, {
      sellerId: seller.id,
      sellerType,
      companyName
    });

    const remember = Boolean(localStorage.getItem('currentUser'));
    if (remember) saveFullUser(updated);
    else saveLoginSession(updated, false);

    alertDialog({ message: t('seller.upgrade.success'), type: 'success' });
    window.setTimeout(() => {
      window.location.href = resolveAuthPath('create-listing.html');
    }, 800);
  } catch {
    alertDialog({ message: t('seller.upgrade.error'), type: 'error' });
    submitBtn.disabled = false;
  }
}

function bindEvents() {
  form?.addEventListener('submit', handleSubmit);
  form?.querySelectorAll('[name="sellerType"]').forEach((radio) => {
    radio.addEventListener('change', updateCompanyField);
  });
  companyField?.addEventListener('input', () => clearError(companyField));
}

async function init() {
  try {
    bindEvents();
    updateCompanyField();

    const session = getCurrentUser();

    if (isAdmin(session)) {
      window.location.href = resolveAuthPath('admin.html');
      return;
    }

    if (!session) {
      guestBlock?.removeAttribute('hidden');
      upgradeBlock?.setAttribute('hidden', '');
      return;
    }

    const user = await API.getUserById(session.id);
    if (isSeller(user)) {
      window.location.href = resolveAuthPath('my-listings.html');
      return;
    }

    guestBlock?.setAttribute('hidden', '');
    upgradeBlock?.removeAttribute('hidden');
  } finally {
    markContentReady();
  }
}

init();
