// service-worker.js para Ciente HRV
const CACHE_NAME = "ciente-hrv-cache-v3.1";
const APP_PREFIX = "ciente-hrv";
const OFFLINE_URL = './offline.html';

// URLs para cache
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './service-worker.js'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log(`${APP_PREFIX}: Service Worker instalando (v3.1)...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`${APP_PREFIX}: Cache aberto "${CACHE_NAME}"`);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log(`${APP_PREFIX}: Todos os recursos cacheados`);
        return self.skipWaiting();
      })
      .catch(error => {
        console.error(`${APP_PREFIX}: Erro ao instalar cache:`, error);
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
          if (cacheName !== CACHE_NAME && cacheName.startsWith('ciente-hrv-cache-')) {
            console.log(`${APP_PREFIX}: Removendo cache antigo:`, cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Limpa todos os clients
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: '3.1'
          });
        });
      });
    }).then(() => self.clients.claim())
  );
});

// Estratégia de cache: Stale-While-Revalidate
self.addEventListener('fetch', event => {
  // Ignora requisições não-GET e requisições de extensões
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;
  if (event.request.url.includes('socket.io')) return;
  
  const requestUrl = new URL(event.request.url);
  
  // Para arquivos HTML, sempre busca da rede primeiro (para atualizações)
  if (requestUrl.pathname.endsWith('.html') || requestUrl.pathname === '/') {
    event.respondWith(
      networkFirstStrategy(event.request)
    );
    return;
  }
  
  // Para outros recursos (CSS, JS, etc.), usa cache primeiro
  event.respondWith(
    cacheFirstStrategy(event.request)
  );
});

// Estratégia: Network First (para HTML)
async function networkFirstStrategy(request) {
  try {
    // Tenta buscar da rede primeiro
    const networkResponse = await fetch(request);
    
    // Clona a resposta para cache
    const responseToCache = networkResponse.clone();
    
    // Atualiza o cache em segundo plano
    caches.open(CACHE_NAME)
      .then(cache => {
        cache.put(request, responseToCache);
      });
    
    return networkResponse;
  } catch (error) {
    console.log(`${APP_PREFIX}: Rede indisponível, usando cache para:`, request.url);
    
    // Fallback para cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Se não tem no cache e é uma página, retorna offline page
    if (request.headers.get('Accept').includes('text/html')) {
      return caches.match(OFFLINE_URL);
    }
    
    throw error;
  }
}

// Estratégia: Cache First (para outros recursos)
async function cacheFirstStrategy(request) {
  // Tenta do cache primeiro
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Atualiza o cache em segundo plano
    updateCacheInBackground(request);
    return cachedResponse;
  }
  
  // Se não tem no cache, busca da rede
  try {
    const networkResponse = await fetch(request);
    
    // Salva no cache para próximo uso
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      caches.open(CACHE_NAME)
        .then(cache => {
          cache.put(request, responseToCache);
        });
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`${APP_PREFIX}: Falha ao buscar recurso:`, request.url, error);
    
    // Se for uma imagem, retorna uma imagem placeholder
    if (request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
      return new Response(
        '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#e0e0e0"/><text x="50" y="50" text-anchor="middle" dy=".3em" font-family="Arial" font-size="10" fill="#999">Imagem</text></svg>',
        {
          headers: { 'Content-Type': 'image/svg+xml' }
        }
      );
    }
    
    throw error;
  }
}

// Atualiza cache em segundo plano
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      caches.open(CACHE_NAME)
        .then(cache => {
          cache.put(request, responseToCache);
        });
    }
  } catch (error) {
    // Ignora erros de atualização em segundo plano
  }
}

// Mensagens do app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log(`${APP_PREFIX}: Recebido SKIP_WAITING, ativando novo worker`);
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION_INFO',
      version: '3.1',
      cacheName: CACHE_NAME
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME)
      .then(() => {
        console.log(`${APP_PREFIX}: Cache limpo por solicitação do app`);
      });
  }
});

// Sincronização em background (para futuras funcionalidades)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log(`${APP_PREFIX}: Sincronização em background`);
    // Aqui você pode implementar sincronização de dados
  }
});

// Notificações push (para futuras funcionalidades)
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Notificação do Ciente HRV',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'ciente-hrv-notification',
    data: {
      url: data.url || './'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Ciente HRV', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Tenta focar em uma janela existente
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Se não encontrar, abre nova janela
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});

// Log para debug
self.addEventListener('error', event => {
  console.error(`${APP_PREFIX}: Erro no Service Worker:`, event.error);
});
