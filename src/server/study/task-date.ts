function offsetAt(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(new Date(timestamp));
  const numberPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((entry) => entry.type === type)?.value);
  const representedAsUtc = Date.UTC(
    numberPart("year"),
    numberPart("month") - 1,
    numberPart("day"),
    numberPart("hour"),
    numberPart("minute"),
    numberPart("second"),
  );
  return representedAsUtc - timestamp;
}

export function dateInputToEndOfDayIso(value: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const localTimestamp = Date.UTC(year, month - 1, day, 23, 59);
  if (
    new Date(localTimestamp).getUTCFullYear() !== year ||
    new Date(localTimestamp).getUTCMonth() !== month - 1 ||
    new Date(localTimestamp).getUTCDate() !== day
  ) {
    return null;
  }
  try {
    let timestamp = localTimestamp - offsetAt(localTimestamp, timeZone);
    timestamp = localTimestamp - offsetAt(timestamp, timeZone);
    return new Date(timestamp).toISOString();
  } catch {
    return null;
  }
}
