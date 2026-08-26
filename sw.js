const CACHE_NAME = 'trpu-pomoshnik-20260826-1';

// Небольшая оболочка приложения сохраняется сразу. Иконки браузер получает
// из manifest.json, поэтому они не замедляют первый запуск.
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
            const response = await fetch(event.request);
            if (response.ok) {
                cache.put(event.request, response.clone());
            }
            return response;
        } catch (error) {
            // Если связь пропала, приложение всё равно открывается из кэша.
            if (event.request.mode === 'navigate') {
                return cache.match('./index.html');
            }
            throw error;
        }
    })());
});
