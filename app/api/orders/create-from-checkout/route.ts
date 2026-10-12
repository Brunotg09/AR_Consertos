import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * POST /api/orders/create-from-checkout
 * Cria order + order_items + decrementa estoque (atômico via RPC reserve_stock).
 * Chamado:
 *  - Pelo modal no onComplete (cartão aprovado na hora)
 *  - Pelo webhook (PIX aprovado)
 * Body:
 * {
 *   checkoutData: { ... },  // dados salvos no sessionStorage no checkout
 *   payment: { method, mp_payment_id, amount }
 * }
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

    const admin = createAdminSupabase();
    const db = admin ?? supabase;

    const body = await req.json();
    const checkoutData = body?.checkoutData;
    const payment = body?.payment;

    if (!checkoutData || !payment) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const {
      items,
      paymentMethod: checkoutPaymentMethod,
      scheduledDate,
      serviceAddress,
      deliveryAddress,
      clientName,
      subtotal,
    } = checkoutData;

    const { method: paymentMethod, mp_payment_id, amount } = payment;

    // Valida se o método bate com o do checkout
    if (paymentMethod !== checkoutPaymentMethod && checkoutPaymentMethod !== "dinheiro") {
      return NextResponse.json({ error: "Método de pagamento divergente" }, { status: 400 });
    }

    // Separa produtos e serviços
    const products = items.filter((i: any) => i.type === "product") as any[];
    const allServices = items.filter((i: any) => i.type === "service") as any[];
    const partnerServicesAll = allServices.filter((i: any) => i.service?.partnerId);
    const normalServices = allServices.filter((i: any) => !i.service?.partnerId);
    const partnerServicesWithInterval = partnerServicesAll.filter(
      (i: any) => i.service?.selectedInterval
    );
    const partnerServicesWithoutInterval = partnerServicesAll.filter(
      (i: any) => !i.service?.selectedInterval
    );

    const needsOrder = products.length > 0 || normalServices.length > 0 || partnerServicesWithoutInterval.length > 0;

    let orderId: string | null = null;
    let clienteId: number | null = null;

    // Busca/cria cliente
    const { data: existingClient } = await db
      .from("clientes")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingClient) {
      clienteId = existingClient.id;
    } else {
      const { data: profile } = await db
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        const { data: newClient } = await db
          .from("clientes")
          .insert({
            nome: profile.full_name || "Cliente",
            telefone: profile.phone || null,
            user_id: user.id,
          })
          .select("id")
          .single();
        if (newClient) clienteId = newClient.id;
      }
    }

    // Endereços
    const buildAddressString = (addr: any) =>
      `${addr.rua}, ${addr.numero} - ${addr.bairro}, ${addr.localidade} - ${addr.uf}, ${addr.cep}`;

    const serviceAddrStr = partnerServicesWithoutInterval.length > 0 ? buildAddressString(serviceAddress) : null;
    const deliveryAddrStr = products.length > 0 ? buildAddressString(deliveryAddress) : null;
    const addrStr = serviceAddrStr || deliveryAddrStr;

    const addressData: Record<string, any> = {};
    if (partnerServicesWithoutInterval.length > 0) {
      addressData.service = serviceAddress;
      if (products.length > 0) addressData.delivery = serviceAddress;
    } else if (products.length > 0) {
      addressData.delivery = deliveryAddress;
    }

    // ===== 1. RESERVA ESTOQUE (produtos) =====
    if (products.length > 0) {
      const itemsPayload = products.map((p) => ({
        product_id: p.productId,
        qty: p.quantity,
      }));

      const { data: reserveResult, error: reserveError } = await db.rpc("reserve_stock", {
        items: itemsPayload,
      });

      if (reserveError || !reserveResult?.success) {
        const errMsg = reserveResult?.error || reserveError?.message || "Erro ao reservar estoque";
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }
    }

    // ===== 2. CRIA ORDER =====
    if (needsOrder) {
      const { data: orderData, error: orderError } = await db
        .from("orders")
        .insert({
          user_id: user.id,
          cliente_id: clienteId,
          payment_method: paymentMethod,
          total: subtotal,
          status: "pendente",
          delivery_address: addrStr,
          address_data: Object.keys(addressData).length > 0 ? addressData : null,
          mp_payment_id: mp_payment_id || null,
        })
        .select("id")
        .single();

      if (orderError || !orderData) {
        // Rollback estoque se falhou
        if (products.length > 0) {
          const releaseItems = products.map((p) => ({ product_id: p.productId, qty: p.quantity }));
          await db.rpc("release_stock", { items: releaseItems });
        }
        return NextResponse.json({ error: "Erro ao criar pedido." }, { status: 500 });
      }

      orderId = orderData.id;

      // ===== 3. ORDER_ITEMS =====
      const productItemsData = products.map((item) => ({
        order_id: orderId,
        item_type: "produto",
        item_id: String(item.productId),
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
        product_category: item.category,
        product_condition: item.condition,
        product_images: item.image ? [item.image] : [],
        payment_status: "pago" as const, // já pagou
      }));

      const normalServiceItemsData = normalServices.map((item) => {
        const svc = item.service;
        return {
          order_id: orderId,
          item_type: "servico",
          item_id: svc.id,
          item_name: svc.name,
          service_type: svc.type,
          price: svc.price,
          scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
          problem_description: checkoutData.problemDescription || null,
          partner_id: null,
          payment_status: paymentMethod === "dinheiro" ? "pendente" as const : "pago" as const,
        };
      });

      const nonSubPartnerItemsData = partnerServicesWithoutInterval.map((item) => {
        const svc = item.service;
        return {
          order_id: orderId,
          item_type: "servico",
          item_id: svc.id,
          item_name: svc.name,
          service_type: svc.type,
          price: svc.price,
          scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
          problem_description: checkoutData.problemDescription || null,
          partner_id: svc.partnerId,
          payment_status: paymentMethod === "dinheiro" ? "pendente" as const : "pago" as const,
        };
      });

      const allOrderItems = [...productItemsData, ...normalServiceItemsData, ...nonSubPartnerItemsData];
      if (allOrderItems.length > 0) {
        const { error: itemsError } = await db.from("order_items").insert(allOrderItems as any);
        if (itemsError) {
          // Rollback: apaga order + libera estoque
          await db.from("orders").delete().eq("id", orderId);
          if (products.length > 0) {
            const releaseItems = products.map((p) => ({ product_id: p.productId, qty: p.quantity }));
            await db.rpc("release_stock", { items: releaseItems });
          }
          return NextResponse.json({ error: "Erro ao salvar itens do pedido." }, { status: 500 });
        }
      }
    }

    // ===== 4. SUBSCRIPTIONS (serviços recorrentes) =====
    const subscriptionMap: Record<string, string> = {};
    for (const item of partnerServicesWithInterval) {
      const svc = item.service;
      if (!svc.selectedInterval || !svc.pricingConfig?.intervals) continue;

      const interval = svc.pricingConfig.intervals.find((i: any) => i.value === svc.selectedInterval);
      if (!interval) continue;

      const { data: sub } = await db
        .from("subscriptions")
        .insert({
          user_id: user.id,
          partner_id: svc.partnerId,
          service_id: svc.id,
          interval_value: interval.value,
          interval_label: interval.label,
          monthly_value: interval.price,
          visit_interval: interval.value,
          status: "active",
          next_visit_date: scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString(),
        })
        .select("id")
        .single();

      if (sub) subscriptionMap[svc.id] = sub.id;
    }

    // Service_orders para subscriptions
    const subIds = Object.values(subscriptionMap);
    if (subIds.length > 0) {
      const serviceOrdersData = partnerServicesWithInterval.map((item) => {
        const svc = item.service;
        const subId = subscriptionMap[svc.id];
        return {
          subscription_id: subId,
          user_id: user.id,
          partner_id: svc.partnerId,
          service_id: svc.id,
          scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString(),
          status: "agendado",
          total: interval?.price || svc.price,
          commission_percentage: svc.commissionPercentage || 0,
          problem_description: checkoutData.problemDescription || null,
        };
      });

      const { error: soError } = await db.from("service_orders").insert(serviceOrdersData as any);
      if (soError) {
        console.error("[create-order] service_orders insert error:", soError);
      }
    }

    // Limpa sessionStorage
    try {
      sessionStorage.removeItem("arc_pending_checkout");
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      ok: true,
      orderId,
      subIds,
      clientName: clientName || "Cliente",
    });
  } catch (e) {
    console.error("[create-order] unexpected error:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}