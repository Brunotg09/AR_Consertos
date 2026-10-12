"use client";

import { useAuth } from "@/hooks/useAuth";
import { generateOSPDF, generateSingleItemOSPDF, type PDFOrder, type PDFCliente } from "@/lib/generateOSPDF";
import { supabase } from "@/lib/supabase";
import { useFloatingWidget } from "@/components/FloatingWidget";
import PaymentDialog from "@/components/PaymentDialog";
import ProductPaymentModal from "@/components/checkout/ProductPaymentModal";
import {
  AlertTriangle,
  Banknote,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  Filter,
  Loader2,
  QrCode,
  ShieldCheck,
  ShieldOff,
  ShoppingCart,
  Wrench,
  XCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, Fragment } from "react";

interface OrderItem {
  item_id: number;
  item_type: string;
  item_name: string;
  item_service_type: string | null;
  item_quantity: number;
  item_price: number | null;
  item_status: string | null;
  item_payment_status: string | null;
  item_amount_paid: number | null;
  item_scheduled_date: string | null;
  item_problem_description: string | null;
  item_diagnosis: string | null;
  item_completed_at: string | null;
  item_warranty_expires_at: string | null;
  item_product_category: string | null;
  item_product_condition: string | null;
  item_product_images: string[] | null;
  item_rating?: number | null;
  item_review?: string | null;
  item_service_order_id?: string | null;
  item_remaining_amount?: number | null;
}

interface Order {
  order_id: string;
  order_status: string;
  order_payment_method: string | null;
  order_total: number;
  order_created_at: string;
  order_notes: string | null;
  order_updated_at: string | null;
  items: OrderItem[];
}

type FilterType = "todos" | "servicos" | "produtos";

