import { chromium, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
// Node's native TypeScript runner requires the real extension.
// @ts-expect-error TS5097: supported by the Node 24 runner used below.
import { classifyResource, correlateProviderTimeline, summarize } from "./metrics.ts";

const origin = process.env.PERF_ORIGIN ?? "https://web-study-pearl.vercel.app";
if (!["https://web-study-pearl.vercel.app", "http://localhost:3100"].includes(origin)) throw new Error("Profiling origin must be the existing app or local production server");
const correlateProvider = process.env.PERF_CORRELATE_PROVIDER === "true";
if (correlateProvider && origin !== "http://localhost:3100") throw new Error("Provider correlation is local-only");
const readProviderLog = () => readFile("test-results/performance/provider-calls.jsonl", "utf8").catch(() => "");
const providerLogBoundary = correlateProvider ? (await readProviderLog()).length : 0;
const dataset = process.env.PERF_DATASET ?? "empty";
if (!["empty", "populated"].includes(dataset)) throw new Error("Invalid dataset");
const email = process.env[`PERF_${dataset.toUpperCase()}_EMAIL`];
const password = process.env[`PERF_${dataset.toUpperCase()}_PASSWORD`];
if (!email?.startsWith("codex.perf.") || !password) throw new Error("Dedicated profiling credentials required");
const count = Number(process.env.PERF_SAMPLES ?? 10);
if (!Number.isInteger(count) || count < 1 || count > 30) throw new Error("Invalid sample count");

const destinations = [
  { path: "/tasks", label: "Tasks", ready: 'main [aria-label="Task status"]' },
  { path: "/calendar", label: "Calendar", ready: 'main [aria-label="Calendar view"]' },
  { path: "/documents", label: "Documents", ready: 'main [aria-label="Uploads are unavailable until storage is connected"]' },
  { path: "/settings", label: "Settings", ready: 'main #subjects' },
  { path: "/", label: "Dashboard", ready: 'main [aria-label="Today\'s summary"]' },
];
const requestedDestinations = process.env.PERF_DESTINATIONS?.split(",");
if (requestedDestinations?.some(label => !destinations.some(d => d.label === label))) throw new Error("Unknown destination");
const selectedDestinations = requestedDestinations ? destinations.filter(d => requestedDestinations.includes(d.label)) : destinations;
const modes = process.env.PERF_MODES?.split(",") ?? ["first-visit", "warm"];
if (modes.some(mode => !["first-visit", "warm"].includes(mode))) throw new Error("Unknown navigation mode");
const browser = await chromium.launch();
const login = await browser.newContext();
const loginPage = await login.newPage();
loginPage.setDefaultTimeout(30000);
try {
  await loginPage.goto(`${origin}/sign-in`);
  await loginPage.locator('input[type="email"]').fill(email);
  await loginPage.locator('input[type="password"]').fill(password);
  await loginPage.getByRole("button", { name: "Sign In", exact: true }).click();
  await loginPage.locator('main h1:text-is("Overview")').waitFor();
} catch {
  await browser.close();
  throw new Error("Test-user login failed; no credentials or page content recorded");
}
// Auth state remains in memory, never written into a trace/report.
const storageState = await login.storageState();
await login.close();

type Resource = { kind: string; start: number; headers?: number; firstByte?: number; lastByte?: number; end?: number; terminal?: number; failed?: boolean; cancelled?: boolean; providerRequestId?: string; destinationRsc?: boolean; prefetch?: boolean };
type TraceEvent = { name: string; ts: number; dur?: number };
type Sample = { dataset: string; destination: string; mode: string; input: string; click: number; feedback: number; shellFeedback: number; domReady: number; frameAfterReady: number; firstPaint: number | null; resources: Resource[]; longTasks: { start: number; duration: number }[]; scriptEvaluationMs: number; provider: ReturnType<typeof correlateProviderTimeline> };
const samples: Sample[] = [];
let failed = false;

async function navigate(page: Page, destination: typeof destinations[number], input: string) {
  if (input === "search") {
    const search = page.getByRole("combobox", { name: "Search Web Study navigation" }).first();
    await search.fill(destination.label);
    await search.press("Enter");
  } else {
    await page.locator(`nav a[href="${destination.path}"]`).filter({ visible: true }).first().click();
  }
  await page.locator(destination.ready).waitFor();
}

try {
  for (const destination of selectedDestinations) {
    for (const input of ["sidebar", "search"]) {
      for (const mode of modes) {
        for (let i = 0; i < count; i++) {
          // The approved sidebar exposes search only in the mobile header.
          const viewport = input === "search" ? { width: 375, height: 812 } : { width: 1440, height: 900 };
          const context = await browser.newContext({ storageState, viewport, timezoneId: "Africa/Tunis" });
          const page = await context.newPage();
          page.setDefaultTimeout(30000);
          const source = destination.path === "/" ? "/tasks" : "/";
          const sourceReady = destinations.find((d) => d.path === source)!.ready;
          await page.goto(`${origin}${source}`);
          await page.locator(sourceReady).waitFor();
          if (mode === "warm") {
            await navigate(page, destination, input);
            await navigate(page, destinations.find((d) => d.path === source)!, input);
            await page.waitForURL((url) => url.pathname === source);
            await page.locator(sourceReady).waitFor();
          }
          if (input === "search") await page.getByRole("combobox", { name: "Search Web Study navigation" }).first().fill(destination.label);
          const cdp = await context.newCDPSession(page);
          await cdp.send("Network.enable");
          await cdp.send("Performance.enable");
          const clock = await cdp.send("Performance.getMetrics");
          const timestamp = clock.metrics.find((m: { name: string }) => m.name === "Timestamp");
          if (!timestamp) throw new Error("CDP monotonic clock unavailable");
          const monotonic = timestamp.value * 1000;
          const pageTime = await page.evaluate(() => performance.now());
          const offset = monotonic - pageTime;
          const resources = new Map<string, Resource>();
          cdp.on("Network.requestWillBeSent", (event) => {
            const kind = classifyResource(event.request.url, new URL(origin).host, event.type ?? "unknown");
            if (kind !== "other") resources.set(event.requestId, {
              kind, start: event.timestamp * 1000 - offset,
              destinationRsc: kind === "rsc" && new URL(event.request.url).pathname === destination.path,
              prefetch: Object.entries(event.request.headers).some(([key, value]) => key.toLowerCase() === "next-router-prefetch" && value === "1"),
            });
          });
          cdp.on("Network.responseReceived", (event) => { const r = resources.get(event.requestId); if (r) { r.headers = event.timestamp * 1000 - offset; const id = event.response.headers["x-perf-request"]; if (typeof id === "string" && /^\d+$/.test(id)) r.providerRequestId = id; } });
          cdp.on("Network.dataReceived", (event) => { const r = resources.get(event.requestId); if (r) { r.lastByte = event.timestamp * 1000 - offset; r.firstByte ??= r.lastByte; } });
          cdp.on("Network.loadingFinished", (event) => { const r = resources.get(event.requestId); if (r) r.end = event.timestamp * 1000 - offset; });
          cdp.on("Network.loadingFailed", (event) => { const r = resources.get(event.requestId); if (r) { r.failed = true; r.cancelled = event.canceled ?? false; r.terminal = event.timestamp * 1000 - offset; } });
          const trace: TraceEvent[] = [];
          cdp.on("Tracing.dataCollected", ({ value }) => {
            for (const e of value) if (["Paint", "EvaluateScript", "FunctionCall"].includes(e.name)) trace.push({ name: e.name, ts: Number(e.ts), dur: Number(e.dur ?? 0) });
          });
          await cdp.send("Tracing.start", { categories: "devtools.timeline", transferMode: "ReportEvents" });
          await page.evaluate(({ path, ready, label }) => {
            const state = { click: 0, feedback: 0, shellFeedback: 0, domReady: 0, frameAfterReady: 0, longTasks: [] as { start: number; duration: number }[] };
            Object.assign(window, { navigationMeasurement: state });
            new PerformanceObserver((list) => { for (const e of list.getEntries()) state.longTasks.push({ start: e.startTime, duration: e.duration }); }).observe({ type: "longtask" });
            const inspect = () => {
              const time = performance.now();
              const pendingDestination = [...document.querySelectorAll('[role="status"]')].some(element =>
                element.textContent?.includes(`Loading ${label}`) && element.getBoundingClientRect().width > 0,
              );
              if (!state.feedback && (pendingDestination || document.querySelector(`nav a[aria-current="page"][href="${path}"]`) || document.querySelector('main [role="status"]') || (location.pathname === path && document.querySelector(ready)))) state.feedback = time;
              if (!state.shellFeedback && location.pathname === path && document.querySelector('main [aria-busy="true"] [role="status"]')?.textContent?.includes(`Loading ${label}`)) state.shellFeedback = time;
              if (!state.domReady && location.pathname === path && document.querySelector(ready)) {
                state.domReady = time;
                requestAnimationFrame(() => requestAnimationFrame(() => { state.frameAfterReady = performance.now(); }));
              }
              if (!state.frameAfterReady) requestAnimationFrame(inspect);
            };
            const start = () => { if (!state.click) { state.click = performance.now(); requestAnimationFrame(inspect); } };
            document.addEventListener("click", start, { once: true, capture: true });
            document.addEventListener("keydown", (e) => { if (e.key === "Enter") start(); }, { once: true, capture: true });
          }, { path: destination.path, ready: destination.ready, label: destination.label });
          if (input === "search") await page.getByRole("combobox", { name: "Search Web Study navigation" }).first().press("Enter");
          else await page.locator(`nav a[href="${destination.path}"]`).filter({ visible: true }).first().click();
          await page.waitForFunction(() => (window as Window & { navigationMeasurement?: { frameAfterReady: number } }).navigationMeasurement?.frameAfterReady);
          // Capture any stream tail; this delay is not included in the usability milestone.
          await page.waitForTimeout(500);
          const state = await page.evaluate(() => (window as Window & { navigationMeasurement?: Omit<Sample, "dataset" | "destination" | "mode" | "input" | "resources" | "firstPaint" | "scriptEvaluationMs" | "provider"> }).navigationMeasurement);
          if (!state) throw new Error("Navigation instrumentation was lost");
          const complete = new Promise<void>((resolve) => cdp.once("Tracing.tracingComplete", () => resolve()));
          await cdp.send("Tracing.end");
          await complete;
          const relevant = trace.filter((e) => e.ts / 1000 - offset >= state.domReady);
          const firstPaint = relevant.filter((e) => e.name === "Paint").sort((a, b) => a.ts - b.ts)[0];
          const destinationRequests = [...resources.values()].filter(resource => resource.destinationRsc && !resource.prefetch);
          let provider: Sample["provider"] = null;
          if (correlateProvider) {
            if (destinationRequests.length !== 1) throw new Error("Expected one attributable destination RSC request");
            provider = correlateProviderTimeline(await readProviderLog(), providerLogBoundary, destinationRequests[0].providerRequestId, destination.path);
            if (!provider) throw new Error("Provider correlation missing; no zero-call claim made");
          }
          samples.push({ ...state, dataset, destination: destination.label, mode, input, resources: [...resources.values()], provider, firstPaint: firstPaint ? firstPaint.ts / 1000 - offset : null, scriptEvaluationMs: trace.filter((e) => e.name === "EvaluateScript").reduce((sum, e) => sum + (e.dur ?? 0) / 1000, 0) });
          console.log(`${dataset} ${destination.label} ${input} ${mode} ${i + 1}/${count}: ${Math.round(state.frameAfterReady - state.click)} ms`);
          await context.close();
        }
      }
    }
  }
} catch {
  failed = true;
} finally {
  await browser.close();
}

const groups = selectedDestinations.flatMap((d) => ["sidebar", "search"].flatMap((input) => modes.map((mode) => {
  const group = samples.filter((s) => s.destination === d.label && s.input === input && s.mode === mode);
  const destinationRequests = (sample: Sample) => sample.resources.filter(resource => resource.destinationRsc && !resource.prefetch);
  return {
    destination: d.label, input, mode,
    feedbackMs: summarize(group.map(s => s.feedback - s.click)),
    shellFeedbackMs: summarize(group.filter(s => s.shellFeedback > 0).map(s => s.shellFeedback - s.click)),
    shellSamples: group.filter(s => s.shellFeedback > 0).length,
    usableFrameMs: summarize(group.map(s => s.frameAfterReady - s.click)),
    readyToFrameMs: summarize(group.map(s => s.frameAfterReady - s.domReady)),
    providerSamples: group.filter(s => s.provider !== null).length,
    providerSpanMs: summarize(group.flatMap(s => s.provider?.spanMs == null ? [] : [s.provider.spanMs])),
    providerErrors: group.reduce((total, s) => total + (s.provider?.errors ?? 0), 0),
    destinationRscCounts: summarize(group.map(s => destinationRequests(s).length)),
    headersToReadyMs: summarize(group.flatMap(s => destinationRequests(s).flatMap(resource => resource.headers === undefined ? [] : [s.domReady - resource.headers]))),
  };
})));
await mkdir("test-results/performance", { recursive: true });
const environment = new URL(origin).hostname === "localhost" ? "local" : "hosted";
await writeFile(`test-results/performance/${environment}-${dataset}.json`, JSON.stringify({ complete: !failed, commit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(), deployedCommit: process.env.PERF_DEPLOYED_COMMIT ?? null, origin: new URL(origin).origin, browser: browser.version(), date: new Date().toISOString(), viewport: { sidebar: [1440, 900], search: [375, 812] }, cpu: "unthrottled", network: "unthrottled", dataset, count, groups, samples }, null, 2));
console.log("Sanitized report saved. No raw traces, bodies, headers, URLs, or auth state saved.");
if (failed) throw new Error("Profiling incomplete; inspect harness selectors/authentication. Partial sanitized samples saved.");
