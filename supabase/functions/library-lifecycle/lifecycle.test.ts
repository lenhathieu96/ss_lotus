import assert from "node:assert/strict";
import {
  createLifecycleService,
  type LifecycleDependencies,
} from "./library-lifecycle-service.ts";

const pdf = { size: 42, contentType: "application/pdf", etag: "etag" };
function fixture() {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const replies: Record<string, unknown[]> = {};
  const failures: Record<string, unknown> = {};
  const dependencies = new Proxy({}, {
    get: (_, name) => async (...args: unknown[]) => {
      const label = name === "invokeLibraryLifecycle"
        ? String(args[0])
        : String(name);
      calls.push({
        name: label,
        args: name === "invokeLibraryLifecycle" ? args.slice(1) : args,
      });
      if (label in failures) throw failures[label];
      if (replies[label]?.length) return replies[label].shift();
      if (
        [
          "verifyStagingPdf",
          "verifyFinalPdf",
          "copyStagingToDocument",
          "headObject",
        ].includes(label)
      ) return pdf;
      return undefined;
    },
  }) as LifecycleDependencies;
  return {
    calls,
    replies,
    failures,
    service: createLifecycleService(dependencies),
    names: () => calls.map((call) => call.name),
  };
}

Deno.test("preparation records ticket before signing and preserves actor/size", async () => {
  const f = fixture();
  f.replies.prepare_s3_library_upload = [{
    document_id: "doc",
    upload_expires_at: "expiry",
  }];
  f.replies.createStagingUploadUrl = [{
    stagingPath: "pending/doc.pdf",
    uploadUrl: "signed",
    expiresInSeconds: 900,
  }];
  const result = await f.service.prepareUpload({
    actorId: "actor",
    categoryId: "cat",
    title: "Kinh",
    author: null,
    originalFilename: "kinh.pdf",
    expectedSize: 42,
  });
  assert.equal(result.documentId, "doc");
  assert.deepEqual(f.names(), [
    "prepare_s3_library_upload",
    "createStagingUploadUrl",
  ]);
  assert.equal(
    (f.calls[0].args[0] as Record<string, unknown>).p_actor_id,
    "actor",
  );
});

Deno.test("completion verifies copy and deletion before publishing with exact claim", async () => {
  const f = fixture();
  f.replies.claim_s3_library_upload_completion = [{
    status: "pending",
    expected_size: 42,
    completion_claim_token: "claim",
  }];
  assert.deepEqual(await f.service.completeUpload("doc", "actor"), {
    status: "published",
  });
  assert.deepEqual(f.names(), [
    "claim_s3_library_upload_completion",
    "verifyStagingPdf",
    "copyStagingToDocument",
    "verifyFinalPdf",
    "deleteObjectAndVerify",
    "complete_s3_library_upload",
  ]);
  assert.deepEqual(f.calls[4].args, ["pending/doc.pdf"]);
  assert.equal(
    (f.calls[5].args[0] as Record<string, unknown>).p_completion_claim_token,
    "claim",
  );
});

Deno.test("published completion is no-op; interrupted completion retains final fallback then copy", async () => {
  const f = fixture();
  f.replies.claim_s3_library_upload_completion = [{ status: "published" }];
  await f.service.completeUpload("doc", "actor");
  assert.deepEqual(f.names(), ["claim_s3_library_upload_completion"]);
  f.calls.length = 0;
  f.replies.claim_s3_library_upload_completion = [{
    status: "pending",
    expected_size: 42,
    completion_claim_token: "claim",
  }];
  f.failures.verifyStagingPdf = new Error("missing staging");
  await f.service.completeUpload("doc", "actor");
  assert.deepEqual(f.names().slice(0, 4), [
    "claim_s3_library_upload_completion",
    "verifyStagingPdf",
    "verifyFinalPdf",
    "copyStagingToDocument",
  ]);
});

Deno.test("partial completion failure never publishes; resolution returns pending", async () => {
  const f = fixture();
  f.replies.claim_s3_library_upload_completion = [{
    status: "pending",
    expected_size: 42,
    completion_claim_token: "claim",
  }];
  f.failures.deleteObjectAndVerify = new Error("denied");
  await assert.rejects(f.service.completeUpload("doc", "actor"));
  assert.equal(f.names().includes("complete_s3_library_upload"), false);
  f.replies.get_s3_library_upload_ticket = [{ status: "pending" }];
  f.replies.claim_s3_library_upload_completion = [{
    status: "pending",
    expected_size: 42,
    completion_claim_token: "claim",
  }];
  assert.equal(
    (await f.service.resolveUpload("doc", "actor")).status,
    "pending",
  );
});

