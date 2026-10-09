import { z } from "zod";

const cursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.string().uuid(),
  position: z.number().int().min(0),
}).strict();

const pageRequestSchema = z.object({
  cursor: cursorSchema.nullable(),
  limit: z.number().int().min(1).max(100),
}).strict();

export type CoreResourceCursor = z.infer<typeof cursorSchema>;

export function encodeCursor(value: CoreResourceCursor) {
  return Buffer.from(JSON.stringify(cursorSchema.parse(value)), "utf8")
    .toString("base64url");
}

export function decodeCursor(value: string): CoreResourceCursor | null {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = cursorSchema.safeParse(JSON.parse(decoded));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function parsePageRequest(search: URLSearchParams) {
  const cursorValue = search.get("cursor");
  const limitValue = search.get("limit");
  if (cursorValue !== null && (cursorValue.length < 1 || cursorValue.length > 1024)) {
    return { code: "INVALID_INPUT", status: "error" } as const;
  }
  const cursor = cursorValue === null ? null : decodeCursor(cursorValue);
  if (cursorValue !== null && cursor === null) {
    return { code: "INVALID_INPUT", status: "error" } as const;
  }
  const limit = limitValue === null || limitValue === ""
    ? 50
    : Number(limitValue);
  const parsed = pageRequestSchema.safeParse({ cursor, limit });
  return parsed.success
    ? { data: parsed.data, status: "success" } as const
    : { code: "INVALID_INPUT", status: "error" } as const;
}
