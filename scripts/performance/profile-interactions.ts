import { chromium, expect, type Request } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
// @ts-expect-error TS5097: Node 24 native TypeScript requires the real extension.
import { classifyResource, summarize } from "./metrics.ts";
// @ts-expect-error TS5097: Node 24 native TypeScript requires the real extension.
import { installDetailProbe, type DetailProbeCriteria, type DetailProbeResult } from "./interaction-probe.ts";
// @ts-expect-error TS5097: Node 24 native TypeScript requires the real extension.
import { correlateDetailProviders } from "./detail-provider-metrics.ts";

const origin = process.env.PERF_ORIGIN ?? "https://web-study-pearl.vercel.app";
if (!["https://web-study-pearl.vercel.app", "http://localhost:3100"].includes(origin)) throw new Error("Unapproved profiling origin");
const email = process.env.PERF_POPULATED_EMAIL;
const password = process.env.PERF_POPULATED_PASSWORD;
if (!email?.startsWith("codex.perf.populated.") || !password) throw new Error("Dedicated populated test credentials required");
const count = Number(process.env.PERF_SAMPLES ?? 10);
if (!Number.isInteger(count) || count < 1 || count > 30) throw new Error("Invalid sample count");
const detailsOnly = process.env.PERF_DETAILS_ONLY === "1";
if (process.env.PERF_DETAILS_ONLY && !["0", "1"].includes(process.env.PERF_DETAILS_ONLY)) throw new Error("Invalid detail-only mode");
const correlateDetails = process.env.PERF_CORRELATE_PROVIDER === "true";
if (process.env.PERF_CORRELATE_PROVIDER && !["true", "false"].includes(process.env.PERF_CORRELATE_PROVIDER)) throw new Error("Invalid provider correlation mode");
if (correlateDetails && (!detailsOnly || origin !== "http://localhost:3100")) throw new Error("Detail provider correlation requires local read-only mode");
const readProviderLog = () => readFile("test-results/performance/provider-calls.jsonl", "utf8").catch(() => "");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: "Africa/Tunis" });
const page = await context.newPage();
page.setDefaultTimeout(30000);
type Network = { kind: string; method: string; currentRoute: boolean; prefetch: boolean | null; startMs: number; headersMs?: number; completeMs?: number; failed?: boolean };
type Sample = { scenario: string; observedReadyFrameMs: number; sampledReadyMs: number | null; sampledNextFrameMs: number | null; provider: ReturnType<typeof correlateDetailProviders> | null; network: Network[] };
const samples: Sample[] = [];
await mkdir("test-results/performance", { recursive: true });
let currentScenario = "login";
let complete = false;
let signedIn = false;

