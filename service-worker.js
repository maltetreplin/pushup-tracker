
self.addEventListener('install', e=>{ self.skipWaiting(); });
self.addEventListener('activate', e=>{ });
self.addEventListener('fetch', function(event) { event.respondWith(fetch(event.request)); });
