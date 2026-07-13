const CACHE = 'pro-fundx-v2'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.svg',
  '/favicon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      )
    }),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API requests → Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }

  // WebSocket → don't cache
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return
  }

  // Vite HMR → don't cache
  if (url.hostname === 'localhost' && url.port === '5173') {
    return
  }

  // Static assets (fonts, images, chunks with hash) → Cache First
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.match(/\.(js|css|woff2?|png|svg|ico)$/)
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Navigation → Network First
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  // Everything else → Network First
  event.respondWith(networkFirst(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const clone = response.clone()
      caches.open(CACHE).then((cache) => cache.put(request, clone))
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      const clone = response.clone()
      caches.open(CACHE).then((cache) => cache.put(request, clone))
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (request.mode === 'navigate') {
      return caches.match('/index.html')
    }
    return new Response('Offline', { status: 503 })
  }
}