// Timing is an assertion-observed upper bound, not an exact DOM commit or paint.
async function measure(scenario: string, action: () => Promise<void>, ready: () => Promise<void>, probeCriteria?: DetailProbeCriteria) {
  currentScenario = scenario;
  const traceOpen = correlateDetails && scenario.endsWith("-detail-open");
  const logBoundary = traceOpen ? (await readProviderLog()).length : 0;
  const sourceRoute = new URL(page.url()).pathname;
  const start = performance.now();
  const requests = new Map<Request, Network>();
  const correlationIds = new Map<Network, Promise<string | null>>();
  const onRequest = (request: Request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) return;
    const kind = request.method() === "POST" ? "post" : classifyResource(request.url(), url.host, request.resourceType() === "script" ? "Script" : request.resourceType());
    if (kind !== "other") {
      const entry: Network = { kind, method: request.method(), currentRoute: url.pathname === new URL(page.url()).pathname, prefetch: null, startMs: performance.now() - start };
      requests.set(request, entry);
      // Inspect only the non-sensitive prefetch flag, never cookies/auth headers.
      void request.headerValue("next-router-prefetch").then(value => { entry.prefetch = value !== null; }).catch(() => {});
    }
  };
  const onResponse = (response: import("@playwright/test").Response) => {
    const entry = requests.get(response.request());
    if (entry) {
      entry.headersMs = performance.now() - start;
      if (traceOpen && entry.method === "POST" && entry.currentRoute) {
        correlationIds.set(entry, response.headerValue("x-perf-request").catch(() => null));
      }
    }
  };
  const onFinished = (request: Request) => { const entry = requests.get(request); if (entry) entry.completeMs = performance.now() - start; };
  const onFailed = (request: Request) => { const entry = requests.get(request); if (entry) entry.failed = true; };
  page.on("request", onRequest).on("response", onResponse).on("requestfinished", onFinished).on("requestfailed", onFailed);
  try {
    if (probeCriteria) await page.evaluate(installDetailProbe, probeCriteria);
    else await page.evaluate(() => {
      Object.assign(window, { interactionClick: 0 });
      document.addEventListener("click", () => { Object.assign(window, { interactionClick: performance.now() }); }, { capture: true, once: true });
    });
    await action();
    await ready();
    const observedReadyFrameMs = await page.evaluate(() => new Promise<number>((resolve, reject) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const click = (window as Window & { interactionClick?: number }).interactionClick;
        if (!click) { reject(new Error("Interaction click timestamp unavailable")); return; }
        resolve(performance.now() - click);
      }));
    }));
    let probe: Pick<DetailProbeResult, "readyMs" | "nextFrameMs"> = { readyMs: null, nextFrameMs: null };
    if (probeCriteria) {
      await page.waitForFunction(() => {
        const status = (window as Window & { detailProbe?: DetailProbeResult }).detailProbe?.status;
        return status === "complete" || status === "timeout" || status === "cancelled";
      });
      probe = await page.evaluate(() => {
        const result = (window as Window & { detailProbe?: DetailProbeResult }).detailProbe;
        if (result?.status !== "complete") throw new Error("Detail readiness probe incomplete");
        return { readyMs: result.readyMs, nextFrameMs: result.nextFrameMs };
      });
    }
    // Read-only close counts include a fixed one-second observation window.
    await page.waitForTimeout(1000);
    let provider: Sample["provider"] = null;
    if (traceOpen) {
      const posts = [...requests.values()].filter(entry => entry.method === "POST" && entry.currentRoute);
      const ids = await Promise.all(posts.map(entry => correlationIds.get(entry) ?? Promise.resolve(null)));
      provider = correlateDetailProviders(await readProviderLog(), logBoundary, ids, sourceRoute);
    }
    samples.push({ scenario, observedReadyFrameMs, sampledReadyMs: probe.readyMs, sampledNextFrameMs: probe.nextFrameMs, provider, network: [...requests.values()] });
    console.log(`${scenario}: ${Math.round(observedReadyFrameMs)} ms`);
  } finally {
    page.off("request", onRequest).off("response", onResponse).off("requestfinished", onFinished).off("requestfailed", onFailed);
  }
}

