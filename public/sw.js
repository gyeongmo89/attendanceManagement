// Service Worker for Mediv 근태관리 시스템
const CACHE_NAME = 'mediv-attendance-v1';
const STATIC_CACHE_NAME = 'mediv-static-v1';
const DYNAMIC_CACHE_NAME = 'mediv-dynamic-v1';

// Assets to cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/checkin.png',
  '/icons/checkout.png',
  // Add your CSS and JS files
  '/_next/static/css/app.css',
  '/_next/static/js/main.js',
  // Add offline fallback page
  '/offline.html'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(keys => Promise.all(
        keys.map(key => {
          if (![STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME].includes(key)) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      )),
      // Enable navigation preload if available
      (async () => {
        if (self.registration.navigationPreload) {
          await self.registration.navigationPreload.enable();
        }
      })()
    ])
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  const { request } = event;

  // API calls
  if (request.url.includes('/api/')) {
    event.respondWith(
      networkFirst(request)
    );
    return;
  }

  // Static assets
  if (STATIC_ASSETS.includes(request.url)) {
    event.respondWith(
      cacheFirst(request)
    );
    return;
  }

  // Other requests
  event.respondWith(
    cacheFirst(request)
      .catch(() => networkFirst(request))
      .catch(() => caches.match('/offline.html'))
  );
});

// Cache first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  return cachedResponse || fetch(request);
}

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Sync event for background sync
self.addEventListener('sync', event => {
  if (event.tag === 'attendance-sync') {
    event.waitUntil(
      // Implement your background sync logic here
      syncAttendanceData()
    );
  }
});

// Background sync function
async function syncAttendanceData() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const requests = await cache.keys();
    
    const pendingRequests = requests.filter(request => 
      request.url.includes('/api/attendance')
    );

    await Promise.all(
      pendingRequests.map(async request => {
        try {
          await fetch(request);
          await cache.delete(request);
        } catch (error) {
          console.error('Sync failed for request:', request.url);
        }
      })
    );
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
