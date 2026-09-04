"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  Calendar,
  DollarSign,
  Pause,
  Play,
  XCircle,
  ChevronDown,
  ChevronUp,
  Wrench,
} from "lucide-react";
import SubscriptionVisits from "@/components/SubscriptionVisits";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Partner {
  id: string;
  name: string;
}

interface Cliente {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  user_id: string | null;
}

interface CombinedService {
  service_id: string;
  name: string;
  category: string;
  type: string;
  pricing_config: {
    model?: "avulso" | "assinatura" | "ambos";
    intervals?: { value: string; label: string; days: number; price: number }[];
  } | null;
  price: number | null;
  partner_id: string | null;
  partner_name: string | null;
  source: "services" | "partner_services";
}

interface Subscription {
  id: string;
  client_user_id: string | null;
  client_id: number | null;
  partner_id: string;
  service_id: string | null;
  visit_interval: string;
  title: string;
  description: string | null;
  monthly_value: number;
  billing_day: number;
  status: string;
  start_date: string;
  next_billing: string;
  notes: string | null;
  created_at: string;
  partner_name?: string;
  client_name?: string;
  service_name?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "text-[#22c55e]" },
  paused: { label: "Pausado", color: "text-[#F59E0B]" },
  overdue: { label: "Inadimplente", color: "text-[#EF4444]" },
  cancelled: { label: "Cancelado", color: "text-white/40" },
};

const WEEKDAY_LABELS: Record<string, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

const ALL_INTERVALS = [
  { value: "7d", label: "A cada 7 dias", days: 7 },
  { value: "15d", label: "A cada 15 dias", days: 15 },
  { value: "1m", label: "A cada 1 mês", days: 30 },
  { value: "2m", label: "A cada 2 meses", days: 60 },
  { value: "3m", label: "A cada 3 meses", days: 90 },
  { value: "6m", label: "A cada 6 meses", days: 180 },
];

