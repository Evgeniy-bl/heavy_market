import { PROFILE_DESKTOP_MQ } from '../config/constants.js';

const STORAGE_KEY = 'currentUser';

export function getCurrentUser() {
  const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function saveLoginSession(user, remember = false) {
  const session = {
    id: user.id,
    email: user.email,
    role: user.role || 'user',
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    sellerId: user.sellerId ?? null,
    sellerType: user.sellerType ?? null,
    companyName: user.companyName ?? null
  };
  const storage = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  other.removeItem(STORAGE_KEY);
  storage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function saveFullUser(user) {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getRedirectPath(userOrRole, inPages = false) {
  const prefix = inPages ? '' : 'pages/';
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;

  if (role === 'admin') {
    return `${prefix}admin.html`;
  }

  return `${prefix}catalog.html`;
}

export function getProfilePath(user) {
  if (user?.role === 'admin') return resolveAuthPath('admin.html');
  if (typeof window !== 'undefined' && window.matchMedia(PROFILE_DESKTOP_MQ).matches) {
    return resolveAuthPath('profile-settings.html');
  }
  return resolveAuthPath('profile.html');
}

export function resolveAuthPath(filename) {
  const inPages = /\/pages\//.test(window.location.pathname) || window.location.pathname.endsWith('/pages');
  return inPages ? filename : `pages/${filename}`;
}

export function checkAuth() {
  const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  if (!stored) {
    window.location.href = resolveAuthPath('login.html');
    return null;
  }
  return JSON.parse(stored);
}

export function checkRole(requiredRole) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = resolveAuthPath('login.html');
    return null;
  }
  if (user.role !== requiredRole) {
    window.location.href = resolveAuthPath('catalog.html');
    return null;
  }
  return user;
}
