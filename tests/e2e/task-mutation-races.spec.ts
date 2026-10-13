import { expect, test } from "@playwright/test";

for (const surface of ["tasks", "dashboard"] as const) {
  for (const fail of [false, true]) {
    test(`${surface} rapid subtask clicks serialize and ${fail ? "rollback only their originating task" : "preserve a different selected task"}`, async ({ page }) => {
      const scope = `task-race-${surface}-${fail}`;
      const path = surface === "tasks" ? "/tasks" : "/";
      const prefix = surface === "tasks" ? "Open " : "Open assignment ";
      await page.goto(`${path}?e2eScope=${scope}`);
      const open = (title: string) => page.getByRole("button", { name: `${prefix}${title}`, exact: true });
      const first = page.getByRole("dialog", { name: "Complete Chapter 4 Exercises", exact: true });
      const second = page.getByRole("dialog", { name: "Read Chapter 4: Forces", exact: true });
      // Preload the other task; Server Actions are serialized behind held writes.
      await open("Read Chapter 4: Forces").click();
      await expect(second.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
      await second.getByRole("button", { name: "Close", exact: true }).click();
      await open("Complete Chapter 4 Exercises").click();
      const subtask = first.getByRole("checkbox", { name: "Solve problems 1–15" });
      await expect(subtask).not.toBeChecked();
      let release!: () => void;
      let started!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const requested = new Promise<void>(resolve => { started = resolve; });
      let writes = 0;
      await page.route(`**/*e2eScope=${scope}`, async route => {
        if (route.request().method() === "POST" && route.request().postData()?.includes('"type":"subtask"')) {
          writes++;
          if (writes === 1) {
            started();
            await gate;
            if (fail) { await route.abort(); return; }
          }
        }
        await route.continue();
      });
      try {
        await subtask.dblclick();
        await requested;
        await expect(subtask).toBeChecked();
        await expect(subtask).toBeDisabled();
        await expect(first.getByRole("button", { name: "Complete", exact: true })).toBeDisabled();
        await first.getByRole("button", { name: "Close", exact: true }).click();
        await open("Read Chapter 4: Forces").click();
        await expect(second).toBeVisible();
        release();
        await expect(second.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
        await expect(second.getByText("Read pages 45–60 and summarize key formulas.", { exact: true })).toBeVisible();
        expect(writes).toBe(1);
        await second.getByRole("button", { name: "Close", exact: true }).click();
        await open("Complete Chapter 4 Exercises").click();
        await expect(subtask).toBeEnabled();
        if (fail) await expect(subtask).not.toBeChecked();
        else await expect(subtask).toBeChecked();
        await expect(first.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
        // The synchronous lock must release after failure as well as success.
        await subtask.click();
        if (fail) await expect(subtask).toBeChecked();
        else await expect(subtask).not.toBeChecked();
        await expect(subtask).toBeEnabled();
        expect(writes).toBe(2);
        await first.getByRole("button", { name: "Close", exact: true }).click();
        await page.reload();
        await open("Complete Chapter 4 Exercises").click();
        if (fail) await expect(subtask).toBeChecked();
        else await expect(subtask).not.toBeChecked();
        await expect(first.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
      } finally { release(); }
    });
  }
}
