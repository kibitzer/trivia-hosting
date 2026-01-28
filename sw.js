// sw.js - Basic Service Worker for PWA
const CACHE_NAME = 'trivia-v1';
const ASSETS = [
  './player.html',
  './host/host.html',
  './shared/styles.css',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', event => {
  // Network-first strategy for dynamic trivia app
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
