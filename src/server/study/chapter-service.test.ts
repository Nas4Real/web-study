import { describe, expect, it, vi } from "vitest";

import { ChapterService, type ChapterRepository } from "./chapter-service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const CHAPTER_ID = "33333333-3333-4333-8333-333333333333";
const CHAPTER = {
  createdAt: "2026-10-06T00:00:00.000Z", id: CHAPTER_ID, name: "Algebra", position: 0,
  subjectId: SUBJECT_ID, updatedAt: "2026-10-06T00:00:00.000Z",
};

function repository(overrides: Partial<ChapterRepository> = {}): ChapterRepository {
  return {
    createOwnedWithStarters: vi.fn().mockResolvedValue({ data: CHAPTER, errorCode: null }),
    deleteOwned: vi.fn().mockResolvedValue({ data: true, errorCode: null }),
    findOwned: vi.fn().mockResolvedValue({ data: CHAPTER, errorCode: null }),
    listOwned: vi.fn().mockResolvedValue({ data: [CHAPTER], errorCode: null }),
    updateOwned: vi.fn().mockResolvedValue({ data: CHAPTER, errorCode: null }),
    ...overrides,
  };
}

describe("ChapterService", () => {
  it("creates an owned chapter and its editable starter folders atomically", async () => {
    const repo = repository();
    const result = await new ChapterService(repo).create(USER_ID, {
      name: "  Algebra ", subjectId: SUBJECT_ID,
    });
    expect(result).toEqual({ data: CHAPTER, status: "success" });
    expect(repo.createOwnedWithStarters).toHaveBeenCalledWith(USER_ID, {
      name: "Algebra", position: 0, subjectId: SUBJECT_ID,
    }, ["Cours", "TD", "Resume"]);
  });

  it("does not enumerate a foreign or missing subject", async () => {
    const repo = repository({ createOwnedWithStarters: vi.fn().mockResolvedValue({ data: null, errorCode: "23503" }) });
    expect(await new ChapterService(repo).create(USER_ID, { name: "Algebra", subjectId: SUBJECT_ID }))
      .toEqual({ code: "NOT_FOUND", status: "error" });
  });

  it("returns conflict when dependencies prevent chapter deletion", async () => {
    const repo = repository({ deleteOwned: vi.fn().mockResolvedValue({ data: false, errorCode: "23503" }) });
    expect(await new ChapterService(repo).delete(USER_ID, CHAPTER_ID))
      .toEqual({ code: "CONFLICT", status: "error" });
  });

  it("scopes reads and mutations to a valid actor", async () => {
    const repo = repository();
    const service = new ChapterService(repo);
    expect(await service.list("bad", { subjectId: SUBJECT_ID })).toEqual({ code: "INVALID_ACTOR", status: "error" });
    await service.find(USER_ID, CHAPTER_ID);
    await service.update(USER_ID, CHAPTER_ID, { name: "Geometry" });
    expect(repo.findOwned).toHaveBeenCalledWith(USER_ID, CHAPTER_ID);
    expect(repo.updateOwned).toHaveBeenCalledWith(USER_ID, CHAPTER_ID, { name: "Geometry" });
  });
});
