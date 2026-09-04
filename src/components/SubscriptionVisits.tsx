"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Check, X, Clock, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Subscription {
  id: string;
  service_id: string | null;
  partner_id: string | null;
  visit_interval: string;
  billing_day: string | number;
  status: string;
  start_date: string;
  title: string;
}

interface VisitData {
  id: string;
  visit_date: string;
  status: string;
  service_order_id: string | null;
}

interface SubscriptionVisitsProps {
  subscription: Subscription;
  isPartnerService: boolean;
  onCreateOS?: (monthDate: Date) => void;
}

export default function SubscriptionVisits({ subscription, isPartnerService, onCreateOS }: SubscriptionVisitsProps) {
  const [visits, setVisits] = useState<VisitData[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const isPartnerRoute = pathname.startsWith("/parceiro");

  const fetchVisits = useCallback(async () => {
    // Buscar visitas desta assinatura
    const { data: dbVisits } = await supabase
      .from("subscription_visits")
      .select("id, visit_date, status, service_order_id")
      .eq("subscription_id", subscription.id)
      .order("visit_date", { ascending: true });

    const visitsList = dbVisits || [];

    // Sync status com service_orders reais
    for (const visit of visitsList) {
      if (visit.service_order_id) {
        const { data: so } = await supabase
          .from("service_orders")
          .select("status")
          .eq("id", visit.service_order_id)
          .single();

        if (so) {
          const expectedStatus =
            so.status === "completed" ? "completed" :
            so.status === "cancelled" ? "missed" :
            so.status === "in_progress" ? "in_progress" :
            "pending";

          if (visit.status !== expectedStatus) {
            await supabase.from("subscription_visits").update({ status: expectedStatus }).eq("id", visit.id);
            visit.status = expectedStatus;
          }
        }
      }
    }

    setVisits(visitsList);
    setLoading(false);
  }, [subscription.id]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const now = new Date();
  const currentMonthStr = format(now, "yyyy-MM");
  const hasCurrentMonthOS = visits.some((v) => v.visit_date.substring(0, 7) === currentMonthStr && v.service_order_id);
  const pendingCount = visits.filter((v) => v.status === "pending").length;
  const completedCount = visits.filter((v) => v.status === "completed").length;
  const inProgressCount = visits.filter((v) => v.status === "in_progress").length;

  if (loading) {
    return <div className="py-2 text-xs text-white/30">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {completedCount > 0 && (
            <span className="text-sm text-white/50">
              <span className="font-bold text-[#22c55e]">{completedCount}</span> realizadas
            </span>
          )}
          {pendingCount > 0 && (
            <span className="text-sm text-white/50">
              <span className="font-bold text-[#F59E0B]">{pendingCount}</span> pendentes
            </span>
          )}
          {inProgressCount > 0 && (
            <span className="text-sm text-white/50">
              <span className="font-bold text-[#3B82F6]">{inProgressCount}</span> em andamento
            </span>
          )}
        </div>

        {isPartnerService && subscription.partner_id && !hasCurrentMonthOS && subscription.status === "active" && (
          <button
            onClick={() => onCreateOS?.(now)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3B82F6]/80"
          >
            <Plus className="h-4 w-4" />
            Criar OS
          </button>
        )}
      </div>

      {visits.length === 0 ? (
        <p className="text-sm text-white/30">Nenhuma visita registrada.</p>
      ) : (
        <div className="overflow-x-auto py-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
          <div className="flex gap-3" style={{ minWidth: "min-content" }}>
            {visits.map((visit) => {
              const visitDate = new Date(visit.visit_date + "T12:00:00");
              const isCurrentMonth = visit.visit_date.substring(0, 7) === currentMonthStr;
              const isCompleted = visit.status === "completed";
              const isMissed = visit.status === "missed";
              const hasOS = !!visit.service_order_id;

              const day = visitDate.getDate();
              const monthLabel = format(visitDate, "MMM", { locale: ptBR });
              const yearLabel = format(visitDate, "yy");

              return (
                <button
                  key={visit.id}
                  onClick={() => {
                    if (hasOS) {
                      window.open(`${isPartnerRoute ? "/parceiro" : "/private/parceiros"}/${subscription.partner_id}/os/${visit.service_order_id}`, "_blank");
                    } else if (isPartnerService && subscription.status === "active") {
                      onCreateOS?.(visitDate);
                    }
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all hover:scale-105 flex-shrink-0 min-w-[90px] ${
                    isCompleted ? "border-[#22c55e]/30 bg-[#22c55e]/10" :
                    isMissed ? "border-[#EF4444]/30 bg-[#EF4444]/10" :
                    hasOS ? "border-[#3B82F6]/30 bg-[#3B82F6]/10" :
                    "border-[#F59E0B]/30 bg-[#F59E0B]/10"
                  } ${isCurrentMonth ? "ring-2 ring-[#3B82F6]/50" : ""}`}
                  title={`${format(visitDate, "dd/MM/yyyy", { locale: ptBR })}${hasOS ? " - Ver OS" : ""}`}
                >
                  <span className={`text-sm font-bold ${isCurrentMonth ? "text-[#3B82F6]" : "text-white/50"}`}>
                    {day}
                  </span>
                  <span className={`text-xs font-medium uppercase ${isCurrentMonth ? "text-[#3B82F6]" : "text-white/40"}`}>
                    {monthLabel}
                  </span>
                  <span className={`text-[10px] ${isCurrentMonth ? "text-[#3B82F6]" : "text-white/30"}`}>
                    {yearLabel}
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center mt-1">
                    {isCompleted ? <Check className="h-5 w-5 text-[#22c55e]" /> :
                     isMissed ? <X className="h-5 w-5 text-[#EF4444]" /> :
                     hasOS ? <div className="flex h-5 w-5 items-center justify-center rounded bg-[#3B82F6]/20 text-[10px] font-bold text-[#3B82F6]">OS</div> :
                     <Clock className="h-5 w-5 text-[#F59E0B]" />}
                  </div>
                  {hasOS && (
                    <span className="text-[10px] font-medium text-[#3B82F6]">Ver OS</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-white/30 pt-1">
        <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#22c55e]" /> Realizada</span>
        <span className="flex items-center gap-1.5"><X className="h-3 w-3 text-[#EF4444]" /> Falhou</span>
        <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-[#F59E0B]" /> Pendente</span>
        <span className="flex items-center gap-1.5"><span className="text-[#3B82F6] font-bold">OS</span> Criada</span>
      </div>
    </div>
  );
}
