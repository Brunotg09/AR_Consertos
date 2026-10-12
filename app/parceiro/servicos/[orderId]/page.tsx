"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  MapPin,
  Calendar,
  Camera,
  FileText,
  Signature as SignatureIcon,
  PlayCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase, withTimeout } from "@/lib/supabase";
import { usePartner } from "@/hooks/usePartners";
import { formatBRL, SO_STATUS_LABELS } from "@/lib/partner-utils";
import { compressImageToWebP } from "@/lib/imageUtils";
import Link from "next/link";

interface ServiceDetail {
  id: string;
  category: string | null;
  client_name: string;
  client_phone: string | null;
  address: string;
  scheduled_date: string;
  status: string;
  total: number | null;
  commission_percentage: number | null;
  commission_value: number | null;
  partner_value: number | null;
  technical_report: string | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  signature_url: string | null;
  cancellation_reason: string | null;
}

export default function ParceiroServicoDetalhe() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const router = useRouter();
  const { partner } = usePartner();

  const [so, setSo] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [report, setReport] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  const fetchSO = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    const data = await withTimeout(
      () =>
        supabase
          .from("service_orders")
          .select(
            "id, category, client_name, client_phone, address, scheduled_date, status, total, commission_percentage, commission_value, partner_value, technical_report, before_photos, after_photos, signature_url, cancellation_reason"
          )
          .eq("id", orderId)
          .maybeSingle<ServiceDetail>(),
      5000,
      null
    );
    if (data?.data) {
      setSo(data.data);
      setReport(data.data.technical_report || "");
      setBeforePhotos(data.data.before_photos || []);
      setAfterPhotos(data.data.after_photos || []);
      setSignature(data.data.signature_url || null);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchSO();
  }, [fetchSO]);

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (fn: (prev: string[]) => string[]) => void
  ) => {
    const files = e.target.files;
    if (!files?.length) return;
    setSaving(true);
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressImageToWebP(file, 200, 1280, 1280);
        const path = `so/${orderId}/${Date.now()}-${compressed.name}`;
        const { error: upError } = await supabase.storage
          .from("service-order-photos")
          .upload(path, compressed);
        if (upError) throw upError;
        const { data: pub } = supabase.storage
          .from("service-order-photos")
          .getPublicUrl(path);
        setter((prev) => [...prev, pub.publicUrl]);
      }
      toast.success("Foto adicionada");
    } catch {
      toast.error("Erro ao enviar foto");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  // Assinatura (canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
  }, []);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setDrawing(true);
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) setSignature(canvas.toDataURL("image/png"));
  };

  function getPos(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignature(null);
    }
  };

  const notifyEvent = (event: string, extra?: Record<string, string | undefined>) => {
    fetch("/api/notifications/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, serviceOrderId: orderId, extra }),
    }).catch(() => null);
  };

  const handleStart = async () => {
    setSaving(true);
    const { data, error } = await withTimeout(
      () => supabase.rpc("start_service_offer", { p_service_order_id: orderId }),
      8000,
      { data: null, error: new Error("Timeout") }
    );
    setSaving(false);
    if (error || !data) {
      toast.error("Não foi possível iniciar o serviço");
      return;
    }
    toast.success("Serviço iniciado!");
    notifyEvent("service_started", { partnerName: partner?.full_name });
    fetchSO();
  };

  const handleComplete = async () => {
    if (!so) return;
    if (beforePhotos.length < 1) return toast.error("Adicione ao menos 1 foto ANTES");
    if (afterPhotos.length < 1) return toast.error("Adicione ao menos 1 foto DEPOIS");
    if (!report.trim()) return toast.error("Preencha o relatório técnico");
    if (!signature) return toast.error("Capture a assinatura do cliente");

    setSaving(true);
    const { data, error } = await withTimeout(
      () =>
        supabase.rpc("complete_partner_service", {
          p_service_order_id: orderId,
          p_technical_report: report,
          p_before_photos: beforePhotos,
          p_after_photos: afterPhotos,
          p_signature_url: signature,
        }),
      10000,
      { data: null, error: new Error("Timeout") }
    );
    setSaving(false);
    if (error || !data) {
      toast.error("Erro ao concluir serviço");
      return;
    }
    toast.success("Serviço concluído!");
    notifyEvent("service_completed", {
      partnerName: partner?.full_name,
      serviceName: so?.client_name,
    });
    fetchSO();
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return toast.error("Informe a justificativa");
    setSaving(true);
    const { data, error } = await withTimeout(
      () =>
        supabase.rpc("cancel_partner_service", {
          p_service_order_id: orderId,
          p_reason: cancelReason,
        }),
      8000,
      { data: null, error: new Error("Timeout") }
    );
    setSaving(false);
    setCancelOpen(false);
    if (error || !data) {
      toast.error("Erro ao cancelar");
      return;
    }
    toast.success("Serviço cancelado");
    notifyEvent("service_cancelled", { partnerName: partner?.full_name });
    router.push("/parceiro/servicos");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (!so) {
    return (
      <div className="py-20 text-center text-white/60">
        Serviço não encontrado.{" "}
        <Link href="/parceiro/servicos" className="text-[#C9A84C] underline">
          Voltar
        </Link>
      </div>
    );
  }

  const isActive = so.status === "accepted" || so.status === "in_progress";

  return (
    <div className="mx-auto max-w-3xl px-4">
      <Link
        href="/parceiro/servicos"
        className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-4 flex items-start justify-between">
          <h1 className="font-bebas text-3xl tracking-wide text-white">
            {(so.category || "SERVIÇO").toUpperCase()}
          </h1>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
            {SO_STATUS_LABELS[so.status] || so.status}
          </span>
        </div>

        <div className="grid gap-3 text-sm text-white/60 sm:grid-cols-2">
          <p>
            <span className="text-white/40">Cliente:</span> {so.client_name}
            {so.client_phone && ` — ${so.client_phone}`}
          </p>
          <p className="flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {so.address}
          </p>
          {so.scheduled_date && (
            <p className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(so.scheduled_date).toLocaleString("pt-BR")}
            </p>
          )}
          <p>
            <span className="text-white/40">Valor:</span> {formatBRL(so.total)}
          </p>
          {so.commission_percentage != null && (
            <p>
              <span className="text-white/40">Comissão:</span> {so.commission_percentage}% ={" "}
              {formatBRL(so.partner_value)}
            </p>
          )}
        </div>

        {so.cancellation_reason && (
          <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
            Cancelado: {so.cancellation_reason}
          </p>
        )}
      </div>

      {so.status === "accepted" && (
        <button onClick={handleStart} disabled={saving} className="btn-premium-red mb-8 flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          Iniciar Serviço
        </button>
      )}

      {so.status === "in_progress" && (
        <>
          {/* Fotos ANTES */}
          <Section icon={<Camera className="h-5 w-5" />} title="Fotos ANTES (mín. 1)">
            <div className="flex flex-wrap gap-3">
              {beforePhotos.map((p, i) => (
                <img key={i} src={p} alt="antes" className="h-24 w-24 rounded-xl object-cover" />
              ))}
              <button
                onClick={() => beforeInputRef.current?.click()}
                className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-white/20 text-white/40 hover:border-[#C9A84C] hover:text-[#C9A84C]"
              >
                <Camera className="h-6 w-6" />
              </button>
            </div>
            <input
              ref={beforeInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={(e) => handleUpload(e, setBeforePhotos)}
            />
          </Section>

          {/* Fotos DEPOIS */}
          <Section icon={<Camera className="h-5 w-5" />} title="Fotos DEPOIS (mín. 1)">
            <div className="flex flex-wrap gap-3">
              {afterPhotos.map((p, i) => (
                <img key={i} src={p} alt="depois" className="h-24 w-24 rounded-xl object-cover" />
              ))}
              <button
                onClick={() => afterInputRef.current?.click()}
                className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-white/20 text-white/40 hover:border-[#C9A84C] hover:text-[#C9A84C]"
              >
                <Camera className="h-6 w-6" />
              </button>
            </div>
            <input
              ref={afterInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={(e) => handleUpload(e, setAfterPhotos)}
            />
          </Section>

          {/* Relatório */}
          <Section icon={<FileText className="h-5 w-5" />} title="Relatório Técnico">
            <textarea
              value={report}
              onChange={(e) => setReport(e.target.value)}
              rows={4}
              placeholder="Descreva o serviço realizado..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white placeholder:text-white/30 focus:border-[#C9A84C] focus:outline-none"
            />
          </Section>

          {/* Assinatura */}
          <Section icon={<SignatureIcon className="h-5 w-5" />} title="Assinatura do Cliente">
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="w-full max-w-md cursor-crosshair rounded-xl border border-white/10 bg-black/40"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            <button onClick={clearSignature} className="mt-2 text-xs text-white/40 hover:text-white">
              Limpar assinatura
            </button>
          </Section>

          <div className="mb-8 flex flex-wrap gap-3">
            <button
              onClick={handleComplete}
              disabled={saving}
              className="btn-premium-red flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Concluir Serviço
            </button>
            <button
              onClick={() => setCancelOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 px-5 py-3 text-sm text-red-400 hover:bg-red-500/10"
            >
              <XCircle className="h-4 w-4" /> Cancelar Serviço
            </button>
          </div>
        </>
      )}

      {so.status === "completed" && (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
          <CheckCircle2 className="mb-2 h-8 w-8 text-green-400" />
          <p className="font-medium text-white">Serviço concluído</p>
          {so.technical_report && (
            <p className="mt-2 text-sm text-white/60">{so.technical_report}</p>
          )}
        </div>
      )}

      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6">
            <h3 className="mb-3 font-bebas text-2xl text-white">Cancelar Serviço</h3>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Justificativa (obrigatória)..."
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white focus:border-red-500 focus:outline-none"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancelOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60"
              >
                Voltar
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-3 flex items-center gap-2 text-[#C9A84C]">
        {icon}
        <h2 className="font-bebas text-xl tracking-wide text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}
