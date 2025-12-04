// service-worker.js - Versão 3.1
const CACHE_NAME = 'ciente-hrv-cache-v13';
const APP_VERSION = '3.1';
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalação
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Ativação
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('ciente-hrv-cache-') && cacheName !== CACHE_NAME) {
            console.log(`🗑️ Removendo cache antigo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`✅ Service Worker v${APP_VERSION} ativado`);
      return self.clients.claim();
    })
  );
});

// Fetch - Estratégia Cache First com fallback para network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  // Ignora requisições do Chrome DevTools
  if (event.request.url.includes('chrome-extension')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retorna do cache se encontrou
        if (response) {
          return response;
        }
        
        // Se não tem no cache, busca na rede
        return fetch(event.request)
          .then(response => {
            // Verifica se a resposta é válida para cachear
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clona a resposta para cachear
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Fallback para página offline
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// Mensagens do Service Worker
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
});
