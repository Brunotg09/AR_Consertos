"use client";

import { ServiceIcon } from "@/components/ServiceIcon";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useFloatingWidget } from "@/components/FloatingWidget";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Calendar,
  Check,
  CreditCard,
  MapPin,
  Package,
  QrCode,
  Wrench
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { trigger } = useFloatingWidget();

  useEffect(() => {
    trigger("buy");
  }, [trigger]);

  const hasService = items.some((i) => i.type === "service");
  const hasProduct = items.some((i) => i.type === "product");

  const [scheduledDate, setScheduledDate] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"dinheiro" | "pix" | "cartao" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/checkout");
    }
  }, [user, authLoading, router]);

  // Show loading or nothing while checking auth
  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-[#E30613] border-t-transparent" />
      </div>
    );
  }

  const handleSubmit = async () => {
    setError("");

    if (!paymentMethod) {
      setError("Selecione um método de pagamento.");
      return;
    }
    if (hasService && !scheduledDate) {
      setError("Informe a data/hora desejada para o serviço.");
      return;
    }

    setLoading(true);

    // 1. Find or create client record for this user
    let clienteId: number | null = null;

    // Try to find existing client linked to this user
    const { data: existingClient } = await supabase
      .from("clientes")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingClient) {
      clienteId = existingClient.id;
    } else {
      // Get user profile to create a client record
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        const { data: newClient } = await supabase
          .from("clientes")
          .insert({
            nome: profile.full_name || "Cliente",
            telefone: profile.phone || null,
            user_id: user.id,
          })
          .select("id")
          .single();

        if (newClient) {
          clienteId = newClient.id;
        }
      }
    }

    // 2. Criar pedido with both user_id and cliente_id
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        cliente_id: clienteId,
        payment_method: paymentMethod,
        total: subtotal,
        status: "pendente",
      })
      .select("id")
      .single();

    if (orderError || !orderData) {
      setError("Erro ao criar pedido.");
      setLoading(false);
      return;
    }

    const orderId = orderData.id;

    // 3. Criar order_items
    const orderItems = items.map((item) => {
      if (item.type === "service") {
        return {
          order_id: orderId,
          item_type: "servico",
          item_id: item.service.id,
          item_name: item.service.name,
          service_type: item.service.type,
          price: 0,
          scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
          problem_description: problemDescription || null,
        };
      }
      return {
        order_id: orderId,
        item_type: "produto",
        item_id: String(item.productId),
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
        product_category: item.category,
        product_condition: item.condition,
        product_images: item.image ? [item.image] : [],
      };
    });

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems as any);

    setLoading(false);

    if (itemsError) {
      setError("Erro ao salvar itens do pedido.");
      return;
    }

    clearCart();
    router.push(`/pedido/${orderId}`);
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Package className="mx-auto h-12 w-12" style={{ color: "#444" }} />
        <p className="mt-4 text-white">Seu carrinho está vazio.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8 lg:px-12">
      <h1 className="font-bebas text-3xl tracking-wide text-white sm:text-4xl">
        FINALIZAR PEDIDO
      </h1>

      {error && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#E3061340", backgroundColor: "#E3061310", color: "#ff6b6b" }}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Resumo */}
      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            {item.type === "service" ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(227,6,19,0.08)" }}>
                <ServiceIcon iconName={item.service.iconName} className="h-4 w-4" style={{ color: "#E30613" }} />
              </div>
            ) : (
              <div className="h-9 w-9 overflow-hidden rounded-lg">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-4 w-4" style={{ color: "#444" }} />
                )}
              </div>
            )}
            <div className="flex-1">
              <span className="text-sm font-medium text-white">
                {item.type === "service" ? item.service.name : item.name}
              </span>
              {item.type === "product" && (
                <span className="ml-2 text-xs" style={{ color: "#888888" }}>
                  x{item.quantity}
                </span>
              )}
            </div>
            {item.type === "product" && (
              <span className="font-oswald text-sm font-bold" style={{ color: "#E30613" }}>
                R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
              </span>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <span className="text-sm font-medium text-white">Total</span>
          <span className="font-oswald text-xl font-bold text-white">
            R$ {subtotal.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>

      {/* Campos de serviço */}
      {hasService && (
        <div className="mt-8 space-y-5">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4" style={{ color: "#E30613" }} />
            <h2 className="font-montserrat text-sm font-bold text-white">Informações do Serviço</h2>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-white/70">Data e hora desejada *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
              <input
                type="datetime-local"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-all focus:border-ar-red/50"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-white/70">Descrição do problema / marca / modelo</label>
            <textarea
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-red/50"
              placeholder="Ex: Geladeira Consul 340L não gela o freezer, faz barulho..."
            />
          </div>
        </div>
      )}

      {/* Campos de produto */}
      {hasProduct && (
        <div className="mt-8 space-y-5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" style={{ color: "#C9A84C" }} />
            <h2 className="font-montserrat text-sm font-bold text-white">Endereço de Entrega</h2>
          </div>
          <textarea
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-red/50"
            placeholder="Rua, número, bairro, cidade, CEP..."
          />
        </div>
      )}

      {/* Pagamento */}
      <div className="mt-8 space-y-5">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" style={{ color: "#8B5CF6" }} />
          <h2 className="font-montserrat text-sm font-bold text-white">Forma de Pagamento</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { id: "dinheiro" as const, label: "Dinheiro", icon: Banknote },
            { id: "pix" as const, label: "PIX", icon: QrCode },
            { id: "cartao" as const, label: "Cartão", icon: CreditCard },
          ].map((opt) => {
            const Icon = opt.icon;
            const selected = paymentMethod === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setPaymentMethod(opt.id)}
                className="flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium transition-all duration-200"
                style={{
                  borderColor: selected ? "#E30613" : "rgba(255,255,255,0.1)",
                  backgroundColor: selected ? "rgba(227,6,19,0.08)" : "rgba(255,255,255,0.02)",
                  color: selected ? "#fff" : "rgba(255,255,255,0.7)",
                }}
              >
                <Icon className="h-5 w-5" />
                {opt.label}
                {selected && <Check className="h-3.5 w-3.5" style={{ color: "#44dd88" }} />}
              </button>
            );
          })}
        </div>
        {paymentMethod === "pix" && (
          <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(201,168,76,0.2)", backgroundColor: "rgba(201,168,76,0.05)", color: "#C9A84C" }}>
            Chave PIX: <strong>(79) 99944-6596</strong>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-premium-red mt-10 flex w-full items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? "Processando..." : "Confirmar Pedido"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
