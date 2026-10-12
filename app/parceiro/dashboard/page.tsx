"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Star, CheckCircle2, Clock, Wallet, Trophy, TrendingUp, TrendingDown, Minus, Calendar, MapPin, Building2, CreditCard, Bell, ArrowRight, Users, Award, Plus, Wrench, Timer, AlertTriangle } from "lucide-react";
import { supabase, withTimeout } from "@/lib/supabase";
import { usePartner } from "@/hooks/usePartners";
import { usePartnerOffers } from "@/hooks/usePartnerOffers";
import { usePartnerNotifications } from "@/hooks/usePartnerNotifications";
import { formatBRL, SO_STATUS_LABELS } from "@/lib/partner-utils";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Stats {
  total: number;
  pending: number;
  completed: number;
  earnings: number;
  rankingPos: number | null;
  avgRating: number | null;
  thisMonthEarnings: number;
  thisMonthServices: number;
  avgDurationHours: number;
  overdueCount: number;
}

interface ServiceOrder {
  id: string;
  category: string | null;
  status: string;
  completed_at: string | null;
  total: number | null;
  client_name: string;
  address: string | null;
  offer_expires_at: string | null;
}

export default function ParceiroDashboard() {
  const { partner, loading, error } = usePartner();
  const { offers } = usePartnerOffers();
  const { notifications, unreadCount } = usePartnerNotifications();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    completed: 0,
    earnings: 0,
    rankingPos: null,
    avgRating: null,
    thisMonthEarnings: 0,
    thisMonthServices: 0,
    avgDurationHours: 0,
    overdueCount: 0,
  });
  const [recent, setRecent] = useState<ServiceOrder[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; earnings: number; services: number }[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!partner?.id) return;
    setLoadingStats(true);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    const [
      completedRes,
      pendingRes,
      earningsRes,
      rankingRes,
      monthEarningsRes,
      monthCompletedRes,
      monthlyRes,
      perfRes,
    ] = await Promise.all([
      withTimeout(
        () =>
          supabase
            .from("service_orders")
            .select("id", { count: "exact", head: true })
            .eq("accepted_by", partner.id)
            .eq("status", "completed"),
        5000,
        { count: 0 }
      ),
      withTimeout(
        () =>
          supabase
            .from("service_orders")
            .select("id", { count: "exact", head: true })
            .eq("accepted_by", partner.id)
            .in("status", ["accepted", "in_progress"]),
        5000,
        { count: 0 }
      ),
      withTimeout(
        () =>
          supabase
            .from("service_orders")
            .select("partner_value")
            .eq("accepted_by", partner.id)
            .eq("status", "completed"),
        5000,
        null
      ),
      withTimeout(() => supabase.rpc("get_partner_ranking"), 5000, null),
      withTimeout(
        () =>
          supabase
            .from("service_orders")
            .select("partner_value, completed_at")
            .eq("accepted_by", partner.id)
            .eq("status", "completed")
            .gte("completed_at", monthStart),
        5000,
        null
      ),
      withTimeout(
        () =>
          supabase
            .from("service_orders")
            .select("id", { count: "exact", head: true })
            .eq("accepted_by", partner.id)
            .eq("status", "completed")
            .gte("completed_at", monthStart),
        5000,
        { count: 0 }
      ),
      withTimeout(
        () =>
          supabase
            .from("service_orders")
            .select("partner_value, completed_at")
            .eq("accepted_by", partner.id)
            .eq("status", "completed")
            .gte("completed_at", new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()),
        5000,
        null
      ),
      withTimeout(() => supabase.rpc("get_partner_performance", { p_partner_id: partner.id }), 5000, null),
    ]);

    const totalEarnings = ((earningsRes as { data?: { partner_value: number | null }[] })?.data || []).reduce(
      (sum, r) => sum + (r.partner_value || 0),
      0
    );

    const thisMonthEarnings = ((monthEarningsRes as { data?: { partner_value: number | null }[] })?.data || []).reduce(
      (sum, r) => sum + (r.partner_value || 0),
      0
    );

    let rankingPos: number | null = null;
    const ranking = (rankingRes as { data?: { partner_id: string; ranking_position: number }[] })?.data;
    if (ranking) {
      const me = ranking.find((r) => r.partner_id === partner.id);
      rankingPos = me ? Number(me.ranking_position) : null;
    }

    // Monthly chart data (last 6 months)
    const monthlyMap = new Map<string, { earnings: number; services: number }>();
    const monthlyRows = (monthlyRes as { data?: { partner_value: number | null; completed_at: string }[] })?.data || [];
    for (const r of monthlyRows) {
      if (!r.completed_at) continue;
      const date = new Date(r.completed_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthlyMap.get(key) || { earnings: 0, services: 0 };
      existing.earnings += r.partner_value || 0;
      existing.services += 1;
      monthlyMap.set(key, existing);
    }
    // Fill missing months with 0
    const monthlyArr: { month: string; earnings: number; services: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const val = monthlyMap.get(key) || { earnings: 0, services: 0 };
      monthlyArr.push({ month: d.toLocaleString("pt-BR", { month: "short" }), ...val });
    }

    const recentRes = await withTimeout(
      () =>
        supabase
          .from("service_orders")
          .select("id, category, status, completed_at, total, client_name, address, offer_expires_at")
          .eq("accepted_by", partner.id)
          .order("updated_at", { ascending: false })
          .limit(5),
      5000,
      null
    );

    const perf = (
      perfRes as { data?: { avg_duration_hours: number | null; overdue_count: number | null }[] } | null
    )?.data?.[0];

    setStats({
      total: (completedRes.count || 0) + (pendingRes.count || 0),
      pending: pendingRes.count || 0,
      completed: completedRes.count || 0,
      earnings: totalEarnings,
      rankingPos,
      avgRating: partner.average_rating,
      thisMonthEarnings,
      thisMonthServices: monthCompletedRes.count || 0,
      avgDurationHours: Number(perf?.avg_duration_hours || 0),
      overdueCount: Number(perf?.overdue_count || 0),
    });
    if (recentRes?.data) setRecent(recentRes.data);
    setMonthlyData(monthlyArr);
    setLoadingStats(false);
  }, [partner?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const trendIcon = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? <TrendingUp className="h-4 w-4 text-green-400" /> : <Minus className="h-4 w-4 text-white/40" />;
    return current > previous ? <TrendingUp className="h-4 w-4 text-green-400" /> : current < previous ? <TrendingDown className="h-4 w-4 text-red-400" /> : <Minus className="h-4 w-4 text-white/40" />;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "offered": return "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/30";
      case "accepted": return "bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30";
      case "in_progress": return "bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30";
      case "completed": return "bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30";
      case "expired": return "bg-[#E30613]/20 text-[#E30613] border-[#E30613]/30";
      default: return "bg-white/10 text-white/60 border-white/20";
    }
  };

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
        Parceiro não encontrado. Verifique seu cadastro.
      </div>
    );
  }

  const firstName = partner.full_name.split(" ")[0]?.toUpperCase();
  const maxEarnings = Math.max(...monthlyData.map((d) => d.earnings), 1);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Welcome Header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {partner.photo_url ? (
                <img
                  src={partner.photo_url}
                  alt={partner.full_name}
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-[#C9A84C]/50"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C9A84C]/10 font-bebas text-4xl text-[#C9A84C] ring-2 ring-[#C9A84C]/50">
                  {partner.full_name.charAt(0)}
                </div>
              )}
              {partner.active !== false && (
                <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                  ✓
                </span>
              )}
            </div>
            <div>
              <h1 className="font-bebas text-3xl md:text-4xl tracking-wide text-white">
                Bem-vindo, {firstName} 👋
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/60">
                <span className="font-medium text-white/80">{partner.full_name}</span>
                {partner.categories?.map((cat: string, i: number) => (
                  <span
                    key={i}
                    className="rounded-full bg-[#C9A84C]/10 px-2 py-0.5 text-[10px] font-medium text-[#C9A84C]"
                  >
                    {cat}
                  </span>
                ))}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-[#C9A84C]" />
                  {partner.average_rating != null ? Number(partner.average_rating).toFixed(1) : "—"}
                  <span className="text-white/40">({partner.total_ratings || 0} avaliações)</span>
                </span>
                {stats.rankingPos && (
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                    <span className="font-bebas text-lg text-yellow-400">{stats.rankingPos}º</span>
                    <span className="text-white/40">no ranking</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/parceiro/servicos" className="btn-premium-red flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo Serviço
            </Link>
            <Link href="/parceiro/ofertas" className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.04]">
              <Bell className="h-4 w-4" />
              Ofertas {unreadCount > 0 && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E30613] px-1.5 text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Concluídos"
          value={String(stats.completed)}
          subtitle={`${stats.thisMonthServices} este mês`}
          trend={trendIcon(stats.thisMonthServices, 0)}
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="Em andamento"
          value={String(stats.pending)}
          subtitle="Ativos agora"
        />
        <KpiCard
          icon={<Wallet className="h-5 w-5" />}
          label="Ganhos totais"
          value={formatBRL(stats.earnings)}
          subtitle={`Mês: ${formatBRL(stats.thisMonthEarnings)}`}
          trend={trendIcon(stats.thisMonthEarnings, 0)}
        />
        <KpiCard
          icon={<Trophy className="h-5 w-5" />}
          label="Ranking"
          value={stats.rankingPos ? `${stats.rankingPos}º` : "—"}
          subtitle={stats.avgRating != null ? `⭐ ${Number(stats.avgRating).toFixed(1)}` : "Sem avaliações"}
        />
        <KpiCard
          icon={<Timer className="h-5 w-5" />}
          label="Tempo médio"
          value={stats.avgDurationHours > 0 ? `${stats.avgDurationHours.toFixed(1)}h` : "—"}
          subtitle="Por serviço concluído"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Parados"
          value={String(stats.overdueCount)}
          subtitle="Aceitos há 7+ dias"
          accent={stats.overdueCount > 0 ? "text-red-400" : undefined}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Earnings Chart */}
        <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-bebas text-2xl tracking-wide text-white">Ganhos dos Últimos 6 Meses</h2>
            <Link href="/parceiro/faturamento" className="text-sm text-[#C9A84C] hover:underline">
              Ver detalhes →
            </Link>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {monthlyData.map((d, i) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-[#C9A84C] to-[#EAB308] transition-all hover:opacity-80"
                  style={{ height: `${Math.max((d.earnings / maxEarnings) * 100, 4)}%`, minHeight: "4px" }}
                  title={`${d.month}: ${formatBRL(d.earnings)} (${d.services} serviços)`}
                />
                <span className="text-[10px] text-white/50 font-medium">{d.month}</span>
                <span className="text-[10px] text-white/40">{d.services} OS</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-gradient-to-r from-[#C9A84C] to-[#EAB308]" />
              Ganhos
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {monthlyData.reduce((s, d) => s + d.services, 0)} serviços
            </span>
          </div>
        </section>

        {/* Quick Stats Card */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-4 font-bebas text-xl tracking-wide text-white">Resumo Rápido</h2>
          <div className="space-y-4">
            <QuickStat
              icon={<Calendar className="h-5 w-5" />}
              label="Serviços este mês"
              value={String(stats.thisMonthServices)}
              iconColor="text-[#3b82f6]"
            />
            <QuickStat
              icon={<Wallet className="h-5 w-5" />}
              label="Faturamento do mês"
              value={formatBRL(stats.thisMonthEarnings)}
              iconColor="text-[#22c55e]"
            />
            <QuickStat
              icon={<Award className="h-5 w-5" />}
              label="Taxa de conclusão"
              value={stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : "—"}
              iconColor="text-yellow-400"
            />
            <QuickStat
              icon={<Star className="h-5 w-5" />}
              label="Avaliação média"
              value={stats.avgRating != null ? Number(stats.avgRating).toFixed(1) : "—"}
              iconColor="text-[#C9A84C]"
            />
            <QuickStat
              icon={<CreditCard className="h-5 w-5" />}
              label="Mercado Pago"
              value={partner.mp_account_id ? "Conectado ✓" : "Não conectado"}
              iconColor={partner.mp_account_id ? "text-green-400" : "text-yellow-400"}
            />
          </div>
        </section>
      </div>

      {/* Ofertas Disponíveis */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bebas text-2xl tracking-wide text-white">Ofertas Disponíveis ({offers.length})</h2>
          <Link href="/parceiro/ofertas" className="flex items-center gap-1 text-sm text-[#C9A84C] hover:underline">
            Ver todas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {offers.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="mx-auto mb-3 h-12 w-12 text-white/20" />
            <p className="text-white/40">Nenhuma oferta no momento</p>
            <p className="mt-1 text-xs text-white/30">Novas ofertas aparecerão aqui automaticamente</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.slice(0, 6).map((o) => (
              <Link
                key={o.id}
                href="/parceiro/ofertas"
                className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-all hover:border-[#C9A84C]/30 hover:bg-white/[0.04]"
              >
                <div className="mb-3 flex items-start justify-between">
                  <span className="rounded-full bg-[#C9A84C]/10 px-2 py-0.5 text-[10px] font-medium text-[#C9A84C]">
                    {o.category}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/30")}>
                    Ofertado
                  </span>
                </div>
                <p className="font-medium text-white group-hover:text-[#C9A84C] transition-colors">{o.client_name}</p>
                <p className="mt-1 text-xs text-white/50 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {o.address || "Endereço não informado"}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-bebas text-lg text-white">{formatBRL(Number(o.total) || 0)}</span>
                  <span className="text-xs text-[#C9A84C]">Ver detalhes →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Serviços Recentes */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bebas text-2xl tracking-wide text-white">Serviços Recentes</h2>
          <Link href="/parceiro/servicos" className="text-sm text-[#C9A84C] hover:underline">
            Ver todos →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="py-8 text-center">
            <Wrench className="mx-auto mb-3 h-12 w-12 text-white/20" />
            <p className="text-white/40">Nenhum serviço ainda</p>
            <p className="mt-1 text-xs text-white/30">Serviços aceitos aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((s) => (
              <Link
                key={s.id}
                href={`/parceiro/servicos/${s.id}`}
                className="group flex items-center gap-4 rounded-xl border border-white/10 p-4 transition-all hover:border-white/20 hover:bg-white/[0.02]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C9A84C]/10">
                  <Wrench className="h-6 w-6 text-[#C9A84C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white group-hover:text-[#C9A84C] transition-colors truncate">
                    {s.category || "Serviço"}
                  </p>
                  <p className="mt-0.5 text-xs text-white/50 truncate">{s.client_name}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold", statusColor(s.status))}>
                    {SO_STATUS_LABELS[s.status] || s.status}
                  </span>
                  <span className="font-bebas text-lg text-white whitespace-nowrap">{formatBRL(s.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Notificações Recentes */}
      {notifications.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-4 font-bebas text-2xl tracking-wide text-white">Últimas Notificações</h2>
          <ul className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id} className="rounded-xl border border-white/10 p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("shrink-0 flex h-8 w-8 items-center justify-center rounded-lg", n.is_read ? "bg-white/5" : "bg-[#E30613]/20")}>
                    {n.is_read ? (
                      <Bell className="h-4 w-4 text-white/50" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#E30613]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{n.title}</p>
                    <p className="mt-0.5 text-sm text-white/60">{n.message}</p>
                    <p className="mt-1 text-[10px] text-white/40">
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  trend?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-white/20">
      <div className="mb-2 flex items-center justify-between">
        <div className={`flex items-center gap-2 ${accent || "text-[#C9A84C]"}`}>
          {icon}
          <span className="text-xs uppercase tracking-wider text-white/50">{label}</span>
        </div>
        {trend && <div className="flex items-center">{trend}</div>}
      </div>
      <p className={`font-bebas text-3xl ${accent || "text-white"}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-white/40">{subtitle}</p>}
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-3 bg-white/[0.02] border border-white/5">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconColor)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
        <p className="text-sm font-medium text-white truncate">{value}</p>
      </div>
    </div>
  );
}