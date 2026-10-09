import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createApiKeyTokenCodec,
  extractApiKeyPrefix,
} from "./api-key-crypto";

describe("personal API key token codec", () => {
  it("generates a high-entropy one-time token and stores only an HMAC digest", () => {
    const codec = createApiKeyTokenCodec("test-pepper", (size) => Buffer.alloc(size, 7));
    const generated = codec.generate();

    expect(generated.token).toMatch(/^wsk_[A-Za-z0-9_-]{12}_[A-Za-z0-9_-]{43}$/);
    expect(generated.prefix).toHaveLength(12);
    expect(generated.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(generated.digest).not.toContain(generated.token);
    expect(codec.verify(generated.token, generated.digest)).toBe(true);
  });

  it("rejects malformed, altered, and differently-peppered tokens", () => {
    const codec = createApiKeyTokenCodec("test-pepper", (size) => Buffer.alloc(size, 9));
    const generated = codec.generate();
    const altered = `${generated.token.slice(0, -1)}A`;

    expect(codec.verify(altered, generated.digest)).toBe(false);
    expect(createApiKeyTokenCodec("other-pepper").verify(generated.token, generated.digest)).toBe(false);
    expect(extractApiKeyPrefix("not-a-key")).toBeNull();
  });
});
