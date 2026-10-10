import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ actor: vi.fn(), client: vi.fn(), headers: vi.fn(), profile: vi.fn(), tasks: vi.fn(), subjects: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/server/auth/request-auth", () => ({ getVerifiedActor: mocks.actor }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("./supabase-study-repositories", () => ({
  createSupabaseProfileRepository: mocks.profile,
  createSupabaseTaskRepository: mocks.tasks,
  createSupabaseSubjectRepository: mocks.subjects,
}));

import { resolveTaskDetailRequestContext, resolveTaskRequestContext } from "./task-request-context";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const SECOND_ACTOR = "22222222-2222-4222-8222-222222222222";

describe("task detail read context", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.actor.mockResolvedValue({ userId: ACTOR });
    mocks.headers.mockResolvedValue(new Headers());
    mocks.client.mockResolvedValue({});
    mocks.tasks.mockReturnValue({});
    mocks.subjects.mockReturnValue({});
  });

  it("exposes authenticated read services before the required profile finishes", async () => {
    let release!: (value: unknown) => void;
    const findByUserId = vi.fn(() => new Promise(resolve => { release = resolve; }));
    mocks.profile.mockReturnValue({ findByUserId });
    const context = await resolveTaskDetailRequestContext();
    expect(context?.actorId).toBe(ACTOR);
    expect(findByUserId).toHaveBeenCalledWith(ACTOR);
    release({ data: { displayName: "Test", timezone: "Asia/Tokyo" }, errorCode: null });
    await expect(context?.timeZone).resolves.toBe("Asia/Tokyo");
  });

  it("constructs no repositories or profile reads without a verified actor", async () => {
    mocks.actor.mockResolvedValue(null);
    await expect(resolveTaskDetailRequestContext()).resolves.toBeNull();
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.profile).not.toHaveBeenCalled();
  });

  it("keeps the normal mutation/page context blocked on its profile", async () => {
    let release!: (value: unknown) => void;
    const findByUserId = vi.fn(() => new Promise(resolve => { release = resolve; }));
    mocks.profile.mockReturnValue({ findByUserId });
    let settled = false;
    const pending = resolveTaskRequestContext().then(context => { settled = true; return context; });
    await vi.waitFor(() => expect(findByUserId).toHaveBeenCalled());
    expect(settled).toBe(false);
    release({ data: { displayName: "Test", timezone: "Africa/Tunis" }, errorCode: null });
    await expect(pending).resolves.toMatchObject({ actorId: ACTOR, timeZone: "Africa/Tunis", displayName: "Test" });
  });

  it("does not reuse a timezone across actors or requests", async () => {
    mocks.actor.mockResolvedValueOnce({ userId: ACTOR }).mockResolvedValueOnce({ userId: SECOND_ACTOR });
    const findByUserId = vi.fn(async (actor: string) => ({ data: { displayName: "Test", timezone: actor === ACTOR ? "Africa/Tunis" : "Asia/Tokyo" }, errorCode: null }));
    mocks.profile.mockReturnValue({ findByUserId });
    const first = await resolveTaskDetailRequestContext();
    const second = await resolveTaskDetailRequestContext();
    expect(first?.actorId).toBe(ACTOR);
    expect(second?.actorId).toBe(SECOND_ACTOR);
    await expect(first?.timeZone).resolves.toBe("Africa/Tunis");
    await expect(second?.timeZone).resolves.toBe("Asia/Tokyo");
    expect(findByUserId.mock.calls).toEqual([[ACTOR], [SECOND_ACTOR]]);
  });

  it.each([
    { data: null, errorCode: null },
    { data: null, errorCode: "provider failure" },
  ])("requires an available profile without falling back to a timezone: %j", async repositoryResult => {
    mocks.profile.mockReturnValue({ findByUserId: vi.fn().mockResolvedValue(repositoryResult) });
    const context = await resolveTaskDetailRequestContext();
    await expect(context?.timeZone).rejects.toThrow();
    await expect(resolveTaskRequestContext()).rejects.toThrow();
  });
});
