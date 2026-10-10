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
