"use client";

import { ServiceIcon } from "@/components/ServiceIcon";
import { useCart } from "@/contexts/CartContext";
import { supabase, withTimeout } from "@/lib/supabase";
import { useFloatingWidget } from "@/components/FloatingWidget";
import { categoryDisplayNames, toSlug } from "@/lib/slugify";
import {
  ArrowLeft,
  Award,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  RefreshCw,
  Star,
  Tag,
  Wrench,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

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
  partner_id?: string | null;
  partner_name?: string | null;
  pricing_config?: {
    model?: "avulso" | "assinatura" | "ambos";
    intervals?: { value: string; label: string; days: number; price?: number }[];
  } | null;
}

const serviceTypeLabels: Record<string, string> = {
  convencional: "Conserto Convencional",
  inverter: "Eletrônica Avançada",
};

export default function ServicoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const slug = params?.slug as string[];
  const slugKey = useMemo(() => slug?.join("/") ?? "", [slug]);
  const { addService } = useCart();
  const { trigger } = useFloatingWidget();
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<string | null>(null);

  useEffect(() => {
    trigger("schedule");
  }, [trigger]);

  const fetchService = useCallback(async () => {
    if (!slug || slug.length === 0) return;
    setLoading(true);

    try {
      let data = null;
      let error = null;

      if (slug.length >= 2) {
        // Format: /servico/{category}/{service_id}
        const serviceId = slug[slug.length - 1];

        // Direct lookup by service_id (single query, no fetch-all)
        const result = await withTimeout(
          () =>
            supabase
              .from("services")
              .select("*")
              .eq("service_id", serviceId)
              .eq("active", true)
              .single(),
          8000,
          { data: null, error: { message: "Timeout" } }
        );
        data = result.data;
        error = result.error;

        // Fallback: try matching category + name slug (backward compat for old URLs)
        if (error) {
          const categorySlug = slug[0];
          const nameSlug = slug.slice(1).join("/");

          const { data: allServices } = await withTimeout(
            () =>
              supabase
                .from("services")
                .select("*")
                .eq("active", true),
            8000,
            { data: [], error: { message: "Timeout" } }
          );

          if (allServices) {
            const matched = allServices.find((s: ServiceData) => {
              const catSlug = s.category
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
              const nameSlugified = s.name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
              return catSlug === categorySlug && (nameSlugified === nameSlug || nameSlug.startsWith(nameSlugified + "-"));
            });

            if (matched) {
              data = matched;
              error = null;
            }
          }
        }
      } else if (slug.length === 1) {
        // Legacy: /servico/{id} or /servico/{service_id}
        const id = slug[0];

        // Try numeric ID first
        const numericId = parseInt(id, 10);
        if (!isNaN(numericId) && numericId > 0) {
          const result = await withTimeout(
            () =>
              supabase
                .from("services")
                .select("*")
                .eq("id", numericId)
                .eq("active", true)
                .single(),
            8000,
            { data: null, error: { message: "Timeout" } }
          );
          data = result.data;
          error = result.error;
        }

        // Fallback: try by service_id
        if (error) {
          const result = await withTimeout(
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
          data = result.data;
          error = result.error;
        }
      }

      if (error) {
        setService(null);
      } else {
        setService(data as ServiceData | null);
        setImgError(false);
      }
    } catch (e) {
      setService(null);
    } finally {
      setLoading(false);
    }
  }, [slugKey]);

  // Also try partner_services table
  useEffect(() => {
    if (!service && !loading && slug && slug.length > 0) {
      const fetchPartnerService = async () => {
        const serviceId = slug[slug.length - 1];
        const { data } = await supabase
          .from("partner_services")
          .select("*, partners:partner_id(name)")
          .eq("service_id", serviceId)
          .eq("active", true)
          .single();
        if (data) {
          setService({
            ...data,
            partner_id: data.partner_id,
            partner_name: data.partners?.name || null,
          } as ServiceData);
          setImgError(false);
        }
      };
      fetchPartnerService();
    }
  }, [service, loading, slug]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  // Dynamic SEO metadata
  useEffect(() => {
    if (service) {
      const siteName = "A.R Conserto";
      const title = `${service.name} | ${siteName} - Conserto com Garantia`;
      document.title = title;

      const metaDesc = service.description
        ? `${service.name}: ${service.description} Garantia de 90 dias. Agende agora!`
        : `${service.name} - Conserto especializado com garantia de 90 dias em Itabaiana/SE. ${siteName}`;
      
      let metaTag = document.querySelector('meta[name="description"]');
      if (!metaTag) {
        metaTag = document.createElement("meta");
        metaTag.setAttribute("name", "description");
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute("content", metaDesc.substring(0, 160));

      // Open Graph
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", title);
      
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", metaDesc.substring(0, 160));

      const ogImage = service.images?.[0];
      const ogImageTag = document.querySelector('meta[property="og:image"]');
      if (ogImage && ogImageTag) ogImageTag.setAttribute("content", ogImage);

      const seoSlug = service.service_id || service.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const catSlug = service.category
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const canonicalUrl = `https://ar-consertos.vercel.app/servico/${catSlug}/${seoSlug}`;
      let canonicalTag = document.querySelector('link[rel="canonical"]');
      if (!canonicalTag) {
        canonicalTag = document.createElement("link");
        canonicalTag.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalTag);
      }
      canonicalTag.setAttribute("href", canonicalUrl);
    }
  }, [service]);

  const handleSchedule = () => {
    if (!service) return;
    const added = addService({
      id: service.service_id || `svc-${service.id}`,
      name: service.name,
      description: service.description,
      category: service.category,
      type: service.type,
      badgeGarantia: service.badge_garantia,
      imagesFolder: "",
      totalImages: service.images?.length || 1,
      iconName: service.icon_name,
      discountPercentage: service.discount_percentage,
      partnerId: service.partner_id || null,
      price: service.price || null,
      pricingConfig: service.pricing_config || null,
      selectedInterval: selectedInterval,
    });
    if (added) {
      toast.success(`${service.name} adicionado ao orçamento!`);
    } else {
      toast.info(`${service.name} já está no orçamento.`);
    }
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
  const isPartner = !!service.partner_id;
  const accent = isPartner ? "#10B981" : isInverter ? "#8B5CF6" : "#E30613";
  const images = service.images && service.images.length > 0 ? service.images : [];

  const hasDiscount = service.discount_percentage > 0;
  const hasPricing = !!service.pricing_config?.intervals?.length;

  const effectivePrice = (() => {
    if (selectedInterval && service.pricing_config?.intervals) {
      const interval = service.pricing_config.intervals.find((i) => i.value === selectedInterval);
      if (interval?.price) return Number(interval.price);
    }
    if (service.price) {
      return hasDiscount
        ? Number(service.price) * (1 - service.discount_percentage / 100)
        : Number(service.price);
    }
    return null;
  })();

  const formattedPrice = effectivePrice
    ? effectivePrice.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    : null;

  // Generate breadcrumb URLs
  const catSlug = service.category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const catDisplayName = categoryDisplayNames[catSlug] || service.category;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: service.name,
            description: service.description || `${service.name} - Conserto especializado`,
            category: service.category,
            provider: {
              "@type": "LocalBusiness",
              name: "A.R Conserto",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Itabaiana",
                addressRegion: "SE",
                addressCountry: "BR",
              },
              telephone: "+55-79-99999-9999",
            },
            areaServed: {
              "@type": "City",
              name: "Itabaiana",
            },
            offers: effectivePrice
              ? {
                  "@type": "Offer",
                  price: effectivePrice,
                  priceCurrency: "BRL",
                  availability: "https://schema.org/InStock",
                }
              : undefined,
            image: service.images?.[0],
            url: `https://ar-consertos.vercel.app/servico/${catSlug}/${service.service_id || service.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`,
          }),
        }}
      />

      <div className="space-y-8 lg:space-y-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs" style={{ color: "#666666" }}>
          <Link
            href={isPartner ? "/servicos-parceiros" : isInverter ? "/inverter" : "/servicos"}
            className="transition-colors hover:text-white"
          >
            {isPartner ? "Serviços Parceiros" : serviceTypeLabels[service.type]}
          </Link>
          {catDisplayName && (
            <>
              <span style={{ color: "#444444" }}>/</span>
              <Link
                href={isPartner ? "/servicos-parceiros" : "/servicos"}
                className="transition-colors hover:text-white"
              >
                {catDisplayName}
              </Link>
            </>
          )}
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
              <div className="absolute left-4 top-4 flex gap-2">
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
                {isPartner && (
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 font-oswald text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      color: "#10B981",
                    }}
                  >
                    <Building2 className="h-3 w-3" />
                    PARCEIRO
                  </span>
                )}
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
            <div className="flex items-center gap-2">
              <span
                className="inline-block rounded-full px-3 py-1 font-oswald text-[10px] tracking-widest uppercase"
                style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C" }}
              >
                {service.category}
              </span>
              {service.partner_name && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-oswald text-[10px] tracking-widest uppercase"
                  style={{ backgroundColor: "rgba(16,185,129,0.15)", color: "#10B981" }}
                >
                  <Building2 className="h-3 w-3" />
                  {service.partner_name}
                </span>
              )}
            </div>

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

            {/* Plan selector — só aparece se tem pricing_config com intervals */}
            {hasPricing && service.pricing_config?.intervals && service.pricing_config.intervals.length > 0 && (
              <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-bold text-blue-400">
                    {service.pricing_config.model === "assinatura" ? "Assinatura" : "Escolha um plano"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-white/50">
                  {service.pricing_config.model === "ambos"
                    ? "Contrate via plano recorrente ou pague por atendimento."
                    : "Contrate via plano e tenha visitas recorrentes programadas."}
                </p>
                <div className="flex flex-col gap-2">
                  {service.pricing_config.model === "ambos" && (
                    <button
                      onClick={() => setSelectedInterval(null)}
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium border transition-all"
                      style={{
                        borderColor: !selectedInterval ? accent : "rgba(255,255,255,0.1)",
                        backgroundColor: !selectedInterval ? `${accent}15` : "rgba(255,255,255,0.02)",
                        color: !selectedInterval ? accent : "#aaa",
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Avulso
                      </span>
                      <span style={{ color: !selectedInterval ? accent : "#888" }}>
                        R$ {Number(service.price).toFixed(2).replace(".", ",")}
                      </span>
                    </button>
                  )}
                  {service.pricing_config.intervals.map((interval) => (
                    <button
                      key={interval.value}
                      onClick={() => setSelectedInterval(interval.value)}
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium border transition-all"
                      style={{
                        borderColor: selectedInterval === interval.value ? "#3B82F6" : "rgba(255,255,255,0.1)",
                        backgroundColor: selectedInterval === interval.value ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.02)",
                        color: selectedInterval === interval.value ? "#60A5FA" : "#aaa",
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        {interval.label}
                      </span>
                      {interval.price ? (
                        <span style={{ color: selectedInterval === interval.value ? "#60A5FA" : "#888" }}>
                          R$ {Number(interval.price).toFixed(2).replace(".", ",")}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
