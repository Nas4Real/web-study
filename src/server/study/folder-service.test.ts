import { describe, expect, it, vi } from "vitest";

import { FolderService, type FolderRepository } from "./folder-service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const CHAPTER_ID = "33333333-3333-4333-8333-333333333333";
const FOLDER_ID = "44444444-4444-4444-8444-444444444444";
const PARENT_ID = "55555555-5555-4555-8555-555555555555";
const FOLDER = {
  chapterId: CHAPTER_ID, createdAt: "2026-10-06T00:00:00.000Z", id: FOLDER_ID,
  name: "Cours", parentId: null, position: 0, subjectId: SUBJECT_ID,
  updatedAt: "2026-10-06T00:00:00.000Z",
};

function repository(overrides: Partial<FolderRepository> = {}): FolderRepository {
  return {
    createOwned: vi.fn().mockResolvedValue({ data: FOLDER, errorCode: null }),
    deleteOwned: vi.fn().mockResolvedValue({ data: true, errorCode: null }),
    findOwned: vi.fn().mockResolvedValue({ data: FOLDER, errorCode: null }),
    isDescendantOwned: vi.fn().mockResolvedValue({ data: false, errorCode: null }),
    listOwned: vi.fn().mockResolvedValue({ data: [FOLDER], errorCode: null }),
    updateOwned: vi.fn().mockResolvedValue({ data: FOLDER, errorCode: null }),
    ...overrides,
  };
}

describe("FolderService", () => {
  it("creates and lists only actor-owned folders", async () => {
    const repo = repository();
    const service = new FolderService(repo);
    await service.create(USER_ID, { chapterId: CHAPTER_ID, name: " Notes ", subjectId: SUBJECT_ID });
    await service.list(USER_ID, { chapterId: CHAPTER_ID, subjectId: SUBJECT_ID });
    expect(repo.createOwned).toHaveBeenCalledWith(USER_ID, {
      chapterId: CHAPTER_ID, name: "Notes", parentId: null, position: 0, subjectId: SUBJECT_ID,
    });
    expect(repo.listOwned).toHaveBeenCalledWith(USER_ID, { chapterId: CHAPTER_ID, subjectId: SUBJECT_ID });
  });

  it("rejects moving a folder beneath itself or one of its descendants", async () => {
    const repo = repository({ isDescendantOwned: vi.fn().mockResolvedValue({ data: true, errorCode: null }) });
    const service = new FolderService(repo);
    expect(await service.update(USER_ID, FOLDER_ID, { parentId: FOLDER_ID }))
      .toEqual({ code: "FOLDER_CYCLE", status: "error" });
    expect(await service.update(USER_ID, FOLDER_ID, { parentId: PARENT_ID }))
      .toEqual({ code: "FOLDER_CYCLE", status: "error" });
    expect(repo.updateOwned).not.toHaveBeenCalled();
  });

  it("maps the database hierarchy guard to the same stable cycle code", async () => {
    const repo = repository({ updateOwned: vi.fn().mockResolvedValue({ data: null, errorCode: "WSC01" }) });
    expect(await new FolderService(repo).update(USER_ID, FOLDER_ID, { parentId: PARENT_ID }))
      .toEqual({ code: "FOLDER_CYCLE", status: "error" });
  });

  it("reports a dependency conflict when a folder with children changes chapter", async () => {
    const repo = repository({ updateOwned: vi.fn().mockResolvedValue({ data: null, errorCode: "WSC02" }) });
    expect(await new FolderService(repo).update(USER_ID, FOLDER_ID, { chapterId: SUBJECT_ID, parentId: null }))
      .toEqual({ code: "CONFLICT", status: "error" });
  });

  it("hides foreign references and reports dependent children as conflict", async () => {
    const missing = repository({ createOwned: vi.fn().mockResolvedValue({ data: null, errorCode: "23503" }) });
    expect(await new FolderService(missing).create(USER_ID, {
      chapterId: CHAPTER_ID, name: "Notes", subjectId: SUBJECT_ID,
    })).toEqual({ code: "NOT_FOUND", status: "error" });

    const dependent = repository({ deleteOwned: vi.fn().mockResolvedValue({ data: false, errorCode: "23503" }) });
    expect(await new FolderService(dependent).delete(USER_ID, FOLDER_ID))
      .toEqual({ code: "CONFLICT", status: "error" });
  });
});
