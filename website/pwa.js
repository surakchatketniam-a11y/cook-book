if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(registration => {
      if (!navigator.connection?.saveData) registration.active?.postMessage('warm-images');
    }).catch(error => console.warn('Offline support unavailable:', error));
  });
}
