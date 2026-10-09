import { describe, expect, it, vi } from "vitest";

import type { ChapterService } from "@/server/study/chapter-service";

import type { PublicApiRequestContext } from "./public-api-handler";
import { createChaptersCollectionAdapter } from "./chapter-api";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const CHAPTER = {
  createdAt: "2026-10-06T00:00:00.000Z",
  id: "33333333-3333-4333-8333-333333333333",
  name: "Algebra",
  position: 0,
  subjectId: SUBJECT_ID,
  updatedAt: "2026-10-06T00:00:00.000Z",
};
const CONTEXT: PublicApiRequestContext = {
  actor: { apiKeyId: "44444444-4444-4444-8444-444444444444", userId: USER_ID },
  requestId: "chapter-request-1",
};

function service(overrides: Partial<ChapterService> = {}) {
  return {
    create: vi.fn(), delete: vi.fn(), find: vi.fn(), listPage: vi.fn(), update: vi.fn(),
    ...overrides,
  } as unknown as ChapterService;
}

describe("chapters public API adapter", () => {
  it("passes the optional subject filter into the cursor page service", async () => {
    const chapters = service({
      listPage: vi.fn().mockResolvedValue({
        data: { items: [CHAPTER], nextCursor: null }, status: "success",
      }),
    });
    const response = await createChaptersCollectionAdapter(chapters)(new Request(
      `https://example.test/api/v1/chapters?limit=20&subject_id=${SUBJECT_ID}`,
    ), CONTEXT);

    expect(chapters.listPage).toHaveBeenCalledWith(USER_ID, {
      cursor: null, limit: 20, subjectId: SUBJECT_ID,
    });
    await expect(response.json()).resolves.toEqual({
      data: [{ id: CHAPTER.id, name: "Algebra", position: 0, subject_id: SUBJECT_ID }],
      pagination: { next_cursor: null },
    });
  });

  it("maps foreign subject references to the non-enumerating 404", async () => {
    const chapters = service({
      create: vi.fn().mockResolvedValue({ code: "NOT_FOUND", status: "error" }),
    });
    const response = await createChaptersCollectionAdapter(chapters)(new Request(
      "https://example.test/api/v1/chapters",
      {
        body: JSON.stringify({ name: "Algebra", subject_id: SUBJECT_ID }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    ), CONTEXT);

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });
});
