// service-worker.js - Versão 2.1
const CACHE_NAME = "ciente-hrv-cache-v5";
const APP_PREFIX = "ciente-hrv-v2.1";

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
  console.log(`${APP_PREFIX}: Instalando Service Worker...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`${APP_PREFIX}: Cache aberto, adicionando recursos...`);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log(`${APP_PREFIX}: Todos recursos cacheados`);
        return self.skipWaiting();
      })
      .catch(error => {
        console.error(`${APP_PREFIX}: Erro ao instalar cache:`, error);
      })
  );
});

// Ativação - remove caches antigos
self.addEventListener('activate', event => {
  console.log(`${APP_PREFIX}: Ativando Service Worker...`);
  
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
    })
    .then(() => {
      console.log(`${APP_PREFIX}: Cache limpo, reivindicando clients`);
      return self.clients.claim();
    })
  );
});

// Fetch - serve do cache ou busca da rede
self.addEventListener('fetch', event => {
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;
  
  // Ignora requisições do Chrome extension
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retorna do cache
        if (response) {
          console.log(`${APP_PREFIX}: Cache hit:`, event.request.url);
          return response;
        }
        
        // Cache miss - busca da rede
        console.log(`${APP_PREFIX}: Cache miss, buscando:`, event.request.url);
        
        return fetch(event.request)
          .then(response => {
            // Verifica se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clona a resposta para cache
            const responseToCache = response.clone();
            
            // Adiciona ao cache (apenas para recursos importantes)
            const cacheableUrls = ['.html', '.js', '.css', '.json', '.png', '.jpg', '.ico'];
            const shouldCache = cacheableUrls.some(ext => event.request.url.includes(ext));
            
            if (shouldCache) {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                  console.log(`${APP_PREFIX}: Adicionado ao cache:`, event.request.url);
                });
            }
            
            return response;
          })
          .catch(error => {
            console.error(`${APP_PREFIX}: Fetch falhou:`, error);
            
            // Pode retornar uma página de fallback aqui
            if (event.request.url.includes('.html')) {
              return caches.match('./');
            }
            
            return new Response('Offline - Sem conexão', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Mensagens do app para controle
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log(`${APP_PREFIX}: Skipping waiting...`);
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log(`${APP_PREFIX}: Limpando cache por solicitação...`);
    caches.delete(CACHE_NAME);
  }
});

// Atualização periódica (a cada 6 horas)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-cache') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(urlsToCache))
    );
  }
});
