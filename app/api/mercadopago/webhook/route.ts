import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import { notifyPartnerEvent } from "@/lib/notify-server";

/**
 * Valida a assinatura HMAC-SHA256 enviada pelo Mercado Pago no header `x-signature`
 * (formato: `ts=<unix>,v1=<hex>`), conforme a documentação:
 *   manifest = `id:[data.id];request-id:[x-request-id];ts:[ts];`
 *   assinatura = HMAC-SHA256(MP_WEBHOOK_SECRET, manifest) em hex.
 *
 * Sem `MP_WEBHOOK_SECRET` configurado NÃO valida (só loga) — para não travar
 * o ambiente de teste. Em produção a variável DEVE estar setada.
 */
function verifyMpSignature(req: Request, url: URL, bodyDataId: string | null): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // não configurado — tratado pelo chamador com warning

  const header = req.headers.get("x-signature") || "";
  const requestId = req.headers.get("x-request-id") || "";

  let ts = "";
  let v1 = "";
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }
  if (!ts || !v1) return false;

  // O id assinado é o data.id (query ou body) — não o id da notificação.
  const dataId = url.searchParams.get("data.id") || bodyDataId || "";
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  // Comparação em tempo constante (evita timing attack)
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

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

    // data.id do body (fallback p/ assinatura quando não vem na query)
    let bodyDataId: string | null = null;
    try {
      const clone = req.clone();
      const body = await clone.json();
      bodyDataId = body?.data?.id != null ? String(body.data.id) : null;
    } catch {
      /* sem body JSON — segue só com a query */
    }

    if (!process.env.MP_WEBHOOK_SECRET) {
      // Em produção, sem segredo o webhook NÃO pode aceitar eventos (fail-closed):
      // qualquer um poderia postar ?id=<pagamento> e ter o pedido marcado como pago.
      if (process.env.NODE_ENV === "production") {
        console.error(
          "[MP/webhook] MP_WEBHOOK_SECRET ausente em produção — rejeitando (fail-closed)"
        );
        return NextResponse.json(
          { error: "Webhook não configurado" },
          { status: 503 }
        );
      }
      console.warn(
        "[MP/webhook] ⚠️ MP_WEBHOOK_SECRET ausente — assinatura NÃO validada ( configure em produção! )"
      );
    } else if (!verifyMpSignature(req, url, bodyDataId)) {
      console.warn("[MP/webhook] assinatura inválida — requisição rejeitada", {
        requestId: req.headers.get("x-request-id"),
      });
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
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
        // Verificação de VALOR (fecha exploit de pagar centavos): só marca como
        // pago se o pagamento cobre o restante do pedido, usando preços
        // autoritativos (products.price), não order_items.price do cliente.
        const { data: wItems } = await supabase
          .from("order_items")
          .select("item_id, quantity, payment_status")
          .eq("order_id", prodOrderId)
          .eq("item_type", "produto");
        const wPids = Array.from(
          new Set(
            (wItems || []).map((x) => Number(x.item_id)).filter((n) => Number.isFinite(n))
          )
        );
        const { data: wProds } = await supabase
          .from("products")
          .select("id, price")
          .in("id", wPids);
        const wMap = new Map(
          (wProds || []).map((p) => [Number(p.id), Number(p.price || 0)])
        );
        const wRp = (x: { item_id?: string | number }) =>
          wMap.get(Number(x.item_id)) ?? 0;
        const wTotal = (wItems || []).reduce(
          (s, x) => s + wRp(x) * Number(x.quantity || 0),
          0
        );
        const wPaid = (wItems || [])
          .filter((x) => x.payment_status === "pago")
          .reduce((s, x) => s + wRp(x) * Number(x.quantity || 0), 0);
        const wRemaining = Math.round((wTotal - wPaid) * 100) / 100;
        const paidAmt = Number(payment.transaction_amount || 0);
        if (wRemaining > 0 && paidAmt < wRemaining - 0.01) {
          console.warn(
            "[MP/webhook] pagamento não cobre o restante — NÃO marca como pago",
            { prodOrderId, paidAmt, wRemaining }
          );
          return NextResponse.json({ ok: true, partial: true });
        }

        // Método REAL usado (o cliente pode ter trocado dentro do modal).
        // payment_type_id do MP: bank_transfer=PIX, debit_card, credit_card…
        // O CHECK de orders/order_items aceita apenas dinheiro/pix/cartao.
        const mpType = String(payment.payment_type_id || "");
        const syncedMethod =
          mpType === "bank_transfer" || mpType === "pix"
            ? "pix"
            : "cartao";
        // Grava o id do MP p/ idempotência (a orders não tem payment_status)
        const { error: oErr } = await supabase
          .from("orders")
          .update({ mp_payment_id: String(payment.id), payment_method: syncedMethod })
          .eq("id", prodOrderId);
        // Fonte de verdade: itens de produto viram "pago" (idempotente)
        const { error: iErr } = await supabase
          .from("order_items")
          .update({ payment_status: "pago", payment_method: syncedMethod })
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