export default function AssinaturasPage() {
  const searchParams = useSearchParams();
  const clientFilter = searchParams.get("client");

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [allServices, setAllServices] = useState<CombinedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [saving, setSaving] = useState(false);
  const [planMode, setPlanMode] = useState<"service" | "custom">("service");
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState<"all" | "own" | "partner">("all");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    monthly_value: "",
    billing_day: "5",
    visit_interval: "1m",
    service_id: "",
    partner_id: "",
    client_id: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (sub) => {
          const [partnerRes, clientRes] = await Promise.all([
            sub.partner_id
              ? supabase.from("partners").select("name").eq("id", sub.partner_id).maybeSingle()
              : Promise.resolve({ data: null as { name: string } | null }),
            sub.client_id
              ? supabase.from("clientes").select("nome").eq("id", sub.client_id).maybeSingle()
              : sub.client_user_id
                ? supabase.from("profiles").select("full_name").eq("id", sub.client_user_id).maybeSingle()
                : Promise.resolve({ data: null as { full_name: string } | null }),
          ]);

          let serviceName = null;
          if (sub.service_id) {
            const svcRes = await supabase.from("services").select("name").eq("service_id", sub.service_id).maybeSingle();
            if (svcRes.data) {
              serviceName = svcRes.data.name;
            } else {
              const psvcRes = await supabase.from("partner_services").select("name").eq("service_id", sub.service_id).maybeSingle();
              serviceName = psvcRes.data?.name || null;
            }
          }

          const clientData = clientRes.data as Record<string, any> | null;

          return {
            ...sub,
            partner_name: partnerRes.data?.name || "N/A",
            client_name: clientData?.nome || clientData?.full_name || "N/A",
            service_name: serviceName,
          };
        })
      );

      setSubscriptions(enriched);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPartnersAndClients = useCallback(async () => {
    const [partnersRes, clientsRes, servicesRes, partnerServicesRes] = await Promise.all([
      supabase.from("partners").select("id, name").eq("active", true).order("name").then(r => ({ data: r.data, error: r.error })),
      supabase.from("clientes").select("id, nome, telefone, email, cpf, user_id").order("nome").then(r => ({ data: r.data, error: r.error })),
      supabase.from("services").select("service_id, name, category, type, price").eq("active", true).then(r => ({ data: r.data, error: r.error })),
      supabase.from("partner_services").select("service_id, name, category, type, price, partner_id").eq("active", true).then(r => ({ data: r.data, error: r.error })),
    ]);

    setPartners(partnersRes.data || []);
    setClients(clientsRes.data || []);

    // Buscar nomes dos parceiros separadamente se necessário
    const partnerMap = new Map<string, string>();
    if ((partnerServicesRes.data || []).length > 0) {
      const partnerIds = Array.from(new Set((partnerServicesRes.data || []).map((s: any) => s.partner_id).filter(Boolean)));
      if (partnerIds.length > 0) {
        const { data: partnerNames } = await supabase.from("partners").select("id, name").in("id", partnerIds);
        (partnerNames || []).forEach((p: any) => partnerMap.set(p.id, p.name));
      }
    }

    const combined: CombinedService[] = [
      ...(servicesRes.data || []).map((s) => ({
        ...s,
        pricing_config: null as CombinedService["pricing_config"],
        partner_id: null,
        partner_name: null,
        source: "services" as const,
      })),
      ...(partnerServicesRes.data || []).map((s: any) => ({
        ...s,
        pricing_config: null as CombinedService["pricing_config"],
        partner_id: s.partner_id,
        partner_name: partnerMap.get(s.partner_id) || null,
        source: "partner_services" as const,
      })),
    ];
    setAllServices(combined);

    // Buscar pricing_config separadamente (coluna pode não existir)
    const allIds = combined.map((s) => s.service_id);
    if (allIds.length > 0) {
      try {
        const [svcPricing, psvcPricing] = await Promise.all([
          supabase.from("services").select("service_id, pricing_config").in("service_id", allIds),
          supabase.from("partner_services").select("service_id, pricing_config").in("service_id", allIds),
        ]);
        const pricingMap = new Map<string, CombinedService["pricing_config"]>();
        (svcPricing.data || []).forEach((r: any) => pricingMap.set(r.service_id, r.pricing_config));
        (psvcPricing.data || []).forEach((r: any) => pricingMap.set(r.service_id, r.pricing_config));
        setAllServices((prev) =>
          prev.map((s) => ({ ...s, pricing_config: pricingMap.get(s.service_id) || null }))
        );
      } catch (e) {
        // pricing_config column might not exist yet - ignore
      }
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    fetchPartnersAndClients();
  }, [fetchSubscriptions, fetchPartnersAndClients]);

  useEffect(() => {
    const handleClickOutside = () => setServiceDropdownOpen(false);
    if (serviceDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [serviceDropdownOpen]);

  const filteredSubs = subscriptions.filter(
    (s) =>
      (clientFilter ? s.client_id?.toString() === clientFilter : true) &&
      (serviceFilter === "all" ? true :
       serviceFilter === "own" ? !s.partner_id :
       !!s.partner_id) &&
      (s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.partner_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.client_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedService = allServices.find((s) => s.service_id === formData.service_id);
  const showInterval = selectedService?.pricing_config?.model === "assinatura" || selectedService?.pricing_config?.model === "ambos";
  const serviceIntervals = selectedService?.pricing_config?.intervals || [];

  const filteredServices = allServices.filter((s) => {
    // No modo serviço, só mostra serviços que têm plano (pricing_config com intervalos)
    if (planMode === "service") {
      const hasPlan = s.pricing_config?.intervals && s.pricing_config.intervals.length > 0 && s.pricing_config.intervals.some((i) => i.price != null && i.price > 0);
      if (!hasPlan) return false;
    }
    if (!serviceSearch) return true;
    const q = serviceSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.partner_name && s.partner_name.toLowerCase().includes(q))
    );
  });

  const ownServices = filteredServices.filter((s) => s.source === "services");
  const partnerSvcList = filteredServices.filter((s) => s.source === "partner_services");

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      monthly_value: "",
      billing_day: "5",
      visit_interval: "1m",
      service_id: "",
      partner_id: "",
      client_id: "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
    setSelectedSub(null);
    setServiceSearch("");
    setServiceDropdownOpen(false);
    setPlanMode("service");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (sub: Subscription) => {
    setSelectedSub(sub);
    setFormData({
      title: sub.title,
      description: sub.description || "",
      monthly_value: String(sub.monthly_value),
      billing_day: String(sub.billing_day),
      visit_interval: sub.visit_interval || "1m",
      service_id: sub.service_id || "",
      partner_id: sub.partner_id,
      client_id: sub.client_id?.toString() || "",
      start_date: sub.start_date,
      notes: sub.notes || "",
    });
    setPlanMode(sub.service_id ? "service" : "custom");
    setDialogOpen(true);
  };

  const openDeleteDialog = (sub: Subscription) => {
    setSelectedSub(sub);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.client_id || !formData.monthly_value) {
      toast.error("Preencha cliente e valor.");
      return;
    }
    if (planMode === "service" && !formData.service_id) {
      toast.error("Selecione um serviço.");
      return;
    }
    if (planMode === "custom" && !formData.title) {
      toast.error("Digite um título para o plano.");
      return;
    }

    setSaving(true);

    try {
      const clientRecord = clients.find((c) => c.id === parseInt(formData.client_id));
      const intervalLabel = planMode === "service"
        ? serviceIntervals.find((i) => i.value === formData.visit_interval)?.label || formData.visit_interval
        : ALL_INTERVALS.find((i) => i.value === formData.visit_interval)?.label || formData.visit_interval;

      const serviceName = planMode === "service" && selectedService ? selectedService.name : null;
      const subscriptionTitle = planMode === "service" && serviceName
        ? `${serviceName} — ${intervalLabel}`
        : formData.title;

      const data: any = {
        title: subscriptionTitle,
        description: formData.description || null,
        monthly_value: parseFloat(formData.monthly_value),
        billing_day: parseInt(formData.billing_day),
        visit_interval: formData.visit_interval,
        service_id: planMode === "service" ? (formData.service_id || null) : null,
        partner_id: planMode === "service" ? (formData.partner_id || null) : null,
        client_id: parseInt(formData.client_id),
        start_date: formData.start_date,
        notes: formData.notes || null,
      };

      if (clientRecord?.user_id) {
        data.client_user_id = clientRecord.user_id;
      }

      if (!selectedSub) {
        // Calcular next_billing baseado no intervalo
        const start = new Date(formData.start_date + "T12:00:00");
        const interval = ALL_INTERVALS.find((i) => i.value === formData.visit_interval);
        if (interval) {
          start.setDate(start.getDate() + interval.days);
        }
        data.next_billing = format(start, "yyyy-MM-dd");
      }

      if (selectedSub) {
        const { error } = await supabase
          .from("subscriptions")
          .update(data)
          .eq("id", selectedSub.id);

        if (error) throw error;
        toast.success("Assinatura atualizada!");
      } else {
        const { error } = await supabase.from("subscriptions").insert(data);
        if (error) throw error;
        toast.success("Assinatura criada!");
      }

      setDialogOpen(false);
      resetForm();
      fetchSubscriptions();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar assinatura.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSub) return;

    try {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", selectedSub.id);

      if (error) throw error;
      toast.success("Assinatura removida!");
      setDeleteDialogOpen(false);
      setSelectedSub(null);
      fetchSubscriptions();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover assinatura.");
    }
  };

  const updateStatus = async (sub: Subscription, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: newStatus })
        .eq("id", sub.id);

      if (error) throw error;
      const label = STATUS_LABELS[newStatus]?.label || newStatus;
      toast.success(`Assinatura marcada como "${label}".`);
      fetchSubscriptions();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status.");
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  };

  const selectedIntervalPrice = serviceIntervals.find((i) => i.value === formData.visit_interval)?.price;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E30613] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bebas text-3xl tracking-wide text-white">
            ASSINATURAS
          </h1>
          <p className="text-sm text-white/50">
            Planos de serviço recorrente para clientes
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-[#E30613] hover:bg-[#E30613]/90">
          <Plus className="mr-2 h-4 w-4" />
          Nova Assinatura
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input
          placeholder="Buscar por título, parceiro ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 border-white/10 bg-white/[0.03] text-white placeholder:text-white/30"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
              <RefreshCw className="h-5 w-5 text-[#22c55e]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {subscriptions.filter((s) => s.status === "active").length}
              </p>
              <p className="text-xs text-white/50">Ativos</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Pause className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {subscriptions.filter((s) => s.status === "paused").length}
              </p>
              <p className="text-xs text-white/50">Pausados</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EF4444]/10">
              <XCircle className="h-5 w-5 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {subscriptions.filter((s) => s.status === "overdue").length}
              </p>
              <p className="text-xs text-white/50">Inadimplentes</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/10">
              <DollarSign className="h-5 w-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(
                  subscriptions
                    .filter((s) => s.status === "active")
                    .reduce((acc, s) => acc + s.monthly_value, 0)
                )}
              </p>
              <p className="text-xs text-white/50">MRR Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50">Filtrar:</span>
        <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
          {[
            { value: "all", label: "Todos" },
            { value: "own", label: "Meus Serviços" },
            { value: "partner", label: "Parceiros" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setServiceFilter(f.value as typeof serviceFilter)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                serviceFilter === f.value
                  ? "bg-[#3B82F6] text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Plano</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Serviço</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Frequência</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Parceiro</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Valor Mensal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Próxima Visita</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/50">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-white/30">
                    Nenhuma assinatura encontrada.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => (
                  <>
                    <tr
                      key={sub.id}
                      className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-2 py-3">
                        <button
                          onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                          className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:text-white"
                        >
                          {expandedSub === sub.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-white">{sub.title}</p>
                          {sub.description && (
                            <p className="text-xs text-white/40 truncate max-w-[200px]">{sub.description}</p>
                          )}
                        </div>
                      </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-white/70">{sub.client_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="h-3 w-3 text-white/40" />
                        <span className="text-sm text-white/70">{sub.service_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#3B82F6]/10 px-2 py-0.5 text-xs font-medium text-[#3B82F6]">
                        <RefreshCw className="h-3 w-3" />
                        {sub.visit_interval === "7d" && "A cada 7 dias"}
                        {sub.visit_interval === "15d" && "A cada 15 dias"}
                        {sub.visit_interval === "1m" && "A cada 1 mês"}
                        {sub.visit_interval === "2m" && "A cada 2 meses"}
                        {sub.visit_interval === "3m" && "A cada 3 meses"}
                        {sub.visit_interval === "6m" && "A cada 6 meses"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-white/70">{sub.partner_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-oswald text-sm font-bold text-[#22c55e]">
                        {formatCurrency(sub.monthly_value)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                        <Calendar className="h-3 w-3" />
                        {sub.next_billing ? format(new Date(sub.next_billing + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${STATUS_LABELS[sub.status]?.color || "text-white/40"}`}>
                        {STATUS_LABELS[sub.status]?.label || sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {sub.status === "active" && (
                          <button
                            onClick={() => updateStatus(sub, "paused")}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                            title="Pausar"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        )}
                        {sub.status === "paused" && (
                          <button
                            onClick={() => updateStatus(sub, "active")}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-[#22c55e]/10 hover:text-[#22c55e]"
                            title="Retomar"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditDialog(sub)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteDialog(sub)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-[#E30613]/10 hover:text-[#E30613]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedSub === sub.id && (
                    <tr key={`${sub.id}-visits`} className="border-b border-white/[0.03] bg-white/[0.01]">
                      <td colSpan={10} className="px-6 py-4">
                        <SubscriptionVisits
                          subscription={sub}
                          isPartnerService={!!sub.partner_id}
                        />
                      </td>
                    </tr>
                  )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl border-white/[0.06] bg-[#0f0f0f]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedSub ? "Editar Assinatura" : "Nova Assinatura"}
            </DialogTitle>
          </DialogHeader>

          {/* MODO: Serviço ou Customizado */}
          {!selectedSub && (
            <div className="flex gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
              <button
                type="button"
                onClick={() => setPlanMode("service")}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  planMode === "service"
                    ? "bg-[#3B82F6] text-white shadow-lg shadow-blue-500/20"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                Usar Serviço Existente
              </button>
              <button
                type="button"
                onClick={() => setPlanMode("custom")}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  planMode === "custom"
                    ? "bg-[#8B5CF6] text-white shadow-lg shadow-purple-500/20"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                Plano Customizado
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* CLIENTE */}
            <div className="col-span-full space-y-2">
              <Label className="text-white/70">Cliente *</Label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2.5 text-sm text-white outline-none"
                style={{ colorScheme: "dark" }}
              >
                <option value="" className="bg-[#1a1a1a] text-white">Selecione o cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#1a1a1a] text-white">
                    {c.nome} {c.telefone ? `(${c.telefone})` : ""} {c.email ? `— ${c.email}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* SERVIÇO (modo serviço) */}
            {planMode === "service" && (
              <>
                <div className="col-span-full space-y-2">
                  <Label className="text-white/70">Serviço *</Label>
                  <div className="relative">
                    <Input
                      value={serviceDropdownOpen ? serviceSearch : (selectedService ? `${selectedService.name} — ${selectedService.source === "partner_services" ? selectedService.partner_name : selectedService.category}` : "")}
                      onChange={(e) => {
                        e.stopPropagation();
                        setServiceSearch(e.target.value);
                        setServiceDropdownOpen(true);
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        setServiceSearch("");
                        setServiceDropdownOpen(true);
                      }}
                      placeholder="Buscar serviço por nome, categoria ou parceiro..."
                      className="border-white/10 bg-white/[0.03] text-white"
                    />
                    {serviceDropdownOpen && (
                      <div onClick={(e) => e.stopPropagation()} className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
                        {ownServices.length > 0 && (
                          <div>
                            <div className="sticky top-0 bg-[#1a1a1a] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white/30">
                              Serviços Próprios
                            </div>
                            {ownServices.map((s) => (
                              <button
                                key={s.service_id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, service_id: s.service_id, partner_id: "" });
                                  setServiceSearch("");
                                  setServiceDropdownOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] ${
                                  formData.service_id === s.service_id ? "bg-white/[0.08]" : ""
                                }`}
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E30613]/10">
                                  <Wrench className="h-4 w-4 text-[#E30613]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{s.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] text-white/40">{s.category}</span>
                                    {s.pricing_config?.intervals && s.pricing_config.intervals.length > 0 ? (
                                      <span className="text-[11px] font-semibold text-[#22c55e]">
                                        {s.pricing_config.intervals.filter((i) => i.price != null && i.price > 0).map((i) => `R${i.price!.toFixed(0)}`).join(" / ")}
                                      </span>
                                    ) : s.price != null ? (
                                      <span className="text-[11px] font-semibold text-[#22c55e]">
                                        R$ {s.price.toFixed(2).replace(".", ",")}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {(!s.pricing_config?.model || s.pricing_config?.model === "avulso") && (
                                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[9px] font-medium text-white/50">
                                      Avulso
                                    </span>
                                  )}
                                  {s.pricing_config?.model === "assinatura" && (
                                    <span className="rounded-md bg-[#3B82F6]/15 px-2 py-0.5 text-[9px] font-medium text-[#3B82F6]">
                                      Assinatura
                                    </span>
                                  )}
                                  {s.pricing_config?.model === "ambos" && (
                                    <span className="rounded-md bg-[#F59E0B]/15 px-2 py-0.5 text-[9px] font-medium text-[#F59E0B]">
                                      Avulso + Assinatura
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {partnerSvcList.length > 0 && (
                          <div>
                            <div className="sticky top-0 bg-[#1a1a1a] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white/30">
                              Serviços de Parceiros
                            </div>
                            {partnerSvcList.map((s) => (
                              <button
                                key={s.service_id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, service_id: s.service_id, partner_id: s.partner_id || "" });
                                  setServiceSearch("");
                                  setServiceDropdownOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] ${
                                  formData.service_id === s.service_id ? "bg-white/[0.08]" : ""
                                }`}
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10B981]/10">
                                  <Wrench className="h-4 w-4 text-[#10B981]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{s.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] text-white/40">{s.partner_name || "Parceiro"}</span>
                                    {s.pricing_config?.intervals && s.pricing_config.intervals.length > 0 ? (
                                      <span className="text-[11px] font-semibold text-[#22c55e]">
                                        {s.pricing_config.intervals.filter((i) => i.price != null && i.price > 0).map((i) => `R${i.price!.toFixed(0)}`).join(" / ")}
                                      </span>
                                    ) : s.price != null ? (
                                      <span className="text-[11px] font-semibold text-[#22c55e]">
                                        R$ {s.price.toFixed(2).replace(".", ",")}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {(!s.pricing_config?.model || s.pricing_config?.model === "avulso") && (
                                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[9px] font-medium text-white/50">
                                      Avulso
                                    </span>
                                  )}
                                  {s.pricing_config?.model === "assinatura" && (
                                    <span className="rounded-md bg-[#3B82F6]/15 px-2 py-0.5 text-[9px] font-medium text-[#3B82F6]">
                                      Assinatura
                                    </span>
                                  )}
                                  {s.pricing_config?.model === "ambos" && (
                                    <span className="rounded-md bg-[#F59E0B]/15 px-2 py-0.5 text-[9px] font-medium text-[#F59E0B]">
                                      Avulso + Assinatura
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {ownServices.length === 0 && partnerSvcList.length === 0 && (
                          <div className="px-3 py-4 text-center text-sm text-white/30">
                            Nenhum serviço encontrado
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {formData.partner_id && (
                    <p className="text-xs text-white/40">
                      Parceiro vinculado:{" "}
                      <span className="text-[#10B981]">
                        {partners.find((p) => p.id === formData.partner_id)?.name || "N/A"}
                      </span>
                    </p>
                  )}
                </div>

                {/* SERVICE INFO CARD */}
                {selectedService && (
                  <div className="col-span-full space-y-3">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            selectedService.pricing_config?.model === "assinatura" ? "bg-[#3B82F6]/15" :
                            selectedService.pricing_config?.model === "ambos" ? "bg-[#F59E0B]/15" : "bg-white/[0.06]"
                          }`}>
                            <RefreshCw className={`h-4 w-4 ${
                              selectedService.pricing_config?.model === "assinatura" ? "text-[#3B82F6]" :
                              selectedService.pricing_config?.model === "ambos" ? "text-[#F59E0B]" : "text-white/50"
                            }`} />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white/50">Modelo de Cobrança</p>
                            <p className={`text-sm font-bold ${
                              selectedService.pricing_config?.model === "assinatura" ? "text-[#3B82F6]" :
                              selectedService.pricing_config?.model === "ambos" ? "text-[#F59E0B]" : "text-white/70"
                            }`}>
                              {selectedService.pricing_config?.model === "avulso" && "Avulso"}
                              {selectedService.pricing_config?.model === "assinatura" && "Assinatura"}
                              {selectedService.pricing_config?.model === "ambos" && "Avulso + Assinatura"}
                              {!selectedService.pricing_config?.model && "Avulso"}
                            </p>
                          </div>
                        </div>
                      </div>
                      {(!selectedService.pricing_config?.model || selectedService.pricing_config?.model === "avulso") && (
                        <p className="text-xs leading-relaxed text-white/40 border-t border-white/[0.06] pt-3">
                          Este serviço é cobrado <strong className="text-white/60">por atendimento</strong>.
                        </p>
                      )}
                      {selectedService.pricing_config?.model === "assinatura" && (
                        <p className="text-xs leading-relaxed text-white/40 border-t border-white/[0.06] pt-3">
                          Este serviço está disponível <strong className="text-[#3B82F6]">apenas por assinatura</strong>.
                        </p>
                      )}
                      {selectedService.pricing_config?.model === "ambos" && (
                        <p className="text-xs leading-relaxed text-white/40 border-t border-white/[0.06] pt-3">
                          Este serviço pode ser cobrado como <strong className="text-white/60">avulso</strong> ou via <strong className="text-[#3B82F6]">assinatura</strong>.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* INTERVALOS DO SERVIÇO (cards com preço) */}
                {showInterval && serviceIntervals.length > 0 && (
                  <div className="col-span-full space-y-2">
                    <Label className="text-white/70">Frequência das Visitas *</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {serviceIntervals.map((interval) => (
                        <button
                          key={interval.value}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              visit_interval: interval.value,
                              monthly_value: String(interval.price),
                            });
                          }}
                          className={`rounded-lg p-3 text-left transition-all ${
                            formData.visit_interval === interval.value
                              ? "border-2 border-[#3B82F6] bg-[#3B82F6]/10"
                              : "border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                          }`}
                        >
                          <p className={`text-xs font-medium ${
                            formData.visit_interval === interval.value ? "text-[#3B82F6]" : "text-white/60"
                          }`}>
                            {interval.label}
                          </p>
                          <p className={`mt-1 text-lg font-bold ${
                            formData.visit_interval === interval.value ? "text-[#3B82F6]" : "text-[#22c55e]"
                          }`}>
                            R$ {(interval.price ?? 0).toFixed(2).replace(".", ",")}
                          </p>
                          <p className="text-[10px] text-white/30">por visita</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* PLANO CUSTOMIZADO */}
            {planMode === "custom" && (
              <>
                <div className="col-span-full space-y-2">
                  <Label className="text-white/70">Serviço (opcional)</Label>
                  <div className="relative">
                    <Input
                      value={serviceDropdownOpen ? serviceSearch : (selectedService ? selectedService.name : "")}
                      onChange={(e) => {
                        e.stopPropagation();
                        setServiceSearch(e.target.value);
                        setServiceDropdownOpen(true);
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        setServiceSearch("");
                        setServiceDropdownOpen(true);
                      }}
                      placeholder="Buscar serviço ou deixar vazio para plano avulso..."
                      className="border-white/10 bg-white/[0.03] text-white"
                    />
                    {serviceDropdownOpen && (
                      <div onClick={(e) => e.stopPropagation()} className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, service_id: "", partner_id: "" });
                            setServiceSearch("");
                            setServiceDropdownOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] ${
                            formData.service_id === "" ? "bg-white/[0.08]" : ""
                          }`}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                            <XCircle className="h-4 w-4 text-white/40" />
                          </div>
                          <span className="text-sm text-white/50">Sem serviço (plano avulso)</span>
                        </button>
                        {allServices.map((s) => (
                          <button
                            key={s.service_id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, service_id: s.service_id, partner_id: s.partner_id || "" });
                              setServiceSearch("");
                              setServiceDropdownOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] ${
                              formData.service_id === s.service_id ? "bg-white/[0.08]" : ""
                            }`}
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B5CF6]/10">
                              <Wrench className="h-4 w-4 text-[#8B5CF6]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{s.name}</p>
                              <span className="text-[11px] text-white/40">{s.category}</span>
                            </div>
                          </button>
                        ))}
                        {allServices.length === 0 && (
                          <div className="px-3 py-4 text-center text-sm text-white/30">
                            Nenhum serviço encontrado
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {formData.service_id && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, service_id: "", partner_id: "" })}
                      className="text-xs text-[#8B5CF6] hover:text-[#8B5CF6]/80"
                    >
                      Limpar serviço
                    </button>
                  )}
                </div>
                <div className="col-span-full space-y-2">
                  <Label className="text-white/70">Título do Plano *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Manutenção Preventiva Mensal"
                    className="border-white/10 bg-white/[0.03] text-white"
                  />
                </div>
                <div className="col-span-full space-y-2">
                  <Label className="text-white/70">Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do plano customizado"
                    className="border-white/10 bg-white/[0.03] text-white"
                  />
                </div>
                <div className="col-span-full space-y-2">
                  <Label className="text-white/70">Frequência das Visitas *</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ALL_INTERVALS.map((interval) => {
                      const intervalPrice = selectedService?.pricing_config?.intervals?.find((i) => i.value === interval.value)?.price;
                      return (
                        <button
                          key={interval.value}
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            visit_interval: interval.value,
                            monthly_value: intervalPrice ? String(intervalPrice) : formData.monthly_value,
                          })}
                          className={`rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                            formData.visit_interval === interval.value
                              ? "bg-[#8B5CF6] text-white shadow-lg shadow-purple-500/20"
                              : "bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/80"
                          }`}
                        >
                          {interval.label}
                          {intervalPrice != null && intervalPrice > 0 && (
                            <span className="ml-1 text-[10px] opacity-70">R${intervalPrice}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* VALOR MENSAL (auto-preenchido, editável) */}
            <div className="space-y-2">
              <Label className="text-white/70">Valor Mensal (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.monthly_value}
                onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
                placeholder="0,00"
                className="border-white/10 bg-white/[0.03] text-white"
              />
              {selectedIntervalPrice != null && parseFloat(formData.monthly_value) !== selectedIntervalPrice && (
                <p className="text-[11px] text-[#F59E0B]">
                  Preço original do intervalo: R$ {selectedIntervalPrice.toFixed(2).replace(".", ",")}
                </p>
              )}
            </div>

            {/* DIA DA SEMANA */}
            <div className="space-y-2">
              <Label className="text-white/70">Dia da Semana *</Label>
              <select
                value={formData.billing_day}
                onChange={(e) => setFormData({ ...formData, billing_day: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2.5 text-sm text-white outline-none"
                style={{ colorScheme: "dark" }}
              >
                {Object.entries(WEEKDAY_LABELS).map(([value, label]) => (
                  <option key={value} value={value} className="bg-[#1a1a1a] text-white">{label}</option>
                ))}
              </select>
              <p className="text-[11px] text-white/30">Dia da semana em que o técnico irá comparecer.</p>
            </div>

            {/* DATA DE INÍCIO */}
            <div className="space-y-2">
              <Label className="text-white/70">Data de Início *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>

            {/* OBSERVAÇÕES */}
            <div className="space-y-2">
              <Label className="text-white/70">Observações</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas internas"
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-white/60 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#E30613] hover:bg-[#E30613]/90"
            >
              {saving ? "Salvando..." : selectedSub ? "Salvar Alterações" : "Criar Assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-white/[0.06] bg-[#0f0f0f]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remover Assinatura</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Tem certeza que deseja remover a assinatura{" "}
              <strong className="text-white">{selectedSub?.title}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white/60 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#E30613] hover:bg-[#E30613]/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
