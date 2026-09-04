"use client";

import { useFloatingWidget } from "@/components/FloatingWidget";
import { ServiceIcon } from "@/components/ServiceIcon";
import { CartProductItem, CartServiceItem, useCart, getServicePrice } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Calendar,
  Check,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  QrCode,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface AddressForm {
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  localidade: string;
  uf: string;
}

const emptyAddress: AddressForm = {
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  localidade: "",
  uf: "",
};

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
  const hasPartnerService = items.some((i) => i.type === "service" && i.service.partnerId && i.service.partnerId !== "");

  const getInitialScheduledDate = () => {
    const now = new Date();
    const d = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [scheduledDate, setScheduledDate] = useState(getInitialScheduledDate);
  const [problemDescription, setProblemDescription] = useState("");
  const [serviceAddress, setServiceAddress] = useState<AddressForm>(emptyAddress);
  const [deliveryAddress, setDeliveryAddress] = useState<AddressForm>(emptyAddress);
  const [paymentMethod, setPaymentMethod] = useState<"dinheiro" | "pix" | "cartao" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [existingAddress, setExistingAddress] = useState<AddressForm | null>(null);
  const [useExisting, setUseExisting] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchClientAddress = async () => {
      let addr: Record<string, string> | null = null;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("address")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData?.address && typeof profileData.address === "object") {
        addr = profileData.address as Record<string, string>;
      }

      if (!addr) {
        const { data: clienteData } = await supabase
          .from("clientes")
          .select("endereco")
          .eq("user_id", user.id)
          .maybeSingle();
        if (clienteData?.endereco && typeof clienteData.endereco === "object") {
          addr = clienteData.endereco as Record<string, string>;
        }
      }

      if (addr) {
        const mapped: AddressForm = {
          cep: addr.cep || "",
          rua: addr.rua || addr.logradouro || "",
          numero: addr.numero || "",
          bairro: addr.bairro || "",
          localidade: addr.localidade || "",
          uf: addr.uf || "",
        };
        if (mapped.rua || mapped.cep) {
          setExistingAddress(mapped);
        }
      }
    };
    fetchClientAddress();
  }, [user, authLoading]);

  useEffect(() => {
    if (useExisting && existingAddress) {
      if (hasPartnerService) {
        setServiceAddress(existingAddress);
      }
      if (hasProduct) {
        setDeliveryAddress(existingAddress);
      }
    }
  }, [useExisting, existingAddress, hasPartnerService, hasProduct]);

  const fetchCep = useCallback(async (cep: string, target: "service" | "delivery") => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        const addr: AddressForm = {
          cep: cleanCep,
          rua: data.logradouro || "",
          numero: "",
          bairro: data.bairro || "",
          localidade: data.localidade || "",
          uf: data.uf || "",
        };
        if (target === "service") setServiceAddress(addr);
        else setDeliveryAddress(addr);
      }
    } catch (e) {
    } finally {
      setLoadingCep(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/checkout");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-[#E30613] border-t-transparent" />
      </div>
    );
  }

  const formatCep = (v: string) => {
    const nums = v.replace(/\D/g, "").slice(0, 8);
    return nums.replace(/^(\d{5})(\d)/, "$1-$2");
  };

  const buildAddressString = (addr: AddressForm) =>
    `${addr.rua}, ${addr.numero} - ${addr.bairro}, ${addr.localidade} - ${addr.uf}, ${addr.cep}`;

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
    if (hasPartnerService && !serviceAddress.rua) {
      setError("Informe o endereço onde o serviço será realizado.");
      return;
    }
    if (hasProduct && !hasPartnerService && !hasService && !deliveryAddress.rua) {
      setError("Informe o endereço de entrega.");
      return;
    }

    setLoading(true);

    const productItems = items.filter((i) => i.type === "product") as CartProductItem[];

    if (productItems.length > 0) {
      const itemsPayload = productItems.map((p) => ({
        product_id: p.productId,
        qty: p.quantity,
      }));

      const { data: reserveResult, error: reserveError } = await supabase.rpc(
        "reserve_stock",
        { items: itemsPayload }
      );

      if (reserveError || !reserveResult?.success) {
        const errMsg = reserveResult?.error || reserveError?.message || "Erro ao reservar estoque";
        setError(errMsg);
        setLoading(false);
        return;
      }
    }

    let clienteId: number | null = null;

    const { data: existingClient } = await supabase
      .from("clientes")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingClient) {
      clienteId = existingClient.id;
    } else {
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

        if (newClient) clienteId = newClient.id;
      }
    }

    const serviceAddrStr = hasPartnerService ? buildAddressString(serviceAddress) : null;
    const deliveryAddrStr = hasProduct ? buildAddressString(deliveryAddress) : null;
    const addrStr = serviceAddrStr || deliveryAddrStr;

    const addressData: Record<string, any> = {};
    if (hasPartnerService) {
      addressData.service = serviceAddress;
      if (hasProduct) addressData.delivery = serviceAddress;
    } else if (hasProduct) {
      addressData.delivery = deliveryAddress;
    }

    const products = items.filter((i) => i.type === "product") as CartProductItem[];
    const allServices = items.filter((i) => i.type === "service") as CartServiceItem[];
    const partnerServicesAll = allServices.filter((i) => (i as CartServiceItem).service.partnerId);
    const normalServices = allServices.filter((i) => !(i as CartServiceItem).service.partnerId);

    const servicesWithInterval = allServices.filter(
      (i) => i.type === "service" && (i as CartServiceItem).service.selectedInterval
    );
    const partnerServicesWithInterval = partnerServicesAll.filter(
      (i) => (i as CartServiceItem).service.selectedInterval
    );
    const partnerServicesWithoutInterval = partnerServicesAll.filter(
      (i) => !(i as CartServiceItem).service.selectedInterval
    );

    const needsOrder = products.length > 0 || normalServices.length > 0 || partnerServicesWithoutInterval.length > 0;

    let orderId: string | null = null;

    if (needsOrder) {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          cliente_id: clienteId,
          payment_method: paymentMethod,
          total: subtotal,
          status: "pendente",
          delivery_address: addrStr,
          address_data: Object.keys(addressData).length > 0 ? addressData : null,
        })
        .select("id")
        .single();

      if (orderError || !orderData) {
        setError("Erro ao criar pedido.");
        setLoading(false);
        if (productItems.length > 0) {
          const releaseItems = productItems.map((p) => ({ product_id: p.productId, qty: p.quantity }));
          await supabase.rpc("release_stock", { items: releaseItems });
        }
        return;
      }

      orderId = orderData.id;

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
      }));

      const normalServiceItemsData = normalServices.map((item) => {
        const svc = item as CartServiceItem;
        return {
          order_id: orderId,
          item_type: "servico",
          item_id: svc.service.id,
          item_name: svc.service.name,
          service_type: svc.service.type,
          price: getServicePrice(svc),
          scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
          problem_description: problemDescription || null,
          partner_id: null,
        };
      });

      const nonSubPartnerItemsData = partnerServicesWithoutInterval.map((item) => {
        const svc = item as CartServiceItem;
        return {
          order_id: orderId,
          item_type: "servico",
          item_id: svc.service.id,
          item_name: svc.service.name,
          service_type: svc.service.type,
          price: getServicePrice(svc),
          scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
          problem_description: problemDescription || null,
          partner_id: svc.service.partnerId,
        };
      });

      const allOrderItems = [...productItemsData, ...normalServiceItemsData, ...nonSubPartnerItemsData];
      if (allOrderItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(allOrderItems as any);

        if (itemsError) {
          setError("Erro ao salvar itens do pedido.");
          if (productItemsData.length > 0) {
            const releaseItems = products.map((p) => ({ product_id: p.productId, qty: p.quantity }));
            await supabase.rpc("release_stock", { items: releaseItems });
          }
          return;
        }
      }
    }

    let clientName = "Cliente";
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.full_name) clientName = profile.full_name;

    const subscriptionMap: Record<string, string> = {};

    for (const item of partnerServicesWithInterval) {
      const svc = item as CartServiceItem;
      if (!svc.service.selectedInterval || !svc.service.pricingConfig?.intervals) continue;

      const interval = svc.service.pricingConfig.intervals.find(
        (i) => i.value === svc.service.selectedInterval
      );
      if (!interval) continue;

      const now = new Date();
      const billingDay = Math.min(now.getDate(), 28);
      const monthsToAdd = interval.value === "1m" ? 1
        : interval.value === "2m" ? 2
        : interval.value === "3m" ? 3
        : interval.value === "6m" ? 6
        : 1;
      const nextBilling = new Date(now);
      nextBilling.setMonth(nextBilling.getMonth() + monthsToAdd);

      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .insert({
          client_user_id: user.id,
          partner_id: svc.service.partnerId!,
          title: svc.service.name,
          description: svc.service.description || null,
          monthly_value: interval.price || getServicePrice(svc),
          billing_day: billingDay,
          status: "active",
          start_date: now.toISOString().split("T")[0],
          next_billing: nextBilling.toISOString().split("T")[0],
          service_id: svc.service.id,
          visit_interval: interval.value,
          client_id: clienteId,
        })
        .select("id")
        .single();

      if (subError) {
      } else {
        subscriptionMap[svc.service.id] = subData.id;
      }
    }

    if (partnerServicesWithInterval.length > 0) {
      const subServiceOrders = partnerServicesWithInterval.map((item) => {
        const svc = item as CartServiceItem;
        const serviceTotal = getServicePrice(svc);
        return {
          partner_id: svc.service.partnerId!,
          client_name: clientName,
          address: buildAddressString(serviceAddress),
          scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString(),
          status: "pending" as const,
          subscription_id: subscriptionMap[svc.service.id] || null,
          order_id: null,
          total: serviceTotal,
          payment_status: "pendente",
          amount_paid: 0,
        };
      });

      const { error: soError } = await supabase
        .from("service_orders")
        .insert(subServiceOrders as any);

      if (soError) {
        setError("Erro ao criar ordem de serviço do parceiro.");
        return;
      }
    }

    if (partnerServicesWithoutInterval.length > 0 && orderId) {
      const oneTimeServiceOrders = partnerServicesWithoutInterval.map((item) => {
        const svc = item as CartServiceItem;
        const serviceTotal = getServicePrice(svc);
        return {
          order_id: orderId,
          partner_id: svc.service.partnerId!,
          client_name: clientName,
          address: buildAddressString(serviceAddress),
          scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString(),
          status: "pending" as const,
          subscription_id: null,
          total: serviceTotal,
          payment_status: "pago",
          amount_paid: serviceTotal,
          payment_method: paymentMethod,
        };
      });

      const { error: soError } = await supabase
        .from("service_orders")
        .insert(oneTimeServiceOrders as any);

      if (soError) {
        setError("Erro ao criar ordem de serviço do parceiro.");
        if (productItems.length > 0) {
          const releaseItems = productItems.map((p) => ({ product_id: p.productId, qty: p.quantity }));
          await supabase.rpc("release_stock", { items: releaseItems });
        }
        return;
      }
    }

    setLoading(false);
    clearCart();

    const subIds = Object.values(subscriptionMap);
    if (subIds.length > 0) {
      const firstSubId = subIds[0];
      const { data: subServiceOrder } = await supabase
        .from("service_orders")
        .select("id")
        .eq("subscription_id", firstSubId)
        .maybeSingle();
      if (subServiceOrder) {
        router.push(`/pedido/${subServiceOrder.id}`);
      } else {
        router.push("/minha-conta");
      }
    } else if (orderId) {
      router.push(`/pedido/${orderId}`);
    } else {
      router.push("/minha-conta");
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Package className="mx-auto h-12 w-12" style={{ color: "#444" }} />
        <p className="mt-4 text-white">Seu carrinho está vazio.</p>
      </div>
    );
  }

  const AddressFields = ({
    addr,
    setAddr,
    target,
    label,
  }: {
    addr: AddressForm;
    setAddr: (a: AddressForm) => void;
    target: "service" | "delivery";
    label: string;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4" style={{ color: "#C9A84C" }} />
        <h2 className="font-montserrat text-sm font-bold text-white">{label}</h2>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/50">CEP *</label>
        <div className="relative">
          <input
            type="text"
            value={addr.cep}
            onChange={(e) => setAddr({ ...addr, cep: formatCep(e.target.value) })}
            onBlur={() => fetchCep(addr.cep, target)}
            placeholder="00000-000"
            maxLength={9}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-[#C9A84C]/50"
          />
          {loadingCep && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/40" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_100px]">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Rua / Logradouro *</label>
          <input
            type="text"
            value={addr.rua}
            onChange={(e) => setAddr({ ...addr, rua: e.target.value })}
            placeholder="Rua, Avenida..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-[#C9A84C]/50"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Nº *</label>
          <input
            type="text"
            value={addr.numero}
            onChange={(e) => setAddr({ ...addr, numero: e.target.value })}
            placeholder="123"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-[#C9A84C]/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Bairro *</label>
          <input
            type="text"
            value={addr.bairro}
            onChange={(e) => setAddr({ ...addr, bairro: e.target.value })}
            placeholder="Centro"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-[#C9A84C]/50"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Cidade *</label>
          <input
            type="text"
            value={addr.localidade}
            onChange={(e) => setAddr({ ...addr, localidade: e.target.value })}
            placeholder="São Paulo"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-[#C9A84C]/50"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Estado *</label>
          <input
            type="text"
            value={addr.uf}
            onChange={(e) => setAddr({ ...addr, uf: e.target.value.toUpperCase() })}
            placeholder="SP"
            maxLength={2}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-[#C9A84C]/50"
          />
        </div>
      </div>
    </div>
  );

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
        {items.map((item) => {
          const isPartner = item.type === "service" && !!item.service.partnerId;
          const accent = isPartner ? "#10B981" : "#E30613";
          return (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            {item.type === "service" ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}12` }}>
                <ServiceIcon iconName={item.service.iconName} className="h-4 w-4" style={{ color: accent }} />
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
            {item.type === "service" && item.service.price ? (
              <span className="font-oswald text-sm font-bold" style={{ color: accent }}>
                R$ {getServicePrice(item as CartServiceItem).toFixed(2).replace(".", ",")}
              </span>
            ) : item.type === "product" ? (
              <span className="font-oswald text-sm font-bold" style={{ color: "#E30613" }}>
                R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
              </span>
            ) : null}
          </div>
          );
        })}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <span className="text-sm font-medium text-white">Total</span>
          <span className="font-oswald text-xl font-bold text-white">
            R$ {subtotal.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>

      {/* Endereço existente */}
      {existingAddress && (hasPartnerService || hasProduct) && (
        <div className="mt-8 rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={useExisting}
              onChange={(e) => setUseExisting(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/[0.05] text-[#C9A84C] focus:ring-[#C9A84C]/50"
            />
            <div>
              <p className="text-sm font-medium text-white">Usar endereço cadastrado</p>
              <p className="mt-0.5 text-xs text-white/50">
                {existingAddress.rua}, {existingAddress.numero} - {existingAddress.bairro}, {existingAddress.localidade}/{existingAddress.uf}
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Campos de serviço + endereço */}
      {hasService && (
        <div className="mt-8 space-y-5">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4" style={{ color: "#E30613" }} />
            <h2 className="font-montserrat text-sm font-bold text-white">Informações do Serviço</h2>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Data e hora desejada *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
              <input
                type="datetime-local"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-all focus:border-[#E30613]/50"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Descrição do problema / marca / modelo</label>
            <textarea
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-[#E30613]/50"
              placeholder="Ex: Geladeira Consul 340L não gela o freezer..."
            />
          </div>
          {/* Endereço: servo parceiro usa serviceAddress; serviço normal + produto usa um único endereço */}
          {hasPartnerService ? (
            <AddressFields addr={serviceAddress} setAddr={setServiceAddress} target="service" label="Endereço do serviço *" />
          ) : hasProduct ? (
            <AddressFields addr={deliveryAddress} setAddr={setDeliveryAddress} target="delivery" label="Endereço de entrega *" />
          ) : null}
        </div>
      )}

      {/* Endereço de entrega — só produto (sem serviço) */}
      {hasProduct && !hasService && (
        <div className="mt-8">
          <AddressFields addr={deliveryAddress} setAddr={setDeliveryAddress} target="delivery" label="Endereço de entrega *" />
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
