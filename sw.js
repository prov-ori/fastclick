// Офлайн-кэш: сначала сеть (чтобы обновления доезжали), при ошибке — кэш.
const CACHE = 'fastclick-v1';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'icons/icon.svg', 'css/style.css',
  'js/app.js', 'js/charts.js', 'js/corpus.js', 'js/course.js', 'js/dom.js', 'js/engine.js', 'js/game.js',
  'js/generator.js', 'js/keyboard.js', 'js/layouts.js', 'js/sound.js', 'js/store.js', 'js/typing.js', 'js/ui.js',
  'js/views-learn.js', 'js/views-meta.js', 'js/views-practice.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html'))),
  );
});
