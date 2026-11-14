/* Offline support for Thermal Tech Study.
   Strategy: "network first, cache fallback".
   - When online, the newest files are always fetched (so new questions show up
     without changing this file) and saved to the cache.
   - When offline, the saved copies are used.
   You do not need to edit this file when adding questions. If you ADD A NEW FILE
   that must work offline (for example a new data file), add it to FILES below. */
var CACHE = 'thermal-study-v1';
var FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './data/questions.json',
  './data/scenarios.json',
  './data/topics.json',
  './data/references.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];
var NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function fromNetwork(request) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error('timeout')); }, NETWORK_TIMEOUT_MS);
    fetch(request).then(function (response) {
      clearTimeout(timer);
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
      }
      resolve(response);
    }, function (err) { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // external links (manuals) go straight to the web
  event.respondWith(
    fromNetwork(req).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('Offline and not cached', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
