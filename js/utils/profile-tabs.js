import { isSeller } from './user-role.js';
import { getCurrentUser } from '../auth/session.js';

export function applyProfileTabs() {
  const user = getCurrentUser();
  const listingsTab = document.querySelector('[data-profile-tab-listings]');
  const listingsShortcut = document.querySelector('[data-profile-shortcut-listings]');
  const settingsTab = document.querySelector('[data-profile-tab-settings]');
  const isUserSeller = isSeller(user);

  if (listingsTab) {
    listingsTab.hidden = !isUserSeller;
  }

  if (listingsShortcut) {
    listingsShortcut.hidden = !isUserSeller;
  }

  if (settingsTab) {
    settingsTab.href = 'profile-settings.html';
  }
}
