"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Users, CheckCircle2, Wallet, Star, AlertTriangle, Pencil, Phone, Settings } from "lucide-react";
import { supabase, withTimeout } from "@/lib/supabase";
import { formatBRL, PARTNER_CATEGORIES } from "@/lib/partner-utils";
import { toast } from "sonner";
import PassarParaParceiroDialog from "@/components/admin/PassarParaParceiroDialog";

interface RankingRow {
  partner_id: string;
  full_name: string;
  photo_url: string | null;
  total_services: number;
  average_rating: number;
  avg_duration_hours?: number | null;
  open_count?: number | null;
  overdue_count?: number | null;
  ranking_position: number;
}

interface DashboardStats {
  totalPartners: number;
  activeServices: number;
  completedMonth: number;
  totalEarnings: number;
  commissionCompany: number;
  pending: number;
  expiredOffers: number;
}

interface ActiveSO {
  id: string;
  status: string;
  category: string | null;
  client_name: string;
  client_phone: string | null;
  total: number | null;
  offer_expires_at: string | null;
  partner_id: string | null;
  accepted_by: string | null;
  order_id: string | null;
  order_item_id: number | null;
  commission_value: number | null;
  partner_name: string | null;
  item_name: string | null;
  service_type: string | null;
}

export default function ParceriasDashboard() {
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [partnerCategories, setPartnerCategories] = useState<Record<string, string[]>>({});
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [partnerMonth, setPartnerMonth] = useState<
    { partner_id: string; full_name: string; photo_url: string | null; average_rating: number | null; earned: number; commission: number; count: number }[]
  >([]);
  const [activeSOs, setActiveSOs] = useState<ActiveSO[]>([]);
  const [soStatusFilter, setSoStatusFilter] = useState("active");
  const [editingSO, setEditingSO] = useState<{ id: string; total: string } | null>(null);
  const [reofferSO, setReofferSO] = useState<ActiveSO | null>(null);
  const [loading, setLoading] = useState(true);

  const filteredSOs = activeSOs.filter((so) => {
    if (soStatusFilter === "all") return true;
    if (soStatusFilter === "active")
      return ["offered", "accepted", "in_progress"].includes(so.status);
    return so.status === soStatusFilter;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [rankingRes, partnersRes, activeRes, completedRes, earningsRes, expiredRes, categoriesRes, activeSORes] =
      await Promise.all([
        withTimeout(() => supabase.rpc("get_partner_ranking"), 8000, null),
        withTimeout(
          () => supabase.from("partners").select("id", { count: "exact", head: true }).eq("active", true),
          5000,
          { count: 0 }
        ),
        withTimeout(
          () =>
            supabase
              .from("service_orders")
              .select("id", { count: "exact", head: true })
              .in("status", ["offered", "accepted", "in_progress"]),
          5000,
          { count: 0 }
        ),
        withTimeout(
          () =>
            supabase
              .from("service_orders")
              .select("total, commission_value, partner_value, payment_status, accepted_by, partner_id")
              .eq("status", "completed")
              .gte("completed_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          8000,
          null
        ),
        withTimeout(
          () =>
            supabase
              .from("service_orders")
              .select("total, commission_value")
              .eq("status", "completed"),
          8000,
          null
        ),
        withTimeout(
          () =>
            supabase
              .from("service_orders")
              .select("id", { count: "exact", head: true })
              .eq("status", "expired"),
          5000,
          { count: 0 }
        ),
        withTimeout(
          () => supabase.from("partners").select("id, categories"),
          5000,
          { data: [] }
        ),
        withTimeout(
          () =>
            supabase
              .from("service_orders")
              .select("id, status, category, client_name, client_phone, total, commission_value, offer_expires_at, partner_id, accepted_by, order_id, order_item_id")
              .in("status", ["offered", "accepted", "in_progress", "completed", "expired"])
              .order("created_at", { ascending: false })
              .limit(50),
          8000,
          { data: [] }
        ),
      ]);

    let rk = (rankingRes?.data as RankingRow[]) || [];
    // Fallback: se a RPC retornar vazio mas existirem parceiros, monta o ranking direto
    if (rk.length === 0) {
      const { data: fallbackPartners } = await withTimeout(
        () =>
          supabase
            .from("partners")
            .select("id, full_name, photo_url, average_rating, total_ratings")
            .eq("active", true)
            .order("full_name"),
        5000,
        { data: [] }
      );
      rk = ((fallbackPartners || []) as {
        id: string;
        full_name: string;
        photo_url: string | null;
        average_rating: number | null;
        total_ratings: number | null;
      }[]).map((p, i) => ({
        partner_id: p.id,
        full_name: p.full_name,
        photo_url: p.photo_url,
        total_services: 0,
        average_rating: Number(p.average_rating || 0),
        avg_duration_hours: 0,
        open_count: 0,
        overdue_count: 0,
        ranking_position: i + 1,
      }));
    }
    setRanking(rk);

    const catRows = (categoriesRes?.data as { id: string; categories: string[] | null }[]) || [];
    setPartnerCategories(Object.fromEntries(catRows.map((c) => [c.id, c.categories || []])));

    // Resolver nomes dos parceiros e dos serviços das OSs (sem embed por causa de RLS)
    const soRows = (activeSORes?.data as Omit<ActiveSO, "partner_name" | "item_name" | "service_type">[]) || [];
    if ((activeSORes as { error?: unknown } | null)?.error) {
      console.error("Erro ao buscar serviços ativos:", (activeSORes as { error: unknown }).error);
    }
    const partnerIds = Array.from(
      new Set(soRows.map((s) => s.accepted_by || s.partner_id).filter(Boolean) as string[])
    );
    const itemIds = Array.from(
      new Set(soRows.map((s) => s.order_item_id).filter((v): v is number => v != null))
    );
    let namesMap: Record<string, string> = {};
    let itemsMap: Record<number, { item_name: string; service_type: string | null }> = {};
    const [namesRes, itemsRes] = await Promise.all([
      partnerIds.length
        ? withTimeout(
            () => supabase.from("partners").select("id, full_name").in("id", partnerIds),
            5000,
            { data: [] }
          )
        : Promise.resolve({ data: [] }),
      itemIds.length
        ? withTimeout(
            () => supabase.from("order_items").select("id, item_name, service_type").in("id", itemIds),
            5000,
            { data: [] }
          )
        : Promise.resolve({ data: [] }),
    ]);
    namesMap = Object.fromEntries(
      ((namesRes?.data || []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name])
    );
    itemsMap = Object.fromEntries(
      ((itemsRes?.data || []) as { id: number; item_name: string; service_type: string | null }[]).map((i) => [
        i.id,
        { item_name: i.item_name, service_type: i.service_type },
      ])
    );
    setActiveSOs(
      soRows.map((s) => ({
        ...s,
        partner_name: namesMap[s.accepted_by || s.partner_id || ""] || null,
        item_name: s.order_item_id != null ? itemsMap[s.order_item_id]?.item_name || null : null,
        service_type: s.order_item_id != null ? itemsMap[s.order_item_id]?.service_type || null : null,
      }))
    );

    const monthRows = (completedRes?.data as {
      total: number | null;
      commission_value: number | null;
      partner_value: number | null;
      payment_status: string | null;
      accepted_by: string | null;
      partner_id: string | null;
    }[]) || [];
    const allRows = (earningsRes?.data as { total: number | null; commission_value: number | null }[]) || [];

    const monthCommission = monthRows.reduce((s, r) => s + (r.commission_value || 0), 0);
    const allCommission = allRows.reduce((s, r) => s + (r.commission_value || 0), 0);

    // Ganhos por parceiro no mês (somente concluídos)
    const byPartner: Record<string, { earned: number; commission: number; count: number }> = {};
    for (const r of monthRows) {
      const pid = r.accepted_by || r.partner_id;
      if (!pid) continue;
      if (!byPartner[pid]) byPartner[pid] = { earned: 0, commission: 0, count: 0 };
      byPartner[pid].earned += r.partner_value || 0;
      byPartner[pid].commission += r.commission_value || 0;
      byPartner[pid].count += 1;
    }
    let pmRows: { partner_id: string; full_name: string; photo_url: string | null; average_rating: number | null; earned: number; commission: number; count: number }[] = [];
    const pmIds = Object.keys(byPartner);
    if (pmIds.length > 0) {
      const { data: pmPartners } = await withTimeout(
        () =>
          supabase
            .from("partners")
            .select("id, full_name, photo_url, average_rating")
            .in("id", pmIds),
        5000,
        { data: [] }
      );
      pmRows = ((pmPartners || []) as {
        id: string;
        full_name: string;
        photo_url: string | null;
        average_rating: number | null;
      }[])
        .map((p) => ({
          partner_id: p.id,
          full_name: p.full_name,
          photo_url: p.photo_url,
          average_rating: p.average_rating,
          earned: byPartner[p.id].earned,
          commission: byPartner[p.id].commission,
          count: byPartner[p.id].count,
        }))
        .sort((a, b) => b.earned - a.earned);
    }
    setPartnerMonth(pmRows);

    setStats({
      totalPartners: partnersRes.count || 0,
      activeServices: activeRes.count || 0,
      completedMonth: monthRows.length,
      totalEarnings: allCommission,
      commissionCompany: monthCommission,
      pending: 0,
      expiredOffers: expiredRes.count || 0,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveTotal = async () => {
    if (!editingSO) return;
    const value = parseFloat(editingSO.total);
    if (isNaN(value) || value < 0) return toast.error("Valor inválido");
    const { error } = await supabase
      .from("service_orders")
      .update({ total: value, remaining_amount: value })
      .eq("id", editingSO.id);
    if (error) return toast.error("Erro ao atualizar preço");
    toast.success("Preço atualizado!");
    setEditingSO(null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-bebas text-4xl tracking-wide text-white">Dashboard de Parcerias</h1>
        <Link href="/private/parceiros" className="btn-premium-red text-sm">
          Gerenciar Parceiros
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={<Users className="h-5 w-5" />} label="Parceiros Ativos" value={String(stats?.totalPartners ?? 0)} />
        <Kpi icon={<CheckCircle2 className="h-5 w-5" />} label="Concluídos (mês)" value={String(stats?.completedMonth ?? 0)} />
        <Kpi icon={<Wallet className="h-5 w-5" />} label="Comissão (mês)" value={formatBRL(stats?.commissionCompany)} />
        <Kpi icon={<Star className="h-5 w-5" />} label="Serviços Ativos" value={String(stats?.activeServices ?? 0)} />
      </div>

      {/* Serviços (modo corrida / em atendimento / concluídos / expirados) */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bebas text-2xl tracking-wide text-white">🔧 Serviços ({filteredSOs.length})</h2>
          <select
            value={soStatusFilter}
            onChange={(e) => setSoStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none [&_option]:bg-[#1a1a1a] [&_option]:text-white"
            style={{ colorScheme: "dark" }}
          >
            <option value="active">Ativos</option>
            <option value="completed">Concluídos</option>
            <option value="expired">Expirados</option>
            <option value="all">Todos</option>
          </select>
        </div>
        {filteredSOs.length === 0 ? (
          <p className="text-sm text-white/40">
            {soStatusFilter === "active"
              ? "Nenhum serviço ativo. Passe um pedido para um parceiro em /private/pedidos."
              : "Nenhum serviço neste filtro."}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredSOs.map((so) => (
              <div
                key={so.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10"
              >
                {/* Cabeçalho: serviço */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold uppercase tracking-wide text-white">
                      {so.item_name || so.category || "Serviço"}
                    </p>
                    <p className="mt-0.5 text-xs text-white/40">
                      {[so.service_type, so.category].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>

                {/* Cliente + Parceiro */}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Cliente</span>
                    <p className="text-sm text-white/85">{so.client_name}</p>
                    {so.client_phone && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-white/50">
                        <Phone className="h-3 w-3" /> {so.client_phone}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Parceiro</span>
                    {so.partner_name ? (
                      so.partner_id || so.accepted_by ? (
                        <Link
                          href={`/private/parceiros/${so.partner_id || so.accepted_by}`}
                          className="text-sm text-[#C9A84C] hover:underline"
                        >
                          {so.partner_name}
                        </Link>
                      ) : (
                        <p className="text-sm text-white/85">{so.partner_name}</p>
                      )
                    ) : (
                      <p className="text-sm text-white/50">Aguardando aceite</p>
                    )}
                    {so.status === "offered" && so.offer_expires_at && (
                      <p className="mt-0.5 text-xs text-[#EAB308]/80">
                        Expira: {new Date(so.offer_expires_at).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Preço + ações */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
                  {editingSO?.id === so.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs text-white/40">Preço (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingSO.total}
                        onChange={(e) => setEditingSO({ ...editingSO, total: e.target.value })}
                        className="w-32 rounded-lg border border-[#C9A84C]/40 bg-[#1a1a1a] px-3 py-1.5 text-sm text-white outline-none"
                        autoFocus
                      />
                      <button
                        onClick={saveTotal}
                        className="rounded-lg bg-[#22c55e]/15 px-3 py-1.5 text-xs text-[#22c55e] hover:bg-[#22c55e]/25"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingSO(null)}
                        className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs text-white/50"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-bebas text-2xl text-white">{formatBRL(Number(so.total) || 0)}</span>
                      {so.status !== "completed" && (
                        <button
                          onClick={() => setEditingSO({ id: so.id, total: String(so.total || 0) })}
                          className="rounded-lg bg-[#C9A84C]/10 p-1.5 text-[#C9A84C] hover:bg-[#C9A84C]/20"
                          title="Editar preço"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                  {so.status !== "completed" && so.order_id && so.order_item_id != null && (
                    <button
                      onClick={() => setReofferSO(so)}
                      className="flex items-center gap-1.5 rounded-lg bg-[#8B5CF6]/15 px-3 py-1.5 text-xs text-[#8B5CF6] hover:bg-[#8B5CF6]/25"
                      title="Configurar e enviar novamente como oferta (período, categoria, comissão)"
                    >
                      <Settings className="h-3.5 w-3.5" /> Gerenciar Oferta
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dialog reofertar (modo corrida) */}
      {reofferSO && (
        <PassarParaParceiroDialog
          open={!!reofferSO}
          onOpenChange={(open) => {
            if (!open) setReofferSO(null);
          }}
          orderId={reofferSO.order_id!}
          orderItemId={reofferSO.order_item_id!}
          clientName={reofferSO.client_name}
          clientPhone={reofferSO.client_phone}
          address={null}
          total={Number(reofferSO.total) || 0}
          initialCategory={reofferSO.category || undefined}
          initialCommission={reofferSO.commission_value}
          onOfferCreated={fetchData}
        />
      )}

      {/* Faturamento — somente comissão de serviços concluídos */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="mb-1 font-bebas text-2xl tracking-wide text-white">💰 Faturamento</h2>
        <p className="mb-4 text-xs text-white/40">Somente serviços concluídos</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
            <span className="text-xs uppercase tracking-wider text-white/50">Comissão empresa (mês)</span>
            <p className="mt-1 font-bebas text-3xl text-[#C9A84C]">{formatBRL(stats?.commissionCompany)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
            <span className="text-xs uppercase tracking-wider text-white/50">Comissão empresa (total)</span>
            <p className="mt-1 font-bebas text-3xl text-[#C9A84C]">{formatBRL(stats?.totalEarnings)}</p>
          </div>
        </div>
      </section>

      {/* Parceiros (mês) — ganhos e comissão gerada */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="mb-4 font-bebas text-2xl tracking-wide text-white">🤝 Parceiros (mês)</h2>
        {partnerMonth.length === 0 ? (
          <p className="text-sm text-white/40">Nenhum serviço concluído por parceiros neste mês.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partnerMonth.map((pm) => (
              <Link
                key={pm.partner_id}
                href={`/private/parceiros/${pm.partner_id}`}
                className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition-colors hover:border-[#C9A84C]/30"
              >
                <div className="flex items-center gap-3">
                  {pm.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pm.photo_url}
                      alt={pm.full_name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C9A84C]/10 font-bebas text-lg text-[#C9A84C]">
                      {pm.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{pm.full_name}</p>
                    <p className="flex items-center gap-1 text-xs text-white/50">
                      <Star className="h-3 w-3 text-[#C9A84C]" />
                      {Number(pm.average_rating || 0).toFixed(1)} · {pm.count} serviço(s) concluído(s)
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Ganho do parceiro</span>
                    <p className="text-sm font-bold text-white">{formatBRL(pm.earned)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Sua comissão</span>
                    <p className="text-sm font-bold text-[#C9A84C]">{formatBRL(pm.commission)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Alertas */}
      {stats && stats.expiredOffers > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {stats.expiredOffers} oferta(s) expirada(s) sem aceite — verifique os pedidos pendentes.
        </div>
      )}

      {/* Ranking */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bebas text-2xl tracking-wide text-white">🏆 Ranking de Parceiros</h2>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none [&_option]:bg-[#1a1a1a] [&_option]:text-white"
            style={{ colorScheme: "dark" }}
          >
            <option value="">Todas as categorias</option>
            {PARTNER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {(() => {
          const filteredRanking = ranking.filter(
            (r) => !categoryFilter || (partnerCategories[r.partner_id] || []).includes(categoryFilter)
          );
          if (filteredRanking.length === 0) {
            return (
              <p className="text-sm text-white/40">
                {categoryFilter
                  ? `Nenhum parceiro na categoria "${categoryFilter}".`
                  : "Nenhum parceiro cadastrado."}
              </p>
            );
          }
          return (
            <ol className="space-y-2">
              {filteredRanking.slice(0, 10).map((r) => (
                <li key={r.partner_id}>
                  <Link
                    href={`/private/parceiros/${r.partner_id}`}
                    className="flex items-center gap-4 rounded-xl border border-white/5 px-4 py-3 transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="w-8 text-center font-bebas text-2xl text-[#C9A84C]">
                      {r.ranking_position}º
                    </span>
                    {r.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-white/5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{r.full_name}</p>
                      <p className="text-xs text-white/40">
                        {r.total_services} serviço(s) · ⭐ {Number(r.average_rating || 0).toFixed(1)}
                        {r.avg_duration_hours != null && Number(r.avg_duration_hours) > 0 && (
                          <span> · ⏱ {Number(r.avg_duration_hours).toFixed(1)}h</span>
                        )}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {r.open_count != null && Number(r.open_count) > 0 && (
                          <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                            {Number(r.open_count)} em aberto
                          </span>
                        )}
                        {r.overdue_count != null && Number(r.overdue_count) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {Number(r.overdue_count)} parado(s)
                          </span>
                        )}
                      </div>
                      {(partnerCategories[r.partner_id] || []).length > 0 && (
                        <p className="mt-0.5 text-[11px] text-white/30">
                          {(partnerCategories[r.partner_id] || []).join(", ")}
                        </p>
                      )}
                    </div>
                    {r.ranking_position <= 3 && (
                      <span className="text-xl">{r.ranking_position === 1 ? "🥇" : r.ranking_position === 2 ? "🥈" : "🥉"}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          );
        })()}
      </section>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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
