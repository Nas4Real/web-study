import { chromium, expect, type Request } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
// @ts-expect-error TS5097: Node 24 native TypeScript requires the real extension.
import { classifyResource, summarize } from "./metrics.ts";
// @ts-expect-error TS5097: Node 24 native TypeScript requires the real extension.
import { installDetailProbe, type DetailProbeCriteria, type DetailProbeResult } from "./interaction-probe.ts";
// @ts-expect-error TS5097: Node 24 native TypeScript requires the real extension.
import { correlateDetailProviders } from "./detail-provider-metrics.ts";
// @ts-expect-error TS5097: Node 24 native TypeScript requires the real extension.
import { detailVisitKinds } from "./detail-visit-metrics.ts";
// @ts-expect-error TS5097: Node 24 native TypeScript requires the real extension.
import { sessionMutationMode, withRestoredSessionLocation } from "./session-mutation-profile.ts";
// @ts-expect-error TS5097: Node 24 native TypeScript requires the real extension.
import { projectClickTiming } from "./interaction-network-metrics.ts";

const origin = process.env.PERF_ORIGIN ?? "https://web-study-pearl.vercel.app";
if (!["https://web-study-pearl.vercel.app", "http://localhost:3100"].includes(origin)) throw new Error("Unapproved profiling origin");
const email = process.env.PERF_POPULATED_EMAIL;
const password = process.env.PERF_POPULATED_PASSWORD;
if (!email?.startsWith("codex.perf.populated.") || !password) throw new Error("Dedicated populated test credentials required");
const count = Number(process.env.PERF_SAMPLES ?? 10);
if (!Number.isInteger(count) || count < 1 || count > 30) throw new Error("Invalid sample count");
const detailsOnly = process.env.PERF_DETAILS_ONLY === "1";
if (process.env.PERF_DETAILS_ONLY && !["0", "1"].includes(process.env.PERF_DETAILS_ONLY)) throw new Error("Invalid detail-only mode");
const detailVisits = detailVisitKinds(detailsOnly, process.env.PERF_DETAIL_REOPEN);
const reopenDetails = detailVisits.includes("warm");
const correlateDetails = process.env.PERF_CORRELATE_PROVIDER === "true";
if (process.env.PERF_CORRELATE_PROVIDER && !["true", "false"].includes(process.env.PERF_CORRELATE_PROVIDER)) throw new Error("Invalid provider correlation mode");
if (correlateDetails && (!detailsOnly || origin !== "http://localhost:3100")) throw new Error("Detail provider correlation requires local read-only mode");
const sessionMutations = sessionMutationMode(process.env.PERF_SESSION_MUTATIONS, { origin, detailsOnly, reopenDetails, correlateDetails });
const readProviderLog = () => readFile("test-results/performance/provider-calls.jsonl", "utf8").catch(() => "");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: "Africa/Tunis" });
const page = await context.newPage();
page.setDefaultTimeout(30000);
type Network = { kind: string; method: string; currentRoute: boolean; prefetch: boolean | null; startMs: number; headersMs?: number; completeMs?: number; failed?: boolean } & Partial<ReturnType<typeof projectClickTiming>>;
type Sample = { scenario: string; observedReadyFrameMs: number; sampledFeedbackMs: number | null; sampledReadyMs: number | null; sampledNextFrameMs: number | null; provider: ReturnType<typeof correlateDetailProviders> | null; network: Network[] };
const samples: Sample[] = [];
await mkdir("test-results/performance", { recursive: true });
let currentScenario = "login";
let failedScenario: string | null = null;
let complete = false;
let signedIn = false;
let sessionRestored = true;
let failure: "timeout" | "measurement" | null = null;

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
    let probe: Pick<DetailProbeResult, "feedbackMs" | "readyMs" | "nextFrameMs"> = { feedbackMs: null, readyMs: null, nextFrameMs: null };
    if (probeCriteria) {
      await page.waitForFunction(() => {
        const status = (window as Window & { detailProbe?: DetailProbeResult }).detailProbe?.status;
        return status === "complete" || status === "timeout" || status === "cancelled";
      });
      probe = await page.evaluate(() => {
        const result = (window as Window & { detailProbe?: DetailProbeResult }).detailProbe;
        if (result?.status !== "complete") throw new Error("Detail readiness probe incomplete");
        return { feedbackMs: result.feedbackMs, readyMs: result.readyMs, nextFrameMs: result.nextFrameMs };
      });
    }
    // Read-only close counts include a fixed one-second observation window.
    await page.waitForTimeout(1000);
    let provider: Sample["provider"] = null;
    if (traceOpen) {
      // Cached DOM can be ready before revalidation ends. Do not truncate that
      // provider timeline or add its completion wait to the readiness metric.
      currentScenario = `${scenario}-provider-completion`;
      // Next may cancel a consumed stream; successful body completion is not
      // required to read the action ID and match completed provider events.
      await expect.poll(() => [...requests.values()].filter(entry => entry.method === "POST" && entry.currentRoute && entry.headersMs !== undefined).length, { timeout: 30000 }).toBe(1);
      const posts = [...requests.values()].filter(entry => entry.method === "POST" && entry.currentRoute);
      const ids = await Promise.all(posts.map(entry => correlationIds.get(entry) ?? Promise.resolve(null)));
      provider = correlateDetailProviders(await readProviderLog(), logBoundary, ids, sourceRoute);
    }
    const clickEpochMs = await page.evaluate(() => performance.timeOrigin + ((window as Window & { interactionClick?: number }).interactionClick ?? Number.NaN));
    const network = [...requests.entries()].map(([request, entry]) => ({ ...entry, ...projectClickTiming(request.timing(), clickEpochMs) }));
    samples.push({ scenario, observedReadyFrameMs, sampledFeedbackMs: probe.feedbackMs, sampledReadyMs: probe.readyMs, sampledNextFrameMs: probe.nextFrameMs, provider, network });
    console.log(`${scenario}: ${Math.round(observedReadyFrameMs)} ms`);
  } finally {
    page.off("request", onRequest).off("response", onResponse).off("requestfinished", onFinished).off("requestfailed", onFailed);
  }
}