try {
  await page.goto(`${origin}/sign-in`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.getByRole("heading", { name: "Overview", exact: true }).waitFor();
  signedIn = true;
  for (let i = 0; i < count; i++) {
    const view = (name: string) => page.getByRole("button", { name, exact: true });
    if (!detailsOnly) {
      await page.goto(`${origin}/calendar?date=2026-10-10&view=day`);
      await expect(view("Day")).toHaveAttribute("aria-pressed", "true");
      await measure("calendar-view-week", () => view("Week").click(), async () => {
        await expect(view("Week")).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByRole("button", { name: "Open Performance session 2", exact: true })).toBeVisible();
      });
      await measure("calendar-next-week", () => view("Next period").click(), async () => {
        await expect(page).toHaveURL(/date=2026-10-17.*view=week/);
        await expect(page.getByRole("button", { name: "Open Performance session 1", exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Open Performance session 2", exact: true })).toHaveCount(0);
      });
    }
    await page.goto(`${origin}/calendar?date=2026-10-10&view=day`);
    const session = page.getByRole("dialog", { name: "Performance session 1", exact: true });
    const sessionSelector = '[role="dialog"][aria-labelledby="session-detail-title"]';
    await measure("session-detail-open", () => view("Open Performance session 1").click(), () => expect(session.getByRole("button", { name: "Edit", exact: true })).toBeEnabled(), { selector: sessionSelector, buttonText: "Edit" });
    await measure("session-read-only-close", () => session.getByRole("button", { name: "Close", exact: true }).click(), () => expect(session).toBeHidden(), { selector: sessionSelector, absent: true });

    await page.goto(`${origin}/tasks`);
    const task = page.getByRole("dialog", { name: "Performance task 1", exact: true });
    const taskSelector = '[role="dialog"][aria-labelledby="task-detail-title"]';
    await measure("task-detail-open", () => view("Open Performance task 1").click(), () => expect(task.getByText("Synthetic profiling data", { exact: true })).toBeVisible(), { selector: taskSelector, buttonText: "Complete" });
    await expect(task.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
    if (!detailsOnly) {
      await measure("task-complete-confirmed", () => task.getByRole("button", { name: "Complete", exact: true }).click(), () => expect(task.getByRole("button", { name: "Reopen", exact: true })).toBeEnabled());
      await measure("task-reopen-confirmed", () => task.getByRole("button", { name: "Reopen", exact: true }).click(), () => expect(task.getByRole("button", { name: "Complete", exact: true })).toBeEnabled());
    }
    await measure("task-read-only-close", () => task.getByRole("button", { name: "Close dialog", exact: true }).click(), () => expect(task).toBeHidden(), { selector: taskSelector, absent: true });
    if (i === 0) await page.screenshot({ path: "test-results/performance/synthetic-tasks.png" });
  }
  complete = true;
} catch {
  // No error payload, page content, user identifiers or credentials in output.
  console.log(`Interaction profiling incomplete at ${currentScenario}. ${detailsOnly ? "Detail-only mode does not mutate study data." : "Synthetic task may need reopening if a mutation failed."}`);
  if (signedIn && ["/tasks", "/calendar"].includes(new URL(page.url()).pathname)) {
    await page.screenshot({ path: "test-results/performance/synthetic-interaction-failure.png" }).catch(() => {});
  }
} finally {
  await browser.close();
}
await mkdir("test-results/performance", { recursive: true });
const groups = [...new Set(samples.map(s => s.scenario))].map(scenario => {
  const group = samples.filter(s => s.scenario === scenario);
  const providers = group.flatMap(sample => sample.provider ? [sample.provider] : []);
  const kinds = [...new Set(providers.flatMap(provider => Object.keys(provider.counts)))];
  return { scenario, providerSamples: providers.length, providerCounts: Object.fromEntries(kinds.map(kind => [kind, summarize(providers.map(provider => provider.counts[kind] ?? 0))])), providerSpanMs: summarize(providers.flatMap(provider => provider.spanMs === null ? [] : [provider.spanMs])), providerErrors: providers.reduce((sum, provider) => sum + provider.errors, 0), observedReadyFrameMs: summarize(group.map(s => s.observedReadyFrameMs)), sampledReadyMs: summarize(group.flatMap(s => s.sampledReadyMs === null ? [] : [s.sampledReadyMs])), sampledNextFrameMs: summarize(group.flatMap(s => s.sampledNextFrameMs === null ? [] : [s.sampledNextFrameMs])), rscRequests: summarize(group.map(s => s.network.filter(r => r.kind === "rsc").length)), currentRouteNonPrefetchRsc: summarize(group.map(s => s.network.filter(r => r.kind === "rsc" && r.currentRoute && r.prefetch === false).length)), unknownPrefetchFlags: summarize(group.map(s => s.network.filter(r => r.kind === "rsc" && r.prefetch === null).length)), posts: summarize(group.map(s => s.network.filter(r => r.kind === "post").length)) };
});
const environment = origin.includes("localhost") ? "local" : "hosted";
await writeFile(`test-results/performance/${environment}-interactions${detailsOnly ? "-details" : ""}${correlateDetails ? "-providers" : ""}.json`, JSON.stringify({ version: 3, complete, detailsOnly, correlateDetails, commit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(), deployedCommit: process.env.PERF_DEPLOYED_COMMIT ?? null, date: new Date().toISOString(), browser: browser.version(), viewport: [1440, 900], dataset: "populated", count, origin, groups, samples }, null, 2));
if (!complete) process.exitCode = 1;
