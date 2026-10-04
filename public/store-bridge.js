(() => {
  const openStore = slug => window.open(`/store.html?slug=${encodeURIComponent(slug)}`, '_blank', 'noopener');
  const storeUrl = slug => `${location.origin}/store.html?slug=${encodeURIComponent(slug)}`;
  const openQr = slug => window.open(`/qr.html?slug=${encodeURIComponent(slug)}`, '_blank', 'noopener');
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href*="#/store/"]');
    if (link) {
      const match = link.getAttribute('href').match(/#\/store\/([^/]+)/);
      if (match) { event.preventDefault(); openStore(decodeURIComponent(match[1])); return; }
    }
    const button = event.target.closest?.('button');
    if (button && /share qr code/i.test(button.textContent || '')) {
      const slug = (location.hash.match(/^#\/store\/([^/]+)/) || [])[1] || '';
      if (slug) { event.preventDefault(); openQr(decodeURIComponent(slug)); }
    }
  }, true);
})();
