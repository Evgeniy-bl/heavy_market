import { API } from '../api.js';
import { api } from '../utils/api.js';
import { t } from '../common/i18n.js';
import { markContentReady } from '../common/preloader.js';
import { checkAuth } from '../auth/session.js';
import {
  getListingFieldConfig,
  getOverviewFieldConfig,
  getDealFieldConfig,
  getCategoryOptions,
  getTypeOptions,
  buildProductTitle,
  LISTING_LIMIT
} from '../utils/listing-form-config.js';
import { alertDialog } from '../components/alert.js';
import { openListingPreviewModal } from '../components/listing-preview-modal.js';
import { isAdmin, isSeller, formatPhoneForSeller } from '../utils/user-role.js';
import ImageUploader from '../utils/loadImages.js';
import {
  getAvailableRegions,
  getCitiesByRegion,
  getRegionByCity
} from '../utils/belarus-regions.js';
import { formatPhoneInput, phoneToDigits } from '../auth/validation.js';

const form = document.getElementById('createListingForm');
const fieldsRoot = document.querySelector('[data-listing-fields]');
const dealFieldsRoot = document.querySelector('[data-listing-deal-fields]');
const descriptionEl = document.getElementById('listingDescription');

let currentUser = null;
let myListingCount = 0;
let selectedCategory = 'transport';
let selectedType = 'trucks';
let editingProduct = null;
let imageUploader = null;
let titleManual = false;

function getEditId() {
  const id = new URLSearchParams(window.location.search).get('id');
  return id ? String(id) : null;
}

