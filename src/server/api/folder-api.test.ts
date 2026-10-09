import { describe, expect, it, vi } from "vitest";

import type { FolderService } from "@/server/study/folder-service";

import type { PublicApiRequestContext } from "./public-api-handler";
import { createFoldersCollectionAdapter } from "./folder-api";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const CHAPTER_ID = "33333333-3333-4333-8333-333333333333";
const FOLDER = {
  chapterId: CHAPTER_ID,
  createdAt: "2026-10-06T00:00:00.000Z",
  id: "44444444-4444-4444-8444-444444444444",
  name: "Cours",
  parentId: null,
  position: 0,
  subjectId: SUBJECT_ID,
  updatedAt: "2026-10-06T00:00:00.000Z",
};
const CONTEXT: PublicApiRequestContext = {
  actor: { apiKeyId: "55555555-5555-4555-8555-555555555555", userId: USER_ID },
  requestId: "folder-request-1",
};

function service(overrides: Partial<FolderService> = {}) {
  return {
    create: vi.fn(), delete: vi.fn(), find: vi.fn(), listPage: vi.fn(), update: vi.fn(),
    ...overrides,
  } as unknown as FolderService;
}

describe("folders public API adapter", () => {
  it("passes validated filters into the cursor page service", async () => {
    const folders = service({
      listPage: vi.fn().mockResolvedValue({
        data: { items: [FOLDER], nextCursor: null }, status: "success",
      }),
    });
    const response = await createFoldersCollectionAdapter(folders)(new Request(
      `https://example.test/api/v1/folders?limit=20&subject_id=${SUBJECT_ID}&chapter_id=${CHAPTER_ID}`,
    ), CONTEXT);
    expect(folders.listPage).toHaveBeenCalledWith(USER_ID, {
      chapterId: CHAPTER_ID, cursor: null, limit: 20, subjectId: SUBJECT_ID,
    });
    await expect(response.json()).resolves.toEqual({
      data: [{
        chapter_id: CHAPTER_ID, id: FOLDER.id, name: "Cours", parent_id: null,
        position: 0, subject_id: SUBJECT_ID,
      }],
      pagination: { next_cursor: null },
    });
  });

  it("maps foreign hierarchy references to the non-enumerating 404", async () => {
    const folders = service({
      create: vi.fn().mockResolvedValue({ code: "NOT_FOUND", status: "error" }),
    });
    const response = await createFoldersCollectionAdapter(folders)(new Request(
      "https://example.test/api/v1/folders",
      {
        body: JSON.stringify({ name: "Notes", subject_id: SUBJECT_ID }),
        headers: { "content-type": "application/json" }, method: "POST",
      },
    ), CONTEXT);
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });
});
