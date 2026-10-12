import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * POST /api/notifications/push
 * Body: { title, message, userIds?: string[], url?: string }
 * Envia Web Push para os usuários informados.
 * Config: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 */
export async function POST(req: Request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const title: string = body?.title || "A.R Consertos";
    const message: string = body?.message || "";
    const userIds: string[] | undefined = body?.userIds;
    const url: string = body?.url || "/";

    const targets = userIds?.length ? userIds : [user.id];

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("token")
      .in("user_id", targets);

    if (!subs?.length) {
      return NextResponse.json({ ok: true, sent: 0, subscriptions: 0 });
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:contato@arconsertos.com.br";

    let sent = 0;
    if (publicKey && privateKey) {
      const webpush = await import("web-push").then((m) => m.default || m);
      webpush.setVapidDetails(subject, publicKey, privateKey);

      const payload = JSON.stringify({ title, message, url });
      await Promise.allSettled(
        subs.map((s) =>
          webpush.sendNotification(JSON.parse(s.token), payload).catch(() => null)
        )
      );
      sent = subs.length;
    }

    return NextResponse.json({ ok: true, sent, subscriptions: subs.length });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
