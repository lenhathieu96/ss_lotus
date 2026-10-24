import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createHandler } from "./index.ts";
import { actions } from "./request-contract.ts";
import { requireAdmin } from "./supabase-client.ts";
import type { LibraryServerLifecycleSource } from "./lifecycle-types.ts";

const id = "bce05144-b90f-4ed6-92aa-10203f702f70";
const origin = "https://library.example.test";
const endpoint = "https://example.test/functions/v1/library-lifecycle";
function payload(action: string) {
  return {
    action,
    documentId: id,
    categoryId: id,
    title: "Kinh",
    originalFilename: "kinh.pdf",
    expectedSize: 42,
  };
}
function request(body: unknown, token?: string) {
  return new Request(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function fixture() {
  const calls: string[] = [];
  const service = new Proxy({}, {
    get: (_, name) => async () => {
      calls.push(String(name));
      if (
        name === "getDownloadUrl"
      ) return "https://signed.example.test/download";
      return { status: "published" };
    },
  }) as LibraryServerLifecycleSource;
  const client = () =>
    createClient("https://supabase.example.test", "test-service-role", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input, init) => {
          const url = String(input);
          if (url.endsWith("/auth/v1/user")) {
            const token = new Headers(init?.headers).get("authorization");
            if (
              token === "Bearer invalid" || token === "Bearer expired"
            ) {
              return Response.json({ message: "invalid token" }, {
                status: 401,
              });
            }
            calls.push("verified-user");
            return Response.json({
              id,
              aud: "authenticated",
              role: "authenticated",
              email: "test@example.test",
            });
          }
          calls.push("admin-membership");
          // This closure records the desired membership without trusting user metadata.
          return Response.json(fixtureAdmin ? { user_id: id } : null);
        },
      },
    });
  let fixtureAdmin = true;
  return {
    calls,
    setAdmin: (value: boolean) => {
      fixtureAdmin = value;
    },
    handler: createHandler({
      service,
      requireAdmin: (req) => requireAdmin(req, client),
      origins: () => [origin],
    }),
  };
}

for (const action of actions.filter((value) => value !== "get-download-url")) {
  Deno.test(`${action}: rejects absent, invalid, expired, non-admin; admits verified admin`, async () => {
    const f = fixture();
    for (const token of [undefined, "invalid", "expired"]) {
      const response = await f.handler(request(payload(action), token));
      assert.equal(response.status, 401);
      assert.deepEqual(f.calls, []);
      assert.equal(response.headers.get("access-control-allow-origin"), origin);
    }
    f.setAdmin(false);
    assert.equal(
      (await f.handler(request(payload(action), "valid"))).status,
      403,
    );
    assert.deepEqual(f.calls, ["verified-user", "admin-membership"]);
    f.calls.length = 0;
    f.setAdmin(true);
    assert.equal(
      (await f.handler(request(payload(action), "valid"))).status,
      200,
    );
    assert.equal(f.calls[0], "verified-user");
    assert.equal(f.calls[1], "admin-membership");
    assert.equal(f.calls.length, 3);
  });
}

Deno.test("public download bypasses auth; health performs no provider calls", async () => {
  const f = fixture();
  const response = await f.handler(request(payload("get-download-url")));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), {
    url: "https://signed.example.test/download",
  });
  assert.deepEqual(f.calls, ["getDownloadUrl"]);
  f.calls.length = 0;
  const health = await f.handler(new Request(`${endpoint}/health`));
  const body = await health.json();
  assert.deepEqual(Object.keys(body).sort(), ["contractVersion", "releaseId"]);
  assert.equal(body.contractVersion, 1);
  assert.match(body.releaseId, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(f.calls, []);
  assert.equal(
    (await f.handler(
      request({ action: "get-download-url", documentId: "bad" }),
    )).status,
    404,
  );
});

Deno.test("default health startup needs no configured provider credentials", async () => {
  const response = await createHandler()(new Request(`${endpoint}/health`));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).contractVersion, 1);
});

Deno.test("malformed, invalid fields, excessive size and actor spoofing never call a provider", async () => {
  const f = fixture();
  for (
    const body of [
      [],
      null,
      { action: "unknown" },
      { ...payload("complete-upload"), documentId: "bad" },
      { ...payload("prepare-upload"), expectedSize: 100 * 1024 * 1024 + 1 },
      { ...payload("prepare-upload"), title: "x".repeat(501) },
      { ...payload("prepare-upload"), author: {} },
      { ...payload("complete-upload"), actorId: id },
    ]
  ) {
    assert.equal((await f.handler(request(body))).status, 400);
  }
  assert.equal(
    (await f.handler(
      new Request(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    )).status,
    400,
  );
  assert.equal(
    (await f.handler(new Request(endpoint, { method: "POST", body: "{}" })))
      .status,
    400,
  );
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(8192));
      controller.enqueue(new Uint8Array(8193));
      controller.close();
    },
  });
  assert.equal(
    (await f.handler(
      new Request(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: stream,
      }),
    )).status,
    413,
  );
  assert.deepEqual(f.calls, []);
});

Deno.test("preflight, method, missing route and disallowed origin handling", async () => {
  const f = fixture();
  assert.equal(
    (await f.handler(
      new Request(endpoint, { method: "OPTIONS", headers: { origin } }),
    )).status,
    204,
  );
  assert.equal(
    (await f.handler(new Request(endpoint, { method: "DELETE" }))).status,
    405,
  );
  assert.equal(
    (await f.handler(new Request(`${endpoint}/unknown`))).status,
    404,
  );
  const denied = await f.handler(
    new Request(endpoint, {
      method: "OPTIONS",
      headers: { origin: "https://evil.test" },
    }),
  );
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.has("access-control-allow-origin"), false);
  assert.deepEqual(f.calls, []);
});
