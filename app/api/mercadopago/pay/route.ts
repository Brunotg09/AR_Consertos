import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * POST /api/mercadopago/pay
 * Body (serviço): { serviceOrderId, paymentMethod, amount, installments?, cardToken?, cardPaymentMethodId? }
 * Body (produto): { orderId, paymentMethod, amount, installments?, cardToken?, cardPaymentMethodId? }
 *
 * Cria pagamento no Mercado Pago. Serviços usam split (application_fee = comissão
 * da empresa). Produtos são vendidos pela empresa (sem split).
 */
export async function POST(req: Request) {
  try {
    // Autenticação: client anon com os cookies do usuário
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Dados: service_role (ou fallback anon)
    const admin = createAdminSupabase();
    const db = admin ?? supabase;

    const body = await req.json();
    const serviceOrderId: string | undefined = body?.serviceOrderId;
    const orderId: string | undefined = body?.orderId;
    const paymentMethod: string = body?.paymentMethod;
    const amount: number = Number(body?.amount);
    const installments: number = Number(body?.installments || 1);
    const cardToken: string | undefined = body?.cardToken;
    const cardPaymentMethodId: string | undefined = body?.cardPaymentMethodId;

    console.log("[MP/pay] request:", {
      authUserId: user.id,
      usingServiceRole: !!admin,
      serviceOrderId,
      orderId,
      paymentMethod,
      amount,
      installments,
      hasCardToken: !!cardToken,
      cardPaymentMethodId,
    });

    if ((!serviceOrderId && !orderId) || !amount || amount <= 0) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    if (serviceOrderId && orderId) {
      return NextResponse.json(
        { error: "Informe apenas um pedido ou serviço" },
        { status: 400 }
      );
    }
    if (!["pix", "debit_card", "credit_card"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Método inválido" }, { status: 400 });
    }
    // Cartão exige token (tokenização feita no front, dados do cartão nunca passam por aqui)
    if (paymentMethod !== "pix" && !cardToken) {
      return NextResponse.json(
        { error: "Token do cartão ausente (cardToken)" },
        { status: 400 }
      );
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Mercado Pago não configurado (MP_ACCESS_TOKEN)" },
        { status: 500 }
      );
    }

    const paymentPayload: Record<string, unknown> = {
      transaction_amount: amount,
      statement_descriptor: "A.R CONSERTOS",
      notification_url: new URL("/api/mercadopago/webhook", req.url).toString(),
    };
    let externalRef: string;

    if (orderId) {
      // ===== PEDIDO DE PRODUTO =====
      // Fonte de verdade do pagamento de produto é order_items.payment_status.
      // A tabela orders NÃO tem coluna payment_status (só mp_payment_id).
      const { data: order, error: orderError } = await db
        .from("orders")
        .select("id, user_id")
        .eq("id", orderId)
        .maybeSingle();

      console.log("[MP/pay] order lookup:", {
        orderId,
        authUserId: user.id,
        found: !!order,
        owner: order?.user_id ?? null,
        error: orderError?.message || null,
      });

      if (!order) {
        return NextResponse.json(
          { error: "Pedido não encontrado" },
          { status: 404 }
        );
      }
      if (order.user_id !== user.id) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
      }

      const { data: items, error: itemsError } = await db
        .from("order_items")
        .select("item_id, quantity, payment_status")
        .eq("order_id", orderId)
        .eq("item_type", "produto");

      if (itemsError) {
        console.log("[MP/pay] order_items error:", itemsError.message);
      }

      // Preço AUTORITATIVO: recalcula a partir de products.price. Não confia em
      // order_items.price (escrito pelo cliente) — sem isso, alguém poderia gravar
      // preço 0,01 e pagar centavos por um pedido de valor real.
      const productIds = Array.from(
        new Set(
          (items || [])
            .map((it) => Number(it.item_id))
            .filter((n) => Number.isFinite(n))
        )
      );
      const { data: products } = await db
        .from("products")
        .select("id, price")
        .in("id", productIds);
      const priceById = new Map(
        (products || []).map((p) => [Number(p.id), Number(p.price || 0)])
      );
      const realPrice = (it: { item_id?: string | number }) =>
        priceById.get(Number(it.item_id)) ?? 0;

      const productTotal = (items || []).reduce(
        (sum, it) => sum + realPrice(it) * Number(it.quantity || 0),
        0
      );
      const paidTotal = (items || [])
        .filter((it) => it.payment_status === "pago")
        .reduce((sum, it) => sum + realPrice(it) * Number(it.quantity || 0), 0);
      const remaining = Math.round((productTotal - paidTotal) * 100) / 100;

      console.log("[MP/pay] product totals:", {
        orderId,
        productTotal,
        paidTotal,
        remaining,
        itemsCount: items?.length ?? 0,
      });

      if (productTotal <= 0) {
        return NextResponse.json({ error: "Pedido sem produtos" }, { status: 400 });
      }
      if (remaining <= 0) {
        return NextResponse.json({ error: "Pedido já pago" }, { status: 400 });
      }
      if (amount > remaining + 0.01) {
        return NextResponse.json(
          { error: "Valor maior que o restante a pagar" },
          { status: 400 }
        );
      }
      // Produtos são pagos de uma vez (evita pagamento parcial ser tratado como
      // pago integral pelo webhook).
      if (Math.abs(amount - remaining) > 0.01) {
        return NextResponse.json(
          { error: "Produtos devem ser pagos no valor integral" },
          { status: 400 }
        );
      }

      paymentPayload.description = `A.R Consertos - Pedido ${orderId.slice(0, 8)}`;
      paymentPayload.external_reference = orderId;
      paymentPayload.metadata = { order_id: orderId, type: "order" };
      externalRef = orderId;
      // Produtos: sem split (vendidos pela empresa)
    } else {
      // ===== SERVIÇO =====
      const { data: so, error: soError } = await db
        .from("service_orders")
        .select(
          "id, total, amount_paid, remaining_amount, commission_percentage, accepted_by, partner_id, order_id"
        )
        .eq("id", serviceOrderId!)
        .maybeSingle();

      console.log("[MP/pay] service lookup:", {
        serviceOrderId,
        found: !!so,
        error: soError?.message || null,
      });

      if (!so) {
        return NextResponse.json(
          { error: "Serviço não encontrado" },
          { status: 404 }
        );
      }

      // Autorização (fecha IDOR): só o DONO do pedido vinculado, o parceiro
      // responsável ou um admin pode gerar pagamento desta OS.
      let authorized = false;
      if (so.order_id) {
        const { data: ownerOrder } = await db
          .from("orders")
          .select("user_id")
          .eq("id", so.order_id)
          .maybeSingle();
        if (ownerOrder?.user_id === user.id) authorized = true;
      }
      if (!authorized) {
        const partnerId = so.accepted_by || so.partner_id;
        if (partnerId) {
          const { data: partner } = await db
            .from("partners")
            .select("user_id")
            .eq("id", partnerId)
            .maybeSingle();
          if (partner?.user_id === user.id) authorized = true;
        }
      }
      if (!authorized) {
        const { data: isAdmin } = await supabase.rpc("is_admin");
        if (isAdmin === true) authorized = true;
      }
      if (!authorized) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
      }

      const remaining = Number(so.remaining_amount ?? (so.total || 0) - (so.amount_paid || 0));

      // Crédito: pagamento integral
      if (paymentMethod === "credit_card" && amount < remaining) {
        return NextResponse.json(
          { error: "Cartão de crédito exige pagamento integral" },
          { status: 400 }
        );
      }
      // PIX/Débito: parcial permitido até o restante
      if (amount > remaining) {
        return NextResponse.json(
          { error: "Valor maior que o restante" },
          { status: 400 }
        );
      }

      const commissionPct = Number(so.commission_percentage || 0);
      const applicationFee = Math.round(amount * (commissionPct / 100) * 100) / 100;

      paymentPayload.description = `A.R Consertos - OS ${serviceOrderId!.slice(0, 8)}`;
      paymentPayload.external_reference = serviceOrderId;
      paymentPayload.metadata = {
        service_order_id: serviceOrderId,
        partner_id: so.accepted_by || so.partner_id,
      };
      externalRef = serviceOrderId!;

      // Split (exige conta de recebedor conectada via OAuth)
      //
      // Fluxo escolhido: pagamento criado com o TOKEN DA PLATAFORMA +
      // `application_fee` (comissão) + `collector_id` (id do vendedor, obtido
      // via OAuth). Assim o webhook continua funcionando (ele busca o
      // pagamento com MP_ACCESS_TOKEN). O access_token do parceiro fica salvo
      // em partner_mp_tokens p/ consultas/reembolso futuros, mas NÃO é usado
      // como Bearer aqui — usá-lo criaria o pagamento na conta do vendedor e a
      // plataforma não conseguiria verificá-lo.
      if (so.accepted_by || so.partner_id) {
        const partnerId = so.accepted_by || so.partner_id;
        const { data: partner } = await db
          .from("partners")
          .select("mp_account_id")
          .eq("id", partnerId)
          .maybeSingle();

        if (partner?.mp_account_id && applicationFee > 0) {
          paymentPayload.application_fee = applicationFee;
          // collector_id: conta que recebe o valor líquido (vendedor)
          paymentPayload.collector_id = Number(partner.mp_account_id) || undefined;
          if (!paymentPayload.collector_id) {
            // fallback legado p/ quando mp_account_id não é numérico
            paymentPayload.mp_account_id = partner.mp_account_id;
          }
        }
      }
    }

    // Payer é obrigatório na API de Payments (sem ele o MP retorna payer_cannot_be_nil).
    // Usa o e-mail do usuário autenticado; nome vem do metadata se disponível.
    const userMeta = (user.user_metadata || {}) as Record<string, string>;
    const fullName = (userMeta.full_name || userMeta.name || "").trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    paymentPayload.payer = {
      email: user.email || "pagamento@arconsertos.com.br",
      first_name: nameParts[0] || "Cliente",
      last_name: nameParts.slice(1).join(" ") || "Consertos",
    };

    // ===== Método de pagamento (comum) =====
    if (paymentMethod === "pix") {
      paymentPayload.payment_method_id = "pix";
    } else if (paymentMethod === "debit_card") {
      paymentPayload.payment_method_id = cardPaymentMethodId || "master";
      paymentPayload.token = cardToken;
    } else {
      paymentPayload.payment_method_id = cardPaymentMethodId || "visa";
      paymentPayload.token = cardToken;
      paymentPayload.installments = installments;
    }

    console.log("[MP/pay] calling Mercado Pago:", {
      externalRef,
      paymentMethod,
      amount: paymentPayload.transaction_amount,
      payerEmail: (paymentPayload.payer as Record<string, unknown>)?.email,
    });

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": `${externalRef}-${amount}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    const payment = await res.json();

    console.log("[MP/pay] MP response:", {
      httpStatus: res.status,
      paymentId: payment?.id ?? null,
      status: payment?.status ?? null,
      message: payment?.message ?? null,
    });

    if (!res.ok || payment.status === "rejected") {
      return NextResponse.json(
        { error: payment?.message || "Pagamento recusado", detail: payment },
        { status: 400 }
      );
    }

    // PIX: retorna QR Code; a confirmação chega via webhook
    if (paymentMethod === "pix" && payment.point_of_interaction?.transaction_data) {
      return NextResponse.json({
        ok: true,
        paymentId: payment.id,
        status: payment.status,
        qrCode: payment.point_of_interaction.transaction_data.qr_code,
        qrCodeBase64: payment.point_of_interaction.transaction_data.qr_code_base64,
      });
    }

    // Débito/crédito aprovado: aplica direto (webhook também cobre)
    if (payment.status === "approved") {
      if (orderId) {
        // Só grava mp_payment_id (a orders não tem payment_status)
        // + sincroniza payment_method com o método REALMENTE usado no modal
        // (o cliente pode trocar de método dentro do modal — ex.: checkout em
        // dinheiro mas pagou por cartão). O CHECK da coluna aceita apenas
        // dinheiro/pix/cartao; debit_card vira cartao.
        const syncedMethod =
          paymentMethod === "pix" ? "pix" : "cartao";
        const { error: updErr } = await db
          .from("orders")
          .update({ mp_payment_id: String(payment.id), payment_method: syncedMethod })
          .eq("id", orderId);
        // Itens de produto viram "pago" (idempotente: só os que ainda não estão)
        const { error: itemErr } = await db
          .from("order_items")
          .update({ payment_status: "pago", payment_method: syncedMethod })
          .eq("order_id", orderId)
          .eq("item_type", "produto")
          .neq("payment_status", "pago");
        console.log("[MP/pay] order marked paid:", {
          orderUpdateError: updErr?.message || null,
          itemUpdateError: itemErr?.message || null,
        });
      } else {
        // RPCs via service_role (db) — a migration de segurança exige
        // service_role/admin para apply_so_payment.
        await db.rpc("apply_so_payment", {
          p_service_order_id: serviceOrderId,
          p_amount: amount,
          p_payment_method: paymentMethod,
          p_mp_payment_id: String(payment.id),
        });
        await db.rpc("notify_payment_received", {
          p_service_order_id: serviceOrderId,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      paymentId: payment.id,
      status: payment.status,
    });
  } catch (e) {
    console.error("[MP/pay] unexpected error:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
