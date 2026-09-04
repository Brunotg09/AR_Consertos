"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import {
  ArrowLeft, User, MapPin, Calendar, Clock, CheckCircle, XCircle,
  FileText, Phone, Camera, Trash2, Pen, Loader2, Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ServiceOrder {
  id: string;
  client_name: string;
  client_cpf: string | null;
  client_phone: string | null;
  address: string;
  scheduled_date: string;
  status: string;
  tech_notes: string | null;
  partner_id: string;
  technician_id: string | null;
  subscription_id: string | null;
  photos: any[];
  client_signature: string | null;
  checked_in_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "Pendente", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10", icon: Clock },
  assigned_partner: { label: "Atribuído", color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/10", icon: FileText },
  assigned_tech: { label: "Com Técnico", color: "text-[#3B82F6]", bg: "bg-[#3B82F6]/10", icon: User },
  in_progress: { label: "Em Andamento", color: "text-[#3B82F6]", bg: "bg-[#3B82F6]/10", icon: Clock },
  completed: { label: "Concluído", color: "text-[#22c55e]", bg: "bg-[#22c55e]/10", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "text-[#EF4444]", bg: "bg-[#EF4444]/10", icon: XCircle },
};

export default function PartnerOSPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const partnerId = params.id as string;
  const orderId = params.orderId as string;
  const isPartnerRoute = pathname.startsWith("/parceiro");
  const basePath = isPartnerRoute ? "/" : "/private/parceiros";

  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [techNotes, setTechNotes] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (error) throw error;
      setOrder(data);
      setTechNotes(data.tech_notes || "");
      setBeforePhotos((data.photos || []).filter((p: any) => p.photo_type === "before").map((p: any) => p.url));
      setAfterPhotos((data.photos || []).filter((p: any) => p.photo_type === "after").map((p: any) => p.url));
      setHasSignature(!!data.client_signature);

      if (data.partner_id) {
        const { data: partner } = await supabase.from("partners").select("name").eq("id", data.partner_id).single();
        if (partner) setPartnerName(partner.name);
      }
    } catch {
      toast.error("Erro ao carregar OS.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [order?.status]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const endDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const uploadPhoto = async (file: File, type: "before" | "after") => {
    const ext = file.name.split(".").pop();
    const fileName = `${orderId}/${type}_${Date.now()}.${ext}`;
    setUploading(type);
    try {
      const { error: uploadError } = await supabase.storage
        .from("service-order-photos")
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("service-order-photos").getPublicUrl(fileName);
      if (type === "before") setBeforePhotos((prev) => [...prev, urlData.publicUrl]);
      else setAfterPhotos((prev) => [...prev, urlData.publicUrl]);
      toast.success(`Foto ${type === "before" ? "ANTES" : "DEPOIS"} enviada!`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar foto.");
    } finally {
      setUploading(null);
    }
  };

  const removePhoto = (url: string, type: "before" | "after") => {
    if (type === "before") setBeforePhotos((prev) => prev.filter((u) => u !== url));
    else setAfterPhotos((prev) => prev.filter((u) => u !== url));
  };

  const startService = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("tech_checkin", {
        p_so_id: orderId,
        p_client_cpf_input: "",
      });
      if (error) throw error;
      toast.success("Atendimento iniciado!");
      fetchOrder();
    } catch (e: any) {
      toast.error(e.message || "Erro ao iniciar.");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!order) return;
    if (beforePhotos.length === 0) { toast.error("Adicione pelo menos 1 foto ANTES."); return; }
    if (afterPhotos.length === 0) { toast.error("Adicione pelo menos 1 foto DEPOIS."); return; }
    if (!techNotes.trim()) { toast.error("O laudo técnico é obrigatório."); return; }
    if (!hasSignature) { toast.error("A assinatura do cliente é obrigatória."); return; }

    setSaving(true);
    try {
      const canvas = canvasRef.current;
      const signatureData = canvas?.toDataURL("image/png") || "";
      const photosPayload = [
        ...beforePhotos.map((url) => ({ url, photo_type: "before" })),
        ...afterPhotos.map((url) => ({ url, photo_type: "after" })),
      ];

      const { error } = await supabase.rpc("complete_service_order", {
        p_so_id: orderId,
        p_tech_notes: techNotes,
        p_photos: photosPayload,
        p_client_signature: signatureData,
      });
      if (error) throw error;

      if (order.subscription_id) {
        const now = new Date();
        const currentMonth = format(now, "yyyy-MM");
        const { data: visit } = await supabase
          .from("subscription_visits")
          .select("id")
          .eq("subscription_id", order.subscription_id)
          .like("visit_date", `${currentMonth}%`)
          .maybeSingle();
        if (visit) await supabase.from("subscription_visits").update({ status: "completed", service_order_id: orderId }).eq("id", visit.id);
      }

      toast.success("OS concluída com sucesso!");
      fetchOrder();
    } catch (e: any) {
      toast.error(e.message || "Erro ao concluir.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("cancel_service_order", {
        p_so_id: orderId,
        p_reason: null,
      });
      if (error) throw error;
      toast.success("OS cancelada.");
      fetchOrder();
    } catch (e: any) {
      toast.error(e.message || "Erro ao cancelar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]"><div className="text-sm text-white/40">Carregando OS...</div></div>;
  }

  if (!order) return null;

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const isDone = order.status === "completed" || order.status === "cancelled";
  const isActive = order.status === "in_progress";
  const canStart = ["pending", "assigned_partner", "assigned_tech"].includes(order.status);

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6">
      <div className="mb-6">
        <button onClick={() => router.push(`${basePath}/${partnerId}`)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Ordem de Serviço</h1>
            <p className="text-sm text-white/50">#{order.id.slice(0, 8)} &middot; {partnerName}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
            <StatusIcon className="h-4 w-4" />
            {statusConfig.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
          <h3 className="text-sm font-medium text-white/70 flex items-center gap-2"><User className="h-4 w-4" /> Cliente</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm"><span className="text-white/50 w-20">Nome:</span><span className="text-white font-medium">{order.client_name}</span></div>
            {order.client_cpf && <div className="flex items-center gap-3 text-sm"><span className="text-white/50 w-20">CPF:</span><span className="text-white">{order.client_cpf}</span></div>}
            {order.client_phone && <div className="flex items-center gap-3 text-sm"><span className="text-white/50 w-20">Telefone:</span><span className="text-white flex items-center gap-1"><Phone className="h-3 w-3" /> {order.client_phone}</span></div>}
            <div className="flex items-center gap-3 text-sm"><span className="text-white/50 w-20">Endereço:</span><span className="text-white flex items-center gap-1"><MapPin className="h-3 w-3" /> {order.address}</span></div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
          <h3 className="text-sm font-medium text-white/70 flex items-center gap-2"><FileText className="h-4 w-4" /> Detalhes</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-white/50 w-24">Agendamento:</span>
              <span className="text-white flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(order.scheduled_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            </div>
            {order.subscription_id && <div className="flex items-center gap-3 text-sm"><span className="text-white/50 w-24">Tipo:</span><span className="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/10 px-2 py-0.5 text-xs font-medium text-[#8B5CF6]">Assinatura</span></div>}
            {order.checked_in_at && <div className="flex items-center gap-3 text-sm"><span className="text-white/50 w-24">Check-in:</span><span className="text-[#22c55e]">{format(new Date(order.checked_in_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></div>}
            {order.completed_at && <div className="flex items-center gap-3 text-sm"><span className="text-white/50 w-24">Concluído:</span><span className="text-[#22c55e]">{format(new Date(order.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></div>}
          </div>
        </div>
      </div>

      {/* Botão Iniciar */}
      {canStart && (
        <div className="mt-6 rounded-xl border border-[#3B82F6]/20 bg-[#3B82F6]/5 p-5">
          <h3 className="text-sm font-medium text-[#3B82F6] mb-3 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Iniciar Atendimento</h3>
          <p className="text-xs text-white/40 mb-4">Clique para iniciar o atendimento desta OS.</p>
          <Button onClick={startService} disabled={saving} className="bg-[#3B82F6] text-white hover:bg-[#3B82F6]/80">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Iniciar Atendimento
          </Button>
        </div>
      )}

      {/* Formulário do técnico */}
      {isActive && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white/70 flex items-center gap-2"><Camera className="h-4 w-4" /> Fotos ANTES <span className="text-[10px] text-[#F59E0B]">(obrigatório)</span></h3>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#F59E0B]/10 px-3 py-1.5 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20">
                <Camera className="h-3.5 w-3.5" />{uploading === "before" ? "Enviando..." : "Adicionar"}
                <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={(e) => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0], "before"); e.target.value = ""; }} />
              </label>
            </div>
            {beforePhotos.length === 0 ? <p className="text-xs text-white/30">Nenhuma foto ainda.</p> : (
              <div className="flex flex-wrap gap-2">{beforePhotos.map((url, i) => (
                <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-white/10">
                  <img src={url} alt={`Antes ${i + 1}`} className="h-full w-full object-cover" />
                  <button onClick={() => removePhoto(url, "before")} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444] text-white opacity-0 transition-opacity group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}</div>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white/70 flex items-center gap-2"><Camera className="h-4 w-4" /> Fotos DEPOIS <span className="text-[10px] text-[#F59E0B]">(obrigatório)</span></h3>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#22c55e]/10 px-3 py-1.5 text-xs font-medium text-[#22c55e] transition-colors hover:bg-[#22c55e]/20">
                <Camera className="h-3.5 w-3.5" />{uploading === "after" ? "Enviando..." : "Adicionar"}
                <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={(e) => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0], "after"); e.target.value = ""; }} />
              </label>
            </div>
            {afterPhotos.length === 0 ? <p className="text-xs text-white/30">Nenhuma foto ainda.</p> : (
              <div className="flex flex-wrap gap-2">{afterPhotos.map((url, i) => (
                <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-white/10">
                  <img src={url} alt={`Depois ${i + 1}`} className="h-full w-full object-cover" />
                  <button onClick={() => removePhoto(url, "after")} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444] text-white opacity-0 transition-opacity group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}</div>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
            <Label className="text-sm font-medium text-white/70 flex items-center gap-2"><FileText className="h-4 w-4" /> Laudo Técnico <span className="text-[10px] text-[#F59E0B]">(obrigatório)</span></Label>
            <textarea value={techNotes} onChange={(e) => setTechNotes(e.target.value)} placeholder="Descreva o serviço realizado..." className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#3B82F6]/50" rows={4} />
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-white/70 flex items-center gap-2"><Pen className="h-4 w-4" /> Assinatura do Cliente <span className="text-[10px] text-[#F59E0B]">(obrigatório)</span></Label>
              <button onClick={clearSignature} className="text-xs text-white/40 hover:text-white/70">Limpar</button>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#1a1a1a] overflow-hidden">
              <canvas ref={canvasRef} className="w-full cursor-crosshair touch-none" style={{ height: "150px" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
            </div>
            {hasSignature && <p className="text-xs text-[#22c55e] flex items-center gap-1"><Check className="h-3 w-3" /> Assinatura capturada</p>}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleComplete} disabled={saving} className="bg-[#22c55e] text-white hover:bg-[#22c55e]/80">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Concluir OS
            </Button>
            <Button onClick={handleCancel} disabled={saving} variant="outline" className="border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10">
              <XCircle className="mr-2 h-4 w-4" /> Cancelar OS
            </Button>
          </div>
        </div>
      )}

      {/* Read-only para concluída/cancelada */}
      {isDone && (
        <div className="mt-6 space-y-4">
          {order.tech_notes && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
              <h3 className="text-sm font-medium text-white/70">Laudo Técnico</h3>
              <p className="text-sm text-white/60 whitespace-pre-wrap">{order.tech_notes}</p>
            </div>
          )}
          {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {beforePhotos.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
                  <h3 className="text-sm font-medium text-white/70">Fotos ANTES</h3>
                  <div className="flex flex-wrap gap-2">{beforePhotos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Antes ${i + 1}`} className="h-20 w-20 rounded-lg object-cover border border-white/10 hover:border-[#3B82F6]/50 transition-colors" /></a>
                  ))}</div>
                </div>
              )}
              {afterPhotos.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
                  <h3 className="text-sm font-medium text-white/70">Fotos DEPOIS</h3>
                  <div className="flex flex-wrap gap-2">{afterPhotos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Depois ${i + 1}`} className="h-20 w-20 rounded-lg object-cover border border-white/10 hover:border-[#3B82F6]/50 transition-colors" /></a>
                  ))}</div>
                </div>
              )}
            </div>
          )}
          {order.client_signature && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
              <h3 className="text-sm font-medium text-white/70">Assinatura do Cliente</h3>
              <img src={order.client_signature} alt="Assinatura" className="max-h-32 rounded-lg border border-white/10 bg-[#1a1a1a] p-2" />
            </div>
          )}
          {order.status === "in_progress" && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleComplete} disabled={saving} className="bg-[#22c55e] text-white hover:bg-[#22c55e]/80">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Concluir OS
              </Button>
              <Button onClick={handleCancel} disabled={saving} variant="outline" className="border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10">
                <XCircle className="mr-2 h-4 w-4" /> Cancelar OS
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
