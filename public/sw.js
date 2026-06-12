const CACHE_NAME = "ebf-2026-v11";
const STATIC_ASSETS = ["/", "/index.html", "/app.js", "/manifest.json", "/assets/logo-ebf-2026.svg", "/assets/logo-ebf-2026.png"];

// Install: pré-cacheia os assets estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first para estáticos, network-first para API
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Chamadas de API: sempre vai para a rede
  if (url.pathname.startsWith("/api/")) return;

  // Assets estáticos: cache first, fallback para a rede
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Salva no cache se for uma resposta válida
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
