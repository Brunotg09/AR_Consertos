"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { endOfDay, format, startOfDay, subDays, subMonths, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import dynamic from "next/dynamic";
import {
  Calendar,
  DollarSign,
  Download,
  FileJson,
  FileSpreadsheet,
  Package,
  ShoppingBag,
  TrendingUp,
  Wrench,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const RelatoriosCharts = dynamic(
  () => import("@/components/RelatoriosCharts").then((mod) => mod.RelatoriosCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-6">
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
            </div>
          </div>
        ))}
      </div>
    ),
  }
);

type PeriodOption = "today" | "yesterday" | "week" | "month" | "quarter" | "year" | "custom";

interface RevenueData {
  date: string;
  convencional: number;
  inverter: number;
  produtos: number;
  total: number;
}

interface OrderData {
  id: string;
  total: number;
  status: string;
  created_at: string;
  cliente_id: number;
}

interface OrderItemData {
  id: number;
  order_id: string;
  item_type: string;
  service_type: string | null;
  item_name: string;
  price: number;
  quantity: number;
  payment_status: string;
}

interface TopService {
  name: string;
  count: number;
  revenue: number;
}

interface BackupData {
  profiles: unknown[];
  clientes: unknown[];
  products: unknown[];
  orders: unknown[];
  order_items: unknown[];
  exported_at: string;
  version: string;
}

const STATUS_COLORS: Record<string, string> = {
  pendente: "#EAB308",
  confirmado: "#3B82F6",
  em_andamento: "#8B5CF6",
  concluido: "#22C55E",
  cancelado: "#EF4444",
};

