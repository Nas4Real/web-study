import { TZDate, tzOffset } from "@date-fns/tz";

export function sessionDateTimeToIso(date: string, time: string, timeZone: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  const [year, month, day] = dateMatch.slice(1).map(Number);
  const [hour, minute] = timeMatch.slice(1).map(Number);
  if (hour > 23 || minute > 59) return null;
  try {
    const wall = new Date(0);
    wall.setUTCFullYear(year, month - 1, day);
    wall.setUTCHours(hour, minute, 0, 0);
    if (wall.getUTCFullYear() !== year || wall.getUTCMonth() !== month - 1 || wall.getUTCDate() !== day) return null;
    // Sample both sides of nearby transitions, then verify each possible instant.
    // Component constructors can resolve a DST fold differently by host timezone.
    const offsets = new Set([-36, 0, 36].map(hours =>
      tzOffset(timeZone, new Date(wall.getTime() + hours * 3_600_000))));
    const candidates = [...offsets].flatMap(offset => {
      const timestamp = wall.getTime() - offset * 60_000;
      if (!Number.isFinite(timestamp)) return [];
      const zoned = new TZDate(timestamp, timeZone);
      return zoned.getFullYear() === year && zoned.getMonth() === month - 1 &&
        zoned.getDate() === day && zoned.getHours() === hour && zoned.getMinutes() === minute
        ? [timestamp] : [];
    }).sort((left, right) => left - right);
    // RFC 5545 selects the first occurrence of an ambiguous local time.
    return candidates.length ? new Date(candidates[0]).toISOString() : null;
  } catch {
    return null;
  }
}
