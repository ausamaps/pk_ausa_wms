const CACHE_NAME = 'pk-ausa-wms-v1';
const URLS_TO_CACHE = [
  './',
  './index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Instalando y cacheando assets...');
      return cache.addAll(URLS_TO_CACHE).catch(err => {
        console.warn('[SW] Error cacheando algunos assets:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Borrando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Para tiles, CDNs y recursos: cache-first
  if (url.pathname.includes('tile') || 
      url.hostname.includes('leaflet') || 
      url.hostname.includes('cdnjs') ||
      url.hostname.includes('esri') ||
      url.hostname.includes('arcgisonline') ||
      event.request.destination === 'font' ||
      event.request.destination === 'style' ||
      event.request.destination === 'script') {
    
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type !== 'error') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          if (event.request.destination === 'image') {
            return new Response('', {status: 404});
          }
          return new Response('Offline', {status: 503});
        });
      })
    );
  } else {
    // Para HTML y datos: network-first
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then(response => {
          return response || new Response('Offline', {status: 503});
        });
      })
    );
  }
});
