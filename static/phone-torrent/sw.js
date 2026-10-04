/* Phone Torrent is now Swarmdeck, at /swarmdeck/. An app installed from /phone-torrent/ still has
 * its old service worker there, which would go on serving the old app from its cache. This one takes
 * its place when the browser next checks for an update: it steps aside and reloads the pages it had,
 * which then land on the redirect next to it. The caches are left alone: Swarmdeck uses the same
 * names on this origin. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    const pages = await self.clients.matchAll({ type: 'window' });
    for (const page of pages) page.navigate(page.url).catch(() => {});
  })());
});
