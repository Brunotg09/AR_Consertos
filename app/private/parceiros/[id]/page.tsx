"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Star,
  Loader2,
  Wallet,
  CheckCircle2,
  Clock,
  UserCircle2,
} from "lucide-react";
import { supabase, withTimeout } from "@/lib/supabase";
import { formatBRL, SO_STATUS_LABELS, PAYMENT_STATUS_LABELS, maskCPFDisplay } from "@/lib/partner-utils";
import { cn as cnUtil } from "@/lib/utils";

interface Partner {
  id: string;
  full_name: string;
  cpf: string;
  email: string;
  phone: string;
  photo_url: string;
  categories: string[];
  bio: string | null;
  experience_years: number | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  average_rating: number | null;
  total_ratings: number;
  active: boolean;
  created_at: string;
}

interface ServiceOrderRow {
  id: string;
  category: string | null;
  client_name: string;
  address: string;
  status: string;
  total: number | null;
  commission_percentage: number | null;
  partner_value: number | null;
  completed_at: string | null;
  rating: number | null;
  review: string | null;
  payment_status: string | null;
}

const TABS = ["dashboard", "servicos", "avaliacoes"] as const;
type Tab = (typeof TABS)[number];

export default function ParceiroDetalheAdmin() {
  const params = useParams();
  const partnerId = params?.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [services, setServices] = useState<ServiceOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");

  const fetchData = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    const [partnerRes, servicesRes] = await Promise.all([
      withTimeout(
        () => supabase.from("partners").select("*").eq("id", partnerId).maybeSingle<Partner>(),
        5000,
        null
      ),
      withTimeout(
        () =>
          supabase
            .from("service_orders")
            .select(
              "id, category, client_name, address, status, total, commission_percentage, partner_value, completed_at, rating, review, payment_status"
            )
            .eq("accepted_by", partnerId)
            .order("updated_at", { ascending: false })
            .limit(200),
        5000,
        null
      ),
    ]);
    setPartner(partnerRes?.data || null);
    setServices(servicesRes?.data || []);
    setLoading(false);
  }, [partnerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="py-20 text-center text-white/60">
        Parceiro não encontrado.{" "}
        <Link href="/private/parceiros" className="text-[#C9A84C] underline">
          Voltar
        </Link>
      </div>
    );
  }

  const completed = services.filter((s) => s.status === "completed");
  const active = services.filter((s) => ["accepted", "in_progress"].includes(s.status));
  const totalEarnings = completed.reduce((sum, s) => sum + (s.partner_value || 0), 0);
  const rated = completed.filter((s) => s.rating != null);

  return (
    <div className="space-y-6">
      <Link
        href="/private/parceiros"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        {partner.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={partner.photo_url} alt={partner.full_name} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
            <UserCircle2 className="h-10 w-10 text-white/30" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-bebas text-3xl tracking-wide text-white">{partner.full_name.toUpperCase()}</h1>
            <span
              className={cnUtil(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                partner.active ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
              )}
            >
              {partner.active ? "Ativo" : "Inativo"}
            </span>
          </div>
          <p className="text-xs text-white/40">CPF: {maskCPFDisplay(partner.cpf)}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> {partner.email}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {partner.phone}
            </span>
            {(partner.address_city || partner.address_state) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {partner.address_city}/{partner.address_state}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-[#C9A84C]">{partner.categories.join(", ")}</p>
          {partner.average_rating != null && (
            <p className="mt-1 flex items-center gap-1 text-xs text-[#C9A84C]">
              <Star className="h-3 w-3 fill-current" /> {partner.average_rating} ({partner.total_ratings} avaliações)
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cnUtil(
              "rounded-xl px-4 py-2 text-sm font-medium capitalize transition-colors",
              tab === t ? "bg-[#E30613] text-white" : "text-white/50 hover:bg-white/[0.04]"
            )}
          >
            {t === "dashboard" ? "Dashboard" : t === "servicos" ? "Serviços" : "Avaliações"}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi label="Concluídos" value={String(completed.length)} icon={<CheckCircle2 className="h-5 w-5" />} />
          <Kpi label="Ativos" value={String(active.length)} icon={<Clock className="h-5 w-5" />} />
          <Kpi label="Ganhos" value={formatBRL(totalEarnings)} icon={<Wallet className="h-5 w-5" />} />
          <Kpi
            label="Avaliação"
            value={partner.average_rating != null ? `${partner.average_rating}/5` : "—"}
            icon={<Star className="h-5 w-5" />}
          />
        </div>
      )}

      {tab === "servicos" && (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
                <th className="p-4">Serviço</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Status</th>
                <th className="p-4">Total</th>
                <th className="p-4">Ganho</th>
                <th className="p-4">Pagamento</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/40">
                    Nenhum serviço registrado.
                  </td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 text-white/70">
                    <td className="p-4">{s.category || "Serviço"}</td>
                    <td className="p-4">{s.client_name}</td>
                    <td className="p-4">
                      <span
                        className={cnUtil(
                          "rounded-full px-2 py-1 text-xs",
                          s.status === "completed"
                            ? "bg-green-500/10 text-green-400"
                            : s.status === "in_progress"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-yellow-500/10 text-yellow-400"
                        )}
                      >
                        {SO_STATUS_LABELS[s.status] || s.status}
                      </span>
                    </td>
                    <td className="p-4">{formatBRL(s.total)}</td>
                    <td className="p-4 text-[#C9A84C]">{formatBRL(s.partner_value)}</td>
                    <td className="p-4 text-xs">
                      {PAYMENT_STATUS_LABELS[s.payment_status || "pending"] || s.payment_status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "avaliacoes" && (
        <div className="space-y-3">
          {rated.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-12 text-center text-white/40">
              Nenhuma avaliação recebida.
            </div>
          ) : (
            rated.map((s) => (
              <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{s.category || "Serviço"}</p>
                  <span className="text-[#C9A84C]">
                    {"⭐".repeat(s.rating || 0)}
                    {"☆".repeat(5 - (s.rating || 0))} ({s.rating}/5)
                  </span>
                </div>
                {s.review && <p className="text-sm text-white/60">&ldquo;{s.review}&rdquo;</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-2 flex items-center gap-2 text-[#C9A84C]">
        {icon}
        <span className="text-xs uppercase tracking-wider text-white/50">{label}</span>
      </div>
      <p className="font-bebas text-3xl text-white">{value}</p>
    </div>
  );
}
