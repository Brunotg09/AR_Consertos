"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Calendar, AlertTriangle, CheckCircle2, PauseCircle } from "lucide-react";
import { supabase, withTimeout } from "@/lib/supabase";
import { formatBRL } from "@/lib/partner-utils";
import { format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MySubscription {
  id: string;
  title: string;
  description: string | null;
  monthly_value: number;
  billing_day: number;
  status: string;
  start_date: string;
  next_billing: string;
  visit_interval: string;
}

const intervalLabels: Record<string, string> = {
  "7d": "Semanal",
  "15d": "Quinzenal",
  "1m": "Mensal",
  "2m": "Bimestral",
  "3m": "Trimestral",
  "6m": "Semestral",
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  active: { label: "Ativa", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "#22c55e" },
  paused: { label: "Pausada", icon: <PauseCircle className="h-3.5 w-3.5" />, color: "#F59E0B" },
  overdue: { label: "Em atraso", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "#EF4444" },
  cancelled: { label: "Cancelada", icon: <PauseCircle className="h-3.5 w-3.5" />, color: "#888888" },
};

export default function MySubscriptions() {
  const [subs, setSubs] = useState<MySubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchSubs = async () => {
      try {
        // RLS "client_select_own_subs" já filtra apenas as assinaturas do usuário
        const { data } = await withTimeout(
          () =>
            supabase
              .from("subscriptions")
              .select(
                "id, title, description, monthly_value, billing_day, status, start_date, next_billing, visit_interval"
              )
              .neq("status", "cancelled")
              .order("next_billing", { ascending: true }),
          8000,
          { data: [] }
        );

        if (!cancelled) setSubs((data as MySubscription[]) || []);
      } catch {
        if (!cancelled) setSubs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSubs();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 text-white/40">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Carregando assinaturas...</span>
        </div>
      </div>
    );
  }

  if (subs.length === 0) {
    return null;
  }

  const now = new Date();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-[#C9A84C]" />
        <h2 className="font-montserrat text-sm font-bold text-white">Minhas Assinaturas</h2>
      </div>

      <div className="space-y-3">
        {subs.map((sub) => {
          const nextBilling = new Date(sub.next_billing + "T12:00:00");
          const daysUntil = differenceInCalendarDays(nextBilling, now);
          const isRenewingSoon = daysUntil >= 0 && daysUntil <= 7;
          const isOverdue = daysUntil < 0;
          const cfg = statusConfig[sub.status] || statusConfig.active;

          return (
            <div
              key={sub.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
              style={{
                borderLeft: `3px solid ${isOverdue ? "#EF4444" : isRenewingSoon ? "#F59E0B" : cfg.color}40`,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">{sub.title}</p>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>
                  {sub.description && (
                    <p className="mt-0.5 truncate text-xs text-white/40">{sub.description}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-white/40">
                    <span>{formatBRL(sub.monthly_value)}/mês</span>
                    <span>•</span>
                    <span>{intervalLabels[sub.visit_interval] || sub.visit_interval}</span>
                    <span>•</span>
                    <span>Vencimento dia {sub.billing_day}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-white/40" />
                    <span className="text-xs text-white/60">
                      {format(nextBilling, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <p
                    className="mt-1 text-[11px] font-medium"
                    style={{ color: isOverdue ? "#EF4444" : isRenewingSoon ? "#F59E0B" : "rgba(255,255,255,0.4)" }}
                  >
                    {isOverdue
                      ? `Venceu há ${Math.abs(daysUntil)} dia(s)`
                      : daysUntil === 0
                      ? "Renova hoje!"
                      : daysUntil === 1
                      ? "Renova amanhã"
                      : `Renova em ${daysUntil} dias`}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
