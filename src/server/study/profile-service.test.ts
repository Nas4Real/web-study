import { describe, expect, it, vi } from "vitest";

import {
  ProfileService,
  type ProfileRepository,
} from "./profile-service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PROFILE = {
  avatarObjectKey: null,
  createdAt: "2026-10-02T00:00:00.000Z",
  displayName: "Nas",
  id: USER_ID,
  storageQuotaBytes: 2_147_483_648,
  storageReservedBytes: 0,
  storageUsedBytes: 0,
  timezone: "Africa/Tunis",
  updatedAt: "2026-10-02T00:00:00.000Z",
};

function createRepository(
  overrides: Partial<ProfileRepository> = {},
): ProfileRepository {
  return {
    findByUserId: vi.fn().mockResolvedValue({
      data: PROFILE,
      errorCode: null,
    }),
    updateOwned: vi.fn().mockResolvedValue({ data: PROFILE, errorCode: null }),
    ...overrides,
  };
}

describe("ProfileService", () => {
  it("rejects an invalid actor before querying the repository", async () => {
    const repository = createRepository();
    const result = await new ProfileService(repository).get("not-a-user");

    expect(result).toMatchObject({ code: "INVALID_ACTOR", status: "error" });
    expect(repository.findByUserId).not.toHaveBeenCalled();
  });

  it("returns the owned profile without introducing an email field", async () => {
    const repository = createRepository();
    const result = await new ProfileService(repository).get(USER_ID);

    expect(result.status).toBe("success");
    expect(result).not.toHaveProperty("data.email");
    expect(repository.findByUserId).toHaveBeenCalledWith(USER_ID);
  });

  it("normalizes editable profile fields and accepts an owned opaque avatar key", async () => {
    const repository = createRepository();
    const service = new ProfileService(repository);
    const avatarObjectKey = `users/${USER_ID}/avatars/22222222-2222-4222-8222-222222222222`;

    const result = await service.update(USER_ID, {
      avatarObjectKey,
      displayName: "  Nas   Study  ",
      timezone: "Africa/Tunis",
    });

    expect(result.status).toBe("success");
    expect(repository.updateOwned).toHaveBeenCalledWith(USER_ID, {
      avatarObjectKey,
      displayName: "Nas Study",
      timezone: "Africa/Tunis",
    });
  });

  it("rejects a foreign avatar key before writing", async () => {
    const repository = createRepository();
    const result = await new ProfileService(repository).update(USER_ID, {
      avatarObjectKey:
        "users/33333333-3333-4333-8333-333333333333/avatars/22222222-2222-4222-8222-222222222222",
      displayName: "Nas Study",
      timezone: "Africa/Tunis",
    });

    expect(result).toMatchObject({ code: "INVALID_INPUT", status: "error" });
    expect(repository.updateOwned).not.toHaveBeenCalled();
  });

  it("maps repository failures to a stable public error", async () => {
    const repository = createRepository({
      findByUserId: vi.fn().mockResolvedValue({
        data: null,
        errorCode: "provider_secret",
      }),
    });
    const result = await new ProfileService(repository).get(USER_ID);

    expect(result).toEqual({ code: "STORAGE_UNAVAILABLE", status: "error" });
    expect(JSON.stringify(result)).not.toContain("provider_secret");
  });

  it("returns not found when no owned profile can be updated", async () => {
    const repository = createRepository({
      updateOwned: vi.fn().mockResolvedValue({ data: null, errorCode: null }),
    });
    const result = await new ProfileService(repository).update(USER_ID, {
      avatarObjectKey: null,
      displayName: "Nas Study",
      timezone: "Africa/Tunis",
    });

    expect(result).toEqual({ code: "NOT_FOUND", status: "error" });
  });
});
