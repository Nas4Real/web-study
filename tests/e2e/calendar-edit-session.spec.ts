import { expect, test } from "@playwright/test";
import { hideNextDevTools } from "./visual-test-helpers";

async function openFixtureSession(page: import("@playwright/test").Page) {
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Open Capacités thermiques : modèle d'Einstein" }).click();
  await expect(page.getByRole("dialog", { name: "Quantum Mechanics Lecture" })).toBeVisible();
}

test.describe("recurring session editing", () => {
  test("chooses an occurrence edit before showing occurrence-safe fields", async ({ page }) => {
    await openFixtureSession(page);
    await page.getByRole("button", { name: "Edit", exact: true }).click();

    const scopeDialog = page.getByRole("dialog", { name: "Edit recurring session" });
    await expect(scopeDialog).toBeVisible();
    await expect(scopeDialog.getByRole("radio", { name: /This session only/ })).toBeChecked();
    await expect(scopeDialog.getByText("Quantum Mechanics Lecture")).toBeVisible();

    await scopeDialog.getByRole("button", { name: "Continue" }).click();

    const editDialog = page.getByRole("dialog", { name: "Edit session" });
    await expect(editDialog.getByText("Editing this session only")).toBeVisible();
    await expect(editDialog.getByLabel("Class or Lecture Name")).toHaveValue("Quantum Mechanics Lecture");
    await expect(editDialog.getByLabel("Room / Location — optional")).toHaveValue("Room 304, Sci-Tech");
    await expect(editDialog.getByLabel("Professor — optional")).toHaveValue("Prof. Heisenberg");
    await expect(editDialog.getByLabel("Subject")).toHaveCount(0);
    await expect(editDialog.getByLabel("Repeat")).toHaveCount(0);
  });

  test("shows series-only subject and recurrence fields for an entire-series edit", async ({ page }) => {
    await openFixtureSession(page);
    await page.getByRole("button", { name: "Edit", exact: true }).click();

    const scopeDialog = page.getByRole("dialog", { name: "Edit recurring session" });
    await scopeDialog.getByRole("radio", { name: /Entire series/ }).check();
    await scopeDialog.getByRole("button", { name: "Continue" }).click();

    const editDialog = page.getByRole("dialog", { name: "Edit session" });
    await expect(editDialog.getByText("Editing entire series")).toBeVisible();
    await expect(editDialog.getByLabel("Subject")).toHaveValue("subject-physics");
    await expect(editDialog.getByLabel("Repeat", { exact: true })).toHaveValue("weekly");
  });

  test("returns from the edit form to the selected scope without losing it", async ({ page }) => {
    await openFixtureSession(page);
    await page.getByRole("button", { name: "Edit", exact: true }).click();

    const scopeDialog = page.getByRole("dialog", { name: "Edit recurring session" });
    await scopeDialog.getByRole("radio", { name: /Entire series/ }).check();
    await scopeDialog.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("dialog", { name: "Edit session" }).getByRole("button", { name: "Cancel" }).click();

    await expect(scopeDialog).toBeVisible();
    await expect(scopeDialog.getByRole("radio", { name: /Entire series/ })).toBeChecked();
    await scopeDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog", { name: "Quantum Mechanics Lecture" }).getByRole("button", { name: "Edit", exact: true })).toBeFocused();
  });

  test("matches the approved scope and occurrence-edit visual references", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await openFixtureSession(page);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await hideNextDevTools(page);
    await expect(page).toHaveScreenshot("session-edit-scope-1440x1200.png", { animations: "disabled", fullPage: true });

    await page.getByRole("dialog", { name: "Edit recurring session" }).getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveScreenshot("session-edit-occurrence-1440x1200.png", { animations: "disabled", fullPage: true });
  });

  test("keeps the entire-series edit usable at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await openFixtureSession(page);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const scopeDialog = page.getByRole("dialog", { name: "Edit recurring session" });
    await expect(scopeDialog).toHaveCSS("width", "302px");
    await scopeDialog.getByRole("radio", { name: /Entire series/ }).check();
    await scopeDialog.getByRole("button", { name: "Continue" }).click();

    const editDialog = page.getByRole("dialog", { name: "Edit session" });
    await expect(editDialog).toHaveCSS("width", "302px");
    await expect(page.evaluate(() => document.documentElement.scrollWidth)).resolves.toBe(320);
    await hideNextDevTools(page);
    await expect(page).toHaveScreenshot("session-edit-series-320x720.png", { animations: "disabled", fullPage: true });
  });

  for (const width of [768, 1024] as const) {
    test(`keeps the edit flow usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openFixtureSession(page);
      await page.getByRole("button", { name: "Edit", exact: true }).click();
      await page.getByRole("dialog", { name: "Edit recurring session" }).getByRole("button", { name: "Continue" }).click();
      await expect(page.getByRole("dialog", { name: "Edit session" }).getByRole("button", { name: "Save changes" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    });
  }
});

test.describe("recurring session deletion", () => {
  test("requires scope and keeps the selected scope after a failed delete", async ({ page }) => {
    await openFixtureSession(page);
    await page.getByRole("button", { name: "Delete Session" }).click();

    const deleteDialog = page.getByRole("dialog", { name: "Delete recurring session" });
    await expect(deleteDialog.getByRole("radio", { name: /This session only/ })).toBeChecked();
    await expect(deleteDialog.getByText("Only this occurrence will be removed. Other sessions in the series stay unchanged.")).toBeVisible();
    await deleteDialog.getByRole("radio", { name: /Entire series/ }).check();
    await expect(deleteDialog.getByRole("button", { name: "Delete series" })).toBeVisible();
    await expect(deleteDialog.getByText("The entire series and its exceptions will be permanently deleted.")).toBeVisible();

    await deleteDialog.getByRole("button", { name: "Delete series" }).click();
    await expect(deleteDialog.getByRole("alert")).toBeVisible();
    await expect(deleteDialog.getByRole("radio", { name: /Entire series/ })).toBeChecked();
    await expect(deleteDialog.getByRole("button", { name: "Delete series" })).toBeEnabled();
  });

  test("matches the approved delete-scope visual reference", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await openFixtureSession(page);
    await page.getByRole("button", { name: "Delete Session" }).click();
    await hideNextDevTools(page);
    await expect(page).toHaveScreenshot("session-delete-scope-1440x1200.png", { animations: "disabled", fullPage: true });
  });
});
