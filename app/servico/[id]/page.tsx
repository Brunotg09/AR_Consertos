"use client";

import { ServiceIcon } from "@/components/ServiceIcon";
import { useCart } from "@/contexts/CartContext";
import { supabase, withTimeout } from "@/lib/supabase";
import { useFloatingWidget } from "@/components/FloatingWidget";
import {
  ArrowLeft,
  Award,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Star,
  Tag,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface ServiceData {
  id: number;
  service_id: string;
  name: string;
  description: string;
  category: string;
  type: "convencional" | "inverter";
  price: number | null;
  discount_percentage: number;
  badge_garantia: string;
  icon_name: string;
  images: string[];
  active: boolean;
}

const serviceTypeLabels: Record<string, string> = {
  convencional: "Conserto Convencional",
  inverter: "Eletrônica Avançada",
};

export default function ServicoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { addService } = useCart();
  const { trigger } = useFloatingWidget();
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    trigger("schedule");
  }, [trigger]);

  const fetchService = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        () =>
          supabase
            .from("services")
            .select("*")
            .eq("service_id", id)
            .eq("active", true)
            .single(),
        8000,
        { data: null, error: { message: "Timeout" } }
      );

      if (error) {
        console.error("[servico] fetchService error:", error);
        setService(null);
      } else {
        setService(data as ServiceData | null);
        setImgError(false);
      }
    } catch (e) {
      console.error("[servico] fetchService error:", e);
      setService(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  const handleSchedule = () => {
    if (!service) return;
    addService({
      id: service.service_id,
      name: service.name,
      description: service.description,
      category: service.category,
      type: service.type,
      badgeGarantia: service.badge_garantia,
      imagesFolder: "",
      totalImages: service.images?.length || 1,
      iconName: service.icon_name,
      discountPercentage: service.discount_percentage,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-ar-red" />
          </div>
          <p className="text-sm" style={{ color: "#888888" }}>Carregando serviço...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <Wrench className="mx-auto h-16 w-16" style={{ color: "#444" }} />
          <h1 className="mt-4 font-bebas text-3xl text-white">Serviço não encontrado</h1>
          <p className="mt-2 max-w-md text-sm" style={{ color: "#888888" }}>
            O serviço solicitado não está disponível ou foi desativado.
          </p>
          <Link
            href="/servicos"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ar-red px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 rotate-180" />
            Ver todos os serviços
          </Link>
        </div>
      </div>
    );
  }

  const isInverter = service.type === "inverter";
  const accent = isInverter ? "#8B5CF6" : "#E30613";
  const images = service.images && service.images.length > 0 ? service.images : [];

  const hasDiscount = service.discount_percentage > 0;
  const finalPrice = service.price
    ? hasDiscount
      ? Number(service.price) * (1 - service.discount_percentage / 100)
      : Number(service.price)
    : null;

  const formattedPrice = finalPrice
    ? finalPrice.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8 lg:space-y-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs" style={{ color: "#666666" }}>
          <Link
            href={isInverter ? "/inverter" : "/servicos"}
            className="transition-colors hover:text-white"
          >
            {serviceTypeLabels[service.type]}
          </Link>
          <span style={{ color: "#444444" }}>/</span>
          <span className="text-white">{service.name}</span>
        </nav>

        {/* Grid principal */}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-12">
          {/* Imagem / Ícone */}
          <div className="space-y-4">
            <div
              className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl"
              style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
            >
              {images.length > 0 ? (
                imgError ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <Wrench className="h-12 w-12" style={{ color: "#444" }} />
                  </div>
                ) : (
                  <img
                    src={images[currentImage]}
                    alt={`${service.name} — imagem ${currentImage + 1}`}
                    className="h-full w-full object-cover object-center transition-transform duration-500"
                    onError={() => setImgError(true)}
                  />
                )
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{
                    background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
                  }}
                >
                  <div
                    className="flex h-28 w-28 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${accent}15`, color: accent }}
                  >
                    <ServiceIcon
                      iconName={service.icon_name}
                      className="h-14 w-14"
                    />
                  </div>
                </div>
              )}

              {/* Type badge */}
              <div className="absolute left-4 top-4">
                <span
                  className="rounded-full px-2.5 py-1 font-oswald text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: isInverter
                      ? "rgba(139,92,246,0.15)"
                      : "rgba(227,6,19,0.15)",
                    color: accent,
                  }}
                >
                  {isInverter ? "INVERTER" : "CONVENCIONAL"}
                </span>
              </div>
            </div>

            {/* Thumbnails / Navigation */}
            {images.length > 1 && (
              <>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImage(idx)}
                      className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                        idx === currentImage
                          ? `border-[${accent}] opacity-100`
                          : "border-white/10 opacity-60 hover:opacity-100"
                      }`}
                      style={{
                        borderColor: idx === currentImage ? accent : "rgba(255,255,255,0.1)",
                      }}
                    >
                      <img
                        src={img}
                        alt={`${service.name} ${idx + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>

                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setCurrentImage((p) => (p - 1 + images.length) % images.length)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/70 transition-all hover:bg-white/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="flex items-center text-xs" style={{ color: "#666666" }}>
                    {currentImage + 1} / {images.length}
                  </span>
                  <button
                    onClick={() => setCurrentImage((p) => (p + 1) % images.length)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/70 transition-all hover:bg-white/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Informações do Serviço */}
          <div className="space-y-6">
            {/* Category */}
            <span
              className="inline-block rounded-full px-3 py-1 font-oswald text-[10px] tracking-widest uppercase"
              style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C" }}
            >
              {service.category}
            </span>

            {/* Name */}
            <h1 className="font-bebas text-3xl tracking-wide text-white sm:text-4xl lg:text-5xl">
              {service.name}
            </h1>

            {/* Badge garantia */}
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5" style={{ color: accent }} />
              <span
                className="font-oswald text-[10px] uppercase tracking-widest"
                style={{ color: accent }}
              >
                {service.badge_garantia}
              </span>
            </div>

            {/* Rating placeholder */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-current" style={{ color: "#C9A84C" }} />
                ))}
              </div>
              <span className="text-xs" style={{ color: "#666666" }}>
                4.9 (28 avaliações)
              </span>
            </div>

            {/* Pricing */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-xs" style={{ color: "#888888" }}>
                <Clock className="h-4 w-4" />
                <span>Prazo médio: 1 a 3 dias úteis</span>
              </div>

              {formattedPrice ? (
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-oswald text-3xl font-bold" style={{ color: accent }}>
                    {formattedPrice}
                  </span>
                  {service.discount_percentage > 0 && (
                    <>
                      <span className="text-sm line-through" style={{ color: "#666666" }}>
                        {service.price?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 font-oswald text-[10px] font-bold uppercase"
                        style={{ backgroundColor: "#E3061320", color: "#E30613" }}
                      >
                        {service.discount_percentage}% OFF
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-2">
                  <span className="font-oswald text-lg font-bold text-white">
                    Consultar preço
                  </span>
                  <p className="mt-0.5 text-xs" style={{ color: "#888888" }}>
                    Faça seu orçamento sem compromisso
                  </p>
                </div>
              )}

              {service.discount_percentage > 0 && service.price && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2">
                  <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m0 6a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-medium text-green-400">
                    Você economiza {service.discount_percentage}% nesse serviço — aproveite!
                  </p>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <button
                onClick={handleSchedule}
                className="group/btn relative flex w-full items-center justify-center gap-3 rounded-xl py-4 text-sm font-bold text-white transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`,
                  boxShadow: `0 6px 24px ${accent}35, 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)`,
                }}
              >
                <CalendarCheck className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                Agendar este Serviço
                <ArrowLeft className="h-4 w-4 rotate-180 group-hover/btn:translate-x-0.5 transition-transform" />
              </button>
              <p className="mt-2 text-center text-xs" style={{ color: "#666666" }}>
                Sem compromisso — fale com um especialista
              </p>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
              <span className="relative inline-block px-3 text-[10px] uppercase tracking-wider" style={{ color: "#444", background: "#111" }}>
                Detalhes
              </span>
            </div>

            {/* Description */}
            <div>
              <h3 className="mb-2 flex items-center gap-2 font-montserrat text-sm font-bold text-white">
                <FileText className="h-4 w-4" style={{ color: accent }} />
                Descrição
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#aaa" }}>
                {service.description || "Sem descrição disponível para este serviço."}
              </p>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                <Tag className="h-5 w-5" style={{ color: "#C9A84C" }} />
                <div>
                  <span className="block text-[10px] uppercase tracking-wider" style={{ color: "#666" }}>Categoria</span>
                  <p className="text-sm text-white">{service.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                <Award className="h-5 w-5" style={{ color: accent }} />
                <div>
                  <span className="block text-[10px] uppercase tracking-wider" style={{ color: "#666" }}>Garantia</span>
                  <p className="text-sm text-white">{service.badge_garantia}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
