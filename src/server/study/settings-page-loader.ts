import "server-only";

import {
  resolveSettingsRequestContext,
  type SettingsRequestContext,
} from "./settings-request-context";

export type SettingsPageData = Readonly<{
  displayName: string;
  email: string;
  errorCode: "UNAUTHENTICATED" | "STORAGE_UNAVAILABLE" | null;
  storageQuotaBytes: number;
  storageUsedBytes: number;
}>;

type ResolveContext = () => Promise<SettingsRequestContext | null>;

const unavailable: SettingsPageData = {
  displayName: "",
  email: "",
  errorCode: "STORAGE_UNAVAILABLE",
  storageQuotaBytes: 2_147_483_648,
  storageUsedBytes: 0,
};

export async function loadSettingsPageData(
  requestedScope?: string,
  resolveContext: ResolveContext = () =>
    resolveSettingsRequestContext(requestedScope),
): Promise<SettingsPageData> {
  try {
    const context = await resolveContext();
    if (!context) return { ...unavailable, errorCode: "UNAUTHENTICATED" };
    return {
      displayName: context.profile.displayName,
      email: context.email,
      errorCode: null,
      storageQuotaBytes: context.profile.storageQuotaBytes,
      storageUsedBytes: context.profile.storageUsedBytes,
    };
  } catch {
    return unavailable;
  }
}
