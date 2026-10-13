import { chromium, expect } from "@playwright/test";

// Narrow recovery for the interrupted timezone diagnostic; no admin credentials.
const origin = process.env.PERF_ORIGIN;
const email = process.env.PERF_POPULATED_EMAIL;
const password = process.env.PERF_POPULATED_PASSWORD;
if (origin !== "http://localhost:3100" || !email?.startsWith("codex.perf.populated.") || !password) {
  throw new Error("Local dedicated profiling account required");
}
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${origin}/sign-in`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.getByRole("heading", { name: "Overview", exact: true }).waitFor();
  const edit = page.getByRole("dialog", { name: "Edit session", exact: true });
  async function open() {
    await page.goto(`${origin}/calendar?date=2026-10-11&view=day`);
    const invoker = page.getByRole("button", { name: "Open Performance session 2", exact: true });
    await expect(invoker).toHaveCount(1);
    await invoker.click();
    await page.getByRole("dialog", { name: "Performance session 2", exact: true }).getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Edit recurring session", exact: true })).toHaveCount(0);
    await expect(edit.getByLabel("Class or Lecture Name", { exact: true })).toHaveValue("Performance session 2");
    await expect(edit.getByLabel("Date", { exact: true })).toHaveValue("2026-10-11");
    await expect(edit.getByLabel("Duration", { exact: true })).toHaveValue("60");
    await expect(edit.getByLabel(/Room \/ Location/)).toHaveValue("");
    await expect(edit.getByLabel("Repeat", { exact: true })).toHaveValue("none");
    await expect(edit.getByLabel("Note 1", { exact: true })).toHaveValue("Synthetic reminder");
  }
  await open();
  const start = edit.getByLabel("Start time", { exact: true });
  const original = await start.inputValue();
  if (!["08:00", "10:00"].includes(original)) throw new Error("Unexpected synthetic timestamp; refusing recovery");
  if (original === "08:00") {
    await start.fill("10:00");
    await edit.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(edit).toBeHidden();
  }
  await open();
  await expect(start).toHaveValue("10:00");
  console.log("Synthetic session restored to 10:00 Africa/Tunis (original 09:00 UTC); fixture content verified through the editor.");
} finally {
  await browser.close();
}
