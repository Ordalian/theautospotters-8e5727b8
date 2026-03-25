// Push notification handler for service worker
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Autospotter", body: event.data.text() };
  }

  const title = data.title || "Autospotter";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "default",
    data: { url: data.url || "/home" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only allow navigation to same-origin paths to prevent open redirect
  const raw = event.notification.data?.url || "/home";
  let url;
  try {
    const parsed = new URL(raw, self.location.origin);
    url = parsed.origin === self.location.origin ? parsed.href : self.location.origin + "/home";
  } catch {
    url = self.location.origin + "/home";
  }
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
