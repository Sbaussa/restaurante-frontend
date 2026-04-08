self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "El Nuevo Baratón", {
      body:  data.body  || "",
      icon:  data.icon  || "/iconoweb.ico",
      badge: "/iconoweb.ico",
      vibrate: [200, 100, 200],
      tag:  "order-notification",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("orders") && "focus" in client)
          return client.focus();
      }
      if (clients.openWindow)
        return clients.openWindow("/orders");
    })
  );
});