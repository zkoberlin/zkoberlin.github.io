(function () {
  const version = '6.35.1';
  window.PAUL_APP_VERSION = version;

  function renderVersion() {
    document.querySelectorAll('[data-app-version]').forEach((element) => {
      element.textContent = `v${version}`;
    });
    const year = new Date().getFullYear();
    document.querySelectorAll('[data-current-year]').forEach((element) => {
      element.textContent = String(year);
    });
    if (document.documentElement.dataset.page === 'calendar') {
      document.title = `Kalender – Paul ${year}`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderVersion, { once: true });
  } else {
    renderVersion();
  }
})();
