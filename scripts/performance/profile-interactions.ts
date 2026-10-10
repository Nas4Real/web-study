import { chromium, expect, type Request } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
// @ts-expect-error TS5097: Node 24 native TypeScript requires the real extension.
import { classifyResource, summarize } from "./metrics.ts";

const origin = process.env.PERF_ORIGIN ?? "https://web-study-pearl.vercel.app";
if (!["https://web-study-pearl.vercel.app", "http://localhost:3100"].includes(origin)) throw new Error("Unapproved profiling origin");
const email = process.env.PERF_POPULATED_EMAIL;
const password = process.env.PERF_POPULATED_PASSWORD;
if (!email?.startsWith("codex.perf.populated.") || !password) throw new Error("Dedicated populated test credentials required");
const count = Number(process.env.PERF_SAMPLES ?? 10);
if (!Number.isInteger(count) || count < 1 || count > 30) throw new Error("Invalid sample count");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: "Africa/Tunis" });
const page = await context.newPage();
page.setDefaultTimeout(30000);
type Network = { kind: string; method: string; currentRoute: boolean; prefetch: boolean | null; startMs: number; headersMs?: number; completeMs?: number; failed?: boolean };
type Sample = { scenario: string; observedReadyFrameMs: number; network: Network[] };
const samples: Sample[] = [];
await mkdir("test-results/performance", { recursive: true });
let currentScenario = "login";
let complete = false;
let signedIn = false;

// Timing is an assertion-observed upper bound, not an exact DOM commit or paint.
async function measure(scenario: string, action: () => Promise<void>, ready: () => Promise<void>) {
  currentScenario = scenario;
  const start = performance.now();
  const requests = new Map<Request, Network>();
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
    if (entry) entry.headersMs = performance.now() - start;
  };
  const onFinished = (request: Request) => { const entry = requests.get(request); if (entry) entry.completeMs = performance.now() - start; };
  const onFailed = (request: Request) => { const entry = requests.get(request); if (entry) entry.failed = true; };
  page.on("request", onRequest).on("response", onResponse).on("requestfinished", onFinished).on("requestfailed", onFailed);
  try {
    await page.evaluate(() => {
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
    // Read-only close counts include a fixed one-second observation window.
    await page.waitForTimeout(1000);
    samples.push({ scenario, observedReadyFrameMs, network: [...requests.values()] });
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
    await page.goto(`${origin}/calendar?date=2026-10-10&view=day`);
    const view = (name: string) => page.getByRole("button", { name, exact: true });
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
    await page.goto(`${origin}/calendar?date=2026-10-10&view=day`);
    const session = page.getByRole("dialog", { name: "Performance session 1", exact: true });
    await measure("session-detail-open", () => view("Open Performance session 1").click(), () => expect(session.getByRole("button", { name: "Edit", exact: true })).toBeEnabled());
    await measure("session-read-only-close", () => session.getByRole("button", { name: "Close", exact: true }).click(), () => expect(session).toBeHidden());

    await page.goto(`${origin}/tasks`);
    const task = page.getByRole("dialog", { name: "Performance task 1", exact: true });
    await measure("task-detail-open", () => view("Open Performance task 1").click(), () => expect(task.getByText("Synthetic profiling data", { exact: true })).toBeVisible());
    await expect(task.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
    await measure("task-complete-confirmed", () => task.getByRole("button", { name: "Complete", exact: true }).click(), () => expect(task.getByRole("button", { name: "Reopen", exact: true })).toBeEnabled());
    await measure("task-reopen-confirmed", () => task.getByRole("button", { name: "Reopen", exact: true }).click(), () => expect(task.getByRole("button", { name: "Complete", exact: true })).toBeEnabled());
    await measure("task-read-only-close", () => task.getByRole("button", { name: "Close dialog", exact: true }).click(), () => expect(task).toBeHidden());
    if (i === 0) await page.screenshot({ path: "test-results/performance/synthetic-tasks.png" });
  }
  complete = true;
} catch {
  // No error payload, page content, user identifiers or credentials in output.
  console.log(`Interaction profiling incomplete at ${currentScenario}. Synthetic task may need reopening if a mutation failed.`);
  if (signedIn && ["/tasks", "/calendar"].includes(new URL(page.url()).pathname)) {
    await page.screenshot({ path: "test-results/performance/synthetic-interaction-failure.png" }).catch(() => {});
  }
} finally {
  await browser.close();
}
await mkdir("test-results/performance", { recursive: true });
const groups = [...new Set(samples.map(s => s.scenario))].map(scenario => {
  const group = samples.filter(s => s.scenario === scenario);
  return { scenario, observedReadyFrameMs: summarize(group.map(s => s.observedReadyFrameMs)), rscRequests: summarize(group.map(s => s.network.filter(r => r.kind === "rsc").length)), currentRouteNonPrefetchRsc: summarize(group.map(s => s.network.filter(r => r.kind === "rsc" && r.currentRoute && r.prefetch === false).length)), unknownPrefetchFlags: summarize(group.map(s => s.network.filter(r => r.kind === "rsc" && r.prefetch === null).length)), posts: summarize(group.map(s => s.network.filter(r => r.kind === "post").length)) };
});
const environment = origin.includes("localhost") ? "local" : "hosted";
await writeFile(`test-results/performance/${environment}-interactions.json`, JSON.stringify({ complete, commit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(), deployedCommit: process.env.PERF_DEPLOYED_COMMIT ?? null, date: new Date().toISOString(), browser: browser.version(), viewport: [1440, 900], dataset: "populated", count, origin, groups, samples }, null, 2));
if (!complete) process.exitCode = 1;
