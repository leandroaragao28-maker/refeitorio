// SS&B Refeitório — Service Worker
const CACHE = 'ssb-refeitorio-v5';

// Recursos estáticos para pré-cachear na instalação
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js'
];

// Instalação — pré-cacheia recursos essenciais
// SEM skipWaiting: novo SW só ativa quando todas as abas fecharem,
// evitando limpeza de localStorage causada por troca abrupta de SW.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE).catch(() => {}))
  );
});

// Ativação — apaga caches antigos e assume controle suavemente
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — estratégia híbrida
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Ignora não-http (chrome-extension://, etc.)
  if (!url.startsWith('http')) return;

  // Apps Script: sempre rede, nunca cache (dados dinâmicos)
  if (url.includes('script.google.com')) return;

  // index.html — cache com revalidação em background (stale-while-revalidate)
  // Entrega o cache imediatamente e atualiza silenciosamente para a próxima visita.
  // Isso evita a espera de rede E evita a troca abrupta que limpava o localStorage.
  if (url.endsWith('index.html') || url.endsWith('/') || url.endsWith('/refeitorio/')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const networkFetch = fetch(e.request).then(res => {
            if (res && res.status === 200)
              cache.put(e.request, res.clone());
            return res;
          }).catch(() => null);
          // Retorna cache imediato; rede atualiza para a próxima abertura
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Demais recursos — cache primeiro (ícones, fontes, libs)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
