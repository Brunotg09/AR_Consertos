import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase URL e/ou chave anon não configurados."
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function withTimeout<T = any>(
  fn: () => PromiseLike<T>,
  ms: number,
  fallback: any // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<T> {
  try {
    return await Promise.race([
      Promise.resolve(fn()),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), ms)
      ),
    ]);
  } catch {
    return fallback;
  }
}

export async function getSessionSafe() {
  return withTimeout(
    () => supabase.auth.getSession(),
    5000,
    { data: { session: null }, error: null }
  );
}
