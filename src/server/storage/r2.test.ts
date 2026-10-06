import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createFileObjectKey,
  createR2ObjectStore,
  createR2ObjectStoreFromEnv,
  R2StorageError,
} from "./r2";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const FILE_ID = "22222222-2222-4222-8222-222222222222";
const OBJECT_KEY = `users/${USER_ID}/files/${FILE_ID}`;
const CONFIG = {
  accessKeyId: "access-key-id",
  accountId: "0123456789abcdef0123456789abcdef",
  bucket: "web-study-private",
  secretAccessKey: "secret-access-key",
};

function dependencies() {
  return {
    client: { send: vi.fn() },
    sign: vi.fn().mockResolvedValue("https://signed.example.test/object"),
  };
}

describe("R2 object storage adapter", () => {
  it("builds only from the four server-side R2 environment values", async () => {
    const deps = dependencies();
    const storage = createR2ObjectStoreFromEnv({
      R2_ACCESS_KEY_ID: CONFIG.accessKeyId,
      R2_ACCOUNT_ID: CONFIG.accountId,
      R2_BUCKET: CONFIG.bucket,
      R2_SECRET_ACCESS_KEY: CONFIG.secretAccessKey,
    }, deps as never);

    await storage.presignDownload({ key: OBJECT_KEY });
    expect(deps.sign).toHaveBeenCalledOnce();
    expect(() => createR2ObjectStoreFromEnv({
      R2_ACCOUNT_ID: CONFIG.accountId,
      R2_BUCKET: CONFIG.bucket,
    })).toThrow(R2StorageError);
  });

  it("creates immutable opaque file keys and rejects malformed identifiers", () => {
    expect(createFileObjectKey(USER_ID, FILE_ID)).toBe(OBJECT_KEY);
    expect(() => createFileObjectKey("../foreign", FILE_ID)).toThrow(R2StorageError);
    expect(() => createFileObjectKey(USER_ID, "folder/report.pdf")).toThrow(R2StorageError);
  });

  it("binds bucket, opaque key, content type, and a ten-minute upload expiry", async () => {
    const deps = dependencies();
    const storage = createR2ObjectStore(CONFIG, deps as never);

    await expect(storage.presignUpload({
      contentType: "application/pdf",
      key: OBJECT_KEY,
    })).resolves.toBe("https://signed.example.test/object");

    const [client, command, options] = deps.sign.mock.calls[0];
    expect(client).toBe(deps.client);
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input).toEqual({
      Bucket: CONFIG.bucket,
      ContentType: "application/pdf",
      Key: OBJECT_KEY,
    });
    expect(options).toEqual({ expiresIn: 600 });
  });

  it("creates short-lived download URLs for the exact object only", async () => {
    const deps = dependencies();
    const storage = createR2ObjectStore(CONFIG, deps as never);

    await storage.presignDownload({ expiresInSeconds: 120, key: OBJECT_KEY });

    const command = deps.sign.mock.calls[0][1];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect((command as GetObjectCommand).input).toEqual({
      Bucket: CONFIG.bucket,
      Key: OBJECT_KEY,
    });
    expect(deps.sign.mock.calls[0][2]).toEqual({ expiresIn: 120 });
  });

  it("rejects unsafe keys, content types, and overlong bearer capabilities before signing", async () => {
    const deps = dependencies();
    const storage = createR2ObjectStore(CONFIG, deps as never);

    await expect(storage.presignUpload({
      contentType: "application/pdf\r\nx-leak: yes",
      key: OBJECT_KEY,
    })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(storage.presignDownload({
      expiresInSeconds: 601,
      key: "users/foreign/files/report.pdf",
    })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(deps.sign).not.toHaveBeenCalled();
  });

  it("heads and deletes the configured private object without returning provider records", async () => {
    const deps = dependencies();
    deps.client.send
      .mockResolvedValueOnce({ ContentLength: 42, ContentType: "application/pdf", ETag: '"etag"' })
      .mockResolvedValueOnce({ provider: "ignored" });
    const storage = createR2ObjectStore(CONFIG, deps as never);

    await expect(storage.headObject(OBJECT_KEY)).resolves.toEqual({
      contentLength: 42,
      contentType: "application/pdf",
      etag: '"etag"',
    });
    await expect(storage.deleteObject(OBJECT_KEY)).resolves.toBeUndefined();
    expect(deps.client.send.mock.calls[0][0]).toBeInstanceOf(HeadObjectCommand);
    expect(deps.client.send.mock.calls[1][0]).toBeInstanceOf(DeleteObjectCommand);
  });

  it("replaces provider failures with a stable non-secret error", async () => {
    const deps = dependencies();
    deps.client.send.mockRejectedValue(new Error("secret provider detail"));
    const storage = createR2ObjectStore(CONFIG, deps as never);

    await expect(storage.headObject(OBJECT_KEY)).rejects.toEqual(
      expect.objectContaining({
        code: "PROVIDER_UNAVAILABLE",
        message: "Object storage is temporarily unavailable.",
      }),
    );
  });

  it("distinguishes a missing object without exposing provider details", async () => {
    const deps = dependencies();
    deps.client.send.mockRejectedValue({ $metadata: { httpStatusCode: 404 }, message: "secret key" });
    const storage = createR2ObjectStore(CONFIG, deps as never);
    await expect(storage.headObject(OBJECT_KEY)).rejects.toMatchObject({
      code: "OBJECT_NOT_FOUND",
      message: "Object was not found.",
    });
  });
});
