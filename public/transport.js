export function normalizeWispUrl(value, pageUrl = location.href) {
  const page = new URL(pageUrl);
  const fallback = new URL("/wisp/", page);
  fallback.protocol = page.protocol === "https:" ? "wss:" : "ws:";
  const url = new URL(value || fallback.href);
  if (!["ws:", "wss:"].includes(url.protocol)) throw new Error("Use a ws:// or wss:// Wisp URL.");
  if (page.protocol === "https:" && url.protocol !== "wss:") throw new Error("HTTPS deployments require a secure wss:// Wisp server.");
  if (url.username || url.password || url.hash) throw new Error("Wisp URLs cannot contain credentials or fragments.");
  if (url.search) throw new Error("Use a Wisp endpoint without query parameters for compatibility with both transports.");
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.href;
}

export function probeWisp(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";
    let finished = false;
    const finish = (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      socket.close();
      if (error) reject(error);
      else resolve();
    };
    const timeout = setTimeout(() => finish(new Error("Wisp timed out. Wake the host or check the endpoint, then retry.")), timeoutMs);
    socket.addEventListener("message", (event) => {
      if (!(event.data instanceof ArrayBuffer)) return;
      const packet = new Uint8Array(event.data);
      if (packet.length >= 9 && packet[0] === 3 && new DataView(event.data).getUint32(1, true) === 0) finish();
    });
    socket.addEventListener("error", () => finish(new Error("Cannot connect to Wisp. Check the URL and WebSocket support.")));
    socket.addEventListener("close", () => finish(new Error("The server closed before a Wisp handshake. Use a Wisp endpoint, not a website URL.")));
  });
}

export async function createTransport(config) {
  const wisp = normalizeWispUrl(config.wispUrl);
  if (!["epoxy", "libcurl"].includes(config.transport)) throw new Error("Choose Epoxy or Libcurl.");
  const module = config.transport === "epoxy" ? await import("/epoxy/index.mjs") : await import("/libcurl/index.mjs");
  const options = config.transport === "epoxy" ? { wisp, wisp_v2: false } : { wisp, transport: "wisp" };
  const transport = new module.default(options);
  let timer;
  try {
    await Promise.race([
      transport.init(),
      new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error(`${config.transport} initialization timed out. Restart Polestar and reload to refresh its assets.`)), 20000); })
    ]);
  } finally { clearTimeout(timer); }
  if (!transport.ready) throw new Error(`${config.transport} could not initialize.`);
  return transport;
}
