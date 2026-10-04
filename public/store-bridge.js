(() => {
  const openStore = slug => window.open(`/store.html?slug=${encodeURIComponent(slug)}`, '_blank', 'noopener');
  const storeUrl = slug => `${location.origin}/store.html?slug=${encodeURIComponent(slug)}`;
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href*="#/store/"]');
    if (link) {
      const match = link.getAttribute('href').match(/#\/store\/([^/]+)/);
      if (match) { event.preventDefault(); openStore(decodeURIComponent(match[1])); return; }
    }
  }, true);
})();
