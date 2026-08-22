export const ThemeManager = {
  init() {
    const saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.dataset.theme = saved;
    }
  }
};
