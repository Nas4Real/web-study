import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "./route";

describe("/api/v1/subjects", () => {
  it("rejects a missing API key before provider configuration is needed", async () => {
    const response = await GET(new Request("https://example.test/api/v1/subjects", {
      headers: { "x-request-id": "subjects-test-1" },
    }));

    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBe("subjects-test-1");
    expect(await response.json()).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "A valid Supabase session or personal API key is required.",
        request_id: "subjects-test-1",
      },
    });
  });
});
