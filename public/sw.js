importScripts("/controller/controller.sw.js");
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const waitingRoutes = new Set();
self.addEventListener("message", (event) => {
  if (event.data?.$controller$init) {
    for (const check of waitingRoutes) check();
  }
});

async function routeWhenReady(event) {
  if (!$scramjetController.shouldRoute(event)) {
    const ready = await new Promise((resolve) => {
      const finish = (value) => {
        clearTimeout(timeout);
        waitingRoutes.delete(check);
        resolve(value);
      };
      const check = () => {
        if ($scramjetController.shouldRoute(event)) finish(true);
      };
      const timeout = setTimeout(() => finish(false), 5000);
      waitingRoutes.add(check);
      check();
    });
    if (!ready) return new Response("Polestar is reconnecting its proxy controller. Reload this page or reopen the tab.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
  return $scramjetController.route(event);
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/~/sj/")) {
    event.respondWith(routeWhenReady(event));
  }
});
