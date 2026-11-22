/* Service Worker - Escala de Porteiros CCB
   Rede primeiro, sem usar o cache HTTP do navegador.
   O cache local só é usado quando estiver sem internet. */
const CACHE = "escala-ccb-v9";
const ARQUIVOS = [
  "./",
  "./index.html",
  "./style.css?v=9",
  "./xlsx.js?v=9",
  "./app.js?v=9",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  // Se algum arquivo faltar, os demais continuam sendo guardados.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ARQUIVOS.map((a) => c.add(new Request(a, { cache: "reload" })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  const ehEscala = url.pathname.endsWith("/escala.json");
  const chaveEscala = new URL("escala.json", self.registration.scope).href;

  e.respondWith(
    fetch(req.url, { cache: "no-cache", credentials: "same-origin" })
      .then((resp) => {
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(ehEscala ? chaveEscala : req, copia));
        }
        return resp;
      })
      .catch(async () => {
        if (ehEscala) {
          const r = await caches.match(chaveEscala);
          if (r) return r;
        }
        return (await caches.match(req, { ignoreSearch: req.mode === "navigate" })) ||
               (req.mode === "navigate" ? await caches.match("./index.html") : Response.error());
      })
  );
});
