export const APP_CONFIG = Object.freeze({
  api: Object.freeze({
    defaultBase: 'http://localhost:3001',
    ports: Object.freeze([3000, 3001]),
    port: 3001
  }),
  paths: Object.freeze({
    pagesAssetsBase: '../'
  }),
  pagination: Object.freeze({
    catalogPageSize: 6,
    similarProductsPageSize: 4
  }),
  listings: Object.freeze({
    limit: 50,
    maxImages: 8,
    minImageSlots: 6,
    maxImageSizeBytes: 8 * 1024 * 1024
  }),
  categories: Object.freeze({
    segmentOrder: Object.freeze(['transport', 'agriculture', 'construction']),
    icons: Object.freeze({
      transport: 'delivery-truck-trailer-svgrepo-com.svg',
      agriculture: 'tractor-svgrepo-com.svg',
      construction: 'building-construction-crane-svgrepo-com.svg'
    })
  }),
  storage: Object.freeze({
    user: 'currentUser',
    theme: 'theme',
    language: 'language',
    accessibility: 'accessibility'
  }),
  breakpoints: Object.freeze({
    catalogDesktop: 1101,
    mobile: 768,
    mobileNav: 1024,
    profileDesktop: 1025
  }),
  ui: Object.freeze({
    preloaderMinVisibleMs: 280,
    preloaderFailsafeMs: 12000,
    catalogCardSlideIntervalMs: 900
  })
});

export const API_DEFAULT_BASE = APP_CONFIG.api.defaultBase;
export const API_PORTS = APP_CONFIG.api.ports;
export const SERVER_PORT = APP_CONFIG.api.port;

export const PAGES_ASSETS_BASE = APP_CONFIG.paths.pagesAssetsBase;

export const CATALOG_PAGE_SIZE = APP_CONFIG.pagination.catalogPageSize;
export const SIMILAR_PRODUCTS_PAGE_SIZE = APP_CONFIG.pagination.similarProductsPageSize;

export const LISTING_LIMIT = APP_CONFIG.listings.limit;
export const LISTING_MAX_IMAGES = APP_CONFIG.listings.maxImages;
export const LISTING_MIN_IMAGE_SLOTS = APP_CONFIG.listings.minImageSlots;
export const LISTING_MAX_IMAGE_SIZE = APP_CONFIG.listings.maxImageSizeBytes;

export const CATEGORY_SEGMENT_ORDER = APP_CONFIG.categories.segmentOrder;
export const CATEGORY_ICONS = APP_CONFIG.categories.icons;

export const STORAGE_KEY_USER = APP_CONFIG.storage.user;
export const STORAGE_KEY_THEME = APP_CONFIG.storage.theme;
export const STORAGE_KEY_LANGUAGE = APP_CONFIG.storage.language;
export const STORAGE_KEY_ACCESSIBILITY = APP_CONFIG.storage.accessibility;

export const CATALOG_DESKTOP_BREAKPOINT = APP_CONFIG.breakpoints.catalogDesktop;
export const MOBILE_BREAKPOINT = APP_CONFIG.breakpoints.mobile;
export const MOBILE_NAV_BREAKPOINT = APP_CONFIG.breakpoints.mobileNav;
export const MOBILE_NAV_MQ = `(max-width: ${MOBILE_NAV_BREAKPOINT}px)`;
export const PROFILE_DESKTOP_BREAKPOINT = APP_CONFIG.breakpoints.profileDesktop;
export const PROFILE_DESKTOP_MQ = `(min-width: ${PROFILE_DESKTOP_BREAKPOINT}px)`;

export const PRELOADER_MIN_VISIBLE_MS = APP_CONFIG.ui.preloaderMinVisibleMs;
export const PRELOADER_FAILSAFE_MS = APP_CONFIG.ui.preloaderFailsafeMs;
export const CATALOG_CARD_SLIDE_INTERVAL_MS = APP_CONFIG.ui.catalogCardSlideIntervalMs;
