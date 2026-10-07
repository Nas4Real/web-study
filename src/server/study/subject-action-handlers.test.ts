import { describe, expect, it, vi } from "vitest";

import type { Subject } from "./study-domain";
import {
  createSubjectMutationHandler,
  type SubjectActionContext,
} from "./subject-action-handlers";

const ACTOR_ID = "00000000-0000-4000-8000-000000000001";
const SUBJECT: Subject = {
  color: "#10b981",
  createdAt: "2026-10-07T10:00:00.000Z",
  icon: "book-open",
  id: "10000000-0000-4000-8000-000000000001",
  name: "Physics",
  position: 2,
  updatedAt: "2026-10-07T10:00:00.000Z",
};

function form(name = " Physics ", color = "#10B981") {
  const data = new FormData();
  data.set("name", name);
  data.set("color", color);
  return data;
}

function context(
  create = vi.fn().mockResolvedValue({ data: SUBJECT, status: "success" }),
  list = vi.fn().mockResolvedValue({
    data: [SUBJECT, { ...SUBJECT, id: "10000000-0000-4000-8000-000000000002" }],
    status: "success",
  }),
): SubjectActionContext {
  return {
    actorId: ACTOR_ID,
    subjectService: { create, list },
  };
}

describe("createSubjectMutationHandler", () => {
  it("creates an owner-scoped subject after the existing subjects", async () => {
    const current = context();

    const result = await createSubjectMutationHandler(
      async () => current,
      form(),
    );

    expect(result).toEqual({
      code: "SUBJECT_CREATED",
      message: "Subject created.",
      status: "success",
    });
    expect(current.subjectService.create).toHaveBeenCalledWith(ACTOR_ID, {
      color: "#10b981",
      icon: "book-open",
      name: "Physics",
      position: 2,
    });
  });

  it.each([
    ["missing name", form("", "#10b981")],
    ["invalid color", form("Physics", "green")],
  ])("rejects %s before creating", async (_case, data) => {
    const current = context();

    const result = await createSubjectMutationHandler(
      async () => current,
      data,
    );

    expect(result).toMatchObject({ code: "INVALID_INPUT", status: "error" });
    expect(current.subjectService.create).not.toHaveBeenCalled();
  });

  it("fails closed without a verified actor", async () => {
    const result = await createSubjectMutationHandler(
      async () => null,
      form(),
    );

    expect(result).toMatchObject({ code: "UNAUTHENTICATED", status: "error" });
  });

  it("maps duplicate names to a stable form error", async () => {
    const current = context(
      vi.fn().mockResolvedValue({ code: "DUPLICATE_NAME", status: "error" }),
    );

    const result = await createSubjectMutationHandler(
      async () => current,
      form(),
    );

    expect(result).toMatchObject({ code: "DUPLICATE_NAME", status: "error" });
  });

  it("does not expose provider failures", async () => {
    const result = await createSubjectMutationHandler(
      async () => {
        throw new Error("provider secret");
      },
      form(),
    );

    expect(result).toMatchObject({
      code: "STORAGE_UNAVAILABLE",
      status: "error",
    });
    expect(JSON.stringify(result)).not.toContain("provider secret");
  });
});
