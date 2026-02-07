// sw.js - Basic Service Worker for PWA
const CACHE_NAME = 'trivia-v1';
const ASSETS = ['./player.html', './host/host.html', './shared/styles.css', './manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Only intercept same-origin requests to avoid issues with external analytics/CDNs
    if (!event.request.url.startsWith(self.location.origin)) return;

    // Network-first strategy for dynamic trivia app
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Return valid network response
                return response;
            })
            .catch(async () => {
                // Fallback to cache if network fails
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) return cachedResponse;
                
                // If both fail, return a rejected promise or a basic error response
                // instead of undefined to avoid Service Worker crash
                throw new Error('Network and cache failure');
            })
    );
});
