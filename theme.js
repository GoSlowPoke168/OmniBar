// Loaded in <head> so the stored theme applies before first paint (no flash).
(function () {
  const KEY = 'omnibar-theme';
  const media = matchMedia('(prefers-color-scheme: dark)');

  function get() {
    const mode = localStorage.getItem(KEY);
    return mode === 'light' || mode === 'dark' ? mode : 'system';
  }

  function apply() {
    const mode = get();
    document.documentElement.dataset.theme = mode === 'system' ? (media.matches ? 'dark' : 'light') : mode;
  }

  function set(mode) {
    if (mode === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
    apply();
  }

  media.addEventListener('change', apply);
  apply();
  window.OmniTheme = { get, set };
})();
