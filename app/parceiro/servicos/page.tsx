"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Wrench, MapPin, Calendar } from "lucide-react";
import { supabase, withTimeout } from "@/lib/supabase";
import { usePartner } from "@/hooks/usePartners";
import { formatBRL, SO_STATUS_LABELS } from "@/lib/partner-utils";
import { cn } from "@/lib/utils";

interface PartnerServiceRow {
  id: string;
  category: string | null;
  client_name: string;
  address: string;
  scheduled_date: string;
  status: string;
  total: number | null;
  completed_at: string | null;
}

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "completed", label: "Concluídos" },
] as const;

export default function ParceiroServicos() {
  const { partner } = usePartner();
  const [services, setServices] = useState<PartnerServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");

  const fetchServices = useCallback(async () => {
    if (!partner?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from("service_orders")
        .select("id, category, client_name, address, scheduled_date, status, total, completed_at")
        .eq("accepted_by", partner.id);

      if (filter === "active") {
        query = query.in("status", ["accepted", "in_progress"]);
      } else if (filter === "completed") {
        query = query.eq("status", "completed");
      }

      const data = await withTimeout(
        () => query.order("updated_at", { ascending: false }).limit(100),
        5000,
        null
      );
      setServices(data?.data || []);
    } finally {
      setLoading(false);
    }
  }, [partner?.id, filter]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return (
    <div className="mx-auto max-w-4xl px-4">
      <h1 className="mb-6 font-bebas text-4xl tracking-wide text-white">Meus Serviços</h1>

      <div className="mb-6 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              filter === f.value
                ? "bg-[#E30613] text-white"
                : "border border-white/10 text-white/60 hover:bg-white/[0.04]"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center">
          <Wrench className="mx-auto mb-4 h-10 w-10 text-white/20" />
          <p className="text-white/50">Nenhum serviço encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <Link
              key={s.id}
              href={`/parceiro/servicos/${s.id}`}
              className="block rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-white">{s.category || "Serviço"}</p>
                  <p className="mt-1 text-sm text-white/50">{s.client_name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-white/40">
                    <MapPin className="h-3 w-3" /> {s.address}
                  </p>
                  {s.scheduled_date && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-white/40">
                      <Calendar className="h-3 w-3" />
                      {new Date(s.scheduled_date).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      s.status === "completed"
                        ? "bg-green-500/10 text-green-400"
                        : s.status === "in_progress"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-yellow-500/10 text-yellow-400"
                    )}
                  >
                    {SO_STATUS_LABELS[s.status] || s.status}
                  </span>
                  <p className="mt-2 font-bebas text-xl text-white">{formatBRL(s.total)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
