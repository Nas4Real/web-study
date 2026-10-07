import { beforeEach, describe, expect, it, vi } from "vitest";

import { createChapterMutationHandler, type ChapterActionContext } from "./chapter-action-handlers";

const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const create = vi.fn();
const list = vi.fn();

function context(): ChapterActionContext {
  return { actorId: ACTOR_ID, chapterService: { create, list } };
}

function form(name = " Mechanics ", subjectId = SUBJECT_ID) {
  const data = new FormData();
  data.set("name", name);
  data.set("subjectId", subjectId);
  return data;
}

describe("createChapterMutationHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue({ data: [{ id: "existing" }], status: "success" });
    create.mockResolvedValue({ data: { id: "chapter" }, status: "success" });
  });

  it("creates an owned chapter after the current subject chapters", async () => {
    const result = await createChapterMutationHandler(async () => context(), form());

    expect(result).toEqual({ code: "CHAPTER_CREATED", message: "Chapter created.", status: "success" });
    expect(list).toHaveBeenCalledWith(ACTOR_ID, { subjectId: SUBJECT_ID });
    expect(create).toHaveBeenCalledWith(ACTOR_ID, { name: "Mechanics", position: 1, subjectId: SUBJECT_ID });
  });

  it("rejects malformed input before writing", async () => {
    const result = await createChapterMutationHandler(async () => context(), form("", "not-a-subject"));

    expect(result.status).toBe("error");
    expect(create).not.toHaveBeenCalled();
  });

  it("requires an authenticated context", async () => {
    const result = await createChapterMutationHandler(async () => null, form());
    expect(result).toMatchObject({ code: "UNAUTHENTICATED", status: "error" });
  });

  it("maps duplicate names to a stable message", async () => {
    create.mockResolvedValue({ code: "DUPLICATE_NAME", status: "error" });
    const result = await createChapterMutationHandler(async () => context(), form());
    expect(result).toMatchObject({ code: "DUPLICATE_NAME", status: "error" });
  });
});
