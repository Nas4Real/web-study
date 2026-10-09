import { describe, expect, it, vi } from "vitest";

import { SubjectService, type SubjectRepository } from "./subject-service";

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

function createRepository(
  overrides: Partial<SubjectRepository> = {},
): SubjectRepository {
  return {
    createOwned: vi.fn().mockResolvedValue({ data: SUBJECT, errorCode: null }),
    deleteOwned: vi.fn().mockResolvedValue({ data: true, errorCode: null }),
    findOwned: vi.fn().mockResolvedValue({ data: SUBJECT, errorCode: null }),
    listOwned: vi.fn().mockResolvedValue({ data: [], errorCode: null }),
    listPageOwned: vi.fn().mockResolvedValue({ data: [], errorCode: null }),
    updateOwned: vi.fn().mockResolvedValue({ data: SUBJECT, errorCode: null }),
    ...overrides,
  };
}

describe("SubjectService", () => {
  it("normalizes a valid subject before creating an owner-scoped row", async () => {
    const repository = createRepository();
    const result = await new SubjectService(repository).create(USER_ID, {
      color: "#EC4899",
      icon: "  Calculator  ",
      name: "  Advanced   Math ",
      position: 2,
    });

    expect(result.status).toBe("success");
    expect(repository.createOwned).toHaveBeenCalledWith(USER_ID, {
      color: "#ec4899",
      icon: "Calculator",
      name: "Advanced Math",
      position: 2,
    });
  });

  it("rejects malformed subject metadata before writing", async () => {
    const repository = createRepository();
    const result = await new SubjectService(repository).create(USER_ID, {
      color: "pink",
      icon: "<script>",
      name: " ",
      position: -1,
    });

    expect(result).toMatchObject({ code: "INVALID_INPUT", status: "error" });
    expect(repository.createOwned).not.toHaveBeenCalled();
  });

  it("always scopes update and delete operations to the actor", async () => {
    const repository = createRepository();
    const service = new SubjectService(repository);

    await service.update(USER_ID, SUBJECT_ID, { name: "Physics" });
    await service.delete(USER_ID, SUBJECT_ID);

    expect(repository.updateOwned).toHaveBeenCalledWith(USER_ID, SUBJECT_ID, {
      name: "Physics",
    });
    expect(repository.deleteOwned).toHaveBeenCalledWith(USER_ID, SUBJECT_ID);
  });

  it("returns not found when no owned row can be changed", async () => {
    const repository = createRepository({
      updateOwned: vi.fn().mockResolvedValue({ data: null, errorCode: null }),
    });
    const result = await new SubjectService(repository).update(
      USER_ID,
      SUBJECT_ID,
      { name: "Physics" },
    );

    expect(result).toEqual({ code: "NOT_FOUND", status: "error" });
  });

  it("maps case-insensitive duplicate names to a stable conflict", async () => {
    const repository = createRepository({
      createOwned: vi.fn().mockResolvedValue({
        data: null,
        errorCode: "unique_violation",
      }),
    });
    const result = await new SubjectService(repository).create(USER_ID, {
      color: "#ec4899",
      name: "math",
      position: 0,
    });

    expect(result).toEqual({ code: "DUPLICATE_NAME", status: "error" });
  });

  it("does not expose unexpected repository failures", async () => {
    const repository = createRepository({
      listOwned: vi.fn().mockResolvedValue({
        data: null,
        errorCode: "database connection secret",
      }),
    });
    const result = await new SubjectService(repository).list(USER_ID);

    expect(result).toEqual({ code: "STORAGE_UNAVAILABLE", status: "error" });
    expect(JSON.stringify(result)).not.toContain("database connection secret");
  });

  it("returns a bounded keyset page and scopes its cursor to the actor", async () => {
    const next = {
      ...SUBJECT,
      createdAt: "2026-10-03T00:00:00.000Z",
      id: "44444444-4444-4444-8444-444444444444",
      position: 1,
    };
    const repository = createRepository({
      listPageOwned: vi.fn().mockResolvedValue({
        data: [SUBJECT, next],
        errorCode: null,
      }),
    });

    const result = await new SubjectService(repository).listPage(USER_ID, {
      cursor: null,
      limit: 1,
    });

    expect(result).toEqual({
      data: {
        items: [SUBJECT],
        nextCursor: {
          createdAt: SUBJECT.createdAt,
          id: SUBJECT.id,
          position: SUBJECT.position,
        },
      },
      status: "success",
    });
    expect(repository.listPageOwned).toHaveBeenCalledWith(USER_ID, {
      cursor: null,
      limit: 2,
    });
  });
});
