import { describe, expect, it, vi } from "vitest";

import type { SubjectService } from "@/server/study/subject-service";

import type { PublicApiRequestContext } from "./public-api-handler";
import {
  createSubjectItemAdapter,
  createSubjectsCollectionAdapter,
} from "./subject-api";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const SUBJECT = {
  color: "#ec4899",
  createdAt: "2026-10-02T00:00:00.000Z",
  icon: null,
  id: SUBJECT_ID,
  name: "Math",
  position: 0,
  updatedAt: "2026-10-02T00:00:00.000Z",
};
const CONTEXT: PublicApiRequestContext = {
  actor: { apiKeyId: "33333333-3333-4333-8333-333333333333", userId: USER_ID },
  requestId: "request-1",
};

function service(overrides: Partial<SubjectService> = {}) {
  return {
    create: vi.fn(),
    delete: vi.fn(),
    find: vi.fn(),
    listPage: vi.fn(),
    update: vi.fn(),
    ...overrides,
  } as unknown as SubjectService;
}

describe("subjects public API adapter", () => {
  it("returns an owner-scoped cursor page using the public projection", async () => {
    const subjects = service({
      listPage: vi.fn().mockResolvedValue({
        data: { items: [SUBJECT], nextCursor: null },
        status: "success",
      }),
    });
    const adapter = createSubjectsCollectionAdapter(subjects);

    const response = await adapter(
      new Request("https://example.test/api/v1/subjects?limit=25"),
      CONTEXT,
    );

    expect(response.status).toBe(200);
    expect(subjects.listPage).toHaveBeenCalledWith(USER_ID, {
      cursor: null,
      limit: 25,
    });
    await expect(response.json()).resolves.toEqual({
      data: [{ id: SUBJECT_ID, name: "Math", color: "#ec4899", icon: null }],
      pagination: { next_cursor: null },
    });
  });

  it("normalizes a strict create payload before using the shared service", async () => {
    const subjects = service({
      create: vi.fn().mockResolvedValue({ data: SUBJECT, status: "success" }),
    });
    const adapter = createSubjectsCollectionAdapter(subjects);

    const response = await adapter(new Request("https://example.test/api/v1/subjects", {
      body: JSON.stringify({ color: "#EC4899", name: " Math " }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }), CONTEXT);

    expect(response.status).toBe(201);
    expect(subjects.create).toHaveBeenCalledWith(USER_ID, {
      color: "#EC4899",
      icon: null,
      name: " Math ",
      position: 0,
    });
  });

  it("conceals a foreign or missing subject behind the same 404", async () => {
    const subjects = service({
      find: vi.fn().mockResolvedValue({ code: "NOT_FOUND", status: "error" }),
    });
    const adapter = createSubjectItemAdapter(subjects, SUBJECT_ID);

    const response = await adapter(
      new Request(`https://example.test/api/v1/subjects/${SUBJECT_ID}`),
      CONTEXT,
    );

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
    expect(subjects.find).toHaveBeenCalledWith(USER_ID, SUBJECT_ID);
  });

  it("returns a stable validation error for malformed JSON input", async () => {
    const adapter = createSubjectsCollectionAdapter(service());
    const response = await adapter(new Request("https://example.test/api/v1/subjects", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    }), CONTEXT);

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("VALIDATION_FAILED");
  });
});
