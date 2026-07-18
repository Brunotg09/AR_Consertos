"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { generateOSPDF, type PDFOrder } from "@/lib/generateOSPDF";
import { ServiceIcon } from "@/components/ServiceIcon";
import {
  Wrench,
  ShoppingCart,
  CheckCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ShieldOff,
  FileText,
  Filter,
  Package,
  Loader2,
} from "lucide-react";

interface OrderItem {
  item_id: number;
  item_type: string;
  item_name: string;
  item_service_type: string | null;
  item_quantity: number;
  item_price: number | null;
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
}

interface Order {
  order_id: string;
  order_status: string;
  order_payment_method: string | null;
  order_total: number;
  order_created_at: string;
  items: OrderItem[];
}

type FilterType = "todos" | "servicos" | "produtos";

export default function HistoricoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("todos");
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
    const { data, error } = await supabase.rpc("get_user_orders_with_items");
    if (error || !data) {
      setLoading(false);
      return;
    }

    // Agrupar por order_id
    const grouped: Record<string, Order> = {};
    for (const row of data as any[]) {
      const oid = row.order_id;
      if (!grouped[oid]) {
        grouped[oid] = {
          order_id: oid,
          order_status: row.order_status,
          order_payment_method: row.order_payment_method,
          order_total: Number(row.order_total),
          order_created_at: row.order_created_at,
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
    const pdfOrder: PDFOrder = {
      order_id: order.order_id,
      order_status: order.order_status,
      order_payment_method: order.order_payment_method,
      order_total: order.order_total,
      order_created_at: order.order_created_at,
      items: order.items,
    };
    generateOSPDF(pdfOrder, clienteName);
  };

  const statusColors: Record<string, string> = {
    pendente: "#ffaa44",
    confirmado: "#44dd88",
    em_andamento: "#8B5CF6",
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

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin" style={{ color: "#E30613" }} />
        <p className="mt-4 text-sm" style={{ color: "#888888" }}>Carregando histórico...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
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
        <div className="mt-8 space-y-8">
          {filteredOrders.map((order) => {
            const totalPaid = order.items.reduce((sum, i) => sum + (i.item_amount_paid || 0), 0);
            const totalPending = order.order_total - totalPaid;

            return (
              <div
                key={order.order_id}
                className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]"
                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
              >
                {/* Card principal do pedido */}
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white">
                          O.S. #{order.order_id.slice(0, 8).toUpperCase()}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: `${statusColors[order.order_status] || "#888"}18`,
                            color: statusColors[order.order_status] || "#888",
                            border: `1px solid ${statusColors[order.order_status] || "#888"}30`,
                          }}
                        >
                          {order.order_status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px]" style={{ color: "#888888" }}>
                        {new Date(order.order_created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-oswald text-xl font-bold text-white">
                        {formatCurrency(order.order_total)}
                      </span>
                      <div className="mt-1 flex items-center gap-2 text-[10px]" style={{ color: "#888888" }}>
                        {totalPaid > 0 && (
                          <span className="flex items-center gap-1" style={{ color: "#44dd88" }}>
                            <CheckCircle className="h-3 w-3" /> Pago {formatCurrency(totalPaid)}
                          </span>
                        )}
                        {totalPending > 0 && (
                          <span className="flex items-center gap-1" style={{ color: "#ffaa44" }}>
                            <Clock className="h-3 w-3" /> Pendente {formatCurrency(totalPending)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleGeneratePDF(order)}
                    className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/70 transition-all hover:bg-white/[0.04] hover:text-white"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Gerar O.S. (PDF)
                  </button>
                </div>

                {/* Sub-cards de itens */}
                <div className="border-t border-white/[0.04] px-5 pb-5 pt-4 space-y-3">
                  {order.items.map((item) => {
                    const isService = item.item_type === "servico";
                    const pg = paymentBadge(item.item_payment_status);
                    const PgIcon = pg.icon;

                    if (isService) {
                      const isInv = item.item_service_type === "inverter";
                      const accent = isInv ? "#8B5CF6" : "#E30613";
                      const completed = !!item.item_completed_at;
                      const warrantyActive = isWarrantyActive(item.item_warranty_expires_at);

                      return (
                        <div
                          key={item.item_id}
                          className="rounded-xl border p-4"
                          style={{
                            borderColor: `${accent}25`,
                            backgroundColor: `${accent}06`,
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}20` }}
                            >
                              <Wrench className="h-5 w-5" style={{ color: accent }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-white">{item.item_name}</span>
                                <span
                                  className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                  style={{ backgroundColor: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}
                                >
                                  {isInv ? "Inverter" : "Convencional"}
                                </span>
                                <span
                                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                  style={{ backgroundColor: `${pg.color}18`, color: pg.color, border: `1px solid ${pg.color}30` }}
                                >
                                  <PgIcon className="h-3 w-3" />
                                  {pg.text}
                                </span>
                              </div>
                              {item.item_problem_description && (
                                <p className="mt-2 text-xs" style={{ color: "#a0a0a0" }}>
                                  <strong style={{ color: "#888888" }}>Problema:</strong> {item.item_problem_description}
                                </p>
                              )}
                              {completed && item.item_diagnosis && (
                                <p className="mt-1 text-xs" style={{ color: "#a0a0a0" }}>
                                  <strong style={{ color: "#888888" }}>Diagnóstico:</strong> {item.item_diagnosis}
                                </p>
                              )}
                              {completed && item.item_completed_at && (
                                <p className="mt-1 text-[10px]" style={{ color: "#888888" }}>
                                  Concluído em {new Date(item.item_completed_at).toLocaleDateString("pt-BR")}
                                </p>
                              )}
                              {completed && item.item_warranty_expires_at && (
                                <div className="mt-2 flex items-center gap-1.5">
                                  {warrantyActive ? (
                                    <>
                                      <ShieldCheck className="h-3.5 w-3.5" style={{ color: "#44dd88" }} />
                                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: "#44dd8818", color: "#44dd88", border: "1px solid #44dd8830" }}>
                                        GARANTIA ATIVA
                                      </span>
                                      <span className="text-[10px]" style={{ color: "#888888" }}>
                                        até {new Date(item.item_warranty_expires_at).toLocaleDateString("pt-BR")}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldOff className="h-3.5 w-3.5" style={{ color: "#ff6b6b" }} />
                                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: "#ff6b6b18", color: "#ff6b6b", border: "1px solid #ff6b6b30" }}>
                                        GARANTIA EXPIRADA
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                              {item.item_scheduled_date && (
                                <p className="mt-1 text-[10px]" style={{ color: "#888888" }}>
                                  Agendado: {new Date(item.item_scheduled_date).toLocaleString("pt-BR")}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Produto
                    return (
                      <div
                        key={item.item_id}
                        className="rounded-xl border p-4"
                        style={{
                          borderColor: "rgba(201,168,76,0.2)",
                          backgroundColor: "rgba(201,168,76,0.04)",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)" }}
                          >
                            <ShoppingCart className="h-5 w-5" style={{ color: "#C9A84C" }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-white">{item.item_name}</span>
                              {item.item_product_category && (
                                <span className="text-[10px]" style={{ color: "#888888" }}>{item.item_product_category}</span>
                              )}
                              <span
                                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                style={{ backgroundColor: "#44dd8818", color: "#44dd88", border: "1px solid #44dd8830" }}
                              >
                                <CheckCircle className="h-3 w-3" />
                                Pago na compra
                              </span>
                            </div>
                            {item.item_product_condition && (
                              <p className="mt-1 text-[10px]" style={{ color: "#888888" }}>
                                Condição: {item.item_product_condition}
                              </p>
                            )}
                            <p className="mt-1 font-oswald text-sm font-bold" style={{ color: "#E30613" }}>
                              {formatCurrency(item.item_price ? item.item_price * item.item_quantity : null)}
                            </p>
                          </div>
                          {item.item_product_images?.[0] && (
                            <img
                              src={item.item_product_images[0]}
                              alt={item.item_name}
                              className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
