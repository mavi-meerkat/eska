// Service worker de Mi Armario: la app funciona sin conexión.
// Solo toca sus propias cachés ("armario-"), nunca las de Mi Entreno ("gym-").
const VERSION = "v3";
const CACHE = "armario-" + VERSION;
const PRECACHE = ["./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/app.js", "js/datos.js", "js/store.js", "js/combos.js", "js/foto.js", "js/dibujo.js",
  "icons/icon.svg", "icons/icon-180.png", "icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("armario-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Primero la red (para recibir actualizaciones); si no hay conexión, la copia guardada.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const r = await fetch(req, { cache: "no-cache" });
      if (r.ok && r.status === 200) cache.put(req, r.clone());
      return r;
    } catch {
      return (await cache.match(req, { ignoreSearch: true })) || (await cache.match("index.html")) || Response.error();
    }
  })());
});
