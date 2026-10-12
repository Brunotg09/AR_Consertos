"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Wallet, TrendingUp, Clock } from "lucide-react";
import { supabase, withTimeout } from "@/lib/supabase";
import { usePartner } from "@/hooks/usePartners";
import { formatBRL, PAYMENT_STATUS_LABELS, SO_STATUS_LABELS } from "@/lib/partner-utils";
import { cn } from "@/lib/utils";

interface EarningRow {
  service_date: string | null;
  service_name: string | null;
  total_value: number | null;
  commission_percentage: number | null;
  partner_earnings: number | null;
  payment_status: string | null;
}

export default function ParceiroFaturamento() {
  const { partner } = usePartner();
  const [rows, setRows] = useState<EarningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  const fetchEarnings = useCallback(async () => {
    if (!partner?.id) return;
    setLoading(true);
    try {
      const start = `${month}-01`;
      const end = `${month}-31`;
      const data = await withTimeout(
        () =>
          supabase.rpc("get_partner_earnings", {
            p_partner_id: partner.id,
            p_start_date: start,
            p_end_date: end,
          }),
        5000,
        null
      );
      setRows((data?.data as EarningRow[]) || []);
    } finally {
      setLoading(false);
    }
  }, [partner?.id, month]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const totalEarnings = rows.reduce((s, r) => s + (r.partner_earnings || 0), 0);
  const pending = rows
    .filter((r) => r.payment_status !== "paid")
    .reduce((s, r) => s + (r.partner_earnings || 0), 0);

  return (
    <div className="mx-auto max-w-4xl px-4">
      <h1 className="mb-6 font-bebas text-4xl tracking-wide text-white">Faturamento</h1>

      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm text-white/50">Período:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-[#C9A84C] focus:outline-none"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-2 flex items-center gap-2 text-[#C9A84C]">
            <Wallet className="h-5 w-5" />
            <span className="text-xs uppercase tracking-wider text-white/50">Este mês</span>
          </div>
          <p className="font-bebas text-3xl text-white">{formatBRL(totalEarnings)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-2 flex items-center gap-2 text-yellow-400">
            <Clock className="h-5 w-5" />
            <span className="text-xs uppercase tracking-wider text-white/50">Pendente</span>
          </div>
          <p className="font-bebas text-3xl text-white">{formatBRL(pending)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-2 flex items-center gap-2 text-green-400">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs uppercase tracking-wider text-white/50">Serviços</span>
          </div>
          <p className="font-bebas text-3xl text-white">{rows.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-12 text-center text-white/40">
          Nenhum serviço concluído no período.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
                <th className="p-4">Data</th>
                <th className="p-4">Serviço</th>
                <th className="p-4">Total</th>
                <th className="p-4">Comissão</th>
                <th className="p-4">Meu ganho</th>
                <th className="p-4">Pagamento</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-white/5 text-white/70">
                  <td className="p-4">
                    {r.service_date ? new Date(r.service_date).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="p-4">{r.service_name || "Serviço"}</td>
                  <td className="p-4">{formatBRL(r.total_value)}</td>
                  <td className="p-4">{r.commission_percentage ?? 0}%</td>
                  <td className="p-4 font-medium text-white">{formatBRL(r.partner_earnings)}</td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-xs",
                        r.payment_status === "paid"
                          ? "bg-green-500/10 text-green-400"
                          : r.payment_status === "partial"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-white/10 text-white/50"
                      )}
                    >
                      {PAYMENT_STATUS_LABELS[r.payment_status || "pending"] || r.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
