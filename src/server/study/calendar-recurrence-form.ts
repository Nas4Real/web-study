import { z } from "zod";

import { sessionDateTimeToIso } from "./calendar-date";

const weekdays = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
const frequencySchema = z.enum(["none", "daily", "weekly", "monthly"]);
const endSchema = z.enum(["never", "date", "count"]);
const integerSchema = (max: number) => z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().min(1).max(max));
const weekdaysSchema = z.array(z.enum(weekdays)).min(1).max(7).refine(days => new Set(days).size === days.length);

type RepeatFields = Partial<Record<"repeatFrequency" | "repeatInterval" | "repeatEnd" | "repeatCount" | "repeatUntil" | "date", string>>;

/** Only allowlisted structured controls become RRULE; raw client rules are never used. */
export function parseRecurrenceForm(values: RepeatFields, days: FormDataEntryValue[], timeZone: string):
  { success: true; rule: string | null } | { success: false } {
  // Check transport shape even when a setting is inactive.
  if (days.length > 7 || days.some(day => typeof day !== "string")) return { success: false };
  const frequency = frequencySchema.safeParse(values.repeatFrequency ?? "none");
  if (!frequency.success) return { success: false };
  if (frequency.data === "none") return { success: true, rule: null };
  const interval = integerSchema(99).safeParse(values.repeatInterval);
  const end = endSchema.safeParse(values.repeatEnd);
  if (!interval.success || !end.success) return { success: false };
  let rule = `FREQ=${frequency.data.toUpperCase()};INTERVAL=${interval.data}`;
  if (frequency.data === "weekly") {
    const selected = weekdaysSchema.safeParse(days);
    if (!selected.success) return { success: false };
    rule += `;BYDAY=${weekdays.filter(day => selected.data.includes(day)).join(",")}`;
  }
  if (end.data === "count") {
    const count = integerSchema(500).safeParse(values.repeatCount);
    if (!count.success) return { success: false };
    rule += `;COUNT=${count.data}`;
  }
  if (end.data === "date") {
    const until = values.repeatUntil ?? "";
    const instant = sessionDateTimeToIso(until, "23:59", timeZone);
    if (!instant || until < (values.date ?? "")) return { success: false };
    rule += `;UNTIL=${instant.replace(/[-:]/g, "").replace(".000", "")}`;
  }
  return { success: true, rule };
}
