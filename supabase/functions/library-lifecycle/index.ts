import { buildInfo } from "./build-info.ts";
import { createLifecycleService } from "./library-lifecycle-service.ts";
import { readRequest, RequestError } from "./request-contract.ts";
import { requireAdmin } from "./supabase-client.ts";
import type { LibraryServerLifecycleSource } from "./lifecycle-types.ts";

type Dependencies = {
  service: LibraryServerLifecycleSource;
  requireAdmin: (request: Request) => Promise<string>;
  origins: () => string[];
};

export function createHandler(deps: Dependencies = {
  service: createLifecycleService(),
  requireAdmin,
  origins: () =>
    (Deno.env.get("LIBRARY_ALLOWED_ORIGINS") ?? "").split(",").map((value) =>
      value.trim()
    ).filter(Boolean),
}) {
  return async (request: Request): Promise<Response> => {
    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Vary": "Origin",
    });
    const origin = request.headers.get("origin");
    const json = (value: unknown, status = 200) =>
      Response.json(value, { status, headers });
    try {
      if (origin) {
        if (!deps.origins().includes(origin)) {
          throw new RequestError("Origin is not allowed.", 403);
        }
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        headers.set(
          "Access-Control-Allow-Headers",
          "authorization, x-client-info, apikey, content-type",
        );
      }
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
      }
      const path = new URL(request.url).pathname.replace(/\/$/, "");
      const base = path === "/library-lifecycle" ||
        path === "/functions/v1/library-lifecycle";
      if (request.method === "GET") {
        if (
          path === "/library-lifecycle/health" ||
          path === "/functions/v1/library-lifecycle/health"
        ) return json(buildInfo);
        throw new RequestError("Not found.", 404);
      }
      if (request.method !== "POST") {
        headers.set("Allow", "GET, POST, OPTIONS");
        throw new RequestError("Method not allowed.", 405);
      }
      if (!base) throw new RequestError("Not found.", 404);
      const input = await readRequest(request);
      const service = deps.service;
      if (input.action === "get-download-url") {
        const url = await service.getDownloadUrl(input.documentId);
        if (!url) throw new RequestError("Not found.", 404);
        return json({ url });
      }
      // Exhaustive centralized boundary: no mutation can bypass both checks.
      const actorId = await deps.requireAdmin(request);
      switch (input.action) {
        case "prepare-upload":
          return json(await service.prepareUpload({ ...input, actorId }));
        case "complete-upload":
          return json(await service.completeUpload(input.documentId, actorId));
        case "resolve-upload":
          return json(await service.resolveUpload(input.documentId, actorId));
        case "recover-upload":
          return json(await service.recoverUpload(input.documentId, actorId));
        case "cancel-upload":
          await service.cancelUpload(input.documentId, actorId);
          return json({ status: "cleaning" });
        case "cleanup-uploads":
          return json({
            cleaned: await service.cleanupExpiredUploads(actorId),
          });
        case "delete-document":
          await service.deleteDocument(input.documentId, actorId);
          return json({ status: "deleted" });
        case "reconcile-document":
          return json({
            status: await service.reconcileDocument(input.documentId, actorId),
          });
        default: {
          const exhaustive: never = input.action;
          throw new Error(`Unhandled action: ${exhaustive}`);
        }
      }
    } catch (error) {
      if (error instanceof RequestError) {
        return json({ error: error.message }, error.status);
      }
      // Do not log provider exceptions: they can contain signed URLs or tokens.
      console.error("Library lifecycle request failed", {
        method: request.method,
      });
      return json(
        { error: "The library request could not be completed." },
        500,
      );
    }
  };
}

if (import.meta.main) Deno.serve(createHandler());
