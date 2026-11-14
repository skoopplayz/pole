import express from "express";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const app = express();
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "0.0.0.0";
const defaultWispUrl = process.env.WISP_URL || "";
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Polestar: PORT must be between 1 and 65535");
if (defaultWispUrl && !/^wss?:\/\//.test(defaultWispUrl)) throw new Error("Polestar: WISP_URL must use ws:// or wss://");
const dirOf = (specifier) => path.dirname(require.resolve(specifier));

app.disable("x-powered-by");
app.use((_request, response, next) => {
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

app.use("/scram/", express.static(scramjetPath));
app.use("/utils/", express.static(dirOf("@mercuryworkshop/scramjet-utils")));
app.use("/controller/", express.static(dirOf("@mercuryworkshop/scramjet-controller")));
app.use("/libcurl/", express.static(dirOf("@mercuryworkshop/libcurl-transport")));
app.use("/epoxy/", express.static(dirOf("@mercuryworkshop/epoxy-transport")));
app.use("/lucide/", express.static(path.join(dirOf("lucide"), "..", "umd")));
app.use("/fonts/geist/", express.static(path.join(__dirname, "node_modules/geist/dist/fonts/geist-sans")));
app.get("/api/config", (_request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.json({ wispUrl: defaultWispUrl });
});
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"], maxAge: 0 }));

app.get("/api/favicon", async (request, response) => {
  const domain = String(request.query.domain || "");
  if (!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain) || domain.length > 253) return response.sendStatus(400);
  try {
    const upstream = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`, { signal: AbortSignal.timeout(6000) });
    if (!upstream.ok) return response.sendStatus(404);
    response.setHeader("Cache-Control", "public, max-age=86400");
    response.type(upstream.headers.get("content-type") || "image/png");
    response.send(Buffer.from(await upstream.arrayBuffer()));
  } catch { response.sendStatus(502); }
});

app.get("/health", (_request, response) => {
  response.json({ name: "Polestar", wisp: "/wisp/", status: "ready" });
});

const server = http.createServer(app);
wisp.options.allow_private_ips = false;
wisp.options.allow_loopback_ips = false;
wisp.options.dns_result_order = "ipv4first";
const sockets = new Set();
server.on("connection", (socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
});
server.on("upgrade", (request, socket, head) => {
  const requestPath = new URL(request.url ?? "/", "http://localhost").pathname;
  if (requestPath === "/wisp/") {
    request.url = requestPath;
    wisp.routeRequest(request, socket, head);
    return;
  }
  socket.end();
});

server.listen(port, host, () => {
  console.log(`✦ Polestar is ready at http://localhost:${port}`);
  console.log(`  Polestar listening on ${host}:${port}; Wisp mounted at /wisp/`);
});

function shutdown() {
  console.log("Polestar is shutting down");
  server.close(() => process.exit(0));
  for (const socket of sockets) socket.destroy();
  setTimeout(() => process.exit(1), 10000).unref();
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
