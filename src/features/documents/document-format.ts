export function formatBytes(bytes: number) {
  if (bytes >= 1_000_000_000) return `${trimDecimal(bytes / 1_000_000_000)} GB`;
  if (bytes >= 1_000_000) return `${trimDecimal(bytes / 1_000_000)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}

function trimDecimal(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