Deno.test("pending recovery retains the existing generic access-denial capability", async () => {
  // Pending recovery historically labels all completion denials as read_staging.
  // Characterize that limitation without changing recovery semantics in this move.
  for (const operation of ["copyStagingToDocument", "deleteObjectAndVerify"]) {
    const f = fixture();
    f.replies.get_s3_library_upload_ticket = [{ status: "pending" }];
    f.replies.claim_s3_library_upload_completion = [{
      status: "pending",
      expected_size: 42,
      completion_claim_token: "claim",
    }];
    f.failures[operation] = { $metadata: { httpStatusCode: 403 } };
    const result = await f.service.recoverUpload("doc", "actor");
    assert.equal(result.status, "needs_s3_access");
    assert.equal(result.capability, "read_staging");
    assert.equal(f.names().includes("complete_s3_library_upload"), false);
  }
});

for (
  const [operation, capability] of [["headObject", "read_staging"], [
    "copyStagingToDocument",
    "write_document",
  ], ["deleteObjectAndVerify", "delete_staging"]] as const
) {
  Deno.test(`cleaning recovery reports ${capability} without publishing`, async () => {
    const f = fixture();
    f.replies.get_s3_library_upload_ticket = [{ status: "cleaning" }];
    f.replies.claim_s3_library_upload_recovery = [{
      expected_size: 42,
      recovery_claim_token: "claim",
    }];
    f.failures[operation] = { $metadata: { httpStatusCode: 403 } };
    const result = await f.service.recoverUpload("doc", "actor");
    assert.equal(result.status, "needs_s3_access");
    assert.equal("capability" in result && result.capability, capability);
    assert.equal(
      f.names().includes("publish_recovered_s3_library_upload"),
      false,
    );
  });
}

Deno.test("missing staging recovery cleans final with claim or reports delete_document denial", async () => {
  for (const denied of [false, true]) {
    const f = fixture();
    f.replies.get_s3_library_upload_ticket = [{ status: "cleaning" }];
    f.replies.claim_s3_library_upload_recovery = [{
      expected_size: 42,
      recovery_claim_token: "claim",
    }];
    f.replies.headObject = [null];
    if (denied) {
      f.failures.deleteObjectAndVerify = { $metadata: { httpStatusCode: 403 } };
    }
    const result = await f.service.recoverUpload("doc", "actor");
    assert.deepEqual(
      f.calls.find((call) => call.name === "deleteObjectAndVerify")?.args,
      ["documents/doc.pdf"],
    );
    assert.equal(
      result.status,
      denied ? "needs_s3_access" : "reupload_required",
    );
    if ("capability" in result) {
      assert.equal(result.capability, "delete_document");
    }
    assert.equal(
      f.names().includes("finish_s3_library_upload_cleanup"),
      !denied,
    );
  }
});

Deno.test("successful cleaning recovery publishes only after staging deletion", async () => {
  const f = fixture();
  f.replies.get_s3_library_upload_ticket = [{ status: "cleaning" }];
  f.replies.claim_s3_library_upload_recovery = [{
    expected_size: 42,
    recovery_claim_token: "claim",
  }];
  assert.equal(
    (await f.service.recoverUpload("doc", "actor")).status,
    "published",
  );
  assert.deepEqual(f.names().slice(-2), [
    "deleteObjectAndVerify",
    "publish_recovered_s3_library_upload",
  ]);
});

Deno.test("cleanup preserves batch 20, removes both keys then finishes each claim", async () => {
  const f = fixture();
  f.replies.claim_expired_s3_library_uploads = [[{
    document_id: "doc",
    cleanup_claim_token: "claim",
  }]];
  assert.equal(await f.service.cleanupExpiredUploads("actor"), 1);
  assert.deepEqual(f.calls[0].args, [{ p_actor_id: "actor", p_limit: 20 }]);
  assert.deepEqual(f.names(), [
    "claim_expired_s3_library_uploads",
    "deleteObjectAndVerify",
    "deleteObjectAndVerify",
    "finish_s3_library_upload_cleanup",
  ]);
});

Deno.test("failed deletion remains deleting; reconciliation uses observed object", async () => {
  const f = fixture();
  f.failures.deleteObjectAndVerify = new Error("S3 unavailable");
  await assert.rejects(f.service.deleteDocument("doc", "actor"));
  assert.deepEqual(f.names(), [
    "begin_s3_library_document_delete",
    "deleteObjectAndVerify",
  ]);
  f.calls.length = 0;
  assert.equal(await f.service.reconcileDocument("doc", "actor"), "published");
  f.replies.headObject = [null];
  assert.equal(await f.service.reconcileDocument("doc", "actor"), "deleted");
});

Deno.test("public download signs only a published metadata result", async () => {
  const f = fixture();
  for (const absent of [null, []]) {
    f.replies.get_published_s3_library_document = [absent];
    assert.equal(await f.service.getDownloadUrl("doc"), null);
  }
  assert.equal(f.names().includes("createDownloadUrl"), false);
  f.replies.get_published_s3_library_document = [[{ title: "Kinh" }]];
  f.replies.createDownloadUrl = ["signed"];
  assert.equal(await f.service.getDownloadUrl("doc"), "signed");
  assert.deepEqual(f.calls.at(-1)?.args, ["doc", "Kinh"]);
});
