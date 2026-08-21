import { API } from '../api.js';
import { getCurrentUser } from '../auth/session.js';

function normalizeIds(list) {
  return [...new Set((list || []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
}

export function isFavorite(favoriteIds, productId) {
  return normalizeIds(favoriteIds).includes(Number(productId));
}

export async function loadFavoriteIds(userId) {
  if (!userId) return [];
  const user = await API.getUserById(userId);
  return normalizeIds(user?.favorites);
}

export async function setFavoriteIds(userId, favoriteIds) {
  const next = normalizeIds(favoriteIds);
  await API.updateUser(userId, { favorites: next });
  return next;
}

export async function toggleFavorite(productId) {
  const session = getCurrentUser();
  if (!session?.id) {
    return { ok: false, reason: 'auth', favoriteIds: [] };
  }

  const current = await loadFavoriteIds(session.id);
  const id = Number(productId);
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id];

  const favoriteIds = await setFavoriteIds(session.id, next);
  return {
    ok: true,
    active: favoriteIds.includes(id),
    favoriteIds
  };
}