async function profileSessionMutation() {
  const path = `${origin}/calendar?date=2026-10-11&view=day`;
  const invoker = page.getByRole("button", { name: "Open Performance session 2", exact: true });
  const detail = page.getByRole("dialog", { name: "Performance session 2", exact: true });
  const edit = page.getByRole("dialog", { name: "Edit session", exact: true });
  async function openEdit() {
    // Remount also recovers an uncertain prior request/dialog before cleanup.
    await page.goto(path);
    await invoker.click();
    await detail.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(edit).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Edit recurring session", exact: true })).toHaveCount(0);
    await expect(edit.getByLabel("Class or Lecture Name", { exact: true })).toHaveValue("Performance session 2");
  }
  await openEdit();
  const original = await edit.getByLabel(/Room \/ Location/).inputValue();
  const originalDate = await edit.getByLabel("Date", { exact: true }).inputValue();
  const originalTime = await edit.getByLabel("Start time", { exact: true }).inputValue();
  const originalDuration = await edit.getByLabel("Duration", { exact: true }).inputValue();
  await edit.getByRole("button", { name: "Cancel", exact: true }).click();
  async function guard(operation: () => Promise<void>) {
    try { await operation(); }
    catch (error) { failedScenario ??= currentScenario; throw error; }
  }
  sessionRestored = false;
  await withRestoredSessionLocation(original, async (location, scenario) => {
    currentScenario = `${scenario}-setup`;
    await guard(async () => {
      await openEdit();
      await expect(edit.getByLabel("Date", { exact: true })).toHaveValue(originalDate);
      await expect(edit.getByLabel("Start time", { exact: true })).toHaveValue(originalTime);
      await expect(edit.getByLabel("Duration", { exact: true })).toHaveValue(originalDuration);
      await edit.getByLabel(/Room \/ Location/).fill(location);
      await measure(scenario, () => edit.getByRole("button", { name: "Save changes", exact: true }).click(), async () => {
        await expect(edit).toBeHidden();
        await expect(invoker).toBeEnabled();
      }, {
        selector: '[role="dialog"][aria-labelledby="edit-session-title"]', absent: true,
        feedbackSelector: '[role="dialog"][aria-labelledby="edit-session-title"] form[aria-busy="true"]',
        readyControlSelector: 'button[aria-label="Open Performance session 2"]',
      });
    });
  }, async location => {
    currentScenario = location === original ? "session-restore-verification" : "session-edit-verification";
    await guard(async () => {
      // Reopen on the same page: verify mutation invalidation, not a reload that
      // would hide stale cached detail. Read the form value to handle empty rooms.
      await invoker.click();
      await detail.getByRole("button", { name: "Edit", exact: true }).click();
      await expect(edit.getByLabel(/Room \/ Location/)).toHaveValue(location);
      await expect(edit.getByLabel("Date", { exact: true })).toHaveValue(originalDate);
      await expect(edit.getByLabel("Start time", { exact: true })).toHaveValue(originalTime);
      await expect(edit.getByLabel("Duration", { exact: true })).toHaveValue(originalDuration);
      await edit.getByRole("button", { name: "Cancel", exact: true }).click();
      if (location === original) sessionRestored = true;
    });
  });
  sessionRestored = true;
}

