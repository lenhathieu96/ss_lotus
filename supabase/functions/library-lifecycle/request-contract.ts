export class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export const actions = [
  "prepare-upload",
  "complete-upload",
  "resolve-upload",
  "recover-upload",
  "cancel-upload",
  "cleanup-uploads",
  "delete-document",
  "reconcile-document",
  "get-download-url",
] as const;
export type Action = typeof actions[number];
export type LifecycleRequest = {
  action: Action;
  documentId: string;
  categoryId: string;
  title: string;
  author: string | null;
  originalFilename: string;
  expectedSize: number;
};
const limit = 16 * 1024;

function invalid(message = "Invalid request body."): never {
  throw new RequestError(message, 400);
}
function text(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim() || value.length > 500) {
    invalid(`Invalid ${key}.`);
  }
  return (value as string).trim();
}
function uuid(value: string, status = 400): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value)
  ) {
    throw new RequestError(
      status === 404 ? "Not found." : "Invalid ID.",
      status,
    );
  }
  return value;
}

/** Count bytes while reading: Content-Length is neither required nor trusted. */
export async function readRequest(request: Request): Promise<LifecycleRequest> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
      "application/json"
  ) invalid("Content-Type must be application/json.");
  const declared = Number(request.headers.get("content-length"));
  if (declared > limit) throw new RequestError("Request body too large.", 413);
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          await reader.cancel();
          throw new RequestError("Request body too large.", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    invalid();
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  const object = input as Record<string, unknown>;
  if (!actions.includes(object.action as Action)) invalid("Unknown action.");
  if ("actorId" in object) invalid("actorId is server-owned.");
  const action = object.action as Action;
  const result: LifecycleRequest = {
    action,
    documentId: "",
    categoryId: "",
    title: "",
    author: null,
    originalFilename: "",
    expectedSize: 0,
  };
  if (action === "prepare-upload") {
    result.categoryId = uuid(text(object, "categoryId"));
    result.title = text(object, "title");
    result.originalFilename = text(object, "originalFilename");
    if (
      object.author !== undefined && object.author !== null &&
      typeof object.author !== "string"
    ) invalid("Invalid author.");
    if (typeof object.author === "string" && object.author.length > 500) {
      invalid("Invalid author.");
    }
    result.author = typeof object.author === "string"
      ? object.author.trim()
      : null;
    if (
      typeof object.expectedSize !== "number" ||
      !Number.isSafeInteger(object.expectedSize) || object.expectedSize < 1 ||
      object.expectedSize > 100 * 1024 * 1024
    ) invalid("PDF size must be between 1 byte and 100 MB.");
    result.expectedSize = object.expectedSize as number;
  } else if (action !== "cleanup-uploads") {
    result.documentId = uuid(
      text(object, "documentId"),
      action === "get-download-url" ? 404 : 400,
    );
  }
  return result;
}
