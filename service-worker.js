// service-worker.js para GitHub Pages
const CACHE_NAME = "ciente-hrv-cache-v2";
const APP_PREFIX = "ciente-hrv";

// URLs para cache - usando caminhos relativos
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './service-worker.js',
  './icon-192.png',
  './icon-512.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log(`${APP_PREFIX}: Service Worker instalando...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`${APP_PREFIX}: Cache aberto`);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log(`${APP_PREFIX}: Todos os recursos cacheados`);
        return self.skipWaiting();
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log(`${APP_PREFIX}: Service Worker ativado`);
  
  // Remove caches antigos
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
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;
  
  // Ignora requisições do Chrome extension
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retorna do cache se encontrado
        if (response) {
          return response;
        }
        
        // Clona a requisição
        const fetchRequest = event.request.clone();
        
        // Faz a requisição de rede
        return fetch(fetchRequest)
          .then(response => {
            // Verifica se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clona a resposta para cache
            const responseToCache = response.clone();
            
            // Adiciona ao cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log(`${APP_PREFIX}: Fetch falhou:`, error);
            // Você pode retornar uma página de fallback aqui
          });
      })
  );
});

// Mensagens do app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});