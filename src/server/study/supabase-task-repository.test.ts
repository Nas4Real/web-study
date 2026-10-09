import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createSupabaseTaskRepository } from "./supabase-study-repositories";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const TASK_ID = "33333333-3333-4333-8333-333333333333";
const SUBTASK_ID = "44444444-4444-4444-8444-444444444444";
const NOW = "2026-10-09T10:00:00.000Z";
const taskRow = { completed_at: null, created_at: NOW, description: null, due_at: null,
  id: TASK_ID, priority: "normal", status: "pending", subject_id: SUBJECT_ID,
  task_subtasks: [], title: "Study", updated_at: NOW };
const subtaskRow = { completed_at: null, created_at: NOW, id: SUBTASK_ID,
  position: 0, title: "Read", updated_at: NOW };

function chain(reply: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["delete", "eq", "gte", "insert", "lte", "or", "order", "select", "update"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.limit = vi.fn().mockResolvedValue(reply);
  builder.maybeSingle = vi.fn().mockResolvedValue(reply);
  return builder;
}

describe("Supabase task repository public API operations", () => {
  it("applies owner, filters, keyset cursor, and a hard page limit", async () => {
    const builder = chain({ data: [taskRow], error: null });
    const client = { from: vi.fn(() => builder) };
    const result = await createSupabaseTaskRepository(client as never).listPageOwned(USER_ID, {
      cursor: { createdAt: NOW, id: TASK_ID, position: 0 },
      dueFrom: "2026-10-01T00:00:00.000Z", dueTo: "2026-10-31T23:59:59.000Z",
      limit: 26, status: "pending", subjectId: SUBJECT_ID,
    });
    expect(result.data?.[0]).toMatchObject({ id: TASK_ID });
    expect(builder.select).toHaveBeenCalledWith(expect.not.stringContaining("task_subtasks"));
    expect(builder.eq.mock.calls).toEqual(expect.arrayContaining([
      ["user_id", USER_ID], ["status", "pending"], ["subject_id", SUBJECT_ID],
    ]));
    expect(builder.gte).toHaveBeenCalledWith("due_at", "2026-10-01T00:00:00.000Z");
    expect(builder.lte).toHaveBeenCalledWith("due_at", "2026-10-31T23:59:59.000Z");
    expect(builder.or).toHaveBeenCalledOnce();
    expect(builder.limit).toHaveBeenCalledWith(26);
  });

  it("scopes subtask creation and mutation to both owner and parent task", async () => {
    const createBuilder = chain({ data: subtaskRow, error: null });
    const updateBuilder = chain({ data: subtaskRow, error: null });
    const client = { from: vi.fn()
      .mockReturnValueOnce(createBuilder)
      .mockReturnValueOnce(updateBuilder) };
    const repository = createSupabaseTaskRepository(client as never);

    await repository.addSubtaskOwned(USER_ID, TASK_ID, {
      completedAt: null, position: 0, title: "Read",
    });
    await repository.updateSubtaskOwned(USER_ID, TASK_ID, SUBTASK_ID, { title: "Review" });

    expect(createBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
      task_id: TASK_ID, user_id: USER_ID,
    }));
    expect(updateBuilder.eq.mock.calls).toEqual([
      ["id", SUBTASK_ID], ["task_id", TASK_ID], ["user_id", USER_ID],
    ]);
  });
});
