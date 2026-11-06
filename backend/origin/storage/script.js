// Client library asset from Origin Server
console.log('[Mini CDN] Client asset script.js loaded successfully.');

window.miniCDN = {
  version: '1.0.0',
  originAuthoritative: true,
  getTimestamp: () => new Date().toISOString()
};
