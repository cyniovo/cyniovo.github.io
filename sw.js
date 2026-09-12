// sw.js — Service Worker：缓存 App Shell + 课程数据，支持离线学习
var CACHE = 'szch-v1.0.1';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/theme.css',
  './styles/app.css',
  './js/courses.raw.js',
  './js/courses.js',
  './js/storage.js',
  './js/auth.js',
  './js/progress.js',
  './js/community.js',
  './js/achievements.js',
  './js/recommend.js',
  './js/ui.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // 逐个加入，缺失的图标不阻塞安装
      return Promise.all(ASSETS.map(function (a) {
        return c.add(a).catch(function (err) { console.warn('SW skip', a, err); });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  // 只处理同源 GET
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // 网络优先（针对 index.html 与 JS/CSS），失败再回退缓存
  e.respondWith(
    fetch(e.request).then(function (resp) {
      var copy = resp.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
      return resp;
    }).catch(function () {
      return caches.match(e.request).then(function (cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
