export function getOverviewSpecs(product, t) {
  const rows = [
    { label: t('filter.type'), value: t(`types.${product.type}`) },
    { label: t('filter.brand'), value: product.brand },
    { label: t('filter.model'), value: product.model },
    { label: t('product.year'), value: product.year ? String(product.year) : null }
  ];

  if (product.category === 'transport') {
    if (product.mileage != null) {
      rows.push({
        label: t('product.mileage'),
        value: `${Number(product.mileage).toLocaleString('ru-RU')} km`
      });
    }
    if (product.type === 'trucks' && product.payload != null) {
      rows.push({
        label: t('product.payload'),
        value: `${product.payload} ${t('product.unitTons')}`
      });
    }
    if (product.type === 'buses' && product.seats != null) {
      rows.push({
        label: t('product.seats'),
        value: String(product.seats)
      });
    }
    if (product.power != null) {
      rows.push({
        label: t('product.power'),
        value: `${product.power} ${t('product.unitHp')}`
      });
    }
  }

  if (product.category === 'agriculture') {
    if (product.power != null) {
      rows.push({
        label: t('product.power'),
        value: `${product.power} ${t('product.unitHp')}`
      });
    }
    if (product.engineHours != null) {
      rows.push({
        label: t('product.engineHours'),
        value: `${Number(product.engineHours).toLocaleString('ru-RU')}`
      });
    }
  }

  if (product.category === 'construction') {
    if (product.engineVolume != null) {
      rows.push({
        label: t('product.engineVolume'),
        value: `${product.engineVolume} ${t('product.unitLiters')}`
      });
    }
    if (product.engineHours != null) {
      rows.push({
        label: t('product.engineHours'),
        value: `${Number(product.engineHours).toLocaleString('ru-RU')}`
      });
    }
    if (product.type === 'loaders' && product.bucketVolume != null) {
      rows.push({
        label: t('product.bucketVolume'),
        value: `${product.bucketVolume} ${t('product.unitCubic')}`
      });
    }
    if (product.type === 'cranes') {
      if (product.payload != null) {
        rows.push({
          label: t('product.payload'),
          value: `${product.payload} ${t('product.unitTons')}`
        });
      }
      if (product.boomReach != null) {
        rows.push({
          label: t('product.boomReach'),
          value: `${product.boomReach} ${t('product.unitMeters')}`
        });
      }
    }
  }

  return rows.filter((row) => row.value != null && row.value !== '');
}

function getPrimaryTypeStat(product, t) {
  switch (product.type) {
    case 'trucks':
    case 'cranes':
      if (product.payload != null) {
        return {
          label: t('product.payload'),
          value: `${product.payload} ${t('product.unitTons')}`
        };
      }
      break;
    case 'buses':
      if (product.seats != null) {
        return {
          label: t('product.seats'),
          value: String(product.seats)
        };
      }
      break;
    case 'loaders':
      if (product.bucketVolume != null) {
        return {
          label: t('product.bucketVolume'),
          value: `${product.bucketVolume} ${t('product.unitCubic')}`
        };
      }
      break;
    case 'tractors':
    case 'motoblocks':
    case 'vans':
      if (product.power != null) {
        return {
          label: t('product.power'),
          value: `${product.power} ${t('product.unitHp')}`
        };
      }
      break;
    default:
      break;
  }
  return null;
}

export function getQuickStats(product, t) {
  const stats = [
    {
      label: t('product.yearLabel'),
      value: product.year
        ? `${product.year}${t('product.yearSuffix') ? ` ${t('product.yearSuffix')}` : ''}`
        : null
    }
  ];

  if (product.category === 'transport' && product.mileage != null) {
    stats.push({
      label: t('product.mileage'),
      value: `${Number(product.mileage).toLocaleString('ru-RU')} km`
    });
  } else if (product.engineHours != null) {
    stats.push({
      label: t('product.engineHours'),
      value: `${Number(product.engineHours).toLocaleString('ru-RU')}`
    });
  } else if (product.power != null && !['tractors', 'motoblocks', 'vans'].includes(product.type)) {
    stats.push({
      label: t('product.power'),
      value: `${product.power} ${t('product.unitHp')}`
    });
  }

  const primary = getPrimaryTypeStat(product, t);
  if (primary) {
    stats.push(primary);
  }

  return stats.filter((row) => row.value);
}

export function formatProductAddress(product) {
  return [product.city, product.district].filter(Boolean).join(', ');
}

export function formatPublishedAt(iso, t, lang = 'ru') {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const locale = lang === 'be' ? 'be-BY' : lang === 'en' ? 'en-GB' : 'ru-RU';
  const time = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startToday - startThat) / 86400000);

  let dayLabel;
  if (dayDiff === 0) {
    dayLabel = t('product.today');
  } else if (dayDiff === 1) {
    dayLabel = t('product.yesterday');
  } else {
    dayLabel = date.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  }

  return `${dayLabel}, ${time}`;
}
