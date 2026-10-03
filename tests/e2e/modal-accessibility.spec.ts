import { expect, test } from "@playwright/test";

test("task detail traps keyboard focus, isolates background and restores the exact invoker", async ({ page }) => {
  await page.goto("/tasks");
  const invoker = page.getByRole("button", { name: "Open Complete Chapter 4 Exercises" });
  await invoker.click();
  const dialog = page.getByRole("dialog", { name: "Complete Chapter 4 Exercises" });
  const close = dialog.getByRole("button", { name: "Close dialog", exact: true });
  const last = dialog.getByRole("button", { name: "Complete", exact: true });
  await expect(close).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  expect(await page.getByRole("link", { name: "Tasks", includeHidden: true }).evaluate(
    el => Boolean(el.closest("[inert]")),
  )).toBe(true);
  expect(await invoker.evaluate(el => Boolean(el.closest("[inert]")))).toBe(true);

  // A background control cannot steal focus while the modal is open.
  await invoker.focus();
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(invoker).toBeFocused();
  expect(await invoker.evaluate(el => Boolean(el.closest("[inert]")))).toBe(false);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});

test("new-task modal retains focus after content changes and releases isolation on close", async ({ page }) => {
  await page.goto("/tasks");
  const invoker = page.getByRole("button", { name: "New Task", exact: true });
  await invoker.click();
  const dialog = page.getByRole("dialog", { name: "Create new task" });
  const title = dialog.getByRole("textbox", { name: "Task Title" });
  await title.fill("Keep the exact invoker");
  await expect(title).toBeFocused();
  await dialog.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(invoker).toBeFocused();
  expect(await invoker.evaluate(el => Boolean(el.closest("[inert]")))).toBe(false);
});
