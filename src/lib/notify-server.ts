import { createClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "./push-server";

/**
 * Resolve alvos e envia push para eventos do fluxo de parceiros.
 * Usa service role (server-only, nunca expor ao client).
 */
export async function notifyPartnerEvent(
  event: "offer_accepted" | "service_completed" | "service_started" | "service_cancelled" | "payment_received",
  serviceOrderId: string,
  extra?: { partnerName?: string; serviceName?: string }
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: so } = await admin
    .from("service_orders")
    .select("id, order_id, client_name, accepted_by, partner_id")
    .eq("id", serviceOrderId)
    .maybeSingle();

  if (!so) return;

  const label = extra?.serviceName || "serviço";

  if (event === "offer_accepted") {
    // Notificar admins (user_private)
    const { data: admins } = await admin.from("user_private").select("id");
    const ids = (admins || []).map((a) => a.id).filter(Boolean);
    await sendPushToUsers(ids, {
      title: "Oferta aceita",
      message: `${extra?.partnerName || "Um parceiro"} aceitou: ${label}`,
      url: `/private/pedidos`,
    });
  }

  if (event === "service_completed" && so.order_id) {
    // Notificar cliente dono do pedido + admins
    const { data: order } = await admin
      .from("orders")
      .select("user_id")
      .eq("id", so.order_id)
      .maybeSingle();

    const { data: admins } = await admin.from("user_private").select("id");
    const ids = [
      ...(order?.user_id ? [order.user_id] : []),
      ...((admins || []).map((a) => a.id) as string[]),
    ];
    await sendPushToUsers(ids, {
      title: "Serviço concluído",
      message: `Seu serviço foi concluído. Avalie no histórico.`,
      url: "/historico",
    });
  }

  if (event === "service_started" && so.order_id) {
    const { data: order } = await admin
      .from("orders")
      .select("user_id")
      .eq("id", so.order_id)
      .maybeSingle();
    if (order?.user_id) {
      await sendPushToUsers([order.user_id], {
        title: "Serviço iniciado",
        message: `O técnico está a caminho do seu endereço.`,
        url: "/historico",
      });
    }
  }

  if (event === "payment_received") {
    // Notificar parceiro que recebeu pagamento + admins
    let partnerUserId: string | null = null;
    const partnerId = so.accepted_by || so.partner_id;
    if (partnerId) {
      const { data: p } = await admin
        .from("partners")
        .select("user_id")
        .eq("id", partnerId)
        .maybeSingle();
      partnerUserId = p?.user_id || null;
    }
    const { data: admins } = await admin.from("user_private").select("id");
    const ids = [
      ...(partnerUserId ? [partnerUserId] : []),
      ...((admins || []).map((a) => a.id) as string[]),
    ];
    await sendPushToUsers(ids, {
      title: "Pagamento recebido",
      message: `Um pagamento foi confirmado${so.client_name ? ` — ${so.client_name}` : ""}.`,
      url: "/parceiro/faturamento",
    });
  }
}
