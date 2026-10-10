import { chromium, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

// Local production only; genuine test-user auth, no fixture headers or saved session.
const origin = "http://localhost:3100";
const email = process.env.PERF_POPULATED_EMAIL;
const password = process.env.PERF_POPULATED_PASSWORD;
const expected = process.env.PERF_EXPECT_SHELL;
const input = process.env.PERF_INPUT ?? "sidebar";
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
let calendarPrefetch = false;
let phase = "login";
let anonymousRedirect = false;
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
  await page.goto(`${origin}/tasks`);
  await page.locator('main [aria-label="Task status"]').waitFor();
  // Fixed observation window, not an application timer or a prefetch loop.
  await page.waitForTimeout(3000);
  const search = page.getByRole("combobox", { name: "Search Web Study navigation" });
  const searchNavigate = async label => { await search.fill(label); await search.press("Enter"); };
  if (input === "search") {
    phase = "warm-up";
    await searchNavigate("Calendar");
    await page.locator('main [aria-label="Calendar view"]').waitFor();
    await searchNavigate("Tasks");
    await page.locator('main [aria-label="Task status"]').waitFor();
  }
  await page.route("**/calendar?*", async route => {
    const headers = route.request().headers();
    if (headers.rsc === "1" && headers["next-router-prefetch"] !== "1") await held;
    await route.continue().catch(() => {}); // The deliberately interrupted route may be cancelled.
  });
  calendarPrefetch = rows.some(row => row.route === "/calendar" && row.prefetch && row.status === 200);
  phase = "held-navigation";
  if (expected === "1" && input === "sidebar" && !calendarPrefetch) throw new Error("Calendar shell was not prefetched");
  const nav = page.getByRole("navigation", { name: "Primary navigation", exact: true });
  if (input === "search") await searchNavigate("Calendar");
  else await nav.getByRole("link", { name: "Calendar", exact: true }).click();
  if (expected === "1") {
    await expect(page.locator('main [aria-busy="true"]')).toBeVisible();
    await expect(page.locator('main [role="status"]')).toHaveText("Loading Calendar…");
    shellVisible = true;
    await expect(page.locator('main [aria-label="Calendar view"]')).toHaveCount(0);
    if (input === "search") {
      await expect(search).toBeFocused();
      if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error("Loading shell overflows viewport");
    }
    await page.screenshot({ path: `.performance-artifacts/loading-shell-${input}.png` });
  } else {
    await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
  }
  if (input === "search") await searchNavigate("Documents");
  else await nav.getByRole("link", { name: "Documents", exact: true }).click();
  phase = "interruption";
  await expect(page).toHaveURL(/\/documents/);
  await page.locator('main [aria-label="Uploads are unavailable until storage is connected"]').waitFor();
  release();
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
  await context.close();
  phase = "anonymous-entry";
  const anonymous = await browser.newContext();
  const anonymousPage = await anonymous.newPage();
  await anonymousPage.goto(`${origin}/tasks`);
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
    const matching = freshProviderRows.filter(call => call.requestId === row.id);
    row.providerCounts = Object.fromEntries([...new Set(matching.map(call => call.kind))].map(kind => [kind, matching.filter(call => call.kind === kind).length]));
  }
  await mkdir(".performance-artifacts", { recursive: true });
  const report = { complete, phase, input, calendarPrefetch, anonymousRedirect, expectedShell: expected === "1", shellVisible, commit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(), date: new Date().toISOString(), browser: browser.version(), viewport: input === "search" ? [320, 812] : [1440, 900], observationMs: 3000, rows };
  await writeFile(`.performance-artifacts/09-03-shell-${expected === "1" ? "candidate" : "control"}-${input}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
if (!complete) throw new Error("Production shell-prefetch verification incomplete");
