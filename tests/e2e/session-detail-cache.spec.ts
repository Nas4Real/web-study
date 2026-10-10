import { expect, test, type Page } from "@playwright/test";

const surfaces = [
  { name: "Calendar", path: "/calendar", query: "&date=2026-10-02&view=day" },
  { name: "Dashboard", path: "/", query: "" },
] as const;

async function holdDetailRead(page: Page, pathname: string) {
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requestStarted = new Promise<void>(resolve => { started = resolve; });
  await page.route("**/*", async route => {
    const request = route.request();
    if (request.method() === "POST" && new URL(request.url()).pathname === pathname) {
      started();
      await gate;
    }
    await route.continue();
  });
  return { release, requestStarted };
}

for (const surface of surfaces) {
  test(`${surface.name} warm detail reopen shows cached content during revalidation`, async ({ page }) => {
    await page.goto(`${surface.path}?e2eScope=detail-cache-warm-${surface.name}${surface.query}`);
    const invoker = page.getByRole("button", { name: "Open Physics lecture", exact: true });
    const dialog = page.getByRole("dialog", { name: "Physics lecture", exact: true });
    await invoker.click();
    await expect(dialog.getByText("Room 401", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(invoker).toBeFocused();
    const held = await holdDetailRead(page, surface.path);
    try {
      await invoker.click();
      await held.requestStarted;
      await expect(dialog.getByText("Room 401", { exact: true })).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Edit", exact: true })).toBeEnabled();
    } finally { held.release(); }
  });

  test(`${surface.name} successful session edit cannot repaint pre-edit cached details`, async ({ page }) => {
    await page.goto(`${surface.path}?e2eScope=detail-cache-edit-${surface.name}${surface.query}`);
    const invoker = page.getByRole("button", { name: "Open Physics lecture", exact: true });
    const dialog = page.getByRole("dialog", { name: "Physics lecture", exact: true });
    await invoker.click();
    await expect(dialog.getByText("Room 401", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByRole("dialog", { name: "Edit recurring session", exact: true }).getByRole("button", { name: "Continue" }).click();
    const edit = page.getByRole("dialog", { name: "Edit session", exact: true });
    await edit.getByLabel(/Room \/ Location/).fill("Room 499");
    await edit.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(edit).toBeHidden();
    await expect(invoker).toBeEnabled();

    const held = await holdDetailRead(page, surface.path);
    try {
      await invoker.click();
      await held.requestStarted;
      await expect(dialog.getByText("Room 401", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("status").filter({ hasText: "Loading session details." })).toHaveCount(1);
    } finally { held.release(); }
    await expect(dialog.getByText("Room 499", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(invoker).toBeFocused();
  });
}