export default function RelatoriosPage() {
  const [period, setPeriod] = useState<PeriodOption>("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [totals, setTotals] = useState({
    convencional: 0,
    inverter: 0,
    produtos: 0,
    total: 0,
    recebida: 0,
    pendente: 0,
  });
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemData[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{ name: string; value: number; color: string }[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);
  const [partnerCommissionData, setPartnerCommissionData] = useState({
    totalComissao: 0,
    totalParceiros: 0,
    receitaPropria: 0,
    receitaParceiros: 0,
    osParceiroCount: 0,
  });

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
      case "custom":
        if (customStartDate && customEndDate) {
          start = startOfDay(new Date(customStartDate));
          return { start, end: endOfDay(new Date(customEndDate)) };
        }
        start = startOfDay(subMonths(now, 1));
        break;
      default:
        start = startOfDay(subMonths(now, 1));
        break;
    }

    return { start, end };
  }, [period, customStartDate, customEndDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      const { data: ordersData } = await supabase
        .from("orders")
        .select(
          `
          id,
          total,
          status,
          created_at,
          cliente_id
        `
        )
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      const { data: itemsData } = await supabase
        .from("order_items")
        .select(
          `
          id,
          order_id,
          item_type,
          service_type,
          item_name,
          price,
          quantity,
          payment_status
        `
        );

      const filteredOrders = (ordersData || []).filter((o: OrderData) => {
        if (statusFilter !== "all" && o.status !== statusFilter) return false;
        if (statusFilter === "all" && o.status === "cancelado") return false;
        return true;
      });

      const filteredOrderIds = new Set(filteredOrders.map((o: OrderData) => o.id));
      const filteredItems = (itemsData || []).filter((item: OrderItemData) => {
        if (!filteredOrderIds.has(item.order_id)) return false;
        if (typeFilter === "convencional" && !(item.item_type === "servico" && item.service_type === "convencional")) return false;
        if (typeFilter === "inverter" && !(item.item_type === "servico" && item.service_type === "inverter")) return false;
        if (typeFilter === "produtos" && item.item_type !== "produto") return false;
        return true;
      });

      setOrders(filteredOrders);
      setOrderItems(filteredItems);
      setOrderCount(filteredOrders.length);

      const dailyRevenue: Record<string, RevenueData> = {};

      filteredOrders.forEach((order: OrderData) => {
        const dateKey = format(new Date(order.created_at), "dd/MM");
        if (!dailyRevenue[dateKey]) {
          dailyRevenue[dateKey] = {
            date: dateKey,
            convencional: 0,
            inverter: 0,
            produtos: 0,
            total: 0,
          };
        }
        dailyRevenue[dateKey].total += Number(order.total) || 0;
      });

      filteredItems.forEach((item: OrderItemData) => {
        const order = filteredOrders.find((o: OrderData) => o.id === item.order_id);
        if (!order) return;

        const dateKey = format(new Date(order.created_at), "dd/MM");
        if (!dailyRevenue[dateKey]) return;

        const amount = Number(item.price || 0) * (item.quantity || 1);

        if (item.item_type === "servico") {
          if (item.service_type === "inverter") {
            dailyRevenue[dateKey].inverter += amount;
          } else {
            dailyRevenue[dateKey].convencional += amount;
          }
        } else {
          dailyRevenue[dateKey].produtos += amount;
        }
      });

      const sortedRevenue = Object.values(dailyRevenue).sort((a, b) => {
        const [dA, mA] = a.date.split("/").map(Number);
        const [dB, mB] = b.date.split("/").map(Number);
        if (mA !== mB) return mA - mB;
        return dA - dB;
      });
      setRevenueData(sortedRevenue);

      let totalConvencional = 0;
      let totalInverter = 0;
      let totalProdutos = 0;
      const serviceCount: Record<string, { count: number; revenue: number }> = {};
      const statusCounts: Record<string, number> = {};

      filteredOrders.forEach((order: OrderData) => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });

      filteredItems.forEach((item: OrderItemData) => {
        const amount = Number(item.price || 0) * (item.quantity || 1);
        if (item.item_type === "servico") {
          if (item.service_type === "inverter") {
            totalInverter += amount;
          } else {
            totalConvencional += amount;
          }
          const key = item.item_name || "Serviço";
          if (!serviceCount[key]) serviceCount[key] = { count: 0, revenue: 0 };
          serviceCount[key].count += item.quantity || 1;
          serviceCount[key].revenue += amount;
        } else {
          totalProdutos += amount;
          const key = item.item_name || "Produto";
          if (!serviceCount[key]) serviceCount[key] = { count: 0, revenue: 0 };
          serviceCount[key].count += item.quantity || 1;
          serviceCount[key].revenue += amount;
        }
      });

      const grandTotal = totalConvencional + totalInverter + totalProdutos;
      setAvgTicket(filteredOrders.length > 0 ? grandTotal / filteredOrders.length : 0);

      // Fetch completed service_orders for partner commission data
      const { data: soData } = await supabase
        .from("service_orders")
        .select("id, total, commission_value, partner_value, status, partner_id, completed_at")
        .eq("status", "completed")
        .gte("completed_at", start.toISOString())
        .lte("completed_at", end.toISOString());

      const soList = soData || [];
      const totalComissao = soList.reduce((sum, so) => sum + (Number(so.commission_value) || 0), 0);
      const totalParceirosVal = soList.reduce((sum, so) => sum + (Number(so.partner_value) || 0), 0);
      const receitaParceiros = soList.reduce((sum, so) => sum + (Number(so.total) || 0), 0);
      const receitaPropria = grandTotal - receitaParceiros;

      setPartnerCommissionData({
        totalComissao,
        totalParceiros: totalParceirosVal,
        receitaPropria: Math.max(0, receitaPropria),
        receitaParceiros,
        osParceiroCount: soList.length,
      });

      // Receita Recebida: pedidos concluídos
      const recebida = filteredOrders
        .filter((o: OrderData) => o.status === "concluido")
        .reduce((sum: number, o: OrderData) => sum + Number(o.total || 0), 0);

      // Receita Pendente: pedientes, confirmados ou em andamento
      const pendente = filteredOrders
        .filter((o: OrderData) => o.status === "pendente" || o.status === "confirmado" || o.status === "em_andamento")
        .reduce((sum: number, o: OrderData) => sum + Number(o.total || 0), 0);

      setTotals({
        convencional: totalConvencional,
        inverter: totalInverter,
        produtos: totalProdutos,
        total: grandTotal,
        recebida,
        pendente,
      });

      setStatusBreakdown(
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

      setTopServices(
        Object.entries(serviceCount)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      );
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [getDateRange, statusFilter, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPeriodLabel = () => {
    const labels: Record<PeriodOption, string> = {
      today: "Hoje",
      yesterday: "Ontem",
      week: "Últimos 7 Dias",
      month: "Último Mês",
      quarter: "Último Trimestre",
      year: "Último Ano",
      custom: customStartDate && customEndDate
        ? `${format(new Date(customStartDate), "dd/MM/yyyy")} - ${format(new Date(customEndDate), "dd/MM/yyyy")}`
        : "Personalizado",
    };
    return labels[period];
  };

  const chartDataForPie = [
    { name: "Convencional", value: totals.convencional },
    { name: "Inverter", value: totals.inverter },
    { name: "Produtos", value: totals.produtos },
  ];

  const exportJSON = async () => {
    setExporting(true);
    try {
      const [profiles, clientes, products, ordersData, itemsData] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("clientes").select("*"),
        supabase.from("products").select("*"),
        supabase.from("orders").select("*"),
        supabase.from("order_items").select("*"),
      ]);

      const backup: BackupData = {
        profiles: profiles.data || [],
        clientes: clientes.data || [],
        products: products.data || [],
        orders: ordersData.data || [],
        order_items: itemsData.data || [],
        exported_at: new Date().toISOString(),
        version: "1.0",
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arconsertos-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = autoTableModule.default;
    const doc = new jsPDF();
    const margin = 15;

    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("A.R CONSERTO - Relatório", margin, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${getPeriodLabel()}`, margin, 22);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, margin, 28);

    let y = 45;
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO DO PERÍODO", margin, y);
    y += 10;

    const summaryData = [
      ["Receita Recebida", formatCurrency(totals.recebida)],
      ["Receita Pendente", formatCurrency(totals.pendente)],
      ["Total", formatCurrency(totals.total)],
      ["", ""],
      ["Convencional", formatCurrency(totals.convencional)],
      ["Inverter", formatCurrency(totals.inverter)],
      ["Produtos", formatCurrency(totals.produtos)],
      ["", ""],
      ["Pedidos", String(orderCount)],
      ["Ticket Médio", formatCurrency(avgTicket)],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Categoria", "Valor"]],
      body: summaryData,
      theme: "striped",
      headStyles: { fillColor: [227, 6, 19], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable?.finalY || y + 30;
    y += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("FATURAMENTO DIÁRIO", margin, y);
    y += 5;

    const dailyData = revenueData.slice(-14).map((d) => [
      d.date,
      formatCurrency(d.convencional),
      formatCurrency(d.inverter),
      formatCurrency(d.produtos),
      formatCurrency(d.total),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Data", "Convencional", "Inverter", "Produtos", "Total"]],
      body: dailyData,
      theme: "grid",
      headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      margin: { left: margin, right: margin },
    });

    doc.save(`relatorio-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportCSV = () => {
    const headers = ["Data", "Convencional", "Inverter", "Produtos", "Total"];
    const rows = revenueData.map((d) => [
      d.date,
      d.convencional.toFixed(2),
      d.inverter.toFixed(2),
      d.produtos.toFixed(2),
      d.total.toFixed(2),
    ]);

    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-white">Relatórios</h1>
          <p className="mt-1 text-sm text-white/50">Análise avançada de faturamento e desempenho</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-white/50" />
          <span className="text-sm font-medium text-white/70">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3">
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
              <SelectItem value="custom" className="text-white">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {period === "custom" && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              />
              <span className="text-white/50">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              />
            </div>
          )}

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 rounded-xl border-white/10 bg-white/[0.02] text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="all" className="text-white">Todos Status</SelectItem>
              <SelectItem value="pendente" className="text-white">Pendente</SelectItem>
              <SelectItem value="confirmado" className="text-white">Confirmado</SelectItem>
              <SelectItem value="em_andamento" className="text-white">Em Andamento</SelectItem>
              <SelectItem value="concluido" className="text-white">Concluído</SelectItem>
              <SelectItem value="cancelado" className="text-white">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 rounded-xl border-white/10 bg-white/[0.02] text-white">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="all" className="text-white">Todos Tipos</SelectItem>
              <SelectItem value="convencional" className="text-white">Convencional</SelectItem>
              <SelectItem value="inverter" className="text-white">Inverter</SelectItem>
              <SelectItem value="produtos" className="text-white">Produtos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E30613]/10">
              <ShoppingBag className="h-4 w-4 text-[#E30613]" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{orderCount}</p>
              <p className="text-[10px] text-white/50">Pedidos</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{formatCurrency(avgTicket)}</p>
              <p className="text-[10px] text-white/50">Ticket Médio</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-500">{formatCurrency(totals.recebida)}</p>
              <p className="text-[10px] text-white/50">Recebido</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10">
              <Activity className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-500">{formatCurrency(totals.pendente)}</p>
              <p className="text-[10px] text-white/50">Pendente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid gap-4 grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E30613]/10">
              <Wrench className="h-4 w-4 text-[#E30613]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#E30613]">{formatCurrency(totals.convencional)}</p>
              <p className="text-[10px] text-white/50">Convencional</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B5CF6]/10">
              <Activity className="h-4 w-4 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#8B5CF6]">{formatCurrency(totals.inverter)}</p>
              <p className="text-[10px] text-white/50">Inverter</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C9A84C]/10">
              <Package className="h-4 w-4 text-[#C9A84C]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#C9A84C]">{formatCurrency(totals.produtos)}</p>
              <p className="text-[10px] text-white/50">Produtos</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-500">{formatCurrency(totals.total)}</p>
              <p className="text-[10px] text-white/50">Total Geral</p>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Commission Summary */}
      {partnerCommissionData.osParceiroCount > 0 && (
        <div className="rounded-2xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 p-6">
          <h2 className="mb-4 font-montserrat text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#8B5CF6]" /> Comissões de Parceiros
          </h2>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-white/50">Receita Própria</p>
              <p className="text-lg font-bold text-white">{formatCurrency(partnerCommissionData.receitaPropria)}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Receita de Parceiros</p>
              <p className="text-lg font-bold text-[#8B5CF6]">{formatCurrency(partnerCommissionData.receitaParceiros)}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Comissão Total (nosso corte)</p>
              <p className="text-lg font-bold text-[#C9A84C]">{formatCurrency(partnerCommissionData.totalComissao)}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Valor Líquido a Parceiros</p>
              <p className="text-lg font-bold text-[#22c55e]">{formatCurrency(partnerCommissionData.totalParceiros)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/40">{partnerCommissionData.osParceiroCount} OSs de parceiros concluídas no período</p>
        </div>
      )}

      {/* Charts */}
      <RelatoriosCharts
        chartDataForPie={chartDataForPie}
        revenueData={revenueData}
        statusBreakdown={statusBreakdown}
        totals={totals}
        loading={loading}
        formatCurrency={formatCurrency}
      />

      {/* Top Services */}
      {topServices.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-6">
          <h2 className="mb-4 font-montserrat text-lg font-bold text-white">
            Top Serviços / Produtos
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="pb-3 text-xs font-medium text-white/50">#</th>
                  <th className="pb-3 text-xs font-medium text-white/50">Nome</th>
                  <th className="pb-3 text-xs font-medium text-white/50">Qtd Vendida</th>
                  <th className="pb-3 text-xs font-medium text-white/50">Receita</th>
                  <th className="pb-3 text-xs font-medium text-white/50">% do Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {topServices.map((service, idx) => (
                  <tr key={service.name} className="group hover:bg-white/[0.02]">
                    <td className="py-3 text-sm text-white/50">{idx + 1}</td>
                    <td className="py-3 text-sm font-medium text-white">{service.name}</td>
                    <td className="py-3 text-sm text-white/70">{service.count}</td>
                    <td className="py-3 text-sm font-medium text-green-400">{formatCurrency(service.revenue)}</td>
                    <td className="py-3 text-sm text-white/70">
                      {totals.total > 0 ? ((service.revenue / totals.total) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-6">
        <h2 className="mb-4 font-montserrat text-lg font-bold text-white">Exportar Dados</h2>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <button
            onClick={exportJSON}
            disabled={exporting}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-white transition-colors hover:bg-white/[0.04]"
          >
            <FileJson className="h-5 w-5 text-blue-400" />
            <div className="text-left">
              <p className="font-medium">Backup Completo</p>
              <p className="text-xs text-white/50">Exportar todos os dados (JSON)</p>
            </div>
          </button>

          <button
            onClick={exportPDF}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-white transition-colors hover:bg-white/[0.04]"
          >
            <Download className="h-5 w-5 text-red-400" />
            <div className="text-left">
              <p className="font-medium">Relatório PDF</p>
              <p className="text-xs text-white/50">Faturamento detalhado</p>
            </div>
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-white transition-colors hover:bg-white/[0.04]"
          >
            <FileSpreadsheet className="h-5 w-5 text-green-400" />
            <div className="text-left">
              <p className="font-medium">Exportar CSV</p>
              <p className="text-xs text-white/50">Planilha para Excel</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
