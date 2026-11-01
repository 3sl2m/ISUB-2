const CACHE_NAME = 'trpu-pomoshnik-20261101170845';
const OFFLINE_CONTENT_CACHE = 'trpu-offline-content-20261101170845';

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
                    .filter(key => key !== CACHE_NAME && key !== OFFLINE_CONTENT_CACHE)
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
        const appCache = await caches.open(CACHE_NAME);
        const offlineCache = await caches.open(OFFLINE_CONTENT_CACHE);
        const cached = await appCache.match(event.request) || await offlineCache.match(event.request);
        if (cached) return cached;

        try {
            const response = await fetch(event.request);
            if (response.ok) {
                offlineCache.put(event.request, response.clone());
            }
            return response;
        } catch (error) {
            // Если связь пропала, приложение всё равно открывается из кэша.
            if (event.request.mode === 'navigate') {
                return appCache.match('./index.html');
            }
            throw error;
        }
    })());
});