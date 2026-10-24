import { createClient } from "@supabase/supabase-js";
import { RequestError } from "./request-contract.ts";

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}

/** Never forward request headers to this privileged client. */
export function serviceClient() {
  return createClient(
    required("SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

export async function requireAdmin(
  request: Request,
  getClient = serviceClient,
): Promise<string> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)
    ?.[1];
  if (!token) throw new RequestError("Authentication is required.", 401);
  const client = getClient();
  // getUser validates the token with Auth; decoding editable claims is insufficient.
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new RequestError("Authentication is required.", 401);
  }
  const { data: admin, error: adminError } = await client.from("admin_users")
    .select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (adminError) throw new Error("Admin lookup failed.");
  if (!admin) throw new RequestError("Administrator access required.", 403);
  return data.user.id;
}

export function requireRpcRow(
  data: unknown,
  message: string,
): Record<string, unknown> {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") throw new Error(message);
  return row as Record<string, unknown>;
}
export function rpcString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || !value) {
    throw new Error(`Invalid lifecycle response: ${key}`);
  }
  return value;
}
export function rpcNumber(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`Invalid lifecycle response: ${key}`);
  }
  return value;
}
export async function invokeLibraryLifecycle(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const { data, error } = await serviceClient().rpc(name, args);
  if (error) throw new Error("Lifecycle operation failed.");
  return data;
}
