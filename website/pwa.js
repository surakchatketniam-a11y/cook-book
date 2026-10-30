if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  // Ask the active worker to download recipe photos for offline use (skipped in data-saver mode).
  const warmImages = worker => { if (worker && !navigator.connection?.saveData) worker.postMessage('warm-images'); };
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(registration => warmImages(registration.active)).catch(error => console.warn('Offline support unavailable:', error));
    // After an update the old worker is still active at load time; the new one announces itself here.
    navigator.serviceWorker.addEventListener('controllerchange', () => warmImages(navigator.serviceWorker.controller));
  });
}
