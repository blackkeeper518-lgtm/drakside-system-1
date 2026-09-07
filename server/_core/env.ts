export const ENV = {
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  metaWebhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN ?? "",
  nodeEnv: process.env.NODE_ENV ?? "production",
};

export function requireServerEnv(name: keyof typeof ENV, value: string) {
  if (!value) throw new Error(`Missing server environment variable for ${name}`);
  return value;
}

export function supabaseHeaders() {
  const key = ENV.supabaseServiceRoleKey || ENV.supabaseAnonKey;
  if (!ENV.supabaseUrl || !key) throw new Error("SUPABASE_URL and a Supabase key are required");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export function supabaseRestUrl(path: string) {
  if (!ENV.supabaseUrl) throw new Error("SUPABASE_URL is required");
  return `${ENV.supabaseUrl.replace(/\/$/, "")}/rest/v1/${path.replace(/^\//, "")}`;
}

export async function supabaseGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(supabaseRestUrl(path), { ...init, headers: { ...supabaseHeaders(), ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error(`Supabase GET failed: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

export async function supabasePost<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const response = await fetch(supabaseRestUrl(path), { method: "POST", ...init, headers: { ...supabaseHeaders(), Prefer: "return=representation", ...(init?.headers ?? {}) }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Supabase POST failed: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}
