import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ taskContext: vi.fn(), scope: vi.fn(), client: vi.fn(), repository: vi.fn(), e2eRepository: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./task-request-context", () => ({ resolveTaskRequestContext: mocks.taskContext, resolveE2eStudyScope: mocks.scope }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("./supabase-calendar-repository", () => ({ createSupabaseCalendarRepository: mocks.repository }));
vi.mock("./e2e-calendar-repository", () => ({ createE2eCalendarRepository: mocks.e2eRepository }));

import { resolveCalendarRequestContext } from "./calendar-request-context";

describe("calendar request context", () => {
  const now = () => new Date("2026-10-04T12:00:00.000Z");
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskContext.mockResolvedValue({ actorId: "11111111-1111-4111-8111-111111111111", timeZone: "Africa/Tunis", now, subjectService: {} });
    mocks.scope.mockResolvedValue(null);
  });
  it("does not construct any calendar repository for an unauthenticated request", async () => {
    mocks.taskContext.mockResolvedValue(null);
    expect(await resolveCalendarRequestContext()).toBeNull();
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.e2eRepository).not.toHaveBeenCalled();
  });
  it("uses the cookie client and verified profile context for production", async () => {
    const client = {};
    mocks.client.mockResolvedValue(client);
    mocks.repository.mockReturnValue({ listOwned: async () => ({ data: [], errorCode: null }), listExceptionsOwned: async () => ({ data: [], errorCode: null }) });
    const context = await resolveCalendarRequestContext("untrusted-scope");
    expect(mocks.repository).toHaveBeenCalledWith(client);
    expect(mocks.e2eRepository).not.toHaveBeenCalled();
    expect(context).toMatchObject({ actorId: "11111111-1111-4111-8111-111111111111", timeZone: "Africa/Tunis", now });
    expect(await context?.calendarService.listOccurrences(context.actorId, "2026-10-04T00:00:00Z", "2026-10-05T00:00:00Z"))
      .toEqual({ data: [], status: "success" });
  });
  it("uses only an authenticated test scope returned by the shared gate", async () => {
    mocks.scope.mockResolvedValue("approved-test-scope");
    mocks.e2eRepository.mockReturnValue({});
    await resolveCalendarRequestContext("requested-scope");
    expect(mocks.e2eRepository).toHaveBeenCalledWith("approved-test-scope");
    expect(mocks.client).not.toHaveBeenCalled();
  });
});
