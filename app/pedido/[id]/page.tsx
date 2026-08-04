"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useFloatingWidget } from "@/components/FloatingWidget";
import {
  CheckCircle,
  Package,
  Wrench,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  ArrowRight,
  Clock,
} from "lucide-react";

interface OrderItem {
  id: number;
  item_type: string;
  item_name: string;
  price: number | null;
  quantity: number;
  scheduled_date: string | null;
  problem_description: string | null;
}

interface Order {
  id: string;
  status: string;
  payment_method: string | null;
  total: number;
  created_at: string;
}

export default function PedidoConfirmacaoPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { trigger } = useFloatingWidget();

  useEffect(() => {
    const fetchOrder = async () => {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", params.id)
        .single();

      if (orderError || !orderData) {
        setLoading(false);
        return;
      }

      const { data: itemsData } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", params.id);

      setOrder(orderData);
      setItems(itemsData || []);
      setLoading(false);
    };
    fetchOrder();
    trigger("thanks");
  }, [params.id, trigger]);

  const paymentIcons: Record<string, React.ReactNode> = {
    dinheiro: <Banknote className="h-4 w-4" />,
    pix: <QrCode className="h-4 w-4" />,
    cartao: <CreditCard className="h-4 w-4" />,
  };

  const statusColors: Record<string, string> = {
    pendente: "#ffaa44",
    confirmado: "#44dd88",
    em_andamento: "#8B5CF6",
    concluido: "#44dd88",
    cancelado: "#ff6b6b",
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-ar-red" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-white">Pedido não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <CheckCircle className="mx-auto h-14 w-14" style={{ color: "#44dd88" }} />
        <h1 className="mt-4 font-bebas text-3xl tracking-wide text-white sm:text-4xl">
          PEDIDO CONFIRMADO
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#888888" }}>
          Seu pedido foi recebido com sucesso
        </p>
      </div>

      <div className="mt-10 space-y-6">
        {/* Número do pedido */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "#888888" }}>
            Número do Pedido
          </span>
          <p className="mt-1 font-mono text-lg font-bold text-white">{order.id.slice(0, 8).toUpperCase()}</p>
          <div
            className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `${statusColors[order.status] || "#888"}18`,
              color: statusColors[order.status] || "#888",
              border: `1px solid ${statusColors[order.status] || "#888"}30`,
            }}
          >
            <Clock className="h-3 w-3" />
            {order.status.replace("_", " ")}
          </div>
        </div>

        {/* Itens */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              {item.item_type === "servico" ? (
                <Wrench className="h-4 w-4 shrink-0" style={{ color: "#E30613" }} />
              ) : (
                <Package className="h-4 w-4 shrink-0" style={{ color: "#C9A84C" }} />
              )}
              <div className="flex-1">
                <span className="text-sm font-medium text-white">{item.item_name}</span>
                {item.scheduled_date && (
                  <div className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: "#888888" }}>
                    <Calendar className="h-3 w-3" />
                    {new Date(item.scheduled_date).toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
              {item.price && (
                <span className="font-oswald text-sm font-bold" style={{ color: "#E30613" }}>
                  R$ {Number(item.price * item.quantity).toFixed(2).replace(".", ",")}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Pagamento */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "#888888" }}>Forma de pagamento</span>
            <div className="flex items-center gap-2 text-sm text-white">
              {paymentIcons[order.payment_method || ""] || <CreditCard className="h-4 w-4" />}
              <span className="capitalize">{order.payment_method}</span>
            </div>
          </div>
          {order.payment_method === "pix" && (
            <div className="mt-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(201,168,76,0.2)", backgroundColor: "rgba(201,168,76,0.05)", color: "#C9A84C" }}>
              Envie o comprovante para o WhatsApp <strong>(79) 99944-6596</strong>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-4">
            <span className="text-sm font-medium text-white">Total</span>
            <span className="font-oswald text-xl font-bold text-white">
              R$ {Number(order.total).toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>

        {/* Instruções */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h3 className="font-montserrat text-sm font-bold text-white">Próximos passos</h3>
          <ul className="mt-3 space-y-2 text-xs" style={{ color: "#a0a0a0" }}>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#44dd88" }} />
              Aguarde nossa equipe confirmar seu pedido via WhatsApp.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#44dd88" }} />
              Para serviços, entraremos em contato para agendar a visita técnica.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#44dd88" }} />
              Para produtos, o envio será feito após confirmação do pagamento.
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Link href="/" className="btn-premium-red flex items-center gap-2">
          Voltar para Início
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
