import { describe, expect, it, vi } from "vitest";

import {
  updateProfileMutationHandler,
  type SettingsActionContext,
} from "./settings-action-handlers";

const PROFILE = {
  avatarObjectKey: null,
  createdAt: "2026-10-02T00:00:00.000Z",
  displayName: "Nas",
  id: "11111111-1111-4111-8111-111111111111",
  storageQuotaBytes: 2_147_483_648,
  storageReservedBytes: 0,
  storageUsedBytes: 348_127_232,
  timezone: "Africa/Tunis",
  updatedAt: "2026-10-02T00:00:00.000Z",
} as const;

function form(displayName: string) {
  const data = new FormData();
  data.set("displayName", displayName);
  return data;
}

function context(
  update = vi.fn().mockResolvedValue({ data: PROFILE, status: "success" }),
): SettingsActionContext {
  return {
    actorId: PROFILE.id,
    profile: PROFILE,
    profileService: { update },
  };
}

describe("updateProfileMutationHandler", () => {
  it("updates the display name while preserving non-editable profile fields", async () => {
    const current = context();

    const result = await updateProfileMutationHandler(
      async () => current,
      form("  Nas   Study  "),
    );

    expect(result).toEqual({
      code: "PROFILE_UPDATED",
      message: "Profile updated.",
      status: "success",
    });
    expect(current.profileService.update).toHaveBeenCalledWith(PROFILE.id, {
      avatarObjectKey: null,
      displayName: "  Nas   Study  ",
      timezone: "Africa/Tunis",
    });
  });

  it("returns an authentication error when the session is unavailable", async () => {
    const result = await updateProfileMutationHandler(
      async () => null,
      form("Nas Study"),
    );

    expect(result).toMatchObject({
      code: "UNAUTHENTICATED",
      status: "error",
    });
  });

  it("maps invalid names to a stable form error", async () => {
    const current = context(
      vi.fn().mockResolvedValue({ code: "INVALID_INPUT", status: "error" }),
    );

    const result = await updateProfileMutationHandler(
      async () => current,
      form(""),
    );

    expect(result).toMatchObject({ code: "INVALID_INPUT", status: "error" });
  });

  it("does not expose provider failures", async () => {
    const result = await updateProfileMutationHandler(
      async () => {
        throw new Error("provider secret");
      },
      form("Nas Study"),
    );

    expect(result).toMatchObject({
      code: "STORAGE_UNAVAILABLE",
      status: "error",
    });
    expect(JSON.stringify(result)).not.toContain("provider secret");
  });
});
