import { createClient } from "@supabase/supabase-js";

/**
 * Envia Web Push direto no server (service role) — para webhooks e RPCs
 * que não têm sessão de usuário.
 * Requer: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; message: string; url?: string }
): Promise<number> {
  if (!userIds.length) return 0;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!url || !serviceKey || !publicKey || !privateKey) return 0;

  try {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("token")
      .in("user_id", userIds);

    if (!subs?.length) return 0;

    const webpush = await import("web-push").then((m) => m.default || m);
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:contato@arconsertos.com.br",
      publicKey,
      privateKey
    );

    const body = JSON.stringify({
      title: payload.title,
      message: payload.message,
      url: payload.url || "/",
    });

    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(JSON.parse(s.token), body).catch(() => null)
      )
    );
    return results.filter((r) => r.status === "fulfilled" && r.value).length;
  } catch {
    return 0;
  }
}
