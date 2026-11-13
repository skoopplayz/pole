# Polestar

Choose **Settings → General → Proxy transport** to switch between Libcurl (default) and Epoxy. Both use your configured Wisp URL; the selection persists across reloads. Restart the Node server after installing the Epoxy dependency so the `/epoxy/` assets are served. Reload existing pages if their in-flight requests were interrupted by a transport change.

Run `npm install` then `npm start`, and open http://localhost:8080. Restart the Node server after server.js changes. Node 20+ is required; use localhost or HTTPS for service workers.

The shell uses Lucide, Geist from Google Fonts with bundled fallback, and same-origin favicon delivery. The Arc-inspired sidebar includes draggable tabs, persistent bookmarks, collapsible navigation, fullscreen, and split view. Open two websites before enabling split view; drag the divider or focus it and use arrow keys to resize.

Settings offers four themes with previews, reduced motion, glass effects, search provider, recent-page storage, cloaking, and a configurable Wisp WebSocket URL. New profiles use the Mercury Workshop demo WSS endpoint; existing saved URLs are preserved. The demo is for personal testing; configure your own service for public deployment. The bundled local endpoint is ws://localhost:8080/wisp/.

Search suggestions use local recent history. Recent pages and bookmarks are stored in this browser. Favicons are retrieved from Google's favicon service through a fixed-host server endpoint.

