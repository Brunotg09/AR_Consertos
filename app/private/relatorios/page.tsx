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
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Calendar,
  DollarSign,
  Download,
  FileJson,
  FileSpreadsheet,
  Package,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PeriodOption = "week" | "month" | "quarter" | "year" | "custom";

interface RevenueData {
  date: string;
  convencional: number;
  inverter: number;
  produtos: number;
  total: number;
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

export default function RelatoriosPage() {
  const [period, setPeriod] = useState<PeriodOption>("month");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [totals, setTotals] = useState({
    convencional: 0,
    inverter: 0,
    produtos: 0,
    total: 0,
  });
  const [orders, setOrders] = useState<unknown[]>([]);
  const [orderItems, setOrderItems] = useState<unknown[]>([]);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let start: Date;
    const end = endOfDay(now);

    switch (period) {
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
        .lte("created_at", end.toISOString())
        .neq("status", "cancelado");

      const { data: itemsData } = await supabase
        .from("order_items")
        .select(
          `
          id,
          order_id,
          item_type,
          service_type,
          price,
          quantity,
          payment_status,
          created_at
        `
        );

      setOrders(ordersData || []);
      setOrderItems(itemsData || []);

      // Calculate revenue by day
      const dailyRevenue: Record<string, RevenueData> = {};

      (ordersData || []).forEach((order: { created_at: string; total: number }) => {
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

      // Calculate item revenue by type
      (itemsData || []).forEach((item: {
        order_id: string;
        item_type: string;
        service_type: string | null;
        price: number;
        quantity: number;
      }) => {
        const order = ordersData?.find((o: { id: string }) => o.id === item.order_id) as { created_at: string } | undefined;
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

      setRevenueData(Object.values(dailyRevenue).reverse());

      // Calculate totals
      let totalConvencional = 0;
      let totalInverter = 0;
      let totalProdutos = 0;

      (itemsData || []).forEach((item: {
        item_type: string;
        service_type: string | null;
        price: number;
        quantity: number;
      }) => {
        const amount = Number(item.price || 0) * (item.quantity || 1);
        if (item.item_type === "servico") {
          if (item.service_type === "inverter") {
            totalInverter += amount;
          } else {
            totalConvencional += amount;
          }
        } else {
          totalProdutos += amount;
        }
      });

      setTotals({
        convencional: totalConvencional,
        inverter: totalInverter,
        produtos: totalProdutos,
        total: totalConvencional + totalInverter + totalProdutos,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

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
      week: "Última Semana",
      month: "Último Mês",
      quarter: "Último Trimestre",
      year: "Último Ano",
      custom: "Personalizado",
    };
    return labels[period];
  };

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
      console.error("Error exporting JSON:", error);
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const margin = 15;

    // Header
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

    // Totals
    let y = 45;
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO DO PERÍODO", margin, y);
    y += 10;

    const summaryData = [
      ["Convencional", formatCurrency(totals.convencional)],
      ["Inverter", formatCurrency(totals.inverter)],
      ["Produtos", formatCurrency(totals.produtos)],
      ["Total", formatCurrency(totals.total)],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Categoria", "Faturamento"]],
      body: summaryData,
      theme: "striped",
      headStyles: { fillColor: [227, 6, 19], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });

    // Daily breakdown
    // @ts-ignore
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
          <p className="mt-1 text-sm text-white/50">Análise de faturamento e backups</p>
        </div>

        <div className="flex gap-2">
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as PeriodOption)}
          >
            <SelectTrigger className="w-40 rounded-xl border-white/10 bg-white/[0.02] text-white">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="week" className="text-white">Última Semana</SelectItem>
              <SelectItem value="month" className="text-white">Último Mês</SelectItem>
              <SelectItem value="quarter" className="text-white">Último Trimestre</SelectItem>
              <SelectItem value="year" className="text-white">Último Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E30613]/10">
              <Wrench className="h-5 w-5 text-[#E30613]" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{formatCurrency(totals.convencional)}</p>
              <p className="text-xs text-white/50">Convencional</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/10">
              <TrendingUp className="h-5 w-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{formatCurrency(totals.inverter)}</p>
              <p className="text-xs text-white/50">Inverter</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C9A84C]/10">
              <Package className="h-5 w-5 text-[#C9A84C]" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{formatCurrency(totals.produtos)}</p>
              <p className="text-xs text-white/50">Produtos</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{formatCurrency(totals.total)}</p>
              <p className="text-xs text-white/50">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Line Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-6">
          <h2 className="mb-4 font-montserrat text-lg font-bold text-white">
            Evolução de Faturamento
          </h2>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
            </div>
          ) : revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                  }}
                />
                <Legend formatter={(value) => <span className="text-white/70">{value}</span>} />
                <Line
                  type="monotone"
                  dataKey="convencional"
                  stroke="#E30613"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="inverter"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="produtos"
                  stroke="#C9A84C"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-white/50">
              Sem dados para o período
            </div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-6">
          <h2 className="mb-4 font-montserrat text-lg font-bold text-white">
            Comparativo por Categoria
          </h2>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={[
                { name: "Convencional", value: totals.convencional },
                { name: "Inverter", value: totals.inverter },
                { name: "Produtos", value: totals.produtos },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <Cell fill="#E30613" />
                <Cell fill="#8B5CF6" />
                <Cell fill="#C9A84C" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

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
