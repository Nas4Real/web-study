export function sessionMutationMode(value: string | undefined, mode: {
  origin: string; detailsOnly: boolean; reopenDetails: boolean; correlateDetails: boolean;
}): boolean {
  if (value !== undefined && !["0", "1"].includes(value)) throw new Error("Invalid session-mutation mode");
  if (value !== "1") return false;
  if (mode.origin !== "http://localhost:3100" || mode.detailsOnly || mode.reopenDetails || mode.correlateDetails) {
    throw new Error("Session mutations require isolated local mode without read-only/reopen/provider modes");
  }
  return true;
}

// Explicit opt-in, separate from read-only detail provider correlation.
export function sessionProviderMode(value: string | undefined, mode: { origin: string; sessionMutations: boolean }) {
  if (value !== undefined && !["true", "false"].includes(value)) throw new Error("Invalid session provider mode");
  if (value !== "true") return false;
  if (mode.origin !== "http://localhost:3100" || !mode.sessionMutations) throw new Error("Session providers require local mutation mode");
  return true;
}

export function expectedSessionRsc(value: string | undefined, mode: { origin: string; sessionMutations: boolean }) {
  if (value === undefined) return null;
  if (!["0", "1"].includes(value) || mode.origin !== "http://localhost:3100" || !mode.sessionMutations) {
    throw new Error("Session request assertions require local mutation mode and count 0 or 1");
  }
  return Number(value);
}

// A failed response can follow a committed write. Always attempt restoration;
// verification must complete before callers mark restoration successful.
export async function withRestoredSessionLocation(
  original: string,
  write: (location: string, scenario: string) => Promise<void>,
  verify: (location: string) => Promise<void>,
) {
  const temporary = original === "Synthetic profiling room" ? "Synthetic profiling room alternate" : "Synthetic profiling room";
  try {
    await write(temporary, "session-edit-confirmed");
    await verify(temporary);
  } finally {
    await write(original, "session-restore-confirmed");
    await verify(original);
  }
}
