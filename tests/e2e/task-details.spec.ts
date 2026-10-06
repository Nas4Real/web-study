import { expect, test } from "@playwright/test";
import { hideNextDevTools } from "./visual-test-helpers";

test("opens the selected canonical task rather than the fixture task", async ({ page }) => {
  await page.goto("/tasks?e2eScope=detail-selected");
  await page.getByRole("button", { name: "Open Read Chapter 4: Forces", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Read Chapter 4: Forces", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Read pages 45–60 and summarize key formulas.", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Normal Priority", { exact: false })).toBeVisible();
});

test("persists independent subtasks and parent changes, then confirms deletion", { tag: "@critical" }, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/tasks?e2eScope=detail-mutations");
  const invoker = page.getByRole("button", { name: "Open Complete Chapter 4 Exercises", exact: true });
  await invoker.click();
  const dialog = page.getByRole("dialog", { name: "Complete Chapter 4 Exercises", exact: true });
  const subtask = dialog.getByRole("checkbox", { name: "Solve problems 1–15" });
  await expect(subtask).not.toBeChecked();
  await hideNextDevTools(page);
  await page.screenshot({ path: "test-results/task-details-canonical.png", fullPage: true });
  await subtask.click();
  await expect(subtask).toBeChecked();
  await expect(dialog.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Reopen", exact: true })).toBeEnabled();
  await expect(dialog.getByRole("checkbox", { name: "Write down proofs for integrals" })).not.toBeChecked();
  await dialog.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(invoker).toBeFocused();
  await page.reload();
  await invoker.click();
  await expect(subtask).toBeChecked();

  await dialog.getByRole("button", { name: "Delete Task", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Delete task?", exact: true });
  await expect(confirmation).toBeVisible();
  await hideNextDevTools(page);
  await page.screenshot({ path: "test-results/task-delete-confirmation.png", fullPage: true });
  await page.keyboard.press("Escape");
  await expect(confirmation).toBeHidden();
  await expect(dialog.getByRole("button", { name: "Delete Task", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Delete Task", exact: true }).click();
  await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(confirmation).toBeHidden();
  await expect(dialog.getByRole("button", { name: "Delete Task", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Delete Task", exact: true }).click();
  await confirmation.getByRole("button", { name: "Delete Task", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(invoker).toBeHidden();
  // Both dialog layers unmount together; their isolation/scroll locks must fully release.
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await page.getByRole("button", { name: "New Task", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Create new task" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(invoker).toBeHidden();
});

test("rolls back a failed subtask mutation and keeps the parent unchanged", async ({ page }) => {
  await page.goto("/tasks?e2eScope=detail-rollback");
  await page.getByRole("button", { name: "Open Complete Chapter 4 Exercises", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Complete Chapter 4 Exercises", exact: true });
  const subtask = dialog.getByRole("checkbox", { name: "Solve problems 1–15" });
  await expect(subtask).not.toBeChecked();
  await page.route("**/tasks?e2eScope=detail-rollback", async route => {
    const request = route.request();
    if (request.method() === "POST" && request.postData()?.includes('"type":"subtask"')) await route.abort();
    else await route.continue();
  });
  await subtask.click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(subtask).not.toBeChecked();
  await expect(dialog.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
});
