import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { notifyPartnerEvent } from "@/lib/notify-server";

/**
 * POST /api/notifications/event
 * Body: { event: 'offer_accepted'|'service_completed'|'service_started'|'service_cancelled', serviceOrderId, extra? }
 * Resolve alvos (admin/cliente) server-side e envia push.
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
    const event = body?.event as string;
    const serviceOrderId = body?.serviceOrderId as string;

    if (!serviceOrderId || !event) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const allowed = [
      "offer_accepted",
      "service_completed",
      "service_started",
      "service_cancelled",
      "payment_received",
    ];
    if (!allowed.includes(event)) {
      return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
    }

    await notifyPartnerEvent(event as never, serviceOrderId, body?.extra);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
