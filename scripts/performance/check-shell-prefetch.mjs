import { chromium, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { getShellScenario } from "./shell-scenarios.ts";

// Local production only; genuine test-user auth, no fixture headers or saved session.
const origin = "http://localhost:3100";
const email = process.env.PERF_POPULATED_EMAIL;
const password = process.env.PERF_POPULATED_PASSWORD;
const expected = process.env.PERF_EXPECT_SHELL;
const input = process.env.PERF_INPUT ?? "sidebar";
const { target, source, interruption } = getShellScenario(process.env.PERF_DESTINATION ?? "Calendar");
if (!["sidebar", "search"].includes(input)) throw new Error("PERF_INPUT must be sidebar or search");
if (!email?.startsWith("codex.perf.") || !password || !["0", "1"].includes(expected)) {
  throw new Error("Dedicated profiling credentials and PERF_EXPECT_SHELL=0|1 required");
}
const routes = new Set(["/", "/tasks", "/calendar", "/documents", "/settings"]);
const logPath = "test-results/performance/provider-calls.jsonl";
const readRows = async () => (await readFile(logPath, "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
const browser = await chromium.launch();
const rows = [];
let complete = false;
let shellVisible = false;
let release;
let offset = 0;
let destinationPrefetch = false;
let phase = "login";
let anonymousRedirect = false;
let historyVerified = false;
try {
  const login = await browser.newContext();
  const loginPage = await login.newPage();
  await loginPage.goto(`${origin}/sign-in`);
  await loginPage.locator('input[type="email"]').fill(email);
  await loginPage.locator('input[type="password"]').fill(password);
  await loginPage.getByRole("button", { name: "Sign In", exact: true }).click();
  await loginPage.locator('main [aria-label="Today\'s summary"]').waitFor();
  const storageState = await login.storageState();
  await login.close();
  offset = (await readRows()).length;
  phase = "initial-entry";
  const viewport = input === "search" ? { width: 320, height: 812 } : { width: 1440, height: 900 };
  const context = await browser.newContext({ storageState, viewport, timezoneId: "Africa/Tunis", reducedMotion: "reduce" });
  const page = await context.newPage();
  const requests = new Map();
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.origin !== origin || !routes.has(url.pathname)) return;
    const headers = request.headers();
    if (request.resourceType() !== "document" && headers.rsc !== "1") return;
    const row = { route: url.pathname, kind: request.resourceType() === "document" ? "document" : "rsc", prefetch: headers["next-router-prefetch"] === "1", status: null, id: null, finished: false, cancelled: false, stage: phase };
    rows.push(row);
    requests.set(request, row);
  });
  page.on("response", response => {
    const row = requests.get(response.request());
    if (!row) return;
    row.status = response.status();
    const id = response.headers()["x-perf-request"];
    if (typeof id === "string" && /^\d+$/.test(id)) row.id = id;
  });
  page.on("requestfinished", request => { const row = requests.get(request); if (row) row.finished = true; });
  page.on("requestfailed", request => { const row = requests.get(request); if (row) row.cancelled = true; });
  const held = new Promise(resolve => { release = resolve; });
  await page.goto(`${origin}${source.path}`);
  await page.locator(source.ready).waitFor();
  // Fixed observation window, not an application timer or a prefetch loop.
  await page.waitForTimeout(3000);
  const search = page.getByRole("combobox", { name: "Search Web Study navigation" });
  const searchNavigate = async label => { await search.fill(label); await search.press("Enter"); };
  if (input === "search") {
    phase = "warm-up";
    await searchNavigate(target.label);
    await page.locator(target.ready).waitFor();
    await searchNavigate(source.label);
    await page.locator(source.ready).waitFor();
  }
  await page.route(url => url.origin === origin && url.pathname === target.path, async route => {
    const headers = route.request().headers();
    if (headers.rsc === "1" && headers["next-router-prefetch"] !== "1") await held;
    await route.continue().catch(() => {}); // The deliberately interrupted route may be cancelled.
  });
  destinationPrefetch = rows.some(row => row.route === target.path && row.prefetch && row.status === 200);
  phase = "held-navigation";
  if (expected === "1" && input === "sidebar" && !destinationPrefetch) throw new Error("Destination shell was not prefetched");
  const nav = page.locator("aside nav"); // Settings belongs to secondary navigation.
  const navigate = async destination => {
    if (input === "search") await searchNavigate(destination.label);
    else await nav.getByRole("link", { name: destination.label, exact: true }).click();
  };
  await navigate(target);
  if (expected === "1") {
    await expect(page.locator('main [aria-busy="true"]')).toBeVisible();
    await expect(page.locator('main [role="status"]')).toHaveText(`Loading ${target.label}…`);
    shellVisible = true;
    await expect(page.locator(target.ready)).toHaveCount(0);
    if (input === "search") {
      await expect(search).toBeFocused();
      if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error("Loading shell overflows viewport");
    }
    await page.screenshot({ path: `.performance-artifacts/loading-shell-${target.label.toLowerCase()}-${input}.png` });
  } else {
    await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
  }
  phase = "interruption";
  await navigate(interruption);
  await expect(page).toHaveURL(url => url.pathname === interruption.path);
  await page.locator(interruption.ready).waitFor();
  release();
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: interruption.label, exact: true })).toBeVisible();
  phase = "completed-navigation";
  await navigate(target);
  await expect(page).toHaveURL(url => url.pathname === target.path);
  await page.locator(target.ready).waitFor();
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
  phase = "history";
  await page.goBack();
  await expect(page).toHaveURL(url => url.pathname === interruption.path);
  await page.locator(interruption.ready).waitFor();
  await page.goForward();
  await expect(page).toHaveURL(url => url.pathname === target.path);
  await page.locator(target.ready).waitFor();
  historyVerified = true;
  await context.close();
  phase = "anonymous-entry";
  const anonymous = await browser.newContext();
  const anonymousPage = await anonymous.newPage();
  await anonymousPage.goto(`${origin}${target.path}`);
  await expect(anonymousPage).toHaveURL(/\/sign-in/);
  await expect(anonymousPage.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
  anonymousRedirect = true;
  await anonymous.close();
  complete = true;
} catch {
  // No URLs, credentials, response bodies or auth state in diagnostic failures.
  console.log("Shell check did not satisfy its assertions; inspect sanitized report.");
} finally {
  release?.();
  await browser.close();
  const freshProviderRows = (await readRows()).slice(offset);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const matching = row.id === null ? [] : freshProviderRows.filter(call => call.requestId === row.id && call.route === row.route);
    row.providerCounts = Object.fromEntries([...new Set(matching.map(call => call.kind))].map(kind => [kind, matching.filter(call => call.kind === kind).length]));
  }
  await mkdir(".performance-artifacts", { recursive: true });
  const report = { version: 2, complete, phase, input, destination: target.label, destinationPrefetch, anonymousRedirect, historyVerified, expectedShell: expected === "1", shellVisible, commit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(), date: new Date().toISOString(), browser: browser.version(), viewport: input === "search" ? [320, 812] : [1440, 900], observationMs: 3000, rows };
  await writeFile(`.performance-artifacts/09-03-shell-${expected === "1" ? "candidate" : "control"}-${target.label.toLowerCase()}-${input}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ complete, phase, input, destination: target.label, destinationPrefetch, shellVisible, anonymousRedirect, historyVerified, initialPrefetches: rows.filter(row => row.stage === "initial-entry" && row.prefetch).length }));
}
if (!complete) throw new Error("Production shell-prefetch verification incomplete");
