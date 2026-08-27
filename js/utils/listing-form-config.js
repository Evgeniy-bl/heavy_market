import { CATEGORY_TYPES } from './filter-config.js';

export const LISTING_LIMIT = 50;

const BASE_FIELDS = [
  { name: 'category', type: 'select', labelKey: 'listing.field.category', required: true, group: 'base' },
  { name: 'type', type: 'select', labelKey: 'listing.field.type', required: true, group: 'base' },
  { name: 'brand', type: 'text', labelKey: 'filter.brand', required: true, group: 'base' },
  { name: 'model', type: 'text', labelKey: 'filter.model', required: true, group: 'base' },
  { name: 'year', type: 'number', labelKey: 'filter.yearFrom', required: true, min: 1950, max: new Date().getFullYear() + 1, group: 'base' }
];

const DEAL_FIELDS = [
  { name: 'price', type: 'number', labelKey: 'listing.field.price', required: true, min: 1, group: 'deal' },
  { name: 'phone', type: 'tel', labelKey: 'auth.register.phone', required: true, group: 'deal' },
  { name: 'region', type: 'select', labelKey: 'listing.field.region', required: true, group: 'location' },
  { name: 'city', type: 'select', labelKey: 'product.city', required: true, group: 'location' }
];

const CATEGORY_FIELDS = {
  transport: [
    { name: 'mileage', type: 'number', labelKey: 'product.mileage', min: 0, group: 'extra' },
    { name: 'power', type: 'number', labelKey: 'product.power', min: 1, group: 'extra' }
  ],
  agriculture: [
    { name: 'power', type: 'number', labelKey: 'product.power', required: true, min: 1, group: 'extra' },
    { name: 'engineHours', type: 'number', labelKey: 'product.engineHours', min: 0, group: 'extra' }
  ],
  construction: [
    { name: 'engineVolume', type: 'number', labelKey: 'product.engineVolume', min: 0, step: 0.1, group: 'extra' },
    { name: 'engineHours', type: 'number', labelKey: 'product.engineHours', min: 0, group: 'extra' }
  ]
};

const TYPE_FIELDS = {
  transport_trucks: [
    { name: 'payload', type: 'number', labelKey: 'product.payload', min: 0, step: 0.1, group: 'extra' }
  ],
  transport_buses: [
    { name: 'seats', type: 'number', labelKey: 'product.seats', required: true, min: 1, group: 'extra' }
  ],
  transport_vans: [],
  agriculture_tractors: [],
  agriculture_motoblocks: [],
  construction_loaders: [
    { name: 'bucketVolume', type: 'number', labelKey: 'product.bucketVolume', min: 0, step: 0.1, group: 'extra' }
  ],
  construction_cranes: [
    { name: 'payload', type: 'number', labelKey: 'product.payload', min: 0, step: 0.1, group: 'extra' },
    { name: 'boomReach', type: 'number', labelKey: 'product.boomReach', min: 0, step: 0.1, group: 'extra' }
  ]
};

function mergeFields(list) {
  const merged = new Map();
  list.forEach((field) => {
    merged.set(field.name, { ...merged.get(field.name), ...field });
  });
  return [...merged.values()];
}

export function getListingFieldConfig(category, type, groups = null) {
  const typeKey = `${category}_${type}`;
  const typeFields = TYPE_FIELDS[typeKey] ?? [];
  const categoryFields = CATEGORY_FIELDS[category] ?? [];
  const fields = mergeFields([...BASE_FIELDS, ...DEAL_FIELDS, ...categoryFields, ...typeFields]);

  if (!groups) return fields;
  return fields.filter((field) => groups.includes(field.group));
}

export function getOverviewFieldConfig(category, type) {
  return getListingFieldConfig(category, type, ['base', 'extra']);
}

export function getDealFieldConfig() {
  return getListingFieldConfig('transport', 'trucks', ['deal', 'location']);
}

export function getCategoryOptions() {
  return Object.keys(CATEGORY_TYPES);
}

export function getTypeOptions(category) {
  return CATEGORY_TYPES[category] ?? [];
}

export function buildProductTitle({ brand, model, power, type, category }) {
  const base = [brand, model].filter(Boolean).join(' ').trim();
  if (!base) return '';
  if (power && (category === 'transport' || category === 'agriculture')) {
    return `${base} (${power} л.с.)`;
  }
  if (type === 'buses') return base;
  return base;
}
