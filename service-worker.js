
const CACHE_NAME = 'pushups-v2';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './offline.html',
  './chart.umd.js'
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
  const req = event.request;
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache=>{ cache.put(req, copy); });
        return res;
      }).catch(()=> caches.match('./offline.html'));
    })
  );
});
