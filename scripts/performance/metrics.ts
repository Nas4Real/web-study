export function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  return {
    count,
    median: count ? (sorted[Math.floor((count - 1) / 2)] + sorted[Math.floor(count / 2)]) / 2 : null,
    p95: count ? sorted[Math.ceil(count * 0.95) - 1] : null,
  };
}

// Return only categories: never persist paths, IDs, queries, or headers.
export function classifyResource(rawUrl: string, host: string, type: string) {
  const url = new URL(rawUrl);
  if (url.host !== host) return "external";
  if (type === "Script") return "js";
  if (url.searchParams.has("_rsc")) return "rsc";
  if (url.pathname.startsWith("/api/")) return "api";
  return "other";
}

export function classifyProvider(path: string) {
  const pathname = path.split("?")[0];
  if (pathname === "/auth/v1/user") return "auth-user";
  if (pathname.startsWith("/auth/v1/")) return "auth-other";
  const table = pathname.split("/")[3];
  if (table === "profiles") return "profile";
  if (table === "subjects") return "subject";
  if (["tasks", "task_subtasks"].includes(table)) return "task";
  if (["calendar_series", "calendar_exceptions"].includes(table)) return "calendar";
  if (["chapters", "folders", "files", "storage_usage"].includes(table)) return "document";
  return "other";
}

type ProviderCall = { kind: string; start: number; end: number; status: number | null; failed: boolean };

// Numeric/category projection only; union time is not the sum of overlapping calls.
export function providerTimeline(input: ProviderCall[]) {
  const kinds = ["auth-user", "auth-other", "profile", "subject", "task", "calendar", "document", "other"];
  for (const call of input) {
    if (!kinds.includes(call.kind) || !Number.isFinite(call.start) || !Number.isFinite(call.end) || call.end < call.start ||
      (call.status !== null && (!Number.isInteger(call.status) || call.status < 100 || call.status > 599)) || typeof call.failed !== "boolean") {
      throw new Error("Invalid sanitized provider timing");
    }
  }
  const sorted = [...input].sort((a, b) => a.start - b.start);
  const counts: Record<string, number> = {};
  const start = sorted[0]?.start;
  let busyMs = 0;
  let coveredUntil = start ?? 0;
  for (const call of sorted) {
    counts[call.kind] = (counts[call.kind] ?? 0) + 1;
    busyMs += Math.max(0, call.end - Math.max(call.start, coveredUntil));
    coveredUntil = Math.max(coveredUntil, call.end);
  }
  return {
    counts,
    busyMs: start === undefined ? null : busyMs,
    spanMs: start === undefined ? null : coveredUntil - start,
    errors: sorted.filter(call => call.failed || (call.status !== null && call.status >= 400)).length,
    calls: sorted.map(call => ({ kind: call.kind, startMs: call.start - start!, endMs: call.end - start!, status: call.status, failed: call.failed })),
  };
}