function isEditMode() {
  return Boolean(editingProduct);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderUsageCounter() {
  const wrap = document.querySelector('[data-listings-usage]');
  const counter = document.querySelector('[data-listings-usage-count]');
  if (!wrap || !counter) return;
  wrap.hidden = false;
  counter.textContent = `${myListingCount}/${LISTING_LIMIT}`;
}

function applyEditLabels() {
  const eyebrow = document.querySelector('[data-listing-eyebrow]');
  const title = document.querySelector('[data-listing-title]');
  const lead = document.querySelector('[data-listing-lead]');
  const submit = document.querySelector('[data-listing-submit]');

  if (!isEditMode()) return;

  if (eyebrow) {
    eyebrow.textContent = t('listing.editEyebrow');
    eyebrow.removeAttribute('data-i18n');
  }
  if (title) {
    title.textContent = t('listing.editTitle');
    title.removeAttribute('data-i18n');
  }
  if (lead) {
    lead.textContent = t('listing.editLead');
    lead.removeAttribute('data-i18n');
  }
  if (submit) {
    submit.textContent = t('listing.submitEdit');
    submit.removeAttribute('data-i18n');
  }

  document.title = `${t('listing.editTitle')} — Heavy Market`;
}

function getFieldLabel(field) {
  if (field.name === 'category') return t('listing.field.category');
  return t(field.labelKey);
}

function getRegionLabel(region) {
  const key = `regions.${region.id}`;
  const translated = t(key);
  return translated !== key ? translated : region.name;
}

function renderSelectField(field, value = '', values = {}) {
  let options = [];
  let placeholder = '';

  if (field.name === 'category') {
    options = getCategoryOptions().map((item) => ({
      value: item,
      label: t(`categories.${item}`)
    }));
  } else if (field.name === 'type') {
    options = getTypeOptions(selectedCategory).map((item) => ({
      value: item,
      label: t(`types.${item}`)
    }));
  } else if (field.name === 'region') {
    placeholder = t('listing.selectRegion');
    options = getAvailableRegions().map((region) => ({
      value: region.id,
      label: getRegionLabel(region)
    }));
  } else if (field.name === 'city') {
    placeholder = t('listing.selectCity');
    const regionId = values.region || '';
    const cities = getCitiesByRegion(regionId);
    options = cities.map((city) => ({ value: city, label: city }));
    if (regionId === 'minsk-city') {
      value = 'Минск';
    }
  }

  const emptyOption = placeholder && !(field.name === 'city' && values.region === 'minsk-city')
    ? `<option value="">${escapeHtml(placeholder)}</option>`
    : '';

  return `
    <div class="create-listing-field" data-field-wrap="${field.name}">
      <label class="create-listing-field__label" for="listing-${field.name}">${escapeHtml(getFieldLabel(field))}</label>
      <select
        class="create-listing-field__control"
        id="listing-${field.name}"
        name="${field.name}"
        ${field.required ? 'required' : ''}
      >
        ${emptyOption}
        ${options.map((option) => `
          <option value="${escapeHtml(option.value)}"${option.value === value ? ' selected' : ''}>${escapeHtml(option.label)}</option>
        `).join('')}
      </select>
      <span class="create-listing-field__error" data-field-error="${field.name}"></span>
    </div>
  `;
}

function renderInputField(field, value = '') {
  const attrs = [
    field.required ? 'required' : '',
    field.min != null ? `min="${field.min}"` : '',
    field.max != null ? `max="${field.max}"` : '',
    field.step != null ? `step="${field.step}"` : '',
    value !== '' && value != null ? `value="${escapeHtml(value)}"` : ''
  ].filter(Boolean).join(' ');

  return `
    <div class="create-listing-field" data-field-wrap="${field.name}">
      <label class="create-listing-field__label" for="listing-${field.name}">${escapeHtml(getFieldLabel(field))}</label>
      <input
        class="create-listing-field__control"
        type="${field.type}"
        id="listing-${field.name}"
        name="${field.name}"
        ${attrs}
      >
      <span class="create-listing-field__error" data-field-error="${field.name}"></span>
    </div>
  `;
}

function renderFieldMarkup(field, values = {}) {
  if (field.type === 'select') {
    let value = values[field.name] ?? '';
    if (field.name === 'category') value = values.category || selectedCategory;
    if (field.name === 'type') value = values.type || selectedType;
    return renderSelectField(field, value, values);
  }
  return renderInputField(field, values[field.name] ?? '');
}

function getSuggestedTitle(values = readFormValues()) {
  return buildProductTitle({
    brand: values.brand,
    model: values.model,
    power: values.power ? Number(values.power) : null,
    type: values.type || selectedType,
    category: values.category || selectedCategory
  });
}

function getTitleMetaChips(values = {}) {
  const chips = [];
  const category = values.category || selectedCategory;

  if (values.year) chips.push(String(values.year));

  if (category === 'transport') {
    if (values.payload) chips.push(`${values.payload} ${t('product.unitTons')}`);
    else if (values.seats) chips.push(String(values.seats));
    if (values.mileage) {
      chips.push(`${Number(values.mileage).toLocaleString('ru-RU')} km`);
    }
  } else if (category === 'agriculture') {
    if (values.power) chips.push(`${values.power} ${t('product.unitHp')}`);
    if (values.engineHours) {
      chips.push(Number(values.engineHours).toLocaleString('ru-RU'));
    }
  } else if (category === 'construction') {
    if (values.payload) chips.push(`${values.payload} ${t('product.unitTons')}`);
    else if (values.bucketVolume) {
      chips.push(`${values.bucketVolume} ${t('product.unitCubic')}`);
    }
    if (values.engineHours) {
      chips.push(Number(values.engineHours).toLocaleString('ru-RU'));
    }
  }

  return chips.slice(0, 3);
}

function getListingNameInput() {
  return document.querySelector('[data-listing-name]');
}

function updateTitlePreview({ force = false } = {}) {
  const values = readFormValues();
  const typeEl = document.querySelector('[data-listing-name-type]');
  const chipsEl = document.querySelector('[data-listing-name-chips]');
  const nameInput = getListingNameInput();
  const typeKey = values.type || selectedType;

  if (typeEl) {
    typeEl.textContent = typeKey ? t(`types.${typeKey}`) : '';
  }

  if (nameInput && (!titleManual || force)) {
    nameInput.value = getSuggestedTitle(values);
  }

  if (chipsEl) {
    const chips = getTitleMetaChips(values);
    chipsEl.hidden = chips.length === 0;
    chipsEl.innerHTML = chips
      .map((chip) => `<span class="listing-name-card__chip">${escapeHtml(chip)}</span>`)
      .join('');
  }
}

function renderFields(values = {}) {
  if (fieldsRoot) {
    const fields = getOverviewFieldConfig(selectedCategory, selectedType);
    fieldsRoot.innerHTML = fields.map((field) => renderFieldMarkup(field, values)).join('');
  }

  if (dealFieldsRoot) {
    const dealFields = getDealFieldConfig();
    dealFieldsRoot.innerHTML = dealFields.map((field) => renderFieldMarkup(field, values)).join('');
  }

  updateTitlePreview();
}

function updateCitySelect(regionId, selectedCity = '') {
  const citySelect = form?.elements.city;
  if (!citySelect || citySelect.tagName !== 'SELECT') return;

  const cities = getCitiesByRegion(regionId);
  const isMinskCity = regionId === 'minsk-city';
  const nextCity = isMinskCity ? 'Минск' : (cities.includes(selectedCity) ? selectedCity : '');

  citySelect.innerHTML = [
    isMinskCity ? '' : `<option value="">${escapeHtml(t('listing.selectCity'))}</option>`,
    ...cities.map((city) => (
      `<option value="${escapeHtml(city)}"${city === nextCity ? ' selected' : ''}>${escapeHtml(city)}</option>`
    ))
  ].join('');

  citySelect.value = nextCity;
}

function toPlainText(value) {
  if (!value) return '';
  if (!/[<>]/.test(value)) return String(value);
  const tmp = document.createElement('div');
  tmp.innerHTML = value;
  return tmp.textContent || '';
}

function readFormValues() {
  const values = {};
  getListingFieldConfig(selectedCategory, selectedType).forEach((field) => {
    const input = form.elements[field.name];
    if (!input) return;
    values[field.name] = String(input.value || '').trim();
  });
  values.name = String(getListingNameInput()?.value || '').trim();
  values.description = toPlainText(descriptionEl?.value || '').trim();
  return values;
}

function setFieldError(name, message) {
  const wrap = document.querySelector(`[data-field-wrap="${name}"]`);
  const error = document.querySelector(`[data-field-error="${name}"]`);
  wrap?.classList.toggle('create-listing-field--error', Boolean(message));
  if (wrap?.classList.contains('listing-name-card')) {
    wrap.classList.toggle('listing-name-card--error', Boolean(message));
  }
  if (error) error.textContent = message || '';
}

function clearErrors() {
  form?.querySelectorAll('[data-field-wrap]').forEach((wrap) => {
    wrap.classList.remove('create-listing-field--error', 'listing-name-card--error');
  });
  form?.querySelectorAll('[data-field-error]').forEach((el) => {
    el.textContent = '';
  });
  imageUploader?.clearError();
}

function validateForm() {
  clearErrors();
  let valid = true;
  let firstInvalid = null;

  const nameInput = getListingNameInput();
  const nameValue = String(nameInput?.value || '').trim();
  if (!nameValue) {
    setFieldError('name', t('validation.required'));
    valid = false;
    if (!firstInvalid) firstInvalid = nameInput;
  }

  getListingFieldConfig(selectedCategory, selectedType).forEach((field) => {
    const input = form.elements[field.name];
    if (!input) return;
    const value = input.value.trim();

    if (field.required && !value) {
      setFieldError(field.name, t('validation.required'));
      valid = false;
      if (!firstInvalid) firstInvalid = input;
      return;
    }

    if (field.type === 'number' && value) {
      const num = Number(value);
      if (Number.isNaN(num) || (field.min != null && num < field.min)) {
        setFieldError(field.name, t('validation.required'));
        valid = false;
        if (!firstInvalid) firstInvalid = input;
      }
    }
  });

  if (!imageUploader?.hasImages()) {
    imageUploader?.setError(t('listing.imagesRequired'));
    valid = false;
    if (!firstInvalid) {
      document.getElementById('listingImagesGrid')?.querySelector('[data-add-slot]')?.focus();
    }
  }

  if (firstInvalid) {
    firstInvalid.focus();
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return valid;
}

function buildProductPayload(values) {
  const payload = {
    name: values.name || getSuggestedTitle(values),
    category: values.category,
    type: values.type,
    brand: values.brand,
    model: values.model,
    price: Number(values.price),
    year: Number(values.year),
    city: values.city,
    phone: phoneToDigits(values.phone) || values.phone,
    sellerId: currentUser.sellerId,
    description: values.description,
    images: imageUploader?.getExistingImages() || [],
    isTop: editingProduct?.isTop || false,
    isDealOfDay: editingProduct?.isDealOfDay || false,
    active: true,
    status: 'pending',
    rejectionReason: null,
    submittedAt: new Date().toISOString(),
    publishedAt: null
  };

  if (isEditMode()) {
    payload.id = editingProduct.id;
  }

  const numericOptional = [
    'mileage', 'power', 'payload', 'seats', 'engineHours', 'engineVolume', 'bucketVolume', 'boomReach'
  ];

  numericOptional.forEach((key) => {
    if (values[key]) payload[key] = Number(values[key]);
  });

  return payload;
}

function fillFormFromProduct(product) {
  selectedCategory = product.category || 'transport';
  selectedType = product.type || getTypeOptions(selectedCategory)[0] || '';
  titleManual = false;

  const region = getRegionByCity(product.city) || '';
  const phoneSource = product.phone || currentUser?.phone || '';
  renderFields({
    ...product,
    region,
    city: product.city || '',
    phone: formatPhoneInput(phoneSource.startsWith('375') || phoneSource.startsWith('+')
      ? (phoneSource.startsWith('+') ? phoneSource : `+${phoneSource}`)
      : phoneSource)
  });

  if (descriptionEl) {
    descriptionEl.value = toPlainText(product.description || '');
  }

  imageUploader?.setExistingImages(product.images || []);

  const nameInput = getListingNameInput();
  const suggested = getSuggestedTitle(readFormValues());
  if (nameInput && product.name) {
    nameInput.value = product.name;
    titleManual = product.name !== suggested;
  }
  updateTitlePreview();
}

function showPreview() {
  const values = readFormValues();
  if (!validateForm()) return;

  const title = values.name || getSuggestedTitle(values);

  const rows = getListingFieldConfig(selectedCategory, selectedType)
    .filter((field) => values[field.name])
    .map((field) => {
      let display = values[field.name];
      if (field.name === 'region') {
        const region = getAvailableRegions().find((item) => item.id === display);
        display = region ? getRegionLabel(region) : display;
      }
      return `<li><strong>${escapeHtml(getFieldLabel(field))}:</strong> ${escapeHtml(display)}</li>`;
    })
    .join('');

  openListingPreviewModal(`
    <div class="modal__text">
      <p><strong>${escapeHtml(title || t('listing.previewUntitled'))}</strong></p>
      <ul class="listing-preview__list">${rows}</ul>
      ${values.description ? `<p class="listing-preview__description">${escapeHtml(values.description)}</p>` : ''}
    </div>
  `);
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!validateForm()) return;

  if (!isEditMode() && myListingCount >= LISTING_LIMIT) {
    alertDialog({ message: t('myListings.limitReached'), type: 'error' });
    return;
  }

  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;

  try {
    const values = readFormValues();
    selectedCategory = values.category;
    selectedType = values.type;
    const product = buildProductPayload(values);
    const files = imageUploader?.getSelectedFiles() || [];

    const saved = await API.createProductWithImages(product, files);

    if (currentUser.sellerId && product.phone) {
      await API.updateSeller(currentUser.sellerId, {
        phone: formatPhoneForSeller(product.phone)
      }).catch(() => null);
    }

    if (isEditMode()) {
      editingProduct = saved || { ...editingProduct, ...product };
      imageUploader?.setExistingImages(editingProduct.images || []);
      alertDialog({ message: t('listing.updated'), type: 'success' });
      submitBtn.disabled = false;
      return;
    }

    alertDialog({ message: t('listing.created'), type: 'success' });
    window.setTimeout(() => {
      window.location.href = 'my-listings.html';
    }, 700);
  } catch (error) {
    alertDialog({
      message: error?.message || (isEditMode() ? t('listing.updateError') : t('listing.createError')),
      type: 'error'
    });
    submitBtn.disabled = false;
  }
}

function bindCategoryTypeHandlers() {
  if (form?.dataset.fieldsBound === 'true') return;
  if (form) form.dataset.fieldsBound = 'true';

  form?.addEventListener('change', (event) => {
    const target = event.target;

    if (target.name === 'region') {
      updateCitySelect(target.value, '');
      return;
    }

    if (target.name === 'category') {
      selectedCategory = target.value;
      selectedType = getTypeOptions(selectedCategory)[0] || '';
      const preserved = readFormValues();
      renderFields({ ...preserved, category: selectedCategory, type: selectedType });
      Object.entries(preserved).forEach(([name, value]) => {
        if (name === 'type' || name === 'category') return;
        if (name === 'region' || name === 'city') return;
        if (form.elements[name]) form.elements[name].value = value;
      });
      if (form.elements.region) form.elements.region.value = preserved.region || '';
      updateCitySelect(preserved.region || '', preserved.city || '');
      if (form.elements.type) form.elements.type.value = selectedType;
      return;
    }

    if (target.name === 'type') {
      selectedType = target.value;
      const preserved = readFormValues();
      renderFields({ ...preserved, type: selectedType });
      Object.entries(preserved).forEach(([name, value]) => {
        if (name === 'region' || name === 'city') return;
        if (form.elements[name]) form.elements[name].value = value;
      });
      if (form.elements.region) form.elements.region.value = preserved.region || '';
      updateCitySelect(preserved.region || '', preserved.city || '');
    }
  });

  form?.addEventListener('input', (event) => {
    const target = event.target;

    if (target.name === 'phone') {
      target.value = formatPhoneInput(target.value);
      return;
    }

    if (target.name === 'name') {
      titleManual = true;
      setFieldError('name', '');
      return;
    }

    if ([
      'brand', 'model', 'power', 'year', 'mileage', 'payload',
      'seats', 'engineHours', 'bucketVolume', 'engineVolume', 'boomReach'
    ].includes(target.name)) {
      updateTitlePreview();
    }
  });
}

function initImageUploader() {
  imageUploader = new ImageUploader({
    gridId: 'listingImagesGrid',
    inputId: 'listingImagesInput',
    addMoreId: 'listingImagesAddMore',
    maxFiles: 8,
    minSlots: 6,
    basePath: '../'
  });
}

function getDefaultDealValues() {
  const phoneSource = currentUser?.phone || '';
  return {
    phone: phoneSource
      ? formatPhoneInput(phoneSource.startsWith('+') ? phoneSource : `+${phoneSource}`)
      : ''
  };
}

async function loadPage() {
  const session = checkAuth();
  if (!session) return;

  if (isAdmin(session)) {
    window.location.href = 'admin.html';
    return;
  }

  currentUser = await API.getUserById(session.id);
  if (!isSeller(currentUser)) {
    window.location.href = 'seller.html';
    return;
  }

  const products = await api.getProducts();
  myListingCount = products.filter(
    (product) => Number(product.sellerId) === Number(currentUser.sellerId)
  ).length;
  renderUsageCounter();

  const editId = getEditId();
  if (editId) {
    const product = await api.getProductById(editId).catch(() => null);
    if (!product || Number(product.sellerId) !== Number(currentUser.sellerId)) {
      alertDialog({ message: t('listing.editForbidden'), type: 'error' });
      window.setTimeout(() => {
        window.location.href = 'my-listings.html';
      }, 900);
      return;
    }

    editingProduct = product;
    applyEditLabels();
    fillFormFromProduct(product);
    return;
  }

  if (myListingCount >= LISTING_LIMIT) {
    alertDialog({ message: t('myListings.limitReached'), type: 'error' });
    return;
  }

  renderFields(getDefaultDealValues());
}

function bindEvents() {
  form?.addEventListener('submit', handleSubmit);
  document.querySelector('[data-listing-preview]')?.addEventListener('click', showPreview);
  bindCategoryTypeHandlers();

  document.addEventListener('languageChanged', () => {
    if (isEditMode()) applyEditLabels();
    if (!fieldsRoot?.innerHTML && !dealFieldsRoot?.innerHTML) return;
    const preserved = readFormValues();
    const keptName = preserved.name;
    const wasManual = titleManual;
    renderFields(preserved);
    if (wasManual) {
      titleManual = true;
      const nameInput = getListingNameInput();
      if (nameInput) nameInput.value = keptName;
      updateTitlePreview();
    }
  });
}

async function init() {
  try {
    initImageUploader();
    bindEvents();
    await loadPage();
  } finally {
    markContentReady();
  }
}

init();