try {
  await page.goto(`${origin}/sign-in`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.getByRole("heading", { name: "Overview", exact: true }).waitFor();
  signedIn = true;
  for (let i = 0; i < count; i++) {
    if (sessionMutations) {
      currentScenario = "session-mutation-setup";
      await profileSessionMutation();
      continue;
    }
    const view = (name: string) => page.getByRole("button", { name, exact: true });
    if (!detailsOnly) {
      currentScenario = "calendar-view-setup";
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
    currentScenario = "session-initial-navigation";
    await page.goto(`${origin}/calendar?date=2026-10-10&view=day`);
    const session = page.getByRole("dialog", { name: "Performance session 1", exact: true });
    const sessionSelector = '[role="dialog"][aria-labelledby="session-detail-title"]';
    for (const visit of detailVisits) {
      const prefix = visit === "warm" ? "session-warm" : "session";
      await measure(`${prefix}-detail-open`, () => view("Open Performance session 1").click(), () => expect(session.getByRole("button", { name: "Edit", exact: true })).toBeEnabled(), { selector: sessionSelector, buttonText: "Edit" });
      await measure(`${prefix}-read-only-close`, () => session.getByRole("button", { name: "Close", exact: true }).click(), () => expect(session).toBeHidden(), { selector: sessionSelector, absent: true });
    }

    currentScenario = "task-initial-navigation";
    await page.goto(`${origin}/tasks`);
    const task = page.getByRole("dialog", { name: "Performance task 1", exact: true });
    const taskSelector = '[role="dialog"][aria-labelledby="task-detail-title"]';
    for (const visit of detailVisits) {
      const prefix = visit === "warm" ? "task-warm" : "task";
      await measure(`${prefix}-detail-open`, () => view("Open Performance task 1").click(), () => expect(task.getByText("Synthetic profiling data", { exact: true })).toBeVisible(), { selector: taskSelector, buttonText: "Complete" });
      await expect(task.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
      if (!detailsOnly) {
        await measure("task-complete-confirmed", () => task.getByRole("button", { name: "Complete", exact: true }).click(), () => expect(task.getByRole("button", { name: "Reopen", exact: true })).toBeEnabled());
        await measure("task-reopen-confirmed", () => task.getByRole("button", { name: "Reopen", exact: true }).click(), () => expect(task.getByRole("button", { name: "Complete", exact: true })).toBeEnabled());
      }
      await measure(`${prefix}-read-only-close`, () => task.getByRole("button", { name: "Close dialog", exact: true }).click(), () => expect(task).toBeHidden(), { selector: taskSelector, absent: true });
    }
    if (i === 0) await page.screenshot({ path: "test-results/performance/synthetic-tasks.png" });
  }
  complete = true;
} catch (cause) {
  failure = cause instanceof Error && cause.name === "TimeoutError" ? "timeout" : "measurement";
  // No error payload, page content, user identifiers or credentials in output.
  failedScenario ??= currentScenario;
  console.log(`Interaction profiling incomplete at ${failedScenario} (${failure}). ${sessionMutations ? `Synthetic session restoration confirmed: ${sessionRestored}.` : detailsOnly ? "Detail-only mode does not mutate study data." : "Synthetic task may need reopening if a mutation failed."}`);
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
const mutationMilestones = sessionMutations ? groups.map(group => {
  const selected = samples.filter(sample => sample.scenario === group.scenario);
  const paired = selected.flatMap(sample => {
    const posts = sample.network.filter(entry => entry.kind === "post" && entry.currentRoute);
    return posts.length === 1 ? [{ sample, post: posts[0] }] : [];
  });
  return {
    scenario: group.scenario,
    pairedPosts: paired.length,
    sampledFeedbackMs: summarize(selected.flatMap(sample => sample.sampledFeedbackMs === null ? [] : [sample.sampledFeedbackMs])),
    postHeadersMs: summarize(paired.flatMap(({ post }) => post.clickHeadersMs == null ? [] : [post.clickHeadersMs])),
    postCompleteMs: summarize(paired.flatMap(({ post }) => post.clickCompleteMs == null ? [] : [post.clickCompleteMs])),
    postHeadersToReadyMs: summarize(paired.flatMap(({ sample, post }) => sample.sampledReadyMs === null || post.clickHeadersMs == null ? [] : [sample.sampledReadyMs - post.clickHeadersMs])),
    postCompletionToReadyMs: summarize(paired.flatMap(({ sample, post }) => sample.sampledReadyMs === null || post.clickCompleteMs == null ? [] : [sample.sampledReadyMs - post.clickCompleteMs])),
  };
}) : null;
const environment = origin.includes("localhost") ? "local" : "hosted";
// Cleanup changes currentScenario; retain the first failing stage in the report.
if (!complete && failedScenario) currentScenario = failedScenario;
await writeFile(`test-results/performance/${environment}-interactions${sessionMutations ? "-session-mutations" : ""}${detailsOnly ? "-details" : ""}${correlateDetails ? "-providers" : ""}${reopenDetails ? "-warm" : ""}.json`, JSON.stringify({ version: 6, complete, failure, failedScenario: complete ? null : currentScenario, detailsOnly, correlateDetails, reopenDetails, sessionMutations, sessionRestored: sessionMutations ? sessionRestored : null, mutationMilestones, commit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(), deployedCommit: process.env.PERF_DEPLOYED_COMMIT ?? null, date: new Date().toISOString(), browser: browser.version(), viewport: [1440, 900], dataset: "populated", count, origin, groups, samples }, null, 2));
if (!complete) process.exitCode = 1;
