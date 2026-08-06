const COMMON_FILTERS = [
  { type: 'select', field: 'type', labelKey: 'filter.type', dynamic: 'types' },
  { type: 'select', field: 'region', labelKey: 'filter.region', dynamic: 'regions' },
  { type: 'select', field: 'brand', labelKey: 'filter.brand', dynamic: 'brands' },
  { type: 'select', field: 'model', labelKey: 'filter.model', dynamic: 'models', dependsOn: 'brand' },
  { type: 'select', field: 'yearFrom', labelKey: 'filter.yearFrom', dynamic: 'years' },
  { type: 'number', field: 'priceTo', labelKey: 'filter.priceTo' }
];

const CATEGORY_FILTERS = {
  transport: [
    { type: 'number', field: 'mileageTo', labelKey: 'filter.mileageTo' }
  ],
  agriculture: [
    { type: 'number', field: 'powerFrom', labelKey: 'filter.powerFrom' },
    { type: 'number', field: 'engineHoursTo', labelKey: 'filter.engineHoursTo' }
  ],
  construction: [
    { type: 'number', field: 'engineVolumeFrom', labelKey: 'filter.engineVolumeFrom' },
    { type: 'number', field: 'engineHoursTo', labelKey: 'filter.engineHoursTo' }
  ]
};

const TYPE_FILTERS = {
  transport_trucks: [
    { type: 'number', field: 'payloadTo', labelKey: 'filter.payloadTo' }
  ],
  transport_buses: [
    { type: 'number', field: 'seatsFrom', labelKey: 'filter.seatsFrom' }
  ],
  construction_loaders: [
    { type: 'number', field: 'bucketVolumeFrom', labelKey: 'filter.bucketVolumeFrom' }
  ],
  construction_cranes: [
    { type: 'number', field: 'payloadTo', labelKey: 'filter.payloadTo' },
    { type: 'number', field: 'boomReachFrom', labelKey: 'filter.boomReachFrom' }
  ]
};

export const CATEGORY_TYPES = {
  transport: ['trucks', 'vans', 'buses'],
  agriculture: ['tractors', 'motoblocks'],
  construction: ['loaders', 'cranes']
};

export function getFilters(category, type) {
  const typeKey = `${category}_${type}`;
  const typeExtra = TYPE_FILTERS[typeKey] ?? [];

  return [
    ...COMMON_FILTERS,
    ...(CATEGORY_FILTERS[category] ?? []),
    ...typeExtra
  ];
}

export default { getFilters, CATEGORY_TYPES, CATEGORY_FILTERS, TYPE_FILTERS };
