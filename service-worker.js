// service-worker.js - Versão 2.5
const CACHE_NAME = 'ciente-hrv-cache-v9';
const APP_VERSION = '2.5';

// URLs para cache
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ===== INSTALAÇÃO =====
self.addEventListener('install', event => {
  console.log(`[SW v${APP_VERSION}] Instalando...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[SW v${APP_VERSION}] Cache aberto`);
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log(`[SW v${APP_VERSION}] Todos recursos cacheados`);
        return self.skipWaiting();
      })
      .catch(error => {
        console.error(`[SW v${APP_VERSION}] Erro ao instalar:`, error);
      })
  );
});

// ===== ATIVAÇÃO =====
self.addEventListener('activate', event => {
  console.log(`[SW v${APP_VERSION}] Ativando...`);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      console.log(`[SW v${APP_VERSION}] Caches encontrados:`, cacheNames);
      
      return Promise.all(
        cacheNames.map(cacheName => {
          // Remove TODOS os caches antigos (v1 até v8)
          if (cacheName.startsWith('ciente-hrv-cache-') && cacheName !== CACHE_NAME) {
            console.log(`[SW v${APP_VERSION}] Removendo cache antigo:`, cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log(`[SW v${APP_VERSION}] Cache limpo, reivindicando clients`);
      return self.clients.claim();
    })
    .then(() => {
      // Envia mensagem para todos os clients (abas/apps)
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: APP_VERSION
          });
        });
      });
    })
  );
});

// ===== FETCH =====
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
          return response;
        }
        
        // Cache miss - busca da rede
        return fetch(event.request)
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
            console.error(`[SW v${APP_VERSION}] Fetch falhou:`, error);
            
            // Retorna página offline se for HTML
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./');
            }
            
            return new Response('App offline', {
              status: 503,
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// ===== MENSAGENS =====
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log(`[SW v${APP_VERSION}] Skipping waiting por comando`);
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log(`[SW v${APP_VERSION}] Limpando cache por solicitação`);
    caches.delete(CACHE_NAME);
  }
});
