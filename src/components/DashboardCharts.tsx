"use client";

import { Activity, TrendingUp, Wrench } from "lucide-react";
import { memo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  convencional: "#E30613",
  inverter: "#8B5CF6",
  produtos: "#C9A84C",
};

interface DailyRevenue {
  date: string;
  convencional: number;
  inverter: number;
  produtos: number;
  total: number;
}

interface DashboardChartsProps {
  chartData: { name: string; value: number }[];
  dailyRevenue: DailyRevenue[];
  statusData: { name: string; value: number; color: string }[];
  kpiData: {
    receitaConvencional?: number;
    receitaInverter?: number;
    receitaProdutos?: number;
  } | null;
  formatCurrency: (value: number) => string;
}

export const DashboardCharts = memo(function DashboardCharts({
  chartData,
  dailyRevenue,
  statusData,
  kpiData,
  formatCurrency,
}: DashboardChartsProps) {
  return (
    <>
      {/* Charts Row 1: Pie + Status Bar */}
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

        {/* Status Breakdown */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between sm:mb-6">
            <div>
              <h2 className="font-montserrat text-base font-bold text-white sm:text-lg">
                Pedidos por Status
              </h2>
              <p className="text-xs text-white/50 sm:text-sm">Distribuição dos pedidos</p>
            </div>
            <Activity className="h-4 w-4 text-[#8B5CF6] sm:h-5 sm:w-5" />
          </div>

          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} width={90} />
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
                  {statusData.map((entry, index) => (
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
        {/* Daily Revenue Line Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between sm:mb-6">
            <div>
              <h2 className="font-montserrat text-base font-bold text-white sm:text-lg">
                Evolução Diária
              </h2>
              <p className="text-xs text-white/50 sm:text-sm">Receita por dia</p>
            </div>
            <Wrench className="h-4 w-4 text-[#E30613] sm:h-5 sm:w-5" />
          </div>

          {dailyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyRevenue}>
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
              Sem dados diários
            </div>
          )}
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
    </>
  );
});
