import { expect, test } from "@playwright/test";

test.describe("workspace surfaces", () => {
  test("navigates to Tasks and opens the approved task dialogs", async ({ page }) => {
    await page.goto("/tasks");

    await expect(page.getByRole("heading", { level: 1, name: "Tasks" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tasks" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("button", { name: "Pending" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "New Task" }).click();
    await expect(page.getByRole("dialog", { name: "Create new task" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Create new task" })).toBeHidden();

    await page.getByRole("button", { name: "Open Complete Chapter 4 Exercises" }).click();
    const taskDialog = page.getByRole("dialog", { name: "Complete Chapter 4 Exercises" });
    await expect(taskDialog).toBeVisible();
    await expect(taskDialog.getByRole("button", { name: "Complete", exact: true })).toBeVisible();
  });

  test("renders Documents with the approved sections", async ({ page }) => {
    await page.goto("/documents");

    await expect(page.getByRole("heading", { level: 1, name: "Documents" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Documents" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 2, name: "Subjects" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Recent" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "All Files" })).toBeVisible();
  });

  test("renders locked Settings values and profile menu", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("348 MB / 2 GB")).toBeVisible();

    await page.getByRole("button", { name: "Open profile menu" }).click();
    await expect(page.getByRole("menu", { name: "Profile menu" })).toBeVisible();
    await expect(page.getByText("nas@example.com")).toBeVisible();
  });

  test("opens approved New Session and Session Details dialogs", async ({ page }) => {
    await page.goto("/calendar");

    await page.getByRole("button", { name: "New Session" }).click();
    await expect(page.getByRole("dialog", { name: "Add a session" })).toBeVisible();
    await expect(page.getByRole("button", { name: "University Class or lecture" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Open Capacités thermiques : modèle d'Einstein" }).click();
    await expect(page.getByRole("dialog", { name: "Quantum Mechanics Lecture" })).toBeVisible();
    await expect(page.getByText("Room 304, Sci-Tech")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Notes & Reminders" })).toBeVisible();
  });
});
