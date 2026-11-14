# Polestar

A vertical-tab browser shell using Scramjet 2, selectable Epoxy/Libcurl transports, and a bundled Wisp WebSocket server. Requires a long-running Node server or Docker container, not static hosting or short-lived serverless functions.

## Run locally

Use Node 22 LTS (the Docker image pins the same major version):

```sh
npm ci
npm start
```

Open `http://localhost:8080`. After changing server dependencies or routes, restart the server and reload the browser. HTTPS is required away from localhost for service workers and cross-origin isolation. The host must preserve the COOP/COEP headers set by Express.

```sh
docker build -t polestar .
docker run --rm -p 8080:8080 polestar
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | HTTP and WebSocket listen port; honors platform-assigned ports. |
| `HOST` | `0.0.0.0` | Bind address; keep this for containers. |
| `WISP_URL` | unset | Optional public `wss://your-wisp.example/wisp/` endpoint for new profiles. Never put secrets here: this value is sent to the browser. |

With no `WISP_URL`, browsers use the current deployment's `/wisp/`, automatically choosing `wss://` on HTTPS and `ws://` on localhost. No hard-coded third-party demo server is required. Existing saved settings are preserved: choose **Settings → General → Use this host’s Wisp → Save changes** to migrate an older profile. A custom endpoint must actually implement Wisp, allow your origin, and accept TCP streams. Use its exact path; trailing slashes are normalized. Both transports require an endpoint without query parameters or embedded credentials.

`GET /health` is a process health check, not proof an external Wisp server or destination website is reachable. `GET /api/config` provides only the public default endpoint. Both transports and their WASM assets are served locally under `/epoxy/` and `/libcurl/`.

## Deployment

Connect your copy of this repository to the platform. These configurations prepare deployment; they do not create an account, purchase resources, or publish automatically. Review the host's current pricing, bandwidth limits, and acceptable-use policy before running a proxy. No persistent disk is needed; tabs, settings, recents, and bookmarks live in the browser.

### Render

Create a Blueprint from this repository using `render.yaml`. It builds the Dockerfile and checks `/health`. Alternatively create a Docker Web Service with port `8080`. The included Blueprint requests the free plan; choose another plan if it is unavailable or unsuitable. Use the generated HTTPS URL. A sleeping instance may need a wake-up request followed by **Retry connection**.

Official guide: [Render Express deployment](https://render.com/docs/deploy-node-express-app).

### Koyeb

Create a Web Service from this repository, select the **Dockerfile** builder, expose port **8080 / HTTP**, route `/` to that port, and configure an HTTP health check at `/health`. Set `PORT=8080` and `HOST=0.0.0.0`. Keep the Docker command; don't override it with a static-site command. Open the generated HTTPS domain.

Official guide: [Koyeb health checks](https://www.koyeb.com/docs/run-and-scale/health-checks).

### Railway

Create a service from this GitHub repository. Railway detects the Dockerfile. In service settings configure health check `/health`, generate a public domain, and route it to the listening `PORT` (or explicitly set `PORT=8080` and target port 8080). Leave the start command unset to use the Docker CMD. WebSocket upgrades use the same service and port as HTTP.

This repository deliberately does not add a legacy `railway.json`: Railway's [configuration documentation](https://docs.railway.com/config-as-code/reference) marks Config as Code deprecated, with legacy support ending December 1, 2026. Docker plus service settings avoids that dependency.

### Fly.io

Install/authenticate the official Fly CLI, then create your own globally unique app name:

```sh
fly apps create YOUR_UNIQUE_APP_NAME
fly deploy --app YOUR_UNIQUE_APP_NAME
```

The provided `fly.toml` uses the Dockerfile, internal port 8080, HTTPS, `/health`, and a 512 MB shared VM. Pass `--app` because the shared template intentionally contains no account-specific app name. Its minimum running count is zero: expect a cold start after autostop. To keep a machine running, set `min_machines_running = 1` (additional charges can apply).

Official reference: [Fly app configuration](https://fly.io/docs/reference/configuration/).

### Glitch

Glitch cannot host this app: [its project hosting ended July 8, 2025](https://blog.glitch.com/post/changes-are-coming-to-glitch/). Use one of the four options above instead; the old Glitch free-hosting table is no longer accurate.

## Epoxy and Libcurl

Choose **Settings → General → Proxy transport**. The application imports the selected engine directly into the Scramjet 2 controller; it does not pass `epoxy` as Libcurl's internal transport type. Libcurl explicitly uses its `wisp` backend. Epoxy uses Wisp v1 mode for compatibility with both v1 and v2 endpoints, without requiring a UDP extension.

Changing transport validates the Wisp handshake before installing the new engine, then reloads existing frames so their old WebSockets cannot keep using the previous transport. Tabs remain open, but scroll position and unsaved page forms may reset during this explicit change. Ordinary tab switching does not reload pages. Failed startup can be retried from Settings instead of requiring a cleared browser profile.

Troubleshooting:

- **Module import/MIME/404 errors:** restart the Node service after `npm ci`; verify `/epoxy/index.mjs` and `/libcurl/index.mjs` return JavaScript, not an HTML fallback.
- **Wisp timeout:** verify the exact path, wake the host if sleeping, and click Retry connection. The status badge confirms a Wisp handshake and initialized Scramjet, not that every remote site works.
- **Mixed content:** an HTTPS app must use `wss://`, never `ws://`.
- **SSL connect error / Libcurl code 35:** the destination TLS connection failed. Try the other transport and your own Wisp endpoint. This is not fixed by disabling TLS verification; Polestar does not do so. Some destinations block proxy/datacenter traffic.
- **Scramjet rewriting error:** this project pins an alpha Scramjet build. Site-specific rewriting bugs can still occur independently of a healthy transport.

Before exposing an instance publicly, add an authentication/access-control layer that covers **both HTTP and WebSocket upgrades**, plus suitable rate limits. The bundled Wisp server blocks loopback/private destinations by default but is not a complete security boundary or multi-user service. Do not deploy it on a network containing sensitive services without proper network isolation. Hosting compatibility is not a promise that a provider permits public proxies.

## Appearance and local features

The Open Sauce Sans SemiBold wordmark is an outlined SVG with a north star, so it doesn't depend on a client font download. Its font license is in `public/licenses/OpenSauceSans-OFL.txt`. Geist and Lucide remain the interface font and icon set.

Appearance includes Aurora (unchanged default), Midnight, Ember, Frost, **Dark · Black**, and **Light · White**, plus glass effects and reduced motion. Cancel restores the saved theme after preview. Bookmarks, editable pinned shortcuts, recent pages, split view, and fullscreen are available; extensions and downloads remain removed. Search suggestions use local recent history. Favicons are fetched through the server from Google's fixed-host favicon service.

## Main files

```text
Dockerfile / .dockerignore    Portable container build
render.yaml                  Render Blueprint
fly.toml                     Fly deployment template
server.js                    Express assets, health/config, Wisp upgrade
public/index.html            Browser shell and settings
public/app.js                Tabs and application state
public/transport.js          Engine factory, URL validation, Wisp probe
public/sw.js                 Scramjet service worker
public/style.css             Base styles
public/finish.css            UI polish and optional monochrome themes
public/polestar-logo.svg      Self-contained outlined wordmark
public/licenses/             Font license
```

