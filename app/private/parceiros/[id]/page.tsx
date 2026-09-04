"use client";

import { useState, useEffect, useCallback, Fragment, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  Users,
  UserPlus,
  Wrench,
  Plus,
  Search,
  DollarSign,
  Eye,
  EyeOff,
  Tag,
  Image as ImageIcon,
  X,
  Loader2,
  Calendar,
  FileText,
  Filter,
  CheckCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { compressImageToWebP, deleteFromStorage, processPendingImages } from "@/lib/imageUtils";
import { ServiceItem } from "@/hooks/useServices";
import SubscriptionVisits from "@/components/SubscriptionVisits";
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
  cnpj: string;
  email: string;
  phone: string | null;
  address: { rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string; cep?: string } | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  commission_percentage: number | null;
}

interface ServiceOrder {
  id: string;
  client_name: string;
  client_cpf: string | null;
  client_phone: string | null;
  address: string;
  scheduled_date: string;
  status: string;
  tech_notes: string | null;
  technician_id: string | null;
  technician_name: string | null;
  created_at: string;
  subscription_id: string | null;
  total: number;
  commission_value: number;
  partner_value: number;
  payment_method: string | null;
  payment_status: string;
  amount_paid: number;
  payments: { date: string; amount: number; method: string; note?: string }[];
  completed_at: string | null;
}

