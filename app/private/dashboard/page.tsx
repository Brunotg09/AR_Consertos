"use client";

import { useState, useEffect, useCallback } from "react";
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
  Calendar,
  Activity,
  Wrench,
} from "lucide-react";
import dynamic from "next/dynamic";
import { supabase, withTimeout } from "@/lib/supabase";

const DashboardCharts = dynamic(
  () => import("@/components/DashboardCharts").then((mod) => mod.DashboardCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-4 sm:p-6">
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
            </div>
          </div>
        ))}
      </div>
    ),
  }
);
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PeriodOption = "today" | "yesterday" | "week" | "month" | "quarter" | "year";

interface KPIData {
  pedidosHoje: number;
  pedidosPendentes: number;
  receitaRecebida: number;
  receitaPendente: number;
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

interface DailyRevenue {
  date: string;
  convencional: number;
  inverter: number;
  produtos: number;
  total: number;
}

const STATUS_COLORS: Record<string, string> = {
  pendente: "#EAB308",
  confirmado: "#3B82F6",
  em_andamento: "#8B5CF6",
  concluido: "#22C55E",
  cancelado: "#EF4444",
};

export default function AdminDashboard() {
  const [period, setPeriod] = useState<PeriodOption>("month");
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number; color: string }[]>([]);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let start: Date;
    const end = endOfDay(now);

    switch (period) {
      case "today":
        start = startOfDay(now);
        break;
      case "yesterday":
        start = startOfDay(subDays(now, 1));
        break;
      case "week":
        start = startOfDay(subDays(now, 7));
        break;
      case "month":
        start = startOfDay(subMonths(now, 1));
        break;
      case "quarter":
        start = startOfDay(subMonths(now, 3));
        break;
      case "year":
        start = startOfDay(subYears(now, 1));
        break;
      default:
        start = startOfDay(subMonths(now, 1));
        break;
    }

