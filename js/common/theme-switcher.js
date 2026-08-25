(function () {
  try {
    var d = document.documentElement;
    var theme = localStorage.getItem('theme');
    if (theme === 'dark' || theme === 'light') d.dataset.theme = theme;
    var raw = localStorage.getItem('accessibility');
    if (!raw) return;
    var s = JSON.parse(raw);
    if (!s.enabled) return;
    d.setAttribute('data-accessibility', 'active');
    if (s.colorScheme) d.setAttribute('data-color-scheme', s.colorScheme);
    if (s.fontSize) d.setAttribute('data-font-size', s.fontSize);
  } catch (e) {}
})();
