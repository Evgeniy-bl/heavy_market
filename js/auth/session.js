const STORAGE_KEY = 'currentUser';

export function getCurrentUser() {
  const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function saveLoginSession(user, remember = false) {
  const session = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone
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

export function getRedirectPath(role, inPages = false) {
  const prefix = inPages ? '' : 'pages/';
  switch (role) {
    case 'landlord':
      return `${prefix}landlord-profile.html`;
    case 'admin':
      return `${prefix}admin.html`;
    case 'renter':
      return `${prefix}catalog.html`;
    default:
      return inPages ? '../index.html' : 'index.html';
  }
}

export function getProfilePath(user, inPages = false) {
  return getRedirectPath(user?.role === 'landlord' ? 'landlord' : user?.role, inPages).replace('catalog.html', 'profile.html').replace('landlord-profile.html', 'landlord-profile.html');
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
