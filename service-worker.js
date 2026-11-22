/* Service Worker - Escala de Porteiros CCB
   Estratégia "rede primeiro": sempre busca a versão mais nova no GitHub
   e usa o cache somente quando estiver sem internet. */
const CACHE = "escala-ccb-v7";
const ARQUIVOS = [
  "./",
  "./index.html",
  "./style.css?v=7",
  "./xlsx.js?v=7",
  "./app.js?v=7",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
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
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  const ehEscala = new URL(req.url).pathname.endsWith("/escala.json");

  e.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp && resp.ok) {
          const copia = resp.clone();
          const chave = ehEscala ? new URL("escala.json", self.registration.scope).href : req;
          caches.open(CACHE).then((c) => c.put(chave, copia));
        }
        return resp;
      })
      .catch(async () => {
        if (ehEscala) {
          const r = await caches.match(new URL("escala.json", self.registration.scope).href);
          if (r) return r;
        }
        return (await caches.match(req)) ||
               (req.mode === "navigate" ? await caches.match("./index.html") : Response.error());
      })
  );
});
