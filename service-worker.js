const CACHE_NAME = 'lulu-staff-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/lulu logo.png',
  './icons/lulu_512.png',
  './images/staff-placeholder.jpg',
  './icons/U.png'
];


self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Ignore requests to chrome extensions or other unsupported protocols
  if (requestUrl.protocol === 'chrome-extension:') {
    // Let browser handle these requests, don't respond with SW
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).catch(err => {
          console.warn('Fetch failed; returning offline page or empty response.', err);
          // Optional: return a fallback page or empty response if fetch fails
          // return caches.match('/offline.html'); // if you have an offline.html cached
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
