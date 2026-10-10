// @ts-expect-error TS5097: Node 24 native TypeScript requires the real extension.
import { correlateProviderTimeline } from "./metrics.ts";

// A missing/ambiguous action is incomplete evidence, not zero provider work.
export function correlateDetailProviders(log: string, boundary: number, ids: (string | null | undefined)[], route: string) {
  if (ids.length !== 1) throw new Error("Detail provider attribution incomplete");
  const result = correlateProviderTimeline(log, boundary, ids[0] ?? undefined, route);
  if (!result) throw new Error("Detail provider attribution incomplete");
  return result;
}
