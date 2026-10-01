import { describe, expect, it } from "vitest";

import { resolveVerifiedActor } from "./verified-actor";

describe("resolveVerifiedActor", () => {
  it("returns a request actor from verified JWT claims", async () => {
    const actor = await resolveVerifiedActor(async () => ({
      data: { claims: { sub: "user-123" } },
      error: null,
    }));

    expect(actor).toEqual({ userId: "user-123" });
  });

  it("returns null when verification fails", async () => {
    const actor = await resolveVerifiedActor(async () => ({
      data: { claims: null },
      error: new Error("invalid token"),
    }));

    expect(actor).toBeNull();
  });

  it("returns null when verified claims have no subject", async () => {
    const actor = await resolveVerifiedActor(async () => ({
      data: { claims: {} },
      error: null,
    }));

    expect(actor).toBeNull();
  });

  it("fails closed when the identity provider is unavailable", async () => {
    const actor = await resolveVerifiedActor(async () => {
      throw new Error("provider details must not escape");
    });

    expect(actor).toBeNull();
  });
});
