// sw.js - Simple iPhone PWA Service Worker
const CACHE_NAME = 'todo-app-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/core.js',
  '/drag.js',
  '/swipe.js',
  '/menu.js',
  '/rendering.js',
  '/state.js',
  '/store.js',
  '/todoStore.js',
  '/taskOperations.js',
  '/editing.js',
  '/gestureCoordinator.js',
  '/cleanupManager.js',
  '/constants.js',
  '/utils.js',
  '/assets/background.png'  // ← ADD THIS LINE
];

// Install - cache files
self.addEventListener('install', (e) => {
  e.waitUntil(
	caches.open(CACHE_NAME)
	  .then(cache => cache.addAll(FILES_TO_CACHE))
	  .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
	caches.keys()
	  .then(keys => Promise.all(
		keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
	  ))
	  .then(() => self.clients.claim())
  );
});

// Fetch - cache first strategy
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
	caches.match(e.request)
	  .then(response => response || fetch(e.request))
	  .catch(() => caches.match('/'))
  );
});