// service-worker.js para GitHub Pages
const CACHE_NAME = "ciente-hrv-cache-v4";
const APP_PREFIX = "ciente-hrv";

// URLs para cache
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './service-worker.js',
  './icon-192.png',
  './icon-512.png'
];

// Instalação
self.addEventListener('install', event => {
  console.log(`${APP_PREFIX}: Service Worker instalando...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`${APP_PREFIX}: Cache aberto`);
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação
self.addEventListener('activate', event => {
  console.log(`${APP_PREFIX}: Service Worker ativado`);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`${APP_PREFIX}: Removendo cache antigo:`, cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepta requisições
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log(`${APP_PREFIX}: Fetch falhou:`, error);
          });
      })
  );
});
