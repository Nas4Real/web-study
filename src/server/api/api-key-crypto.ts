import "server-only";

import {
  createHmac,
  randomBytes as nodeRandomBytes,
  timingSafeEqual,
} from "node:crypto";

import type { ApiKeyTokenCodec } from "./api-key-service";

const TOKEN_PATTERN = /^wsk_([A-Za-z0-9_-]{12})_([A-Za-z0-9_-]{43})$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

type RandomBytes = (size: number) => Uint8Array;

function digestToken(token: string, pepper: string) {
  return createHmac("sha256", pepper).update(token, "utf8").digest("hex");
}

export function extractApiKeyPrefix(token: string) {
  return TOKEN_PATTERN.exec(token)?.[1] ?? null;
}

export function createApiKeyTokenCodec(
  pepper: string,
  randomBytes: RandomBytes = nodeRandomBytes,
): ApiKeyTokenCodec {
  if (pepper.length < 1) throw new Error("API key hash pepper is not configured");

  return {
    extractPrefix(token) {
      return extractApiKeyPrefix(token);
    },

    generate() {
      const prefix = Buffer.from(randomBytes(9)).toString("base64url");
      const secret = Buffer.from(randomBytes(32)).toString("base64url");
      const token = `wsk_${prefix}_${secret}`;
      return { digest: digestToken(token, pepper), prefix, token };
    },

    verify(token, expectedDigest) {
      if (!TOKEN_PATTERN.test(token) || !DIGEST_PATTERN.test(expectedDigest)) {
        return false;
      }
      const actual = Buffer.from(digestToken(token, pepper), "hex");
      const expected = Buffer.from(expectedDigest, "hex");
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    },
  };
}
