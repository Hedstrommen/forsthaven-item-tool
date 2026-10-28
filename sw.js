// Minimal service worker so browsers treat the site as installable.
// App shell files are cached for offline use; item card images are always
// fetched from the network so a broken cache can never hide the pictures.
const CACHE_NAME = "frosthaven-item-tool-v3";
const CORE_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./game-data.js",
  "./icons.js",
  "./manifest.webmanifest",
  "./data/catalog.json",
  "./data/gloomhaven-catalog.json"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    }).then(function () {
      // Take over as soon as an update lands, so no browser is left running
      // an old worker with a stale cache.
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }
  const url = new URL(event.request.url);
  // Never serve item artwork from the cache: the pictures must always come
  // from the network so a stale cache entry cannot blank out the cards.
  if (url.pathname.indexOf("/assets/items") !== -1) {
    return;
  }
  event.respondWith(
    fetch(event.request).then(function (response) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(event.request, copy);
      });
      return response;
    }).catch(function () {
      return caches.match(event.request);
    })
  );
});
