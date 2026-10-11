import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TaskListRow } from "./task-list-row";
import type { TaskListViewModel } from "./task-view-model";

const task: TaskListViewModel = { id: "task-id", title: "Review integration", description: "Practice five examples",
  subjectLabel: "Calculus", tone: "analysis", dueLabel: "Yesterday", status: "pending", group: "overdue" };

describe("copied localhost task row", () => {
  it("preserves source dimensions, overdue styling and independently named controls", () => {
    const html = renderToStaticMarkup(createElement(TaskListRow, { task, onOpen: vi.fn(), onTransition: vi.fn() }));
    expect(html).toContain("text-[15px]");
    expect(html).toContain("text-[13px]");
    expect(html).toContain("w-[22px]");
    expect(html).toContain("text-red-400");
    expect(html).toContain('aria-label="Complete Review integration"');
    expect(html).toContain('aria-label="Open Review integration"');
    expect(html).toContain('id="task-open-task-id"');
    expect(html).toContain('aria-label="More actions for Review integration"');
    expect(html).not.toContain("sm:p-5");
  });
  it("keeps reopening available without imposing subtask conditions", () => {
    const html = renderToStaticMarkup(createElement(TaskListRow, { task: { ...task, status: "completed", group: "completed" }, onOpen: vi.fn(), onTransition: vi.fn() }));
    expect(html).toContain('aria-label="Reopen Review integration"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("line-through");
  });
});
