import assert from "node:assert/strict";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import {
  createDownloadUrl,
  createLibraryStorage,
  createStagingUploadUrl,
  isS3AccessDenied,
  isS3NotFound,
  s3LibraryKeys,
} from "./library-storage.ts";

Deno.test("actual Deno/AWS presigning preserves create-only PUT and avoids empty-body checksums", async () => {
  const values = {
    AWS_REGION: "ap-southeast-1",
    S3_LIBRARY_BUCKET: "test-library",
    AWS_ACCESS_KEY_ID: "test-key",
    AWS_SECRET_ACCESS: "test-secret",
    AWS_SECRET_ACCESS_KEY: "",
  };
  const saved = new Map(
    Object.keys(values).map((name) => [name, Deno.env.get(name)]),
  );
  try {
    for (const [name, value] of Object.entries(values)) {
      if (value) Deno.env.set(name, value);
      else Deno.env.delete(name);
    }
    const result = await createStagingUploadUrl("doc");
    const url = new URL(result.uploadUrl);
    assert.equal(result.stagingPath, "pending/doc.pdf");
    assert.equal(result.expiresInSeconds, 900);
    assert.equal(url.searchParams.has("x-amz-checksum-crc32"), false);
    assert.equal(url.searchParams.has("x-amz-sdk-checksum-algorithm"), false);
    assert.match(
      url.searchParams.get("X-Amz-SignedHeaders") ?? "",
      /if-none-match/,
    );
    const download = new URL(await createDownloadUrl("doc", 'bad\r\n"/:name'));
    const disposition =
      download.searchParams.get("response-content-disposition") ?? "";
    assert.match(disposition, /^attachment; filename="bad name.pdf"$/);
    assert.equal(s3LibraryKeys.documentKey("doc"), "documents/doc.pdf");
    assert.equal(
      isS3AccessDenied({ $metadata: { httpStatusCode: 403 } }),
      true,
    );
    assert.equal(isS3NotFound({ $metadata: { httpStatusCode: 404 } }), true);
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
});

function storageFixture() {
  const calls: Array<{ name: string; input: Record<string, unknown> }> = [];
  const objects = new Map<
    string,
    { size: number; contentType: string; signature: string }
  >();
  let preventDelete = false;
  const client = {
    send: async (command: { input: Record<string, unknown> }) => {
      calls.push({ name: command.constructor.name, input: command.input });
      const key = String(command.input.Key);
      const object = objects.get(key);
      if (command instanceof HeadObjectCommand) {
        if (!object) throw { $metadata: { httpStatusCode: 404 } };
        return {
          ContentLength: object.size,
          ContentType: object.contentType,
          ETag: "etag",
        };
      }
      if (command instanceof GetObjectCommand) {
        return {
          Body: {
            transformToByteArray: async () =>
              new TextEncoder().encode(object?.signature),
          },
        };
      }
      if (command instanceof CopyObjectCommand) {
        const source = objects.get("pending/doc.pdf");
        if (!source) throw new Error("missing staging");
        objects.set(key, { ...source });
        return {};
      }
      if (command instanceof DeleteObjectCommand) {
        if (!preventDelete) objects.delete(key);
        return {};
      }
      throw new Error("Unexpected command");
    },
  } as unknown as S3Client;
  return {
    objects,
    calls,
    preventDelete: () => {
      preventDelete = true;
    },
    storage: createLibraryStorage(() => client),
  };
}

Deno.test("storage PDF verification rejects missing, mismatched size/type/signature and ranges five bytes", async () => {
  const previous = Deno.env.get("S3_LIBRARY_BUCKET");
  Deno.env.set("S3_LIBRARY_BUCKET", "test-library");
  try {
    const f = storageFixture();
    await assert.rejects(f.storage.verifyStagingPdf("doc", 42), /missing/);
    for (
      const object of [
        { size: 41, contentType: "application/pdf", signature: "%PDF-" },
        { size: 42, contentType: "text/plain", signature: "%PDF-" },
        { size: 42, contentType: "application/pdf", signature: "bogus" },
      ]
    ) {
      f.objects.set("pending/doc.pdf", object);
      await assert.rejects(f.storage.verifyStagingPdf("doc", 42));
    }
    f.objects.set("pending/doc.pdf", {
      size: 42,
      contentType: "application/pdf",
      signature: "%PDF-",
    });
    assert.equal((await f.storage.verifyStagingPdf("doc", 42)).size, 42);
    assert.equal(f.calls.at(-1)?.input.Range, "bytes=0-4");
  } finally {
    if (previous === undefined) Deno.env.delete("S3_LIBRARY_BUCKET");
    else Deno.env.set("S3_LIBRARY_BUCKET", previous);
  }
});

Deno.test("storage copy observes existing final, verifies new copy and confirms deletion", async () => {
  const previous = Deno.env.get("S3_LIBRARY_BUCKET");
  Deno.env.set("S3_LIBRARY_BUCKET", "test-library");
  try {
    const f = storageFixture();
    const pdf = {
      size: 42,
      contentType: "application/pdf",
      signature: "%PDF-",
    };
    f.objects.set("pending/doc.pdf", pdf);
    await f.storage.copyStagingToDocument("doc");
    const copied = f.calls.find((call) => call.name === "CopyObjectCommand");
    assert.equal(copied?.input.CopySource, "/test-library/pending/doc.pdf");
    assert.equal(copied?.input.ContentDisposition, "inline");
    assert.equal(copied?.input.MetadataDirective, "REPLACE");
    f.calls.length = 0;
    await f.storage.copyStagingToDocument("doc");
    assert.equal(f.calls.length, 1);
    await f.storage.deleteObjectAndVerify("pending/doc.pdf");
    assert.equal(f.objects.has("pending/doc.pdf"), false);
    f.preventDelete();
    await assert.rejects(
      f.storage.deleteObjectAndVerify("documents/doc.pdf"),
      /still exists/,
    );
  } finally {
    if (previous === undefined) Deno.env.delete("S3_LIBRARY_BUCKET");
    else Deno.env.set("S3_LIBRARY_BUCKET", previous);
  }
});
