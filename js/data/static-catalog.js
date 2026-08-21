import { BELARUS_REGIONS } from '../utils/belarus-regions.js';

/** Popular sellers by listing volume on the marketplace (offline snapshot). */
export const FEATURED_SELLERS = [
  {
    id: 1,
    name: 'МАЗ-Центр Минск',
    city: 'Минск',
    description: 'Официальный дилер МАЗ и Нёман'
  },
  {
    id: 3,
    name: 'АгроБел',
    city: 'Могилёв',
    description: 'МТЗ, Гомсельмаш, Бобруйскагромаш'
  },
  {
    id: 4,
    name: 'Амкодор-Сервис',
    city: 'Минск',
    description: 'Погрузчики и дорожная техника'
  },
  {
    id: 6,
    name: 'СпецТехГомель',
    city: 'Гомель',
    description: 'Автокраны и спецтехника на МАЗ'
  },
  {
    id: 2,
    name: 'БелАЗ-Техника',
    city: 'Жодино',
    description: 'Карьерные самосвалы БелАЗ'
  },
  {
    id: 5,
    name: 'МЗКТ-Волат',
    city: 'Минск',
    description: 'Тяжёлые шасси и тягачи МЗКТ'
  }
];

const YEAR_FROM = 2015;
const YEAR_TO = 2026;

export const FILTER_YEARS = Array.from(
  { length: YEAR_TO - YEAR_FROM + 1 },
  (_, index) => YEAR_TO - index
);

export const FILTER_REGIONS = [...BELARUS_REGIONS];

const FILTER_OPTIONS = {
  transport: {
    trucks: {
      brands: ['МАЗ', 'МЗКТ', 'БелАЗ', 'КамАЗ', 'Scania', 'Volvo'],
      models: ['5440В9', '6430', '7429', '6312', '75581', '7547', '6312C9', '6501C9', '65115', '5490', 'R450', 'FH460', '5440М9', '74135']
    },
    vans: {
      brands: ['МАЗ', 'МЗКТ', 'ГАЗ', 'Ford', 'Mercedes', 'Iveco'],
      models: ['4371', '5337', '4370', '5309', '651651', 'Transit Custom', 'Sprinter 316', 'Next', 'Daily 35S']
    },
    buses: {
      brands: ['МАЗ', 'Нёман', 'НефАЗ'],
      models: ['206', '203', '4202', '42023', '251', '5299']
    }
  },
  agriculture: {
    tractors: {
      brands: ['МТЗ', 'Гомсельмаш', 'John Deere', 'New Holland'],
      models: ['82.1', '1221.3', '3522.4', 'КЗС-812', 'КЗР-812', '1221.2', '1523', '6155M', 'T6.180']
    },
    motoblocks: {
      brands: ['МТЗ', 'Кентавр', 'Weima', 'Форте', 'Бобруйскагромаш'],
      models: ['09Н', '1080Д', 'WM1100A', '1050G', 'ПК-6.2']
    }
  },
  construction: {
    loaders: {
      brands: ['Амкодор', 'JCB', 'Caterpillar'],
      models: ['342В', '333Б', '2661', '332С', '352С', '3CX', '950M']
    },
    cranes: {
      brands: ['КС', 'МАЗ', 'Liebherr', 'Grove'],
      models: ['КС-55713', 'КС-55727', 'КС-3577', '55713', '65713', 'LTM 1050', 'GMK3050']
    }
  }
};

export function getStaticFilterOptions(category, type) {
  const options = FILTER_OPTIONS[category]?.[type] ?? { brands: [], models: [] };
  return {
    brands: options.brands,
    models: options.models,
    years: FILTER_YEARS,
    regions: FILTER_REGIONS
  };
}
