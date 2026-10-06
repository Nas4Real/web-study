import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./settings-request-context", () => ({
  resolveSettingsRequestContext: vi.fn(),
}));

import type { SettingsRequestContext } from "./settings-request-context";
import { loadSettingsPageData } from "./settings-page-loader";

const context = {
  actorId: "11111111-1111-4111-8111-111111111111",
  email: "nas@example.com",
  profile: {
    avatarObjectKey: null,
    createdAt: "2026-10-02T00:00:00.000Z",
    displayName: "Nas",
    id: "11111111-1111-4111-8111-111111111111",
    storageQuotaBytes: 2_147_483_648,
    storageReservedBytes: 0,
    storageUsedBytes: 348_127_232,
    timezone: "Africa/Tunis",
    updatedAt: "2026-10-02T00:00:00.000Z",
  },
  profileService: {},
} as unknown as SettingsRequestContext;

describe("loadSettingsPageData", () => {
  it("maps the authenticated profile to settings data", async () => {
    await expect(
      loadSettingsPageData(undefined, async () => context),
    ).resolves.toEqual({
      displayName: "Nas",
      email: "nas@example.com",
      errorCode: null,
      storageQuotaBytes: 2_147_483_648,
      storageUsedBytes: 348_127_232,
    });
  });

  it("returns an authentication state when no actor is available", async () => {
    await expect(
      loadSettingsPageData(undefined, async () => null),
    ).resolves.toMatchObject({ errorCode: "UNAUTHENTICATED" });
  });

  it("returns a stable unavailable state when loading fails", async () => {
    await expect(
      loadSettingsPageData(undefined, async () => {
        throw new Error("provider secret");
      }),
    ).resolves.toMatchObject({ errorCode: "STORAGE_UNAVAILABLE" });
  });
});