type Tab = "overview" | "services" | "orders" | "billing";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendente", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
  assigned_partner: { label: "Atribuído", color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/10" },
  assigned_tech: { label: "Com Técnico", color: "text-[#3B82F6]", bg: "bg-[#3B82F6]/10" },
  in_progress: { label: "Em Andamento", color: "text-[#3B82F6]", bg: "bg-[#3B82F6]/10" },
  completed: { label: "Concluído", color: "text-[#22c55e]", bg: "bg-[#22c55e]/10" },
  cancelled: { label: "Cancelado", color: "text-[#EF4444]", bg: "bg-[#EF4444]/10" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// ============================================================
// BILLING TAB COMPONENT
// ============================================================
function BillingTab({ partnerId, partner }: { partnerId: string; partner: Partner }) {
  const [billingOrders, setBillingOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<"all" | "month" | "quarter" | "year">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");

  const fetchBillingOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .eq("partner_id", partnerId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      if (error) throw error;
      setBillingOrders(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [partnerId]);

  useEffect(() => { fetchBillingOrders(); }, [fetchBillingOrders]);

  const filteredBillingOrders = billingOrders.filter((o) => {
    if (paymentStatusFilter !== "all" && o.payment_status !== paymentStatusFilter) return false;
    if (periodFilter !== "all" && o.completed_at) {
      const completedDate = new Date(o.completed_at);
      const now = new Date();
      if (periodFilter === "month") {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        if (completedDate < monthAgo) return false;
      } else if (periodFilter === "quarter") {
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        if (completedDate < quarterAgo) return false;
      } else if (periodFilter === "year") {
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        if (completedDate < yearAgo) return false;
      }
    }
    return true;
  });

  const totalBruto = filteredBillingOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalComissao = filteredBillingOrders.reduce((sum, o) => sum + (Number(o.commission_value) || 0), 0);
  const totalLiquido = filteredBillingOrders.reduce((sum, o) => sum + (Number(o.partner_value) || 0), 0);
  const pendenteComissao = filteredBillingOrders
    .filter((o) => o.payment_status !== "pago")
    .reduce((sum, o) => sum + (Number(o.commission_value) || 0), 0);

  const allPaid = filteredBillingOrders.length > 0 && filteredBillingOrders.every((o) => o.payment_status === "pago");
  const hasPending = filteredBillingOrders.some((o) => o.payment_status !== "pago" && o.payment_status !== "cancelado");
  const hasDebt = filteredBillingOrders.some((o) => o.payment_status === "cancelado" && (Number(o.amount_paid) || 0) > 0);

  const statusIndicatorColor = allPaid ? "bg-[#22c55e]" : hasDebt ? "bg-[#EF4444]" : hasPending ? "bg-[#F59E0B]" : "bg-[#22c55e]";
  const statusIndicatorLabel = allPaid ? "Tudo pago" : hasDebt ? "Com devoluções" : hasPending ? "Tem pendente" : "Sem dados";

  const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    pendente: { label: "Pendente", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
    pago_parcial: { label: "Parcial", color: "text-[#3B82F6]", bg: "bg-[#3B82F6]/10" },
    pago: { label: "Pago", color: "text-[#22c55e]", bg: "bg-[#22c55e]/10" },
    cancelado: { label: "Cancelado", color: "text-[#EF4444]", bg: "bg-[#EF4444]/10" },
  };

  const exportCSV = () => {
    const headers = ["Data", "Cliente", "Serviço", "Valor Total", "Comissão (%)", "Valor Líquido", "Status Pgto"];
    const rows = filteredBillingOrders.map((o) => [
      o.completed_at ? format(new Date(o.completed_at), "dd/MM/yyyy") : "—",
      o.client_name,
      o.tech_notes?.substring(0, 50) || "—",
      (Number(o.total) || 0).toFixed(2),
      partner.commission_percentage?.toString() || "30",
      (Number(o.partner_value) || 0).toFixed(2),
      PAYMENT_STATUS_MAP[o.payment_status]?.label || o.payment_status,
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faturamento-${partner.name.replace(/\s+/g, "_")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable = autoTableModule.default;
    const doc = new jsPDF();
    const margin = 15;

    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`Faturamento - ${partner.name}`, margin, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Comissão: ${partner.commission_percentage || 30}% | Gerado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, 22);

    let y = 45;
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO", margin, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [["Métrica", "Valor"]],
      body: [
        ["Faturamento Bruto", formatCurrency(totalBruto)],
        ["Comissão Total", formatCurrency(totalComissao)],
        ["Valor Líquido (Parceiro)", formatCurrency(totalLiquido)],
        ["Pendente de Comissão", formatCurrency(pendenteComissao)],
        ["OSs no Período", String(filteredBillingOrders.length)],
      ],
      theme: "striped",
      headStyles: { fillColor: [227, 6, 19], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable?.finalY || y + 30;
    y += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DETALHAMENTO", margin, y);
    y += 5;

    const tableData = filteredBillingOrders.map((o) => [
      o.completed_at ? format(new Date(o.completed_at), "dd/MM/yyyy") : "—",
      o.client_name,
      formatCurrency(Number(o.total) || 0),
      `${partner.commission_percentage || 30}%`,
      formatCurrency(Number(o.partner_value) || 0),
      PAYMENT_STATUS_MAP[o.payment_status]?.label || o.payment_status,
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Data", "Cliente", "Total", "Comissão", "Líquido", "Status"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      margin: { left: margin, right: margin },
    });

    doc.save(`faturamento-${partner.name.replace(/\s+/g, "_")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-white/50" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-xs text-white/50">Faturamento Bruto</p>
          <p className="mt-1 text-lg font-bold text-white">{formatCurrency(totalBruto)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-xs text-white/50">Comissão Total ({partner.commission_percentage || 30}%)</p>
          <p className="mt-1 text-lg font-bold text-[#C9A84C]">{formatCurrency(totalComissao)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-xs text-white/50">Valor Líquido</p>
          <p className="mt-1 text-lg font-bold text-[#22c55e]">{formatCurrency(totalLiquido)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-xs text-white/50">Pendente de Comissão</p>
          <p className="mt-1 text-lg font-bold text-[#F59E0B]">{formatCurrency(pendenteComissao)}</p>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className={`h-3 w-3 rounded-full ${statusIndicatorColor}`} />
        <span className="text-sm text-white/70">{statusIndicatorLabel}</span>
        <span className="text-xs text-white/40">({filteredBillingOrders.length} OSs no período)</span>
      </div>

      {/* Filters & Export */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-0.5">
          {[{ value: "all", label: "Todos" }, { value: "month", label: "Mês" }, { value: "quarter", label: "Trimestre" }, { value: "year", label: "Ano" }].map((f) => (
            <button key={f.value} onClick={() => setPeriodFilter(f.value as typeof periodFilter)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${periodFilter === f.value ? "bg-[#3B82F6] text-white" : "text-white/50 hover:text-white/70"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-0.5">
          {[{ value: "all", label: "Todos" }, { value: "pendente", label: "Pendente" }, { value: "pago_parcial", label: "Parcial" }, { value: "pago", label: "Pago" }].map((f) => (
            <button key={f.value} onClick={() => setPaymentStatusFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${paymentStatusFilter === f.value ? "bg-[#8B5CF6] text-white" : "text-white/50 hover:text-white/70"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/70 transition-colors hover:bg-white/[0.08]">
            <FileText className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={exportPDF} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/70 transition-colors hover:bg-white/[0.08]">
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Serviço</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/50">Valor Total</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/50">Comissão (%)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/50">Valor Líquido</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-white/50">Status Pgto</th>
            </tr>
          </thead>
          <tbody>
            {filteredBillingOrders.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-white/30">Nenhuma OS concluída encontrada.</td></tr>
            ) : (
              filteredBillingOrders.map((o) => (
                <tr key={o.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-xs text-white/50">
                    {o.completed_at ? format(new Date(o.completed_at), "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-white">{o.client_name}</td>
                  <td className="px-4 py-3 text-xs text-white/50 max-w-[200px] truncate">{o.tech_notes || "—"}</td>
                  <td className="px-4 py-3 text-sm text-right text-white/70">{formatCurrency(Number(o.total) || 0)}</td>
                  <td className="px-4 py-3 text-sm text-right text-[#C9A84C]">{partner.commission_percentage || 30}%</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-[#22c55e]">{formatCurrency(Number(o.partner_value) || 0)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_MAP[o.payment_status]?.bg || ""} ${PAYMENT_STATUS_MAP[o.payment_status]?.color || "text-white/40"}`}>
                      {PAYMENT_STATUS_MAP[o.payment_status]?.label || o.payment_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PartnerPanelPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const isPartnerRoute = pathname.startsWith("/parceiro");
  const basePath = isPartnerRoute ? "/" : "/private/parceiros";
  const partnerId = params.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Overview states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [techDialogOpen, setTechDialogOpen] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [techForm, setTechForm] = useState({ cpf: "" });
  const [savingTech, setSavingTech] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "", cnpj: "", email: "", phone: "", rua: "", numero: "", bairro: "", cidade: "", estado: "", cep: "", notes: "", commission_percentage: "30",
  });

  // Services states
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceEditDialogOpen, setServiceEditDialogOpen] = useState(false);
  const [serviceDeleteDialogOpen, setServiceDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [serviceImages, setServiceImages] = useState<string[]>([]);
  const [servicePendingFiles, setServicePendingFiles] = useState<File[]>([]);
  const [servicePreviews, setServicePreviews] = useState<Map<File, string>>(new Map());
  const [serviceDragOver, setServiceDragOver] = useState(false);
  const serviceFileInputRef = useRef<HTMLInputElement>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "", description: "", category: "", type: "convencional" as "convencional" | "inverter",
    price: "", discount_percentage: "", badge_garantia: "GARANTIA 90 DIAS", icon_name: "Wrench",
  });
  const [pricingModel, setPricingModel] = useState<"avulso" | "assinatura" | "ambos">("avulso");
  const [pricingIntervals, setPricingIntervals] = useState<{ value: string; label: string; days: number; price: number }[]>([]);

  // Orders states
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "avulso" | "assinatura">("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Subscriptions states
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [subSearch, setSubSearch] = useState("");
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  // Create OS from subscription dialog
  const [createOSDialogOpen, setCreateOSDialogOpen] = useState(false);
  const [selectedSubForOS, setSelectedSubForOS] = useState<any>(null);
  const [osForm, setOsForm] = useState({
    client_name: "", client_cpf: "", client_phone: "", address: "", cep: "",
    scheduled_date: format(new Date(), "yyyy-MM-dd"), tech_notes: "",
  });

  const lookupCEP = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setOsForm((prev) => ({
          ...prev,
          address: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`,
        }));
        toast.success("Endereço preenchido automaticamente!");
      } else {
        toast.error("CEP não encontrado.");
      }
    } catch {
      toast.error("Erro ao buscar CEP.");
    }
  };

  const fetchPartner = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("partners").select("*").eq("id", partnerId).single();
      if (error) throw error;
      setPartner(data);
    } catch { toast.error("Erro ao carregar parceiro."); router.push(basePath); }
    finally { setLoading(false); }
  }, [partnerId, router]);

  const fetchTechnicians = useCallback(async () => {
    setLoadingTechs(true);
    try {
      const { data: techData } = await supabase.from("partner_technicians").select("id, cpf, user_id").eq("partner_id", partnerId);
      if (techData && techData.length > 0) {
        const userIds = techData.map((t) => t.user_id).filter(Boolean);
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        setTechnicians(techData.map((t) => ({ ...t, profile: profiles?.find((p) => p.id === t.user_id) })));
      }
    } catch (e) { console.error(e); }
    finally { setLoadingTechs(false); }
  }, [partnerId]);

  const fetchServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const { data, error } = await supabase.from("partner_services").select("*").eq("partner_id", partnerId).order("sort_order", { ascending: true });
      if (error) throw error;
      setServices(data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingServices(false); }
  }, [partnerId]);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch technician names
      const techIds = (data || []).map((o) => o.technician_id).filter(Boolean);
      let techMap = new Map<string, string>();
      if (techIds.length > 0) {
        const { data: techs } = await supabase.from("profiles").select("id, full_name").in("id", techIds);
        (techs || []).forEach((t) => techMap.set(t.id, t.full_name));
      }

      setOrders((data || []).map((o) => ({ ...o, technician_name: techMap.get(o.technician_id) || null })));
    } catch (e) { console.error(e); }
    finally { setLoadingOrders(false); }
  }, [partnerId]);

  const fetchSubscriptions = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const enriched = await Promise.all((subs || []).map(async (sub) => {
        let clientName = "—";
        let serviceName = "—";
        let clientPhone = "";
        let clientAddress = "";
        if (sub.client_id) {
          const { data: c } = await supabase.from("clientes").select("nome, telefone, endereco").eq("id", sub.client_id).single();
          if (c) { clientName = c.nome; clientPhone = c.telefone || ""; clientAddress = c.endereco || ""; }
        }
        if (sub.service_id) {
          const { data: s } = await supabase.from("services").select("name").eq("service_id", sub.service_id).single();
          if (s) serviceName = s.name;
        }
        return { ...sub, client_name: clientName, service_name: serviceName, client_phone: clientPhone, client_address: clientAddress };
      }));

      setSubscriptions(enriched);
    } catch (e) { console.error(e); }
    finally { setLoadingSubs(false); }
  }, [partnerId]);

  useEffect(() => {
    fetchPartner();
    fetchTechnicians();
    fetchServices();
    fetchOrders();
    fetchSubscriptions();
  }, [fetchPartner, fetchTechnicians, fetchServices, fetchOrders, fetchSubscriptions]);

  // === OVERVIEW HANDLERS ===
  const handleEditSave = async () => {
    if (!formData.name || !formData.cnpj || !formData.email) { toast.error("Preencha nome, CNPJ e email."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("partners").update({
        name: formData.name, cnpj: formData.cnpj, email: formData.email, phone: formData.phone || null,
        address: { rua: formData.rua || null, numero: formData.numero || null, bairro: formData.bairro || null, cidade: formData.cidade || null, estado: formData.estado || null, cep: formData.cep || null },
        notes: formData.notes || null,
        commission_percentage: parseFloat(formData.commission_percentage) || 30,
      }).eq("id", partnerId);
      if (error) throw error;
      toast.success("Parceiro atualizado!"); setEditDialogOpen(false); fetchPartner();
    } catch (e: any) { toast.error(e.message || "Erro ao salvar."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("partners").delete().eq("id", partnerId);
      if (error) throw error;
      toast.success("Parceiro removido!"); router.push(basePath);
    } catch (e: any) { toast.error(e.message || "Erro ao remover."); }
  };

  const formatCPF = (value: string): string => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    return numbers.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const validateCPF = (cpf: string): boolean => {
    const numbers = cpf.replace(/\D/g, "");
    if (numbers.length !== 11 || /^(\d)\1{10}$/.test(numbers)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(numbers[i]) * (10 - i);
    let remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(numbers[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(numbers[i]) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    return remainder === parseInt(numbers[10]);
  };

  const handleAddTech = async () => {
    if (!selectedUser) { toast.error("Selecione um usuário."); return; }
    if (!techForm.cpf) { toast.error("CPF é obrigatório."); return; }
    if (!validateCPF(techForm.cpf)) { toast.error("CPF inválido."); return; }
    setSavingTech(true);
    try {
      const { error } = await supabase.from("partner_technicians").insert({ partner_id: partnerId, user_id: selectedUser.id, cpf: techForm.cpf.replace(/\D/g, "") });
      if (error) throw error;

      // Link profile to partner
      await supabase.from("profiles").update({ partner_id: partnerId }).eq("id", selectedUser.id);

      toast.success("Técnico adicionado!"); setTechDialogOpen(false); setSelectedUser(null); setTechForm({ cpf: "" }); fetchTechnicians();
    } catch (e: any) { toast.error(e.message || "Erro ao adicionar técnico."); }
    finally { setSavingTech(false); }
  };

  const handleRemoveTech = async (techId: string) => {
    try {
      const { error } = await supabase.from("partner_technicians").delete().eq("id", techId);
      if (error) throw error;
      toast.success("Técnico removido!"); fetchTechnicians();
    } catch (e: any) { toast.error(e.message || "Erro ao remover técnico."); }
  };

  const searchUsers = async (q: string) => {
    if (!q || q.length < 2) { setUserSearchResults([]); return; }
    setSearchingUsers(true);
    try { const { data } = await supabase.from("profiles").select("id, full_name").ilike("full_name", `%${q}%`).limit(5); setUserSearchResults(data || []); }
    catch (e) { console.error(e); }
    finally { setSearchingUsers(false); }
  };

  // === SERVICES HANDLERS ===
  const filteredServices = services.filter((s) => s.name.toLowerCase().includes(serviceSearch.toLowerCase()) || s.category.toLowerCase().includes(serviceSearch.toLowerCase()));

  const openCreateService = () => {
    setSelectedService(null);
    setServiceForm({ name: "", description: "", category: "", type: "convencional", price: "", discount_percentage: "0", badge_garantia: "GARANTIA 90 DIAS", icon_name: "Wrench" });
    setPricingModel("avulso"); setPricingIntervals([]); setServiceImages([]); setServicePendingFiles([]); setServicePreviews(new Map()); setServiceEditDialogOpen(true);
  };

  const openEditService = (service: ServiceItem) => {
    setSelectedService(service);
    setServiceForm({ name: service.name, description: service.description || "", category: service.category || "", type: service.type, price: service.price?.toString() || "", discount_percentage: service.discount_percentage?.toString() || "0", badge_garantia: service.badge_garantia || "GARANTIA 90 DIAS", icon_name: service.icon_name || "Wrench" });
    setPricingModel(service.pricing_config?.model || "avulso"); setPricingIntervals(service.pricing_config?.intervals || []); setServiceImages(service.images || []); setServicePendingFiles([]); setServicePreviews(new Map()); setServiceEditDialogOpen(true);
  };

  const closeServiceEditDialog = () => {
    servicePreviews.forEach((url) => URL.revokeObjectURL(url));
    setServicePreviews(new Map());
    setServicePendingFiles([]);
    setServiceEditDialogOpen(false);
  };

  const addServicePendingFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter((f) => {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: muito grande. Máx 10MB.`); return false; }
      if (!f.type.startsWith("image/")) { toast.error(`${f.name}: não é imagem.`); return false; }
      return true;
    });
    setServicePendingFiles((prev) => [...prev, ...valid]);
    setServicePreviews((prev) => {
      const next = new Map(prev);
      valid.forEach((f) => next.set(f, URL.createObjectURL(f)));
      return next;
    });
  }, []);

  const handleServiceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addServicePendingFiles(e.target.files);
    if (serviceFileInputRef.current) serviceFileInputRef.current.value = "";
  };

  const handleServiceDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setServiceDragOver(false);
    if (e.dataTransfer.files) addServicePendingFiles(e.dataTransfer.files);
  }, [addServicePendingFiles]);

  const handleServiceDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setServiceDragOver(true);
  }, []);

  const handleServiceDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setServiceDragOver(false);
  }, []);

  const removeServiceImage = async (index: number) => {
    setServiceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeServicePendingFile = (index: number) => {
    setServicePendingFiles((prev) => {
      const file = prev[index];
      if (file) {
        const url = servicePreviews.get(file);
        if (url) URL.revokeObjectURL(url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveService = async () => {
    if (!serviceForm.name) return;
    setSaving(true);

    const folder = selectedService?.service_id || `partner-${partnerId}-${Date.now()}`;
    const finalImages = await processPendingImages(
      supabase, "service-images", folder, servicePendingFiles, serviceImages
    );

    servicePreviews.forEach((url) => URL.revokeObjectURL(url));
    setServicePreviews(new Map());
    setServicePendingFiles([]);

    const pricingConfig = pricingModel === "avulso" ? null : { model: pricingModel, intervals: pricingIntervals };
    const serviceData = { name: serviceForm.name, description: serviceForm.description, category: serviceForm.category, type: serviceForm.type, price: serviceForm.price ? parseFloat(serviceForm.price) : null, discount_percentage: parseInt(serviceForm.discount_percentage) || 0, badge_garantia: serviceForm.badge_garantia, icon_name: serviceForm.icon_name, images: finalImages, partner_id: partnerId, pricing_config: pricingConfig };
    if (selectedService) {
      const { error } = await supabase.from("partner_services").update(serviceData).eq("id", selectedService.id);
      if (error) { toast.error("Erro ao salvar: " + error.message); } else { toast.success("Serviço atualizado!"); closeServiceEditDialog(); fetchServices(); }
    } else {
      const service_id = serviceForm.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + `-${Date.now()}`;
      const { error } = await supabase.from("partner_services").insert({ ...serviceData, service_id, active: true, sort_order: 0 });
      if (error) { toast.error("Erro ao criar: " + error.message); } else { toast.success("Serviço criado!"); closeServiceEditDialog(); fetchServices(); }
    }
    setSaving(false);
  };

  const handleDeleteService = async () => {
    if (!selectedService) return;
    setSaving(true);
    // Remove images from storage
    for (const img of selectedService.images || []) {
      await deleteFromStorage(supabase, "service-images", img);
    }
    const { error } = await supabase.from("partner_services").delete().eq("id", selectedService.id);
    if (error) { toast.error("Erro ao excluir: " + error.message); } else { toast.success("Serviço excluído!"); setServiceDeleteDialogOpen(false); fetchServices(); }
    setSaving(false);
  };

  const toggleServiceActive = async (service: ServiceItem) => {
    const { error } = await supabase.from("partner_services").update({ active: !service.active }).eq("id", service.id);
    if (error) { toast.error("Erro ao alterar status"); } else { toast.success(service.active ? "Desativado" : "Ativado"); fetchServices(); }
  };

  // === ORDERS HANDLERS ===
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
    const matchesType = orderTypeFilter === "all" ||
      (orderTypeFilter === "assinatura" && o.subscription_id) ||
      (orderTypeFilter === "avulso" && !o.subscription_id);
    const matchesSearch = !orderSearch || o.client_name.toLowerCase().includes(orderSearch.toLowerCase()) || o.address.toLowerCase().includes(orderSearch.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  // === SUBSCRIPTIONS HANDLERS ===
  const filteredSubs = subscriptions.filter((s) =>
    !subSearch || s.title.toLowerCase().includes(subSearch.toLowerCase()) ||
    s.client_name.toLowerCase().includes(subSearch.toLowerCase()) ||
    s.service_name?.toLowerCase().includes(subSearch.toLowerCase())
  );

  const openCreateOS = () => {
    setSelectedSubForOS(null);
    setOsForm({ client_name: "", client_cpf: "", client_phone: "", address: "", cep: "", scheduled_date: format(new Date(), "yyyy-MM-dd"), tech_notes: "" });
    setCreateOSDialogOpen(true);
  };

  const openCreateOSFromSub = (sub: any, visitDate?: Date) => {
    setSelectedSubForOS(sub);
    setOsForm({
      client_name: sub.client_name || "",
      client_cpf: "",
      client_phone: sub.client_phone || "",
      address: sub.client_address || "",
      cep: "",
      scheduled_date: visitDate ? format(visitDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      tech_notes: `OS referente à assinatura: ${sub.title}`,
    });
    setCreateOSDialogOpen(true);
  };

  const handleCreateOS = async () => {
    if (!osForm.client_name) { toast.error("Nome do cliente é obrigatório."); return; }
    try {
      const { data: newOrder, error } = await supabase.from("service_orders").insert({
        client_name: osForm.client_name,
        client_cpf: osForm.client_cpf.replace(/\D/g, "") || null,
        client_phone: osForm.client_phone.replace(/\D/g, "") || null,
        address: osForm.address || "A definir",
        scheduled_date: osForm.scheduled_date + "T12:00:00",
        partner_id: partnerId,
        status: "pending",
        tech_notes: osForm.tech_notes || null,
        subscription_id: selectedSubForOS?.id || null,
      }).select("id").single();
      if (error) throw error;

      // Criar ou atualizar visita para o mês (match por mês/ano)
      if (selectedSubForOS) {
        const scheduledMonth = osForm.scheduled_date.substring(0, 7); // "2026-09"
        const { data: existingVisit } = await supabase
          .from("subscription_visits")
          .select("id")
          .eq("subscription_id", selectedSubForOS.id)
          .like("visit_date", `${scheduledMonth}%`)
          .maybeSingle();

        if (existingVisit) {
          await supabase.from("subscription_visits").update({ status: "pending", service_order_id: newOrder.id }).eq("id", existingVisit.id);
        } else {
          await supabase.from("subscription_visits").insert({
            subscription_id: selectedSubForOS.id,
            visit_date: osForm.scheduled_date,
            status: "pending",
            service_order_id: newOrder.id,
          });
        }
      }

      toast.success("OS criada com sucesso!"); setCreateOSDialogOpen(false); fetchOrders(); fetchSubscriptions();
    } catch (e: any) { toast.error(e.message || "Erro ao criar OS."); }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    let rpcError = null;

    if (newStatus === "in_progress") {
      const { error } = await supabase.rpc("tech_checkin", {
        p_so_id: orderId,
        p_client_cpf_input: "",
      });
      rpcError = error;
    } else if (newStatus === "completed") {
      const { error } = await supabase.rpc("complete_service_order", {
        p_so_id: orderId,
        p_tech_notes: "Concluído pelo parceiro",
        p_photos: [],
        p_client_signature: null,
      });
      rpcError = error;
    } else if (newStatus === "cancelled") {
      const { error } = await supabase.rpc("cancel_service_order", {
        p_so_id: orderId,
        p_reason: null,
      });
      rpcError = error;
    }

    if (rpcError) { toast.error("Erro ao atualizar status"); return; }

    // Se completou, calcular comissão do parceiro
    if (newStatus === "completed") {
      await supabase.rpc("calculate_partner_commission", { p_service_order_id: orderId });

      // Se completou uma OS de assinatura, marcar visita como completed
      const order = orders.find((o) => o.id === orderId);
      if (order?.subscription_id) {
        const now = new Date();
        const { data: visit } = await supabase
          .from("subscription_visits")
          .select("id")
          .eq("subscription_id", order.subscription_id)
          .gte("visit_date", format(now, "yyyy-MM-01"))
          .lte("visit_date", format(now, "yyyy-MM-31"))
          .maybeSingle();

        if (visit) {
          await supabase.from("subscription_visits").update({ status: "completed" }).eq("id", visit.id);
        }
      }
    }

    toast.success("Status atualizado!"); fetchOrders(); fetchSubscriptions();
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]"><div className="text-sm text-white/40">Carregando painel...</div></div>;
  }
  if (!partner) return null;

  const tabs: { value: Tab; label: string; icon: any }[] = [
    { value: "overview", label: "Visão Geral", icon: Building2 },
    { value: "services", label: "Serviços", icon: Wrench },
    { value: "orders", label: "Pedidos", icon: FileText },
    { value: "billing", label: "Faturamento", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.push(basePath)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Parceiros
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#C9A84C]/10"><Building2 className="h-7 w-7 text-[#C9A84C]" /></div>
            <div>
              <h1 className="text-2xl font-bold text-white">{partner.name}</h1>
              <p className="text-sm text-white/50">{partner.cnpj}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setFormData({ name: partner.name, cnpj: partner.cnpj, email: partner.email, phone: partner.phone || "", rua: partner.address?.rua || "", numero: partner.address?.numero || "", bairro: partner.address?.bairro || "", cidade: partner.address?.cidade || "", estado: partner.address?.estado || "", cep: partner.address?.cep || "", notes: partner.notes || "", commission_percentage: (partner.commission_percentage ?? 30).toString() }); setEditDialogOpen(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"><Edit className="h-4 w-4" /> Editar</button>
            <button onClick={() => setDeleteDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#E30613]/10 px-3 py-2 text-sm text-[#E30613] transition-colors hover:bg-[#E30613]/20"><Trash2 className="h-4 w-4" /> Excluir</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
        {tabs.map((tab) => (
          <button key={tab.value} onClick={() => setActiveTab(tab.value)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${activeTab === tab.value ? "bg-[#3B82F6] text-white shadow-lg shadow-blue-500/20" : "text-white/50 hover:text-white/70"}`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            <h3 className="text-sm font-medium text-white/70">Informações</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/60"><Mail className="h-4 w-4" /> {partner.email}</div>
              {partner.phone && <div className="flex items-center gap-2 text-sm text-white/60"><Phone className="h-4 w-4" /> {partner.phone}</div>}
              {partner.address && <div className="flex items-center gap-2 text-sm text-white/60"><MapPin className="h-4 w-4" /> {[partner.address.rua, partner.address.numero, partner.address.bairro, partner.address.cidade, partner.address.estado].filter(Boolean).join(", ")}</div>}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-white/70">Técnicos ({technicians.length})</h3>
              <button onClick={() => setTechDialogOpen(true)} className="inline-flex items-center gap-1 rounded-lg bg-[#8B5CF6]/10 px-2 py-1 text-xs text-[#8B5CF6] transition-colors hover:bg-[#8B5CF6]/20"><UserPlus className="h-3 w-3" /> Adicionar</button>
            </div>
            <div className="space-y-2">
              {technicians.length === 0 ? <p className="text-xs text-white/30">Nenhum técnico.</p> :
                technicians.map((tech) => (
                  <div key={tech.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                    <span className="text-sm text-white/70">{tech.profile?.full_name || "Sem nome"}</span>
                    <button onClick={() => handleRemoveTech(tech.id)} className="text-xs text-[#E30613] hover:underline">Remover</button>
                  </div>
                ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            <h3 className="text-sm font-medium text-white/70">Resumo</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-white/50">Serviços</span><span className="font-medium text-white">{services.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/50">Pedidos Totais</span><span className="font-medium text-white">{orders.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/50">Pedidos Pendentes</span><span className="font-medium text-[#F59E0B]">{orders.filter(o => o.status === "pending").length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/50">Pedidos Concluídos</span><span className="font-medium text-[#22c55e]">{orders.filter(o => o.status === "completed").length}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Services */}
      {activeTab === "services" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input type="text" placeholder="Buscar serviço..." value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#3B82F6]/50" />
            </div>
            <Button onClick={openCreateService} className="bg-[#E30613] hover:bg-[#E30613]/90"><Plus className="mr-2 h-4 w-4" /> Novo</Button>
          </div>
          {loadingServices ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-white/50" /></div> :
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map((service) => (
                <div key={service.id} className={`group relative overflow-hidden rounded-xl border ${!service.active ? "border-red-500/20 opacity-60" : "border-white/[0.06]"} bg-[#0f0f0f]`}>
                  <div className="relative h-40 w-full overflow-hidden bg-white/[0.02]">
                    {service.images && service.images.length > 0 ? <img src={service.images[0]} alt={service.name} className="h-full w-full object-cover" /> :
                      <div className="flex h-full w-full items-center justify-center"><ImageIcon className="h-12 w-12 text-white/20" /></div>}
                    <div className="absolute right-2 top-2 z-10 flex gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${service.type === "inverter" ? "bg-[#8B5CF6]/20 text-[#8B5CF6]" : "bg-[#E30613]/20 text-[#E30613]"}`}>{service.type}</span>
                      {!service.active && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">Inativo</span>}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-white">{service.name}</h3>
                    <p className="mt-1 text-xs text-white/50">{service.category}</p>
                    <div className="mt-3 flex items-center gap-3">
                      {service.price && <span className="flex items-center gap-1 text-sm font-bold text-green-400"><DollarSign className="h-3 w-3" /> {service.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                      {service.discount_percentage > 0 && <span className="flex items-center gap-1 text-xs text-[#C9A84C]"><Tag className="h-3 w-3" /> {service.discount_percentage}% OFF</span>}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button onClick={() => openEditService(service)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.08]"><Edit className="h-4 w-4" /> Editar</button>
                      <button onClick={() => toggleServiceActive(service)} className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${service.active ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" : "bg-green-500/20 text-green-400 hover:bg-green-500/30"}`}>
                        {service.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button onClick={() => { setSelectedService(service); setServiceDeleteDialogOpen(true); }} className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-400 transition-colors hover:bg-red-500/30"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredServices.length === 0 && <div className="col-span-full py-12 text-center text-sm text-white/40">Nenhum serviço encontrado.</div>}
            </div>
          }
        </div>
      )}

      {/* TAB: Orders */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input type="text" placeholder="Buscar por cliente ou endereço..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#3B82F6]/50" />
            </div>
            <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-0.5">
              {[{ value: "all", label: "Todos" }, { value: "avulso", label: "Avulso" }, { value: "assinatura", label: "Assinatura" }].map((f) => (
                <button key={f.value} onClick={() => setOrderTypeFilter(f.value as typeof orderTypeFilter)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${orderTypeFilter === f.value ? "bg-[#8B5CF6] text-white" : "text-white/50 hover:text-white/70"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-0.5">
              {[{ value: "all", label: "Todos" }, { value: "pending", label: "Pendente" }, { value: "in_progress", label: "Em Andamento" }, { value: "completed", label: "Concluído" }, { value: "cancelled", label: "Cancelado" }].map((f) => (
                <button key={f.value} onClick={() => setOrderStatusFilter(f.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${orderStatusFilter === f.value ? "bg-[#3B82F6] text-white" : "text-white/50 hover:text-white/70"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <Button onClick={openCreateOS} className="bg-[#3B82F6] hover:bg-[#3B82F6]/80"><Plus className="mr-2 h-4 w-4" /> Nova OS</Button>
          </div>

          {/* Orders Table */}
          {loadingOrders ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-white/50" /></div> :
            <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="w-8 px-2 py-3"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Endereço</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/50">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-white/30">Nenhum pedido encontrado.</td></tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <Fragment key={order.id}>
                        <tr className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-2 py-3">
                            {order.subscription_id && (
                              <button onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:text-white">
                                {expandedOrder === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-white">{order.client_name}</p>
                              {order.client_phone && <p className="text-xs text-white/40">{order.client_phone}</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-white/60 max-w-[200px] truncate">{order.address}</td>
                          <td className="px-4 py-3 text-xs text-white/50">
                            {format(new Date(order.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${order.subscription_id ? "bg-[#8B5CF6]/10 text-[#8B5CF6]" : "bg-white/5 text-white/50"}`}>
                              {order.subscription_id ? "Assinatura" : "Avulso"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[order.status]?.bg || ""} ${STATUS_LABELS[order.status]?.color || "text-white/40"}`}>
                              {STATUS_LABELS[order.status]?.label || order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {order.status === "pending" && (
                                <button onClick={() => updateOrderStatus(order.id, "in_progress")}
                                  className="rounded-lg bg-[#3B82F6]/10 px-2 py-1 text-xs text-[#3B82F6] hover:bg-[#3B82F6]/20">Iniciar</button>
                              )}
                              {order.status === "in_progress" && !order.subscription_id && (
                                <button onClick={() => updateOrderStatus(order.id, "completed")}
                                  className="rounded-lg bg-[#22c55e]/10 px-2 py-1 text-xs text-[#22c55e] hover:bg-[#22c55e]/20">Concluir</button>
                              )}
                              {(order.status === "pending" || order.status === "in_progress") && (
                                <button onClick={() => updateOrderStatus(order.id, "cancelled")}
                                  className="rounded-lg bg-[#EF4444]/10 px-2 py-1 text-xs text-[#EF4444] hover:bg-[#EF4444]/20">Cancelar</button>
                              )}
                              {order.subscription_id && (
                                <a href={`${basePath}/${partnerId}/os/${order.id}`} target="_blank"
                                  className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/60 hover:bg-white/10">Ver OS</a>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedOrder === order.id && order.subscription_id && (
                          <tr key={`${order.id}-visits`} className="border-b border-white/[0.03] bg-white/[0.01]">
                            <td colSpan={7} className="px-6 py-6">
                              {(() => {
                                const sub = subscriptions.find((s) => s.id === order.subscription_id);
                                return sub ? (
                                  <SubscriptionVisits
                                    subscription={sub}
                                    isPartnerService={true}
                                    onCreateOS={(monthDate) => openCreateOSFromSub(sub, monthDate)}
                                  />
                                ) : <p className="text-xs text-white/30">Assinatura não encontrada.</p>;
                              })()}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          }
        </div>
      )}

      {/* TAB: Billing */}
      {activeTab === "billing" && (
        <BillingTab partnerId={partnerId} partner={partner} />
      )}

      {/* === DIALOGS === */}

      {/* Edit Partner Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl border-white/[0.06] bg-[#0f0f0f]">
          <DialogHeader><DialogTitle className="text-white">Editar Parceiro</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label className="text-white/70">Nome *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="border-white/10 bg-[#1a1a1a] text-white" /></div>
            <div className="space-y-2"><Label className="text-white/70">CNPJ *</Label><Input value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} className="border-white/10 bg-[#1a1a1a] text-white" /></div>
            <div className="space-y-2"><Label className="text-white/70">Email *</Label><Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="border-white/10 bg-[#1a1a1a] text-white" /></div>
            <div className="space-y-2"><Label className="text-white/70">Telefone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="border-white/10 bg-[#1a1a1a] text-white" /></div>
            <div className="col-span-full space-y-2"><Label className="text-white/70">Observações</Label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none" rows={2} /></div>
            <div className="space-y-2"><Label className="text-white/70">Comissão (%)</Label><Input type="number" min="0" max="100" step="0.5" value={formData.commission_percentage} onChange={(e) => setFormData({ ...formData, commission_percentage: e.target.value })} className="border-white/10 bg-[#1a1a1a] text-white" /><p className="text-xs text-white/40">Percentual retido pela empresa. O parceiro recebe o restante.</p></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-white/10 text-white/70">Cancelar</Button>
            <Button onClick={handleEditSave} disabled={saving} className="bg-[#3B82F6] text-white hover:bg-[#3B82F6]/80">{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Partner Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-white/[0.06] bg-[#0f0f0f]">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Excluir parceiro?</AlertDialogTitle><AlertDialogDescription className="text-white/50">Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="border-white/10 text-white/70">Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#E30613] text-white hover:bg-[#E30613]/80">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tech Dialog */}
      <Dialog open={techDialogOpen} onOpenChange={setTechDialogOpen}>
        <DialogContent className="max-w-md border-white/[0.06] bg-[#0f0f0f]">
          <DialogHeader><DialogTitle className="text-white">Adicionar Técnico</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Buscar Usuário</Label>
              <Input placeholder="Nome do técnico..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); searchUsers(e.target.value); }} className="border-white/10 bg-[#1a1a1a] text-white" />
              {searchingUsers && <p className="text-xs text-white/30">Buscando...</p>}
              {userSearchResults.length > 0 && (
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-[#1a1a1a] p-1">
                  {userSearchResults.map((u) => (
                    <button key={u.id} onClick={() => { setSelectedUser(u); setUserSearch(u.full_name); setUserSearchResults([]); }} className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/[0.06]">{u.full_name}</button>
                  ))}
                </div>
              )}
              {selectedUser && <p className="text-xs text-[#22c55e]">Selecionado: {selectedUser.full_name}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">CPF *</Label>
              <Input placeholder="000.000.000-00" value={techForm.cpf} onChange={(e) => setTechForm({ ...techForm, cpf: formatCPF(e.target.value) })} maxLength={14}
                className={`border-white/10 bg-[#1a1a1a] text-white ${techForm.cpf && !validateCPF(techForm.cpf) ? "border-[#E30613]/50" : techForm.cpf && validateCPF(techForm.cpf) ? "border-[#22c55e]/50" : ""}`} />
              {techForm.cpf && !validateCPF(techForm.cpf) && <p className="text-xs text-[#E30613]">CPF inválido</p>}
              {techForm.cpf && validateCPF(techForm.cpf) && <p className="text-xs text-[#22c55e]">CPF válido</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTechDialogOpen(false)} className="border-white/10 text-white/70">Cancelar</Button>
            <Button onClick={handleAddTech} disabled={savingTech} className="bg-[#8B5CF6] text-white hover:bg-[#8B5CF6]/80">{savingTech ? "Adicionando..." : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create OS Dialog */}
      <Dialog open={createOSDialogOpen} onOpenChange={setCreateOSDialogOpen}>
        <DialogContent className="max-w-lg border-white/[0.06] bg-[#0f0f0f]">
          <DialogHeader><DialogTitle className="text-white">Criar Ordem de Serviço</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-white/70">Nome do Cliente *</Label><Input value={osForm.client_name} onChange={(e) => setOsForm({ ...osForm, client_name: e.target.value })} placeholder="Nome completo" className="border-white/10 bg-[#1a1a1a] text-white" /></div>
              <div className="space-y-2"><Label className="text-white/70">CPF</Label><Input placeholder="000.000.000-00" value={osForm.client_cpf} onChange={(e) => setOsForm({ ...osForm, client_cpf: formatCPF(e.target.value) })} maxLength={14} className="border-white/10 bg-[#1a1a1a] text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-white/70">Telefone</Label><Input value={osForm.client_phone} onChange={(e) => setOsForm({ ...osForm, client_phone: e.target.value })} placeholder="(00) 00000-0000" className="border-white/10 bg-[#1a1a1a] text-white" /></div>
              <div className="space-y-2"><Label className="text-white/70">Data Agendada *</Label><Input type="date" value={osForm.scheduled_date} onChange={(e) => setOsForm({ ...osForm, scheduled_date: e.target.value })} className="border-white/10 bg-[#1a1a1a] text-white" style={{ colorScheme: "dark" }} /></div>
            </div>
            <div className="space-y-2"><Label className="text-white/70">CEP</Label><Input placeholder="00000-000" value={osForm.cep} onChange={(e) => setOsForm({ ...osForm, cep: e.target.value })} onBlur={(e) => lookupCEP(e.target.value)} maxLength={9} className="border-white/10 bg-[#1a1a1a] text-white" /></div>
            <div className="space-y-2"><Label className="text-white/70">Endereço</Label><Input value={osForm.address} onChange={(e) => setOsForm({ ...osForm, address: e.target.value })} placeholder="Rua, número - Bairro" className="border-white/10 bg-[#1a1a1a] text-white" /></div>
            <div className="space-y-2"><Label className="text-white/70">Observações</Label><textarea value={osForm.tech_notes} onChange={(e) => setOsForm({ ...osForm, tech_notes: e.target.value })} placeholder="Detalhes do atendimento..." className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOSDialogOpen(false)} className="border-white/10 text-white/70">Cancelar</Button>
            <Button onClick={handleCreateOS} className="bg-[#3B82F6] text-white hover:bg-[#3B82F6]/80">Criar OS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Edit Dialog */}
      <Dialog open={serviceEditDialogOpen} onOpenChange={closeServiceEditDialog}>
        <DialogContent className="max-w-2xl border-white/[0.06] bg-[#0f0f0f] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white">{selectedService ? "Editar Serviço" : "Novo Serviço"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Imagens</Label>
              <div
                className={`grid grid-cols-4 gap-2 ${serviceDragOver ? "rounded-lg ring-2 ring-[#E30613]/60 p-1" : ""}`}
                onDrop={handleServiceDrop}
                onDragOver={handleServiceDragOver}
                onDragLeave={handleServiceDragLeave}
              >
                {serviceImages.map((img, idx) => (
                  <div key={`old-${idx}`} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10">
                    <img src={img} alt={`Img ${idx + 1}`} className="h-full w-full object-cover" />
                    <button onClick={() => removeServiceImage(idx)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                {servicePendingFiles.map((file, idx) => (
                  <div key={`new-${idx}`} className="group relative aspect-square overflow-hidden rounded-lg border border-dashed border-emerald-400/40">
                    <img src={servicePreviews.get(file)} alt={`Nova ${idx + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-emerald-500/80 px-1 py-0.5 text-[8px] text-white">NOVA</span>
                    <button onClick={() => removeServicePendingFile(idx)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.02] transition-colors hover:bg-white/[0.04]">
                  <input ref={serviceFileInputRef} type="file" accept="image/*" multiple onChange={handleServiceImageUpload} className="hidden" />
                  <Plus className="h-5 w-5 text-white/40" />
                </label>
              </div>
              <p className="text-[10px] text-white/40">Arraste e solte ou clique · WebP ao salvar · Máx. 200KB</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-white/70">Nome *</Label><Input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} className="border-white/10 bg-[#1a1a1a] text-white" /></div>
              <div className="space-y-2"><Label className="text-white/70">Categoria</Label><Input value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} className="border-white/10 bg-[#1a1a1a] text-white" /></div>
              <div className="space-y-2"><Label className="text-white/70">Tipo</Label>
                <select value={serviceForm.type} onChange={(e) => setServiceForm({ ...serviceForm, type: e.target.value as any })} className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white" style={{ colorScheme: "dark" }}>
                  <option value="convencional" className="bg-[#1a1a1a]">Convencional</option>
                  <option value="inverter" className="bg-[#1a1a1a]">Inverter</option>
                </select>
              </div>
              <div className="space-y-2"><Label className="text-white/70">Preço (R$)</Label><Input type="number" step="0.01" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} className="border-white/10 bg-[#1a1a1a] text-white" /></div>
              <div className="space-y-2"><Label className="text-white/70">Desconto (%)</Label><Input type="number" value={serviceForm.discount_percentage} onChange={(e) => setServiceForm({ ...serviceForm, discount_percentage: e.target.value })} className="border-white/10 bg-[#1a1a1a] text-white" /></div>
              <div className="space-y-2"><Label className="text-white/70">Badge Garantia</Label><Input value={serviceForm.badge_garantia} onChange={(e) => setServiceForm({ ...serviceForm, badge_garantia: e.target.value })} className="border-white/10 bg-[#1a1a1a] text-white" /></div>
            </div>
            <div className="space-y-2"><Label className="text-white/70">Descrição</Label><textarea value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none" rows={3} /></div>
            <div className="space-y-2">
              <Label className="text-white/70">Modelo de Preço</Label>
              <div className="flex gap-2">
                {(["avulso", "assinatura", "ambos"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setPricingModel(m)}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${pricingModel === m ? "bg-[#3B82F6] text-white" : "bg-white/[0.04] text-white/50 hover:text-white/70"}`}>
                    {m === "avulso" ? "Avulso" : m === "assinatura" ? "Assinatura" : "Ambos"}
                  </button>
                ))}
              </div>
              {pricingModel !== "avulso" && (
                <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  {pricingIntervals.map((interval, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-24 text-xs text-white/50">{interval.label}</span>
                      <Input type="number" step="0.01" placeholder="Preço" value={interval.price || ""}
                        onChange={(e) => { const n = [...pricingIntervals]; n[idx].price = parseFloat(e.target.value) || 0; setPricingIntervals(n); }}
                        className="flex-1 border-white/10 bg-[#1a1a1a] text-white" />
                      <button type="button" onClick={() => setPricingIntervals(pricingIntervals.filter((_, i) => i !== idx))} className="text-[#E30613] hover:text-[#E30613]/80"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    const existing = pricingIntervals.map((i) => i.value);
                    const all = [{ value: "7d", label: "A cada 7 dias", days: 7 }, { value: "15d", label: "A cada 15 dias", days: 15 }, { value: "1m", label: "A cada 1 mês", days: 30 }, { value: "2m", label: "A cada 2 meses", days: 60 }, { value: "3m", label: "A cada 3 meses", days: 90 }, { value: "6m", label: "A cada 6 meses", days: 180 }];
                    const next = all.find((a) => !existing.includes(a.value));
                    if (next) setPricingIntervals([...pricingIntervals, { ...next, price: 0 }]);
                  }} className="inline-flex items-center gap-1 text-xs text-[#3B82F6] hover:underline"><Plus className="h-3 w-3" /> Adicionar intervalo</button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceEditDialogOpen(false)} className="border-white/10 text-white/70">Cancelar</Button>
            <Button onClick={handleSaveService} disabled={saving} className="bg-[#3B82F6] text-white hover:bg-[#3B82F6]/80">{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Delete Dialog */}
      <AlertDialog open={serviceDeleteDialogOpen} onOpenChange={setServiceDeleteDialogOpen}>
        <AlertDialogContent className="border-white/[0.06] bg-[#0f0f0f]">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Excluir serviço?</AlertDialogTitle><AlertDialogDescription className="text-white/50">Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="border-white/10 text-white/70">Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteService} className="bg-[#E30613] text-white hover:bg-[#E30613]/80">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
