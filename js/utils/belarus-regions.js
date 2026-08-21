export const BELARUS_REGIONS = [
  'minsk-city',
  'brest',
  'vitebsk',
  'gomel',
  'grodno',
  'minsk',
  'mogilev'
];

const CITY_TO_REGION = {
  'Минск': 'minsk-city',
  'Жодино': 'minsk',
  'Борисов': 'minsk',
  'Солигорск': 'minsk',
  'Слуцк': 'minsk',
  'Брест': 'brest',
  'Пинск': 'brest',
  'Барановичи': 'brest',
  'Витебск': 'vitebsk',
  'Гомель': 'gomel',
  'Гродно': 'grodno',
  'Лида': 'grodno',
  'Могилёв': 'mogilev',
  'Бобруйск': 'mogilev',
  'Горки': 'mogilev'
};

export function getRegionByCity(city) {
  return CITY_TO_REGION[city] || null;
}
