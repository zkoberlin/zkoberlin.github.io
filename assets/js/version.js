(function () {
  const version = '6.2.0';
  window.PAUL_APP_VERSION = version;

  function renderVersion() {
    document.querySelectorAll('[data-app-version]').forEach((element) => {
      element.textContent = `v${version}`;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderVersion, { once: true });
  } else {
    renderVersion();
  }
})();
