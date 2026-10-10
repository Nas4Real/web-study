// Warm visits must never repeat mutations or silently replace the baseline mode.
export function detailVisitKinds(detailsOnly: boolean, reopen: string | undefined): readonly ("initial" | "warm")[] {
  if (reopen !== undefined && !["0", "1"].includes(reopen)) throw new Error("Invalid detail-reopen mode");
  if (reopen === "1" && !detailsOnly) throw new Error("Detail reopen requires read-only mode");
  return reopen === "1" ? ["initial", "warm"] : ["initial"];
}
