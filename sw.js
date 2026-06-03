// SS&B Refeitório — Service Worker
const CACHE = 'ssb-refeitorio-v3';

// Recursos que devem SEMPRE ser buscados na rede primeiro (HTML principal)
const NETWORK_FIRST = ['index.html', '/refeitorio/', '/refeitorio/index.html'];

// Instalação — ativa imediatamente sem esperar aba fechar
self.addEventListener('install', e => {
  self.skipWaiting();
});

// Ativação — apaga todos os caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — estratégia híbrida
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Apps Script e APIs externas: sempre rede, sem cache
  if (url.includes('script.google.com')) return;

  const isNetworkFirst = NETWORK_FIRST.some(p => url.endsWith(p)) || url === self.location.origin + '/refeitorio/';

  if (isNetworkFirst) {
    // REDE PRIMEIRO: busca versão mais recente, atualiza cache, fallback offline
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // CACHE PRIMEIRO: imagens, libs externas, ícones (performance)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return res;
        }).catch(() => cached);
      })
    );
  }
});
