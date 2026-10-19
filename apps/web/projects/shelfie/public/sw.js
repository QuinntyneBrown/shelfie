// The push worker: shows a notification when a message arrives and opens the page when it is tapped.
// It caches nothing and has no offline behaviour (docs/adr/0016-push-with-a-push-only-service-worker.md).

self.addEventListener('push', (event) => {
  let message;
  try {
    message = event.data.json();
  } catch {
    return;
  }
  const { title, body, tag, url } = message;
  if (!title) return;
  event.waitUntil(self.registration.showNotification(title, { body, tag, icon: '/logo.png', data: { url } }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const wanted = new URL(event.notification.data?.url ?? '/shelf', self.location.origin);
  const target = wanted.origin === self.location.origin ? wanted.href : new URL('/shelf', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (windows[0]) {
        await windows[0].focus();
        await windows[0].navigate(target);
      } else {
        await self.clients.openWindow(target);
      }
    })(),
  );
});