export default function HistoricoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { trigger } = useFloatingWidget();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("todos");

  // Avaliação
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingItem, setRatingItem] = useState<OrderItem | null>(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingReview, setRatingReview] = useState("");
  const [savingRating, setSavingRating] = useState(false);

  // Pagamento
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payItem, setPayItem] = useState<OrderItem | null>(null);
  // Pagamento de produto pendente (pedido abandonado no checkout)
  const [payProductOrder, setPayProductOrder] = useState<{
    orderId: string;
    amount: number;
  } | null>(null);

  const openPayDialog = (item: OrderItem) => {
    setPayItem(item);
    setPayDialogOpen(true);
  };

  const openRatingDialog = (item: OrderItem) => {
    setRatingItem(item);
    setRatingStars(0);
    setRatingReview("");
    setRatingDialogOpen(true);
  };

  const submitRating = async () => {
    if (!ratingItem || ratingStars < 1) return;
    setSavingRating(true);
    const { error } = await supabase.rpc("submit_service_rating", {
      p_service_order_id: ratingItem.item_service_order_id,
      p_rating: ratingStars,
      p_review: ratingReview || null,
    });
    setSavingRating(false);
    if (error) {
      alert("Erro ao enviar avaliação: " + error.message);
      return;
    }
    // Notificar parceiro (best-effort)
    supabase.rpc("notify_partner_rating", {
      p_service_order_id: ratingItem.item_service_order_id,
    });
    setRatingDialogOpen(false);
    fetchOrders();
  };

  useEffect(() => { trigger("help"); }, [trigger]);
  const [clienteName, setClienteName] = useState("Cliente");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/historico");
      return;
    }
    fetchOrders();
    fetchProfile();
  }, [user, authLoading, router]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user!.id)
      .single();
    if (data?.full_name) setClienteName(data.full_name);
  };

  const fetchOrders = async () => {
    setLoading(true);
    
    // Try RPC first
    let { data: rpcData, error: rpcError } = await supabase.rpc("get_user_orders_with_items");
    
    // If RPC fails, fallback to direct query
    if (rpcError || !rpcData) {
      // Direct query by user_id only (simplified - removed complex cliente_id fallback)
      let { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          payment_method,
          total,
          created_at,
          order_items (
            id,
            item_type,
            item_name,
            service_type,
            quantity,
            price,
            status,
            payment_status,
            amount_paid,
            scheduled_date,
            problem_description,
            diagnosis,
            completed_at,
            warranty_expires_at,
            product_category,
            product_condition,
            product_images
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (ordersError || !ordersData) {
        setLoading(false);
        return;
      }

      // Transform to match RPC format
      const grouped: Record<string, Order> = {};
      for (const order of ordersData as any[]) {
        const oid = order.id;
        grouped[oid] = {
          order_id: oid,
          order_status: order.status,
          order_payment_method: order.payment_method,
          order_total: Number(order.total),
          order_created_at: order.created_at,
          order_notes: order.notes || null,
          order_updated_at: order.updated_at || null,
          items: (order.order_items || []).map((oi: any) => ({
            item_id: oi.id,
            item_type: oi.item_type,
            item_name: oi.item_name,
            item_service_type: oi.service_type,
            item_quantity: oi.quantity,
            item_price: oi.price ? Number(oi.price) : null,
            item_status: oi.status || "pendente",
            item_payment_status: oi.payment_status,
            item_amount_paid: oi.amount_paid ? Number(oi.amount_paid) : null,
            item_scheduled_date: oi.scheduled_date,
            item_problem_description: oi.problem_description,
            item_diagnosis: oi.diagnosis,
            item_completed_at: oi.completed_at,
            item_warranty_expires_at: oi.warranty_expires_at,
            item_product_category: oi.product_category,
            item_product_condition: oi.product_condition,
            item_product_images: oi.product_images,
          })),
        };
      }
      setOrders(Object.values(grouped));
      setLoading(false);
      return;
    }

    // Process RPC data
    const grouped: Record<string, Order> = {};
    for (const row of rpcData as any[]) {
      const oid = row.order_id;
      if (!grouped[oid]) {
        grouped[oid] = {
          order_id: oid,
          order_status: row.order_status,
          order_payment_method: row.order_payment_method,
          order_total: Number(row.order_total),
          order_created_at: row.order_created_at,
          order_notes: row.order_notes || null,
          order_updated_at: row.order_updated_at || null,
          items: [],
        };
      }
      grouped[oid].items.push({
        item_id: row.item_id,
        item_type: row.item_type,
        item_name: row.item_name,
        item_service_type: row.item_service_type,
        item_quantity: row.item_quantity,
        item_price: row.item_price ? Number(row.item_price) : null,
        item_status: row.item_status || "pendente",
        item_payment_status: row.item_payment_status,
        item_amount_paid: row.item_amount_paid ? Number(row.item_amount_paid) : null,
        item_scheduled_date: row.item_scheduled_date,
        item_problem_description: row.item_problem_description,
        item_diagnosis: row.item_diagnosis,
        item_completed_at: row.item_completed_at,
        item_warranty_expires_at: row.item_warranty_expires_at,
        item_product_category: row.item_product_category,
        item_product_condition: row.item_product_condition,
        item_product_images: row.item_product_images,
        item_rating: row.item_rating,
        item_review: row.item_review,
        item_service_order_id: row.item_service_order_id,
        item_remaining_amount: row.item_remaining_amount != null ? Number(row.item_remaining_amount) : null,
      });
    }

    setOrders(Object.values(grouped));
    setLoading(false);
  };

  const filteredOrders = useMemo(() => {
    if (filter === "todos") return orders;
    return orders.filter((o) =>
      filter === "servicos"
        ? o.items.some((i) => i.item_type === "servico")
        : o.items.some((i) => i.item_type === "produto")
    );
  }, [orders, filter]);

  const handleGeneratePDF = (order: Order) => {
    const isOrderDone = order.order_status === "concluido" || (order.items.length > 0 && order.items.every(
      (i) => (i.item_type === "produto" ? (i.item_payment_status === "pago" || i.item_status === "concluido" || i.item_status === "entregue") : (i.item_status === "concluido" || !!i.item_completed_at))
    ));
    if (!isOrderDone) {
      alert("A O.S. completa só fica disponível após a conclusão dos itens do pedido.");
      return;
    }

    const pdfOrder: PDFOrder = {
      order_id: order.order_id,
      order_status: order.order_status,
      order_payment_method: order.order_payment_method,
      order_total: order.order_total,
      order_created_at: order.order_created_at,
      order_notes: order.order_notes,
      order_updated_at: order.order_updated_at,
      items: order.items.map(item => ({
        ...item,
        item_type: item.item_type as "servico" | "produto",
        status: item.item_status || null,
      })),
    };
    const clienteInfo: PDFCliente = {
      nome: clienteName,
      cpf: null,
      telefone: null,
      whatsapp: null,
      email: null,
      endereco: null,
      forma_atendimento: null,
    };
    const empresaInfo = {
      nome: "A.R. Consertos",
      cnpj: "(79) 99944-6596",
      endereco: "Itabaiana/SE",
      telefone: "(79) 99944-6596",
      email: "contato@arconsertos.com.br",
      site: "www.arconsertos.com.br",
    };
    generateOSPDF(pdfOrder, clienteInfo, empresaInfo);
  };

  const handleGenerateItemPDF = (order: Order, item: OrderItem) => {
    const isDone = item.item_type === "produto"
      ? (item.item_payment_status === "pago" || item.item_status === "concluido" || item.item_status === "entregue" || order.order_status === "concluido")
      : (item.item_status === "concluido" || !!item.item_completed_at || order.order_status === "concluido");

    if (!isDone) {
      alert("A O.S. deste item só fica disponível após a conclusão.");
      return;
    }

    const pdfOrder: PDFOrder = {
      order_id: order.order_id,
      order_status: order.order_status,
      order_payment_method: order.order_payment_method,
      order_total: order.order_total,
      order_created_at: order.order_created_at,
      order_notes: order.order_notes,
      order_updated_at: order.order_updated_at,
      items: [],
    };
    const pdfItem = {
      item_type: item.item_type,
      item_name: item.item_name,
      item_service_type: item.item_service_type,
      item_quantity: item.item_quantity,
      item_price: item.item_price,
      item_payment_status: item.item_payment_status,
      item_amount_paid: item.item_amount_paid,
      item_scheduled_date: item.item_scheduled_date,
      item_problem_description: item.item_problem_description,
      item_diagnosis: item.item_diagnosis,
      item_completed_at: item.item_completed_at,
      item_warranty_expires_at: item.item_warranty_expires_at,
      item_product_category: item.item_product_category,
      item_product_condition: item.item_product_condition,
      item_product_images: item.item_product_images,
      status: item.item_status || null,
    };
    const clienteInfo: PDFCliente = {
      nome: clienteName,
      cpf: null,
      telefone: null,
      whatsapp: null,
      email: null,
      endereco: null,
      forma_atendimento: null,
    };
    const empresaInfo = {
      nome: "A.R. Consertos",
      cnpj: "(79) 99944-6596",
      endereco: "Itabaiana/SE",
      telefone: "(79) 99944-6596",
      email: "contato@arconsertos.com.br",
      site: "www.arconsertos.com.br",
    };
    generateSingleItemOSPDF(pdfOrder, pdfItem, clienteInfo, empresaInfo);
  };

  const statusColors: Record<string, string> = {
    pendente: "#ffaa44",
    orcamento_enviado: "#06B6D4",
    em_andamento: "#8B5CF6",
    pronto: "#10B981",
    entregue: "#14B8A6",
    concluido: "#44dd88",
    cancelado: "#ff6b6b",
  };

  const paymentBadge = (status: string | null) => {
    if (!status) return { text: "Pendente", color: "#ffaa44", icon: Clock };
    const map: Record<string, { text: string; color: string; icon: any }> = {
      pendente: { text: "⏳ Pendente", color: "#ffaa44", icon: Clock },
      pago_parcial: { text: "⏴ Pago Parcial", color: "#ff8800", icon: AlertTriangle },
      pago: { text: "✅ Pago", color: "#44dd88", icon: CheckCircle },
      cancelado: { text: "❌ Cancelado", color: "#ff6b6b", icon: ShieldOff },
    };
    return map[status] || map.pendente;
  };

  const isWarrantyActive = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) > new Date();
  };

  const formatCurrency = (v: number | null) =>
    v != null ? `R$ ${Number(v).toFixed(2).replace(".", ",")}` : "-";

  // ServiceTimeline component - compact horizontal
  const ServiceTimeline = ({ item, accent }: { item: OrderItem; accent: string }) => {
    const itemStatus = item.item_status || "pendente";
    const scheduled = !!item.item_scheduled_date;
    const orcamentoEnviado = itemStatus === "orcamento_enviado";
    const inProgress = itemStatus === "em_andamento";
    const pronto = itemStatus === "pronto";
    const entregue = itemStatus === "entregue";
    const completed = itemStatus === "concluido" || !!item.item_completed_at;
    const cancelled = itemStatus === "cancelado";

    if (cancelled) {
      return (
        <div className="mt-2.5 flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.15)" }}>
          <XCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#ff6b6b" }} />
          <span className="text-xs font-medium" style={{ color: "#ff6b6b" }}>Cancelado</span>
        </div>
      );
    }

    const stages = [
      { key: "agendado", label: "Agendado", done: scheduled || orcamentoEnviado || inProgress || pronto || entregue || completed, current: scheduled && !orcamentoEnviado && !inProgress && !pronto && !entregue && !completed },
      { key: "orcamento_enviado", label: "Orçamento", done: orcamentoEnviado || inProgress || pronto || entregue || completed, current: orcamentoEnviado && !inProgress && !pronto && !entregue && !completed },
      { key: "em_andamento", label: "Andamento", done: inProgress || pronto || entregue || completed, current: inProgress && !pronto && !entregue && !completed },
      { key: "pronto", label: "Pronto", done: pronto || entregue || completed, current: pronto && !entregue && !completed },
      { key: "entregue", label: "Entregue", done: entregue || completed, current: entregue && !completed },
      { key: "concluido", label: "Concluído", done: completed, current: completed },
    ];

    return (
      <div className="mt-2.5">
        <div className="flex items-center gap-0">
          {stages.map((stage, idx) => (
            <Fragment key={stage.key}>
              <div className="flex items-center gap-1.5">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full transition-all"
                  style={{
                    backgroundColor: stage.done ? accent : "transparent",
                    border: `1.5px solid ${stage.done ? accent : stage.current ? accent : "rgba(255,255,255,0.15)"}`,
                    boxShadow: stage.current ? `0 0 0 3px ${accent}20` : "none",
                  }}
                >
                  {stage.done && !stage.current && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {stage.current && (
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stage.done ? "#000" : accent }} />
                  )}
                </div>
                <span className="text-[9px] font-medium" style={{ color: stage.done || stage.current ? "#ccc" : "#666" }}>
                  {stage.label}
                </span>
              </div>
              {idx < stages.length - 1 && (
                <div className="mx-1 h-px flex-1" style={{ backgroundColor: stages[idx + 1].done ? accent : "rgba(255,255,255,0.08)", minWidth: 16 }} />
              )}
            </Fragment>
          ))}
        </div>
        <div className="mt-2 text-[11px]" style={{ color: "#999" }}>
          {completed && item.item_completed_at && (
            <span style={{ color: "#44dd88" }}>Concluído em {new Date(item.item_completed_at).toLocaleDateString("pt-BR")}</span>
          )}
          {inProgress && !completed && (
            <span style={{ color: accent }}>Em andamento</span>
          )}
          {scheduled && !inProgress && !completed && (
            <span>Agendado para {new Date(item.item_scheduled_date!).toLocaleDateString("pt-BR", { weekday: 'short', day: '2-digit', month: 'short' })}</span>
          )}
          {!scheduled && !inProgress && !completed && (
            <span style={{ color: "#666" }}>Aguardando</span>
          )}
        </div>
      </div>
    );
  };

  // ProductTimeline component - compact horizontal
  const ProductTimeline = ({ item }: { item: OrderItem }) => {
    const paymentStatus = item.item_payment_status || "pendente";
    const paid = paymentStatus === "pago";
    const partial = paymentStatus === "pago_parcial";
    const cancelled = paymentStatus === "cancelado";

    if (cancelled) {
      return (
        <div className="mt-2.5 flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.15)" }}>
          <XCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#ff6b6b" }} />
          <span className="text-xs font-medium" style={{ color: "#ff6b6b" }}>Cancelado</span>
        </div>
      );
    }

    const stages = [
      { key: "pedido", label: "Pedido", done: true, current: !paid && !partial },
      { key: "pagamento", label: "Pago", done: paid || partial, current: partial },
      { key: "entregue", label: "Entregue", done: paid, current: paid },
    ];

    return (
      <div className="mt-2.5">
        <div className="flex items-center gap-0">
          {stages.map((stage, idx) => (
            <Fragment key={stage.key}>
              <div className="flex items-center gap-1.5">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full transition-all"
                  style={{
                    backgroundColor: stage.done ? "#C9A84C" : "transparent",
                    border: `1.5px solid ${stage.done ? "#C9A84C" : stage.current ? "#C9A84C" : "rgba(255,255,255,0.15)"}`,
                    boxShadow: stage.current ? "0 0 0 3px rgba(201,168,76,0.2)" : "none",
                  }}
                >
                  {stage.done && !stage.current && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {stage.current && (
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stage.done ? "#1a1a1a" : "#C9A84C" }} />
                  )}
                </div>
                <span className="text-[9px] font-medium" style={{ color: stage.done || stage.current ? "#ccc" : "#666" }}>
                  {stage.label}
                </span>
              </div>
              {idx < stages.length - 1 && (
                <div className="mx-1 h-px flex-1" style={{ backgroundColor: stages[idx + 1].done ? "#C9A84C" : "rgba(255,255,255,0.08)", minWidth: 16 }} />
              )}
            </Fragment>
          ))}
        </div>
        <div className="mt-2 text-[11px]" style={{ color: "#999" }}>
          {paid && <span style={{ color: "#44dd88" }}>Pago integralmente</span>}
          {partial && <span style={{ color: "#ffaa44" }}>Pago parcialmente</span>}
          {!paid && !partial && <span style={{ color: "#666" }}>Aguardando pagamento</span>}
        </div>
      </div>
    );
  };

  const statusLabels: Record<string, string> = {
    pendente: "Pendente",
    orcamento_enviado: "Orçamento Enviado",
    em_andamento: "Em Andamento",
    pronto: "Pronto",
    entregue: "Entregue",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin" style={{ color: "#E30613" }} />
        <p className="mt-4 text-sm" style={{ color: "#888888" }}>Carregando histórico...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6" style={{ color: "#C9A84C" }} />
        <h1 className="font-bebas text-3xl tracking-wide text-white sm:text-4xl">
          HISTÓRICO DE PEDIDOS
        </h1>
      </div>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#888888" }}>
          <Filter className="h-3.5 w-3.5" />
          <span>Filtrar:</span>
        </div>
        {(["todos", "servicos", "produtos"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? "text-white"
                : "border border-white/10 text-white/70 hover:bg-white/5"
            }`}
            style={filter === f ? { backgroundColor: "#E30613" } : undefined}
          >
            {f === "todos" ? "Todos" : f === "servicos" ? "Serviços" : "Produtos"}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="mt-12 text-center">
          <FileText className="mx-auto h-12 w-12" style={{ color: "#444" }} />
          <p className="mt-4 text-sm" style={{ color: "#888888" }}>
            Nenhum pedido encontrado.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {filteredOrders.map((order) => {
            const totalPaid = order.items.reduce((sum, i) => sum + (i.item_amount_paid || 0), 0);
            const totalPending = order.order_total - totalPaid;
            const sc = statusColors[order.order_status] || "#888";
            const isItemDone = (i: OrderItem) => {
              if (i.item_type === "produto") {
                return (
                  i.item_payment_status === "pago" ||
                  i.item_status === "concluido" ||
                  i.item_status === "entregue" ||
                  order.order_status === "concluido"
                );
              }
              return (
                i.item_status === "concluido" ||
                !!i.item_completed_at ||
                order.order_status === "concluido"
              );
            };

            const allItemsCompleted =
              order.items.length > 0 && order.items.every(isItemDone);
            const anyItemCompleted = order.items.some(isItemDone);

            // Produtos ainda não pagos (pedido abandonado no checkout) → botão "Pagar"
            const unpaidProductTotal = order.items
              .filter((i) => i.item_type === "produto" && i.item_payment_status !== "pago")
              .reduce((sum, i) => sum + (i.item_price || 0) * (i.item_quantity || 1), 0);
            const hasUnpaidProducts = unpaidProductTotal > 0;

            return (
              <div
                key={order.order_id}
                className="overflow-hidden rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                {/* Header do pedido */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {/* Número OS com ícone */}
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${sc}12`, border: `1px solid ${sc}25` }}
                      >
                        <span className="font-mono text-xs font-bold" style={{ color: sc }}>
                          #{order.order_id.slice(0, 4).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white">
                            O.S. #{order.order_id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px]" style={{ color: "#777" }}>
                          {new Date(order.order_created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                          {" às "}
                          {new Date(order.order_created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {/* Status badge */}
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: `${sc}15`,
                          color: sc,
                          border: `1px solid ${sc}30`,
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc }} />
                        {statusLabels[order.order_status] || order.order_status}
                      </span>
                      {/* Total */}
                      <span className="font-oswald text-lg font-bold text-white">
                        {formatCurrency(order.order_total)}
                      </span>
                    </div>
                  </div>

                  {/* Resumo de pagamento */}
                  <div className="mt-3 flex items-center gap-4 text-[11px]" style={{ color: "#777" }}>
                    {totalPaid > 0 && (
                      <span className="flex items-center gap-1" style={{ color: "#44dd88" }}>
                        <CheckCircle className="h-3 w-3" /> {formatCurrency(totalPaid)} pago
                      </span>
                    )}
                    {totalPending > 0 && (
                      <span className="flex items-center gap-1" style={{ color: "#ffaa44" }}>
                        <Clock className="h-3 w-3" /> {formatCurrency(totalPending)} pendente
                      </span>
                    )}
                    {totalPaid === 0 && totalPending <= 0 && (
                      <span>{formatCurrency(order.order_total)}</span>
                    )}
                    {order.order_payment_method && (
                      <span className="flex items-center gap-1 capitalize">
                        {order.order_payment_method === "dinheiro" && <Banknote className="h-3 w-3" />}
                        {order.order_payment_method === "pix" && <QrCode className="h-3 w-3" />}
                        {order.order_payment_method === "cartao" && <CreditCard className="h-3 w-3" />}
                        {order.order_payment_method}
                      </span>
                    )}
                  </div>

                  {/* Pagar produtos pendentes (pedido abandonado no checkout) */}
                  {hasUnpaidProducts && (
                    <button
                      onClick={() =>
                        setPayProductOrder({
                          orderId: order.order_id,
                          amount: unpaidProductTotal,
                        })
                      }
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
                      style={{
                        backgroundColor: "rgba(227,6,19,0.12)",
                        color: "#E30613",
                        border: "1px solid rgba(227,6,19,0.25)",
                      }}
                    >
                      <CreditCard className="h-4 w-4" />
                      Pagar produtos — {formatCurrency(unpaidProductTotal)}
                    </button>
                  )}

                  {/* Botão PDF */}
                  {allItemsCompleted ? (
                    <button
                      onClick={() => handleGeneratePDF(order)}
                      className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all"
                      style={{
                        backgroundColor: "rgba(68,221,136,0.1)",
                        color: "#44dd88",
                        border: "1px solid rgba(68,221,136,0.2)",
                      }}
                    >
                      <FileText className="h-3 w-3" />
                      Gerar O.S.
                    </button>
                  ) : (
                    <div
                      className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px]"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.02)",
                        color: "#555",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <FileText className="h-3 w-3" />
                      Aguardando conclusão dos itens
                    </div>
                  )}
                </div>

                {/* Itens */}
                <div className="border-t border-white/[0.04] px-5 pb-4 pt-3 space-y-2.5">
                  {order.items.map((item) => {
                    const isService = item.item_type === "servico";
                    const pg = paymentBadge(item.item_payment_status);
                    const PgIcon = pg.icon;

                    if (isService) {
                      const isInv = item.item_service_type === "inverter";
                      const accent = isInv ? "#8B5CF6" : "#E30613";
                      const isServiceDone =
                        item.item_status === "concluido" ||
                        !!item.item_completed_at ||
                        order.order_status === "concluido";
                      const completed = isServiceDone;
                      const warrantyActive = isWarrantyActive(item.item_warranty_expires_at);

                      return (
                        <div
                          key={item.item_id}
                          className="rounded-xl p-3.5"
                          style={{
                            background: `linear-gradient(135deg, ${accent}08 0%, ${accent}03 100%)`,
                            border: `1px solid ${accent}18`,
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: `${accent}15` }}
                            >
                              <Wrench className="h-4 w-4" style={{ color: accent }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-sm font-bold text-white">{item.item_name}</span>
                                <span
                                  className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                                  style={{ backgroundColor: `${accent}20`, color: accent }}
                                >
                                  {isInv ? "Inverter" : "Convencional"}
                                </span>
                              </div>

                              {/* Preço */}
                              <div className="mt-1.5">
                                {item.item_price && item.item_price > 0 ? (
                                  <span className="font-oswald text-sm font-bold" style={{ color: accent }}>
                                    {formatCurrency(item.item_price * item.item_quantity)}
                                  </span>
                                ) : (
                                  <span className="text-xs italic" style={{ color: "#666" }}>Preço a definir</span>
                                )}
                              </div>

                              {/* Timeline */}
                              <ServiceTimeline item={item} accent={accent} />

                              {/* Problema */}
                              {item.item_problem_description && (
                                <div className="mt-2 rounded-lg px-2.5 py-2" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                                  <p className="text-[11px] leading-relaxed" style={{ color: "#aaa" }}>
                                    <span style={{ color: "#777" }}>Problema: </span>
                                    {item.item_problem_description}
                                  </p>
                                </div>
                              )}

                              {/* Diagnóstico */}
                              {completed && item.item_diagnosis && (
                                <div className="mt-1.5 rounded-lg px-2.5 py-2" style={{ backgroundColor: `${accent}08` }}>
                                  <p className="text-[11px] leading-relaxed" style={{ color: "#bbb" }}>
                                    <span style={{ color: accent }}>Diagnóstico: </span>
                                    {item.item_diagnosis}
                                  </p>
                                </div>
                              )}

                              {/* Garantia */}
                              {completed && item.item_warranty_expires_at && (
                                <div className="mt-2 flex items-center gap-1.5">
                                  {warrantyActive ? (
                                    <Fragment>
                                      <ShieldCheck className="h-3.5 w-3.5" style={{ color: "#44dd88" }} />
                                      <span className="text-[10px] font-medium" style={{ color: "#44dd88" }}>
                                        Garantia até {new Date(item.item_warranty_expires_at).toLocaleDateString("pt-BR")}
                                      </span>
                                    </Fragment>
                                  ) : (
                                    <Fragment>
                                      <ShieldOff className="h-3.5 w-3.5" style={{ color: "#666" }} />
                                      <span className="text-[10px]" style={{ color: "#666" }}>
                                        Garantia expirada
                                      </span>
                                    </Fragment>
                                  )}
                                </div>
                              )}

                              {/* Fotos do aparelho */}
                              {item.item_product_images && item.item_product_images.length > 0 && (
                                <div className="mt-2 flex gap-1.5">
                                  {item.item_product_images.map((img, idx) => (
                                    <img
                                      key={idx}
                                      src={img}
                                      alt={`Foto ${idx + 1}`}
                                      className="h-16 w-16 rounded-lg object-cover"
                                      style={{ border: `1px solid ${accent}30` }}
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Saldo restante / Pagar */}
                              {item.item_service_order_id &&
                                item.item_remaining_amount != null &&
                                item.item_remaining_amount > 0 && (
                                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-medium text-[#F59E0B]">
                                      Restante: {formatCurrency(item.item_remaining_amount)}
                                    </span>
                                    <button
                                      onClick={() => openPayDialog(item)}
                                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all"
                                      style={{
                                        backgroundColor: "rgba(227,6,19,0.12)",
                                        color: "#E30613",
                                        border: "1px solid rgba(227,6,19,0.25)",
                                      }}
                                    >
                                      <CreditCard className="h-3 w-3" />
                                      Pagar
                                    </button>
                                  </div>
                                )}

                              {/* Avaliação do serviço */}
                              {isServiceDone && (
                                <div className="mt-2.5">
                                  {item.item_rating ? (
                                    <p className="text-[11px] text-[#C9A84C]">
                                      {"⭐".repeat(item.item_rating)}
                                      {"☆".repeat(5 - item.item_rating)} ({item.item_rating}/5)
                                      {item.item_review && (
                                        <span className="ml-1 text-white/50">&ldquo;{item.item_review}&rdquo;</span>
                                      )}
                                    </p>
                                  ) : (
                                    <button
                                      onClick={() => openRatingDialog(item)}
                                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all"
                                      style={{
                                        backgroundColor: "rgba(201,168,76,0.1)",
                                        color: "#C9A84C",
                                        border: "1px solid rgba(201,168,76,0.25)",
                                      }}
                                    >
                                      ⭐ Avaliar Serviço
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* O.S. individual */}
                              {isServiceDone ? (
                                <button
                                  onClick={() => handleGenerateItemPDF(order, item)}
                                  className="mt-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all"
                                  style={{
                                    backgroundColor: `${accent}10`,
                                    color: accent,
                                    border: `1px solid ${accent}20`,
                                  }}
                                >
                                  <FileText className="h-3 w-3" />
                                  Gerar O.S. deste item
                                </button>
                              ) : (
                                <div
                                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px]"
                                  style={{
                                    backgroundColor: "rgba(255,255,255,0.02)",
                                    color: "#666",
                                    border: "1px solid rgba(255,255,255,0.05)",
                                  }}
                                >
                                  <Clock className="h-3 w-3" />
                                  <span>O.S. disponível após conclusão do serviço</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Produto
                    const isProductDone =
                      item.item_payment_status === "pago" ||
                      item.item_status === "concluido" ||
                      item.item_status === "entregue" ||
                      order.order_status === "concluido";

                    return (
                      <div
                        key={item.item_id}
                        className="rounded-xl p-3.5"
                        style={{
                          background: "linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.02) 100%)",
                          border: "1px solid rgba(201,168,76,0.12)",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: "rgba(201,168,76,0.12)" }}
                          >
                            <ShoppingCart className="h-4 w-4" style={{ color: "#C9A84C" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-bold text-white">{item.item_name}</span>
                              {item.item_product_category && (
                                <span className="text-[10px]" style={{ color: "#888" }}>{item.item_product_category}</span>
                              )}
                            </div>

                            {/* Preço */}
                            <p className="mt-1 font-oswald text-sm font-bold" style={{ color: "#C9A84C" }}>
                              {formatCurrency(item.item_price ? item.item_price * item.item_quantity : null)}
                            </p>

                            {/* Timeline */}
                            <ProductTimeline item={item} />

                            {item.item_product_condition && (
                              <p className="mt-1.5 text-[10px]" style={{ color: "#888" }}>
                                Condição: {item.item_product_condition}
                              </p>
                            )}
                          </div>
                          {item.item_product_images?.[0] && (
                            <img
                              src={item.item_product_images[0]}
                              alt={item.item_name}
                              className="h-11 w-11 shrink-0 rounded-lg object-cover"
                              style={{ border: "1px solid rgba(201,168,76,0.15)" }}
                            />
                          )}
                        </div>
                        {/* O.S. individual produto */}
                        {isProductDone ? (
                          <button
                            onClick={() => handleGenerateItemPDF(order, item)}
                            className="mt-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all"
                            style={{
                              backgroundColor: "rgba(201,168,76,0.08)",
                              color: "#C9A84C",
                              border: "1px solid rgba(201,168,76,0.15)",
                            }}
                          >
                            <FileText className="h-3 w-3" />
                            Gerar O.S. deste item
                          </button>
                        ) : (
                          <div
                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px]"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.02)",
                              color: "#666",
                              border: "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            <Clock className="h-3 w-3" />
                            <span>Comprovante disponível após conclusão/pagamento</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Pagamento */}
      {payDialogOpen && payItem && (
        <PaymentDialog
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          serviceOrderId={payItem.item_service_order_id!}
          serviceName={payItem.item_name}
          remainingAmount={payItem.item_remaining_amount || 0}
          onPaid={() => {
            setPayDialogOpen(false);
            fetchOrders();
          }}
        />
      )}

      {/* Modal de Pagamento de Produto (pedido pendente) */}
      {payProductOrder && (
        <ProductPaymentModal
          open
          onOpenChange={(v) => {
            if (!v) setPayProductOrder(null);
          }}
          orderId={payProductOrder.orderId}
          amount={payProductOrder.amount}
          initialMethod="pix"
          onComplete={() => {
            setPayProductOrder(null);
            fetchOrders();
          }}
        />
      )}

      {/* Modal de Avaliação */}
      {ratingDialogOpen && ratingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{
              background: "linear-gradient(135deg, #141414 0%, #0d0d0d 100%)",
              border: "1px solid rgba(201,168,76,0.2)",
            }}
          >
            <h3 className="font-bebas text-2xl tracking-wide text-white">Avaliar Serviço</h3>
            <p className="mt-1 text-sm text-white/50">{ratingItem.item_name}</p>

            <div className="my-5 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRatingStars(s)}
                  className="text-3xl transition-transform hover:scale-110"
                  style={{ color: s <= ratingStars ? "#C9A84C" : "#333" }}
                >
                  {s <= ratingStars ? "★" : "☆"}
                </button>
              ))}
            </div>

            <textarea
              value={ratingReview}
              onChange={(e) => setRatingReview(e.target.value)}
              rows={3}
              placeholder="Comentário (opcional)..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white placeholder:text-white/30 focus:border-[#C9A84C] focus:outline-none"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setRatingDialogOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60"
              >
                Cancelar
              </button>
              <button
                onClick={submitRating}
                disabled={savingRating || ratingStars < 1}
                className="btn-premium-red disabled:opacity-50"
              >
                {savingRating ? "Enviando..." : "Enviar Avaliação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
