/* Konetyökalut — service worker
   - Sivu haetaan aina ensin verkosta, joten uusin versio tulee heti kun yhteys on.
     Välimuistissa oleva kopio käytetään vain, jos verkkoa ei ole.
   - Fontit ja kuvakkeet tulevat välimuistista.
   - Pilvisynkronointiin (Apps Script) ja muihin osoitteisiin ei kosketa. */
const VERSIO = 'konetyokalut-2';
const YDIN = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIO).then(c => c.addAll(YDIN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(nimet => Promise.all(nimet.filter(n => n !== VERSIO).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fontti = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fontti) return;

  const sivu = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (sivu) {
    e.respondWith(
      fetch(url.href, { cache: 'no-store' })
        .then(vastaus => {
          if (vastaus.ok) {
            const kopio = vastaus.clone();
            caches.open(VERSIO).then(c => c.put('./', kopio));
          }
          return vastaus;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(osuma => osuma || fetch(req).then(vastaus => {
      if (vastaus.ok || vastaus.type === 'opaque') {
        const kopio = vastaus.clone();
        caches.open(VERSIO).then(c => c.put(req, kopio));
      }
      return vastaus;
    }))
  );
});
