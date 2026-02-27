const CACHE_NAME = 'offline';
const OFFLINE_PAGE = 'offline.html';
const OFFLINE_LOGO = '/img/app_icon_192.png';
const OFFLINE_FONT = 'https://swc.autodesk.com/pharmacopeia/fonts/ArtifaktElement/v1.0/WOFF2/Artifakt%20Element%20Regular.woff2';
const OFFLINE_FAVICON = '/favicon.ico';
const FILES = [OFFLINE_PAGE,OFFLINE_LOGO, OFFLINE_FONT, OFFLINE_FAVICON];

self.addEventListener('install', function(event) {
    console.log('[Service Worker] Installed.');
    event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
        return cache.addAll(FILES);
    }).then(() => {
        self.skipWaiting();
    }));
});

self.addEventListener('activate', function(event) {
    console.log('[Service Worker] Activated.');
    if ('navigationPreload' in self.registration) {
        console.log('[Service Worker] Enabling navigation pre-load.');
        event.waitUntil(self.registration.navigationPreload.enable());
    }
});

self.addEventListener('fetch', function(event) {
    if (event.request.mode == 'navigate') {
        event.respondWith((async () => {
            try {
                const preloadResponse = await event.preloadResponse;
                if (preloadResponse) {
                    return preloadResponse;
                }

                const networkResponse = await fetch(event.request);
                return networkResponse;
            } catch (error) {
                console.log('[Service Worker] Fetch failed; returning offline page instead.', error);

                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(OFFLINE_PAGE);
                return cachedResponse;
            }
        })());
    } else {
        // Check if request is GET and from origin (commodity-values), then
        // hard check for logo and favicon in cache to support offline page
        // if matches font url, serve cached font
        if (event.request.method === 'GET') {
            const url = new URL(event.request.url);
            if (url.origin === self.location.origin) {
                if (url.pathname === OFFLINE_LOGO || url.pathname === OFFLINE_FAVICON) {
                    return event.respondWith(
                        fetch(event.request).catch(() => caches.match(url.pathname))
                    )
                }
            } else if (event.request.url === OFFLINE_FONT) {
                return event.respondWith(
                    fetch(event.request).catch(() => caches.match(OFFLINE_FONT))
                );
            }
        }
    }
});