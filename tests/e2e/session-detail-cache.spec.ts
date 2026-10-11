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
  test(`${surface.name} failed session edit retains content and can retry without duplicate cards`, async ({ page }) => {
    await page.goto(`${surface.path}?e2eScope=session-edit-failure-retry-${surface.name}${surface.query}`);
    const invoker = page.getByRole("button", { name: "Open Physics lecture", exact: true });
    const detail = page.getByRole("dialog", { name: "Physics lecture", exact: true });
    await invoker.click();
    await detail.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByRole("dialog", { name: "Edit recurring session", exact: true }).getByRole("button", { name: "Continue" }).click();
    const edit = page.getByRole("dialog", { name: "Edit session", exact: true });
    await edit.getByLabel("Class or Lecture Name", { exact: true }).fill("   ");
    await edit.getByLabel(/Room \/ Location/).fill("Room 499");
    await edit.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(edit.getByRole("alert")).toBeVisible();
    await expect(edit.getByRole("button", { name: "Save changes", exact: true })).toBeEnabled();
    await expect(invoker.getByText("Room 401", { exact: true })).toBeVisible();
    await expect(invoker.getByText("Room 499", { exact: true })).toHaveCount(0);

    await edit.getByLabel("Class or Lecture Name", { exact: true }).fill("Physics lecture");
    await edit.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(edit).toBeHidden();
    await expect(invoker).toHaveCount(1);
    await expect(invoker.getByText("Room 499", { exact: true })).toBeVisible();
    await invoker.click();
    await expect(detail.getByText("Room 499", { exact: true })).toBeVisible();
  });
}

for (const entireSeries of [false, true]) {
  test(`Dashboard ${entireSeries ? "series" : "occurrence"} deletion reconciles today's card and Calendar siblings`, async ({ page }) => {
    const scope = `dashboard-session-delete-${entireSeries}`;
    await page.goto(`/?e2eScope=${scope}`);
    const invoker = page.getByRole("button", { name: "Open Physics lecture", exact: true });
    await invoker.click();
    await page.getByRole("dialog", { name: "Physics lecture", exact: true }).getByRole("button", { name: "Delete Session", exact: true }).click();
    const confirmation = page.getByRole("dialog", { name: "Delete recurring session", exact: true });
    if (entireSeries) await confirmation.getByRole("radio", { name: /Entire series/ }).check();
    else await expect(confirmation.getByRole("radio", { name: /This session only/ })).toBeChecked();
    await confirmation.getByRole("button", { name: entireSeries ? "Delete series" : "Delete session", exact: true }).click();
    await expect(confirmation).toBeHidden();
    await expect(invoker).toHaveCount(0);
    await page.goto(`/calendar?e2eScope=${scope}&date=2026-10-09&view=day`);
    if (entireSeries) await expect(invoker).toHaveCount(0);
    else await expect(invoker).toBeVisible();
  });
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
