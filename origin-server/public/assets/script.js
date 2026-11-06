// Sample CDN client library
console.log('[CDN Asset] script.js loaded from edge/origin cache.');

function getCdnTelemetry() {
  return {
    loadedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    screenRes: `${window.innerWidth}x${window.innerHeight}`
  };
}

