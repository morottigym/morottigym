const CACHE = "morottigym-pwa-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./logo.png"
];

// Instala a nova versão imediatamente
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(error => console.error("Erro ao criar cache:", error))
  );
});

// Remove caches antigos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Controle das requisições
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const request = event.request;
  const url = new URL(request.url);

  // Não interfere no Supabase ou outros domínios
  if (url.origin !== self.location.origin) return;

  const isNavigation =
    request.mode === "navigate" ||
    request.destination === "document";

  // Para páginas/HTML: tenta sempre pegar a versão nova
  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE).then(cache => {
              cache.put("./index.html", copy);
            });
          }

          return response;
        })
        .catch(async () => {
          return (
            await caches.match("./index.html") ||
            await caches.match("./")
          );
        })
    );

    return;
  }

  // Outros arquivos: rede primeiro, cache se estiver offline
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();

          caches.open(CACHE).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      })
      .catch(() => caches.match(request))
  );
});
