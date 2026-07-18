const CACHE = "finance-ia-static-v1";
const ASSETS_ESTATICOS = ["/icons/", "/_next/static/"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: cache-first só para assets estáticos (ícones, JS/CSS do Next);
// tudo o mais (páginas, dados) sempre busca da rede, sem cache — o app lida
// com dados financeiros pessoais e autenticação, então preferimos sempre a
// versão mais atual em vez de arriscar mostrar algo desatualizado.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const ehAssetEstatico = ASSETS_ESTATICOS.some((prefixo) =>
    url.pathname.startsWith(prefixo)
  );

  if (!ehAssetEstatico || event.request.method !== "GET") {
    return; // deixa o navegador buscar normalmente
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const emCache = await cache.match(event.request);
      if (emCache) return emCache;

      const resposta = await fetch(event.request);
      if (resposta.ok) cache.put(event.request, resposta.clone());
      return resposta;
    })
  );
});
