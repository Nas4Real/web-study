import { chromium } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
// @ts-expect-error TS5097: Node 24 native TypeScript requires the real extension.
import { providerTimeline, summarize } from "./metrics.ts";

const origin = "http://localhost:3100";
const dataset = process.env.PERF_DATASET ?? "empty";
if (!["empty", "populated"].includes(dataset)) throw new Error("Invalid profiling dataset");
const email = process.env[`PERF_${dataset.toUpperCase()}_EMAIL`];
const password = process.env[`PERF_${dataset.toUpperCase()}_PASSWORD`];
if (!email?.startsWith("codex.perf.") || !password) throw new Error("Dedicated test credentials required");
const count = Number(process.env.PERF_SAMPLES ?? 10);
if (!Number.isInteger(count) || count < 1 || count > 30) throw new Error("Invalid sample count");
const targets = [
  { path: "/tasks", label: "Tasks", ready: 'main [aria-label="Task status"]' },
  { path: "/calendar", label: "Calendar", ready: 'main [aria-label="Calendar view"]' },
  { path: "/documents", label: "Documents", ready: 'main [aria-label="Uploads are unavailable until storage is connected"]' },
  { path: "/settings", label: "Settings", ready: 'main #subjects' },
  { path: "/", label: "Dashboard", ready: 'main [aria-label="Today\'s summary"]' },
];
const logPath = "test-results/performance/provider-calls.jsonl";
const readLog = () => readFile(logPath, "utf8").catch(() => "");
// Ignore previous runs, whose numeric IDs can collide after a server restart.
const logBoundary = (await readLog()).length;
type ProviderRow = { requestId: string | null; route: string; kind: string; start: number; end: number; status: number | null; failed: boolean };
type Sample = { destination: string; requestId: string; documentHeadersMs: number; observedReadyMs: number; provider: ReturnType<typeof providerTimeline> };
const samples: Sample[] = [];
const seenIds = new Set<string>();
const browser = await chromium.launch();
let complete = false;
try {
  const login = await browser.newContext();
  const page = await login.newPage();
  await page.goto(`${origin}/sign-in`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.locator('main h1:text-is("Overview")').waitFor();
  const storageState = await login.storageState(); // Memory only, never persisted.
  await login.close();
  for (const target of targets) {
    for (let i = 0; i < count; i++) {
      const context = await browser.newContext({ storageState, viewport: { width: 1440, height: 900 }, timezoneId: "Africa/Tunis" });
      const page = await context.newPage();
      let headerTime: number | undefined;
      page.on("response", response => {
        if (response.request().isNavigationRequest() && response.request().frame() === page.mainFrame()) headerTime = performance.now();
      });
      const start = performance.now();
      const response = await page.goto(`${origin}${target.path}`, { waitUntil: "domcontentloaded" });
      const requestId = await response?.headerValue("x-perf-request");
      if (!requestId || !/^\d+$/.test(requestId) || seenIds.has(requestId) || response?.status() !== 200 || headerTime === undefined) {
        throw new Error("Document correlation unavailable; ensure one traced local production server");
      }
      seenIds.add(requestId);
      await page.locator(target.ready).waitFor();
      const observedReadyMs = performance.now() - start;
      // This tail allows completed provider events to flush; excluded from readiness.
      await page.waitForTimeout(500);
      const rows = (await readLog()).slice(logBoundary).trim().split("\n").filter(Boolean).map(line => JSON.parse(line) as ProviderRow);
      const calls = rows.filter(row => row.requestId === requestId && row.route === target.path);
      if (!calls.length) throw new Error("Provider attribution missing; no zero-call claim made");
      const provider = providerTimeline(calls);
      samples.push({ destination: target.label, requestId, documentHeadersMs: headerTime - start, observedReadyMs, provider });
      console.log(`${dataset} ${target.label} initial ${i + 1}/${count}: ${calls.length} provider calls`);
      await context.close();
    }
  }
  complete = true;
} catch {
  // Do not print provider/browser errors that may contain private data.
} finally {
  await browser.close();
}
const groups = targets.map(target => {
  const rows = samples.filter(sample => sample.destination === target.label);
  const counts = (kind: string) => summarize(rows.map(sample => sample.provider.counts[kind] ?? 0));
  return { destination: target.label, samples: rows.length, documentHeadersMs: summarize(rows.map(row => row.documentHeadersMs)), observedReadyMs: summarize(rows.map(row => row.observedReadyMs)), profile: counts("profile"), authUser: counts("auth-user"), subject: counts("subject"), calendar: counts("calendar"), providerBusyMs: summarize(rows.flatMap(row => row.provider.busyMs === null ? [] : [row.provider.busyMs])), providerSpanMs: summarize(rows.flatMap(row => row.provider.spanMs === null ? [] : [row.provider.spanMs])), providerErrors: rows.reduce((sum, row) => sum + row.provider.errors, 0) };
});
await mkdir("test-results/performance", { recursive: true });
await writeFile(`test-results/performance/local-initial-${dataset}.json`, JSON.stringify({ complete, commit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(), diagnostic: "initial-entry harness working-tree addition", date: new Date().toISOString(), browser: browser.version(), origin, dataset, count, viewport: [1440, 900], timezone: "Africa/Tunis", cpu: "unthrottled", network: "unthrottled", groups, samples }, null, 2));
console.log("Sanitized initial-entry report saved; no auth state, bodies or raw URLs saved.");
if (!complete) throw new Error("Initial-entry profiling incomplete; check traced local server and test login. Partial sanitized report saved.");
