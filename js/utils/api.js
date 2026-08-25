import { isProductPublished } from './product-status.js';

const DEFAULT_API_BASE = 'http://localhost:3001';

function getApiBaseURL() {
  if (typeof window === 'undefined') {
    return DEFAULT_API_BASE;
  }

  try {
    const { protocol, hostname, port, origin } = window.location;

    if (protocol === 'file:') {
      return DEFAULT_API_BASE;
    }

    const isApiPort = port === '3000' || port === '3001';

    if (isApiPort) {
      return origin;
    }
  } catch {
  }

  return DEFAULT_API_BASE;
}

const baseURL = getApiBaseURL();

export async function deleteResource(url) {
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      cache: 'no-store'
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    const message = error?.message || String(error);
    throw new Error(`JSON Server недоступен или запрос не выполнен: ${message}`);
  }
}

async function fetchJSON(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    const message = error?.message || String(error);
    throw new Error(`JSON Server недоступен или запрос не выполнен: ${message}`);
  }
}

function createQueryString(filters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export const api = {
  async getProducts(filters = {}) {
    const { includeInactive = false, ...query } = filters;
    const products = await fetchJSON(`${baseURL}/products${createQueryString(query)}`);
    if (includeInactive) return products || [];
    return (products || []).filter(isProductPublished);
  },

  async getProductById(id) {
    return fetchJSON(`${baseURL}/products/${encodeURIComponent(id)}`);
  },

  async getSellers() {
    return fetchJSON(`${baseURL}/sellers`);
  },

  async getCategories() {
    return fetchJSON(`${baseURL}/categories`);
  },

  async getCart() {
    const raw = localStorage.getItem('cart');
    return raw ? JSON.parse(raw) : [];
  },

  async saveCart(items) {
    localStorage.setItem('cart', JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    return items;
  }
};

export { getApiBaseURL, fetchJSON };
