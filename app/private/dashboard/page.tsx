"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Clock,
  DollarSign,
  Users,
  Package,
  Settings,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { supabase, withTimeout } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KPIData {
  pedidosHoje: number;
  pedidosPendentes: number;
  receitaTotal: number;
  totalClientes: number;
  receitaConvencional: number;
  receitaInverter: number;
  receitaProdutos: number;
}

interface RecentOrder {
  id: string;
  created_at: string;
  total: number;
  status: string;
}

const COLORS = {
  convencional: "#C9A84C",
  inverter: "#8B5CF6",
  produtos: "#E30613",
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [ordersResult, orderItemsResult, clientsResult] = await Promise.allSettled([
        withTimeout(() => supabase.from("orders").select("id, created_at, total, status"), 8000, { data: [], error: null }),
        withTimeout(() => supabase.from("order_items").select("item_type, service_type, price, quantity"), 8000, { data: [], error: null }),
        withTimeout(() => supabase.from("clientes").select("*", { count: "exact", head: true }), 8000, { data: null, error: null, count: 0 }),
      ]);

      const orders = ordersResult.status === "fulfilled" ? ordersResult.value.data : [];
      const orderItems = orderItemsResult.status === "fulfilled" ? orderItemsResult.value.data : [];
      const clientsCount = clientsResult.status === "fulfilled" ? clientsResult.value.count : 0;

      if (orders && orderItems) {
        const pedidosHoje = orders.filter(
          (o) => new Date(o.created_at) >= today
        ).length;

        const pedidosPendentes = orders.filter(
          (o) => o.status === "pendente" || o.status === "confirmado" || o.status === "em_andamento"
        ).length;

        const receitaTotal = orders
          .filter((o) => o.status !== "cancelado")
          .reduce((sum, o) => sum + Number(o.total || 0), 0);

        let receitaConvencional = 0;
        let receitaInverter = 0;
        let receitaProdutos = 0;

        orderItems.forEach((item) => {
          const itemTotal = Number(item.price || 0) * (item.quantity || 1);
          if (item.item_type === "servico") {
            if (item.service_type === "convencional") {
              receitaConvencional += itemTotal;
            } else if (item.service_type === "inverter") {
              receitaInverter += itemTotal;
            }
          } else if (item.item_type === "produto") {
            receitaProdutos += itemTotal;
          }
        });

        setKpiData({
          pedidosHoje,
          pedidosPendentes,
          receitaTotal,
          totalClientes: clientsCount || 0,
          receitaConvencional,
          receitaInverter,
          receitaProdutos,
        });

        setChartData([
          { name: "Convencional", value: receitaConvencional },
          { name: "Inverter", value: receitaInverter },
          { name: "Produtos", value: receitaProdutos },
        ]);

        const sorted = [...orders]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        setRecentOrders(sorted);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendente: "Pendente",
      confirmado: "Confirmado",
      em_andamento: "Em Andamento",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendente: "bg-yellow-500/20 text-yellow-400",
      confirmado: "bg-blue-500/20 text-blue-400",
      em_andamento: "bg-purple-500/20 text-purple-400",
      concluido: "bg-green-500/20 text-green-400",
      cancelado: "bg-red-500/20 text-red-400",
    };
    return colors[status] || "bg-gray-500/20 text-gray-400";
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E30613] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-white/50">Visão geral do seu negócio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KPICard
          title="Pedidos Hoje"
          value={kpiData?.pedidosHoje ?? 0}
          icon={ShoppingCart}
          color="#E30613"
        />
        <KPICard
          title="Pedidos Pendentes"
          value={kpiData?.pedidosPendentes ?? 0}
          icon={Clock}
          color="#C9A84C"
        />
        <KPICard
          title="Receita Total"
          value={formatCurrency(kpiData?.receitaTotal ?? 0)}
          icon={DollarSign}
          color="#22C55E"
        />
        <KPICard
          title="Total de Clientes"
          value={kpiData?.totalClientes ?? 0}
          icon={Users}
          color="#8B5CF6"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Segment - Pie Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between sm:mb-6">
            <div>
              <h2 className="font-montserrat text-base font-bold text-white sm:text-lg">
                Faturamento por Segmento
              </h2>
              <p className="text-xs text-white/50 sm:text-sm">Distribuição da receita</p>
            </div>
            <TrendingUp className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                <Cell fill={COLORS.convencional} />
                <Cell fill={COLORS.inverter} />
                <Cell fill={COLORS.produtos} />
              </Pie>
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                }}
              />
              <Legend
                formatter={(value) => <span className="text-white/70">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Segment Details */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center border-t border-white/[0.06] pt-4 sm:gap-4">
            <div>
              <div className="mx-auto mb-1 h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.convencional }} />
              <p className="text-[10px] text-white/50 sm:text-xs">Convencional</p>
              <p className="text-xs font-bold text-white sm:text-base">{formatCurrency(kpiData?.receitaConvencional ?? 0)}</p>
            </div>
            <div>
              <div className="mx-auto mb-1 h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.inverter }} />
              <p className="text-[10px] text-white/50 sm:text-xs">Inverter</p>
              <p className="text-xs font-bold text-white sm:text-base">{formatCurrency(kpiData?.receitaInverter ?? 0)}</p>
            </div>
            <div>
              <div className="mx-auto mb-1 h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.produtos }} />
              <p className="text-[10px] text-white/50 sm:text-xs">Produtos</p>
              <p className="text-xs font-bold text-white sm:text-base">{formatCurrency(kpiData?.receitaProdutos ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Revenue Bar Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="font-montserrat text-base font-bold text-white sm:text-lg">
              Comparativo de Receita
            </h2>
            <p className="text-xs text-white/50 sm:text-sm">Faturamento por categoria</p>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} width={80} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                <Cell fill={COLORS.convencional} />
                <Cell fill={COLORS.inverter} />
                <Cell fill={COLORS.produtos} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-montserrat text-lg font-bold text-white">
              Últimos Pedidos
            </h2>
            <p className="text-sm text-white/50">Pedidos mais recentes</p>
          </div>
          <Link
            href="/private/pedidos"
            className="flex items-center gap-1 text-sm text-[#E30613] transition-colors hover:text-[#E30613]/80"
          >
            Ver todos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] text-left">
                <th className="pb-3 text-xs font-medium text-white/50">ID</th>
                <th className="pb-3 text-xs font-medium text-white/50">Data</th>
                <th className="pb-3 text-xs font-medium text-white/50">Total</th>
                <th className="pb-3 text-xs font-medium text-white/50">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {recentOrders.map((order) => (
                <tr key={order.id} className="group hover:bg-white/[0.02]">
                  <td className="py-3 font-mono text-xs text-white/70">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="py-3 text-sm text-white/70">
                    {format(new Date(order.created_at), "dd MMM yyyy", { locale: ptBR })}
                  </td>
                  <td className="py-3 text-sm font-medium text-white">
                    {formatCurrency(Number(order.total))}
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-white/50">
                    Nenhum pedido encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/private/estoque"
          className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4 transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E30613]/10">
            <Package className="h-5 w-5 text-[#E30613]" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Gerenciar Estoque</p>
            <p className="text-xs text-white/50">Produtos e inventário</p>
          </div>
        </Link>
        <Link
          href="/private/clientes"
          className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4 transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/10">
            <Users className="h-5 w-5 text-[#8B5CF6]" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Gerenciar Clientes</p>
            <p className="text-xs text-white/50">Cadastro e vínculos</p>
          </div>
        </Link>
        <Link
          href="/private/pedidos"
          className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4 transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C9A84C]/10">
            <ShoppingCart className="h-5 w-5 text-[#C9A84C]" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Ver Pedidos</p>
            <p className="text-xs text-white/50">Ordens de serviço</p>
          </div>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4 transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <Settings className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Ver Site</p>
            <p className="text-xs text-white/50">Área pública</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-3 sm:p-5">
      <div className="flex items-center justify-between">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg sm:h-10 sm:w-10"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color }} />
        </div>
      </div>
      <div className="mt-2 sm:mt-3">
        <p className="text-lg font-bold text-white sm:text-2xl">{value}</p>
        <p className="text-[10px] text-white/50 sm:text-sm">{title}</p>
      </div>
    </div>
  );
}
