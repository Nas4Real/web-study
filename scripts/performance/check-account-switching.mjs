import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { getShellScenario } from "./shell-scenarios.ts";

// Genuine local production auth only; no fixture headers, exported state or study writes.
const origin = "http://localhost:3100";
const accounts = {
  populated: { email: process.env.PERF_POPULATED_EMAIL, password: process.env.PERF_POPULATED_PASSWORD },
  empty: { email: process.env.PERF_EMPTY_EMAIL, password: process.env.PERF_EMPTY_PASSWORD },
};
for (const [kind, account] of Object.entries(accounts)) {
  if (!account.email?.startsWith(`codex.perf.${kind}.`) || !account.password) throw new Error("Dedicated profiling accounts required");
}
const visits = [
  { name: "Tasks", path: "/tasks", title: "Performance task 1" },
  { name: "Calendar", path: "/calendar?date=2026-10-11&view=day", title: "Performance session 2" },
  { name: "Dashboard", path: "/", title: "Performance session 2" },
];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: "Africa/Tunis" });
const page = await context.newPage();
page.setDefaultTimeout(30000);
const scenarios = [];
let phase = "login";
let complete = false;
let pageErrors = 0;
page.on("pageerror", () => { pageErrors++; }); // Count only; never save error payloads.

async function login(kind) {
  const account = accounts[kind];
  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
}
async function logout() {
  await page.getByRole("button", { name: "Open profile menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign Out", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/sign-in");
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function warmDetails(visit) {
  await page.goto(`${origin}${visit.path}`);
  for (let i = 0; i < 2; i++) {
    const response = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === new URL(page.url()).pathname);
    await page.getByRole("button", { name: `Open ${visit.title}`, exact: true }).click();
    const detail = page.getByRole("dialog", { name: visit.title, exact: true });
    if (visit.name === "Tasks") await expect(detail.getByText("Synthetic profiling data", { exact: true })).toBeVisible();
    else await expect(detail.getByRole("button", { name: "Edit", exact: true })).toBeEnabled();
    await response;
    await detail.getByRole("button", { name: "Close", exact: true }).click();
    await expect(detail).toBeHidden();
  }
}
async function assertEmpty() {
  await expect(page.getByRole("button", { name: /^Open (?:assignment |task )?Performance / })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function startProbe() {
  // Rendered DOM text only, never cookies, tokens, storage or raw data.
  await page.evaluate(() => {
    const probe = { seen: false };
    const inspect = () => { if (/Performance (?:task|session) \d/.test(document.body.innerText)) probe.seen = true; };
    const observer = new MutationObserver(inspect);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    Object.assign(window, { accountSwitchProbe: { probe, stop: () => observer.disconnect() } });
    inspect();
  });
}
async function stopProbe() {
  return page.evaluate(() => {
    const state = window.accountSwitchProbe;
    if (!state) throw new Error("Account probe unavailable");
    state.stop();
    return state.probe.seen;
  });
}
try {
  await page.goto(`${origin}/sign-in`);
  await startProbe();
  await login("populated");
  // Positive control: the same observer must detect known synthetic content.
  expect(await stopProbe()).toBe(true);
  for (const visit of visits) {
    phase = `${visit.name}-warm`;
    await warmDetails(visit);
    phase = `${visit.name}-sign-out`;
    await logout();
    await startProbe();
    phase = `${visit.name}-empty-login`;
    await login("empty");
    await assertEmpty();
    for (const destination of ["Tasks", "Calendar", "Dashboard"]) {
      phase = `${visit.name}-empty-${destination}`;
      const { target } = getShellScenario(destination);
      await page.locator("aside nav").getByRole("link", { name: destination, exact: true }).click();
      await expect(page).toHaveURL(url => url.pathname === target.path);
      await expect(page.locator(target.ready)).toBeVisible();
      await assertEmpty();
    }
    phase = `${visit.name}-empty-history`;
    await page.goBack();
    await expect(page).toHaveURL(url => url.pathname === "/calendar");
    await expect(page.locator(getShellScenario("Calendar").target.ready)).toBeVisible();
    await assertEmpty();
    await page.goForward();
    await expect(page).toHaveURL(url => url.pathname === "/");
    await expect(page.locator(getShellScenario("Dashboard").target.ready)).toBeVisible();
    await assertEmpty();
    await page.waitForTimeout(1000); // Finite stale-content observation, not a timing benchmark.
    const leaked = await stopProbe();
    expect(leaked).toBe(false);
    phase = `${visit.name}-return-login`;
    await logout();
    await login("populated");
    await warmDetails(visit);
    scenarios.push({ surface: visit.name, warmReopen: true, signOut: true, emptyRevisits: true, emptyHistory: true, observedPreviousActorContent: leaked, populatedReturn: true });
  }
  phase = "final-sign-out";
  await logout();
  expect(pageErrors).toBe(0);
  complete = true;
} catch {
  console.log("Account-switch verification incomplete; see sanitized phase report.");
} finally {
  await browser.close();
  await mkdir(".performance-artifacts", { recursive: true });
  const report = { version: 1, complete, phase, scenarios, pageErrors, commit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(), date: new Date().toISOString(), browser: browser.version(), viewport: [1440, 900], origin, studyWrites: 0, observationMs: 1000 };
  await writeFile(".performance-artifacts/09-04-account-switching.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ complete, phase, completedScenarios: scenarios.length, pageErrors }));
}
if (!complete) process.exitCode = 1;
