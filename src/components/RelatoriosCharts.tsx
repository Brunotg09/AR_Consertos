"use client";

import { memo } from "react";
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
  Line,
  LineChart,
} from "recharts";
import { TrendingUp, Activity, BarChart3, PieChart as PieChartIcon } from "lucide-react";

const COLORS = {
  convencional: "#E30613",
  inverter: "#8B5CF6",
  produtos: "#C9A84C",
};

interface RevenueData {
  date: string;
  convencional: number;
  inverter: number;
  produtos: number;
  total: number;
}

interface RelatoriosChartsProps {
  chartDataForPie: { name: string; value: number }[];
  revenueData: RevenueData[];
  statusBreakdown: { name: string; value: number; color: string }[];
  totals: {
    convencional: number;
    inverter: number;
    produtos: number;
    total: number;
  };
  loading: boolean;
  formatCurrency: (value: number) => string;
}

export const RelatoriosCharts = memo(function RelatoriosCharts({
  chartDataForPie,
  revenueData,
  statusBreakdown,
  totals,
  loading,
  formatCurrency,
}: RelatoriosChartsProps) {
  return (
    <>
      {/* Charts Row 1: Pie + Horizontal Bar */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-montserrat text-lg font-bold text-white">
                Faturamento por Segmento
              </h2>
              <p className="text-xs text-white/50">Distribuição da receita</p>
            </div>
            <PieChartIcon className="h-5 w-5 text-white/30" />
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
            </div>
          ) : totals.total > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={chartDataForPie}
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
                  <Legend formatter={(value) => <span className="text-white/70 text-xs">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center border-t border-white/[0.06] pt-4">
                <div>
                  <div className="mx-auto mb-1 h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.convencional }} />
                  <p className="text-[10px] text-white/50">Convencional</p>
                  <p className="text-xs font-bold text-white">{formatCurrency(totals.convencional)}</p>
                </div>
                <div>
                  <div className="mx-auto mb-1 h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.inverter }} />
                  <p className="text-[10px] text-white/50">Inverter</p>
                  <p className="text-xs font-bold text-white">{formatCurrency(totals.inverter)}</p>
                </div>
                <div>
                  <div className="mx-auto mb-1 h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.produtos }} />
                  <p className="text-[10px] text-white/50">Produtos</p>
                  <p className="text-xs font-bold text-white">{formatCurrency(totals.produtos)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-64 items-center justify-center text-white/50">
              Sem dados para o período
            </div>
          )}
        </div>

        {/* Status Breakdown Pie */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-montserrat text-lg font-bold text-white">
                Pedidos por Status
              </h2>
              <p className="text-xs text-white/50">Distribuição dos pedidos</p>
            </div>
            <BarChart3 className="h-5 w-5 text-white/30" />
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
            </div>
          ) : statusBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} width={90} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${value} pedidos`, "Quantidade"]}
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-white/50">
              Sem dados de status
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Line + Revenue Bar */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Line Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-montserrat text-lg font-bold text-white">
                Evolução de Faturamento
              </h2>
              <p className="text-xs text-white/50">Receita diária por categoria</p>
            </div>
            <Activity className="h-5 w-5 text-white/30" />
          </div>

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
                <Legend formatter={(value) => <span className="text-white/70 text-xs">{value}</span>} />
                <Line type="monotone" dataKey="convencional" stroke={COLORS.convencional} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="inverter" stroke={COLORS.inverter} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="produtos" stroke={COLORS.produtos} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-white/50">
              Sem dados para o período
            </div>
          )}
        </div>

        {/* Revenue Bar Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-montserrat text-lg font-bold text-white">
                Comparativo de Receita
              </h2>
              <p className="text-xs text-white/50">Faturamento por categoria</p>
            </div>
            <TrendingUp className="h-5 w-5 text-white/30" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartDataForPie} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} width={90} />
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
    </>
  );
});
