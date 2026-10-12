import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import { notifyPartnerEvent } from "@/lib/notify-server";

/**
 * POST /api/mercadopago/webhook
 * Recebe notificações do Mercado Pago e aplica pagamentos (idempotente).
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || url.searchParams.get("topic");
    const id = url.searchParams.get("id");

    // Apenas eventos de pagamento
    if (type && type !== "payment") {
      return NextResponse.json({ ok: true, ignored: true });
    }
    if (!id) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: "MP não configurado" }, { status: 500 });
    }

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Falha ao buscar pagamento" }, { status: 500 });
    }

    const payment = await res.json();
    const meta = payment?.metadata || {};

    // Webhook não tem sessão de usuário — usa service_role p/ gravar (RLS).
    // Sem a chave, cai no anon (gravações podem ser bloqueadas pelo RLS).
    const admin = createAdminSupabase();
    const supabase = admin ?? createServerSupabase();
    if (!admin) {
      console.error(
        "[MP/webhook] ⚠️ SUPABASE_SERVICE_ROLE_KEY ausente/vazia — usando anon; RLS pode bloquear gravações"
      );
    }

    console.log("[MP/webhook] payment:", {
      id: payment?.id,
      status: payment?.status,
      external_reference: payment?.external_reference,
      usingServiceRole: !!admin,
      meta,
    });

    // ===== PEDIDO DE PRODUTO (metadata.order_id) =====
    if (meta.order_id) {
      const prodOrderId = String(meta.order_id);
      if (payment.status === "approved") {
        // Grava o id do MP p/ idempotência (a orders não tem payment_status)
        const { error: oErr } = await supabase
          .from("orders")
          .update({ mp_payment_id: String(payment.id) })
          .eq("id", prodOrderId);
        // Fonte de verdade: itens de produto viram "pago" (idempotente)
        const { error: iErr } = await supabase
          .from("order_items")
          .update({ payment_status: "pago" })
          .eq("order_id", prodOrderId)
          .eq("item_type", "produto")
          .neq("payment_status", "pago");
        console.log("[MP/webhook] order paid update:", {
          prodOrderId,
          orderError: oErr?.message || null,
          itemError: iErr?.message || null,
        });
      }
      return NextResponse.json({ ok: true });
    }

    const serviceOrderId: string | undefined = payment?.external_reference;
    if (!serviceOrderId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (payment.status === "approved") {
      // Idempotência garantida dentro de apply_so_payment (checa mp_payment_id)
      await supabase.rpc("apply_so_payment", {
        p_service_order_id: serviceOrderId,
        p_amount: Number(payment.transaction_amount || 0),
        p_payment_method:
          payment.payment_type_id === "bank_transfer"
            ? "pix"
            : payment.payment_type_id === "debit_card"
              ? "debit_card"
              : "credit_card",
        p_mp_payment_id: String(payment.id),
      });
      await supabase.rpc("notify_payment_received", {
        p_service_order_id: serviceOrderId,
      });
      // Push para parceiro/admins (melhor esforço)
      notifyPartnerEvent("payment_received", serviceOrderId).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
