import { describe, expect, it, vi } from "vitest";
import { createTimetableImportAdapter } from "./timetable-import-api";
import { TimetableImportService } from "@/server/study/timetable-import-service";
import { MAX_TIMETABLE_BYTES } from "@/domain/timetable-import";
import { createPublicApiHandler } from "./public-api-handler";

const actor = "11111111-1111-4111-8111-111111111111";
const wire = { version: 1, timezone: "Africa/Tunis", sessions: [{ kind: "university", title: "Physics", subject: "Physics", date: "2026-10-19", start_time: "09:00", duration_minutes: 60 }] };
const summary = { importId: "22222222-2222-4222-8222-222222222222", sessionCount: 1, subjectsCreated: 1, alreadyImported: false, firstDate: "2026-10-19" };
const context = { actor: { apiKeyId: null, userId: actor }, requestId: "import-test" };
const request = (body = JSON.stringify(wire), headers: Record<string, string> = {}) => new Request("https://example.test/api/v1/calendar/imports", { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
const setup = () => {
  const repository = { importOwned: vi.fn().mockResolvedValue({ data: summary, errorCode: null }) };
  const onImported = vi.fn();
  return { repository, onImported, adapter: createTimetableImportAdapter(new TimetableImportService(repository), onImported) };
};

describe("authenticated timetable import API", () => {
  it("returns a committed summary and refreshes affected paths once", async () => {
    const { adapter, onImported } = setup();
    const response = await adapter(request(), context);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ import_id: summary.importId, session_count: 1, first_date: "2026-10-19", already_imported: false });
    expect(onImported).toHaveBeenCalledOnce();
  });
  it("keeps committed success even if post-write revalidation fails", async () => {
    const { adapter, onImported } = setup();
    onImported.mockImplementation(() => { throw new Error("refresh failed"); });
    expect((await adapter(request(), context)).status).toBe(201);
  });
  it("reports replays as 200 instead of creating again", async () => {
    const { adapter, repository, onImported } = setup();
    repository.importOwned.mockResolvedValue({ data: { ...summary, alreadyImported: true, subjectsCreated: 0 }, errorCode: null });
    expect((await adapter(request(), context)).status).toBe(200);
    expect(onImported).toHaveBeenCalledOnce();
  });
  it.each(["{bad", JSON.stringify({ ...wire, sessions: [{ ...wire.sessions[0], duration_minutes: -1 }] })])("returns actionable validation errors without writes: %s", async body => {
    const { adapter, repository } = setup();
    const response = await adapter(request(body), context);
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_FAILED", details: [expect.objectContaining({ message: expect.any(String) })] } });
    expect(repository.importOwned).not.toHaveBeenCalled();
  });
  it("limits streamed bodies even without a content-length header", async () => {
    const { adapter, repository } = setup();
    expect((await adapter(request(" ".repeat(MAX_TIMETABLE_BYTES + 1)), context)).status).toBe(413);
    expect(repository.importOwned).not.toHaveBeenCalled();
  });
  it("rejects oversized declared lengths and unsupported content types", async () => {
    const { adapter, repository } = setup();
    expect((await adapter(request("{}", { "content-length": String(MAX_TIMETABLE_BYTES + 1) }), context)).status).toBe(413);
    expect((await adapter(request("{}", { "content-type": "text/plain" }), context)).status).toBe(415);
    expect(repository.importOwned).not.toHaveBeenCalled();
  });
  it("conceals foreign subject information and creates nothing on an owner-reference failure", async () => {
    const { adapter, repository, onImported } = setup();
    repository.importOwned.mockResolvedValue({ data: null as never, errorCode: "23503" });
    const response = await adapter(request(), context);
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_FAILED", details: [expect.objectContaining({ message: expect.stringContaining("subject") })] } });
    expect(onImported).not.toHaveBeenCalled();
  });
  it.each(["cookie", "jwt", "key"])("uses the existing %s authentication boundary", async mode => {
    const { adapter, repository } = setup();
    const sessions = { verify: vi.fn().mockResolvedValue({ status: "success", data: context.actor }) };
    const apiKeys = { verify: vi.fn().mockResolvedValue({ status: "success", data: { ...context.actor, apiKeyId: actor } }) };
    const limiter = { consume: vi.fn().mockResolvedValue({ status: "success", data: { allowed: true, retryAfterSeconds: 0 } }) };
    const handler = createPublicApiHandler({ next: adapter, sessions, apiKeys, limiter });
    const headers: Record<string, string> = mode === "cookie" ? { origin: "https://example.test" } : { authorization: `Bearer ${mode === "key" ? "wsk_test" : "user.jwt.token"}` };
    const response = await handler(request(undefined, headers));
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(repository.importOwned.mock.calls[0][0]).toBe(actor);
  });
  it("rejects expired sessions and cross-origin cookie posts before import", async () => {
    const { adapter, repository } = setup();
    const sessions = { verify: vi.fn().mockResolvedValue({ status: "success", data: context.actor }) };
    const handler = createPublicApiHandler({ next: adapter, sessions, apiKeys: { verify: vi.fn() }, limiter: { consume: vi.fn() } });
    expect((await handler(request(undefined, { origin: "https://evil.test" }))).status).toBe(403);
    sessions.verify.mockResolvedValue({ status: "error", code: "INVALID_SESSION" });
    expect((await handler(request())).status).toBe(401);
    expect(repository.importOwned).not.toHaveBeenCalled();
  });
});
