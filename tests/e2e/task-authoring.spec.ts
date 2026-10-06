import { expect, test } from "@playwright/test";
import { hideNextDevTools } from "./visual-test-helpers";

test("creates enriched tasks with edited, removed and reordered subtasks", { tag: "@critical" }, async ({ page }) => {
  await page.goto("/tasks?e2eScope=task-authoring-enriched");
  await page.getByRole("button", { name: "New Task" }).click();
  const dialog = page.getByRole("dialog", { name: "Create new task" });
  await expect(dialog.getByText("No subtasks added yet.")).toBeVisible();
  await dialog.getByLabel("Task title").fill("Prepare enriched exam");
  await dialog.getByLabel("Subject", { exact: true }).selectOption({ label: "Analysis" });
  await dialog.getByLabel("Due Date").fill("2026-10-02");
  await dialog.getByRole("button", { name: "High Priority", exact: true }).click();
  await dialog.getByLabel(/Description/).fill("Bring the formula sheet.");
  for (const title of ["Read notes", "Solve exercises", "Discard this"]) {
    await dialog.getByRole("button", { name: "Add subtask", exact: true }).click();
    await dialog.getByRole("textbox", { name: /Subtask \d+ title/ }).last().fill(title);
  }
  await dialog.getByRole("button", { name: "Remove subtask 3", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Subtask 1 title", exact: true }).fill("Review notes");
  await dialog.getByRole("button", { name: "Move subtask 2 up", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "Subtask 1 title", exact: true })).toHaveValue("Solve exercises");
  await expect(dialog.getByRole("button", { name: "Move subtask 1 up", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Move subtask 2 down", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Add Task", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByRole("button", { name: "Open Prepare enriched exam", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Prepare enriched exam", exact: true });
  await expect(detail.getByText(/High Priority/)).toBeVisible();
  await expect(detail.getByText("Bring the formula sheet.")).toBeVisible();
  await expect(detail.getByText("Due Today, 11:59 PM", { exact: true })).toBeVisible();
  await expect(detail.getByRole("checkbox")).toHaveCount(2);
  await expect(detail.getByRole("checkbox").nth(0)).toHaveAccessibleName("Solve exercises");
  await expect(detail.getByRole("checkbox").nth(1)).toHaveAccessibleName("Review notes");
  await expect(detail.getByRole("checkbox").nth(0)).not.toBeChecked();
  await expect(detail.getByRole("checkbox").nth(1)).not.toBeChecked();
  await detail.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(detail.getByRole("button", { name: "Reopen", exact: true })).toBeVisible();
  await expect(detail.getByRole("checkbox").nth(0)).not.toBeChecked();
  await expect(detail.getByRole("checkbox").nth(1)).not.toBeChecked();
  await detail.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect(detail.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
  await detail.getByRole("checkbox", { name: "Solve exercises", exact: true }).click();
  await expect(detail.getByRole("checkbox", { name: "Solve exercises", exact: true })).toBeChecked();
  await expect(detail.getByRole("checkbox", { name: "Solve exercises", exact: true })).toBeEnabled();
  await expect(detail.getByRole("checkbox", { name: "Review notes", exact: true })).not.toBeChecked();
});

test("retains authoring values after a rejected write and retries with optional fields empty", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/tasks?e2eScope=task-authoring-retry");
  await page.getByRole("button", { name: "New Task" }).click();
  const dialog = page.getByRole("dialog", { name: "Create new task" });
  await dialog.getByLabel("Task title").fill("Retry authoring task");
  await dialog.getByLabel("Subject", { exact: true }).selectOption({ label: "Analysis" });
  await dialog.getByRole("button", { name: "Add subtask", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Subtask 1 title", exact: true }).fill("   ");
  await dialog.getByRole("button", { name: "Add Task", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("Task title")).toHaveValue("Retry authoring task");
  await expect(dialog.getByRole("button", { name: "Normal", exact: true })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Remove subtask 1", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await dialog.getByRole("button", { name: "Add Task", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Open Retry authoring task", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Retry authoring task", exact: true });
  await expect(detail.getByText("High Priority", { exact: true })).toHaveCount(0);
  await expect(detail.getByRole("checkbox")).toHaveCount(0);
  await expect(detail.getByText("No due date", { exact: true })).toBeVisible();
  await expect(detail.getByText(/Normal Priority/)).toBeVisible();
});

for (const width of [320, 768, 1024, 1440]) {
  test(`keeps authoring scrollable and keyboard controls reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`/tasks?e2eScope=authoring-keyboard-${width}`);
    await page.getByRole("button", { name: "New Task" }).click();
    const dialog = page.getByRole("dialog", { name: "Create new task" });
    for (let i = 0; i < 8; i++) {
      await dialog.getByRole("button", { name: "Add subtask", exact: true }).click();
      await expect(dialog.getByRole("textbox", { name: `Subtask ${i + 1} title`, exact: true })).toBeFocused();
      await page.keyboard.type(`Step ${i + 1}`);
    }
    const input = dialog.getByRole("textbox", { name: "Subtask 8 title", exact: true });
    await input.press("Tab");
    const up = dialog.getByRole("button", { name: "Move subtask 8 up", exact: true });
    await expect(up).toBeFocused();
    await expect(up).toHaveCSS("opacity", "1");
    await up.press("Enter");
    await expect(dialog.getByRole("textbox", { name: "Subtask 7 title", exact: true })).toHaveValue("Step 8");
    await expect(dialog.getByRole("textbox", { name: "Subtask 7 title", exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    const footer = await dialog.getByRole("button", { name: "Add Task", exact: true }).boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(800);
  });
}

test("matches the approved populated authoring state", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/tasks");
  await page.getByRole("button", { name: "New Task" }).click();
  const dialog = page.getByRole("dialog", { name: "Create new task" });
  for (const title of ["Read Chapter 4", "Solve practice problems 1-5"]) {
    await dialog.getByRole("button", { name: "Add subtask", exact: true }).click();
    await dialog.getByRole("textbox", { name: /Subtask \d+ title/ }).last().fill(title);
  }
  await dialog.getByRole("button", { name: "High Priority", exact: true }).click();
  await hideNextDevTools(page);
  await expect(page).toHaveScreenshot("task-authoring-populated-1440x1200.png", { animations: "disabled", fullPage: true });
});

test.describe("touch authoring", () => {
  test.use({ hasTouch: true });
  test("shows subtask controls without hover on coarse pointers", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/tasks");
    await page.getByRole("button", { name: "New Task" }).click();
    const dialog = page.getByRole("dialog", { name: "Create new task" });
    await dialog.getByRole("button", { name: "Add subtask", exact: true }).click();
    await dialog.getByLabel("Task title").fill("Touch controls");
    await expect(dialog.locator(".subtask-controls")).toHaveCSS("opacity", "1");
  });
});
