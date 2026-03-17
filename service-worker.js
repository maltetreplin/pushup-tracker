
const CACHE_NAME = 'pushups-v6.1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './offline.html'
];
self.addEventListener('install', (event)=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=> cache.addAll(APP_SHELL)));
});
self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys().then(keys=> Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=> caches.delete(k))))
  );
});
self.addEventListener('fetch', (event)=>{
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).catch(()=> caches.match('./offline.html')))
  );
});