    return { start, end };
  }, [period]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      const [ordersResult, orderItemsResult, clientsResult] = await Promise.allSettled([
        withTimeout(() =>
          supabase
            .from("orders")
            .select("id, created_at, total, status")
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString()),
          8000,
          { data: [], error: null }
        ),
        withTimeout(() =>
          supabase.from("order_items").select("item_type, service_type, item_name, price, quantity, order_id"),
          8000,
          { data: [], error: null }
        ),
        withTimeout(() =>
          supabase.from("clientes").select("*", { count: "exact", head: true }),
          8000,
          { data: null, error: null, count: 0 }
        ),
      ]);

      const orders = ordersResult.status === "fulfilled" ? ordersResult.value.data || [] : [];
      const orderItems = orderItemsResult.status === "fulfilled" ? orderItemsResult.value.data || [] : [];
      const clientsCount = clientsResult.status === "fulfilled" ? clientsResult.value.count : 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pedidosHoje = orders.filter(
        (o: { created_at: string }) => new Date(o.created_at) >= today
      ).length;

      const pedidosPendentes = orders.filter(
        (o: { status: string }) => o.status === "pendente" || o.status === "confirmado" || o.status === "em_andamento"
      ).length;

      // Receita Recebida: pedidos concluídos
      const receitaRecebida = orders
        .filter((o: { status: string }) => o.status === "concluido")
        .reduce((sum: number, o: { total: number }) => sum + Number(o.total || 0), 0);

      // Receita Pendente: pedidos pendentes, confirmados ou em andamento
      const receitaPendente = orders
        .filter((o: { status: string }) => o.status === "pendente" || o.status === "confirmado" || o.status === "em_andamento")
        .reduce((sum: number, o: { total: number }) => sum + Number(o.total || 0), 0);

      // Receita Total: tudo que não foi cancelado
      const receitaTotal = orders
        .filter((o: { status: string }) => o.status !== "cancelado")
        .reduce((sum: number, o: { total: number }) => sum + Number(o.total || 0), 0);

      let receitaConvencional = 0;
      let receitaInverter = 0;
      let receitaProdutos = 0;
      const dailyRev: Record<string, DailyRevenue> = {};
      const statusCounts: Record<string, number> = {};

      orders.forEach((order: { status: string; created_at: string }) => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        const dateKey = format(new Date(order.created_at), "dd/MM");
        if (!dailyRev[dateKey]) {
          dailyRev[dateKey] = { date: dateKey, convencional: 0, inverter: 0, produtos: 0, total: 0 };
        }
      });

      orderItems.forEach((item: { order_id: string; item_type: string; service_type: string | null; price: number; quantity: number }) => {
        const order = orders.find((o: { id: string }) => o.id === item.order_id);
        if (!order) return;

        const itemTotal = Number(item.price || 0) * (item.quantity || 1);

        if (item.item_type === "servico") {
          if (item.service_type === "inverter") {
            receitaInverter += itemTotal;
            const dateKey = format(new Date(order.created_at), "dd/MM");
            if (dailyRev[dateKey]) dailyRev[dateKey].inverter += itemTotal;
          } else {
            receitaConvencional += itemTotal;
            const dateKey = format(new Date(order.created_at), "dd/MM");
            if (dailyRev[dateKey]) dailyRev[dateKey].convencional += itemTotal;
          }
        } else if (item.item_type === "produto") {
          receitaProdutos += itemTotal;
          const dateKey = format(new Date(order.created_at), "dd/MM");
          if (dailyRev[dateKey]) dailyRev[dateKey].produtos += itemTotal;
        }
      });

      orders.forEach((order: { created_at: string; total: number }) => {
        const dateKey = format(new Date(order.created_at), "dd/MM");
        if (dailyRev[dateKey]) dailyRev[dateKey].total += Number(order.total || 0);
      });

      setKpiData({
        pedidosHoje,
        pedidosPendentes,
        receitaRecebida,
        receitaPendente,
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

      setDailyRevenue(
        Object.values(dailyRev).sort((a, b) => {
          const [dA, mA] = a.date.split("/").map(Number);
          const [dB, mB] = b.date.split("/").map(Number);
          if (mA !== mB) return mA - mB;
          return dA - dB;
        })
      );

      setStatusData(
        Object.entries(statusCounts).map(([status, count]) => ({
          name: status === "pendente" ? "Pendente" :
                status === "confirmado" ? "Confirmado" :
                status === "em_andamento" ? "Em Andamento" :
                status === "concluido" ? "Concluído" :
                status === "cancelado" ? "Cancelado" : status,
          value: count,
          color: STATUS_COLORS[status] || "#666",
        }))
      );

      const sorted = [...orders]
        .sort((a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      setRecentOrders(sorted);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-white/50">Visão geral do seu negócio</p>
        </div>
        <Select value={period} onValueChange={(value) => setPeriod(value as PeriodOption)}>
          <SelectTrigger className="w-44 rounded-xl border-white/10 bg-white/[0.02] text-white">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10">
            <SelectItem value="today" className="text-white">Hoje</SelectItem>
            <SelectItem value="yesterday" className="text-white">Ontem</SelectItem>
            <SelectItem value="week" className="text-white">Últimos 7 Dias</SelectItem>
            <SelectItem value="month" className="text-white">Último Mês</SelectItem>
            <SelectItem value="quarter" className="text-white">Último Trimestre</SelectItem>
            <SelectItem value="year" className="text-white">Último Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <KPICard
          title="Pedidos no Período"
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
          title="Receita Recebida"
          value={formatCurrency(kpiData?.receitaRecebida ?? 0)}
          icon={DollarSign}
          color="#22C55E"
        />
        <KPICard
          title="Receita Pendente"
          value={formatCurrency(kpiData?.receitaPendente ?? 0)}
          icon={Activity}
          color="#EAB308"
        />
        <KPICard
          title="Receita Total"
          value={formatCurrency(kpiData?.receitaTotal ?? 0)}
          icon={TrendingUp}
          color="#8B5CF6"
        />
      </div>

      {/* Charts */}
      <DashboardCharts
        chartData={chartData}
        dailyRevenue={dailyRevenue}
        statusData={statusData}
        kpiData={kpiData}
        formatCurrency={formatCurrency}
      />

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
          href="/private/relatorios"
          className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4 transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Ver Relatórios</p>
            <p className="text-xs text-white/50">Análises avançadas</p>
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
