import { AsyncLocalStorage } from "node:async_hooks";
import { channel } from "node:diagnostics_channel";
import { appendFileSync, mkdirSync } from "node:fs";
import { Server } from "node:http";
import { classifyProvider } from "./metrics.ts";

// Explicit local-only diagnostic preload, not imported by the application.
if (process.env.PERF_PROVIDER_TIMING === "true") {
  if (process.env.NEXT_PUBLIC_APP_ORIGIN !== "http://localhost:3100") throw new Error("Provider tracing is local-only");
  mkdirSync("test-results/performance", { recursive: true });
  const scope = new AsyncLocalStorage();
  const originalEmit = Server.prototype.emit;
  let sequence = 0;
  Server.prototype.emit = function (event, ...args) {
    if (event !== "request") return originalEmit.call(this, event, ...args);
    const [request, response] = args;
    const pathname = new URL(request.url, "http://localhost:3100").pathname;
    const route = ["/", "/tasks", "/calendar", "/documents", "/settings"].includes(pathname) ? pathname : "other";
    const requestId = String(++sequence);
    response.setHeader("x-perf-request", requestId);
    return scope.run({ requestId, route }, () => originalEmit.call(this, event, ...args));
  };
  const requests = new WeakMap();
  const providerOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
  channel("undici:request:create").subscribe(({ request }) => {
    if (String(request.origin) !== providerOrigin) return;
    requests.set(request, { ...scope.getStore(), kind: classifyProvider(request.path), start: performance.now() });
  });
  channel("undici:request:headers").subscribe(({ request, response }) => {
    const timing = requests.get(request);
    if (timing) { timing.headers = performance.now(); timing.status = response.statusCode; }
  });
  function complete(request, failed) {
    const timing = requests.get(request);
    if (!timing) return;
    requests.delete(request);
    const end = performance.now();
    // Explicit allowlisted numeric/category data only; never log URLs or headers.
    appendFileSync("test-results/performance/provider-calls.jsonl", JSON.stringify({ event: "provider-call", requestId: timing.requestId ?? null, route: timing.route ?? "unattributed", kind: timing.kind, start: timing.start, headers: timing.headers ?? null, end, duration: end - timing.start, status: timing.status ?? null, failed }) + "\n");
  }
  channel("undici:request:trailers").subscribe(({ request }) => complete(request, false));
  channel("undici:request:error").subscribe(({ request }) => complete(request, true));
}
