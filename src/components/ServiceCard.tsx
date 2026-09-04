"use client";

import { ServicePricingConfig, useCart } from "@/contexts/CartContext";
import { serviceUrl } from "@/lib/slugify";
import { ArrowUpRight, Building2, CalendarCheck, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ServiceIcon } from "./ServiceIcon";

interface ServiceCardProps {
  service: {
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
    pricing_config?: ServicePricingConfig | null;
  };
  variant?: "convencional" | "inverter";
  partner?: boolean;
}

export function ServiceCard({ service, variant, partner }: ServiceCardProps) {
  const type = variant || service.type;
  const isInverter = type === "inverter";
  const isPartner = partner || !!service.partner_id;
  const accent = isPartner ? "#10B981" : isInverter ? "#8B5CF6" : "#E30613";

  const images = service.images && service.images.length > 0
    ? service.images
    : [];

  const [currentImage, setCurrentImage] = useState(0);
  const [selectedInterval, setSelectedInterval] = useState<string | null>(null);
  const { addService } = useCart();

  const hasPricing = !!service.pricing_config?.intervals?.length;
  const hasAvulso = service.pricing_config?.model === "avulso" || service.pricing_config?.model === "ambos";
  const hasAssinatura = service.pricing_config?.model === "assinatura" || service.pricing_config?.model === "ambos";

  const nextImage = () => {
    if (images.length === 0) return;
    setCurrentImage((p) => (p + 1) % images.length);
  };
  const prevImage = () => {
    if (images.length === 0) return;
    setCurrentImage((p) => (p - 1 + images.length) % images.length);
  };

  const serviceSlug = service.service_id || `svc-${service.id}`;
  const seoUrl = serviceUrl(service.category, service.name, service.description, service.service_id);

  const handleSchedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    const added = addService({
      id: serviceSlug,
      name: service.name,
      description: service.description,
      category: service.category,
      type: service.type,
      badgeGarantia: service.badge_garantia,
      imagesFolder: "",
      totalImages: service.images?.length || 0,
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

  return (
    <div
      className="group relative rounded-2xl p-[1px] transition-all duration-300"
      style={{
        background: isPartner
          ? "linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.05), transparent)"
          : isInverter
          ? "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(139,92,246,0.05), transparent)"
          : "linear-gradient(135deg, rgba(227,6,19,0.35), rgba(227,6,19,0.05), transparent)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = "scale(1.02) translateY(-4px)";
        el.style.background = isPartner
          ? "linear-gradient(135deg, rgba(16,185,129,0.55), rgba(16,185,129,0.15), transparent)"
          : isInverter
          ? "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(139,92,246,0.15), transparent)"
          : "linear-gradient(135deg, rgba(227,6,19,0.55), rgba(227,6,19,0.15), transparent)";
        el.style.boxShadow = isPartner
          ? "0 12px 40px rgba(0,0,0,0.35), 0 0 50px rgba(16,185,129,0.18)"
          : isInverter
          ? "0 12px 40px rgba(0,0,0,0.35), 0 0 50px rgba(139,92,246,0.18)"
          : "0 12px 40px rgba(0,0,0,0.35), 0 0 50px rgba(227,6,19,0.18)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = "scale(1) translateY(0)";
        el.style.background = isPartner
          ? "linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.05), transparent)"
          : isInverter
          ? "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(139,92,246,0.05), transparent)"
          : "linear-gradient(135deg, rgba(227,6,19,0.35), rgba(227,6,19,0.05), transparent)";
        el.style.boxShadow = "none";
      }}
    >
      <div
        className="relative h-full overflow-hidden rounded-2xl"
        style={{
          background: "rgba(34, 34, 34, 0.9)",
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)",
        }}
      >
      {/* Image carousel */}
      <Link href={seoUrl} className="block">
        <div className="relative h-[180px] w-full overflow-hidden">
          {images.length > 0 ? (
            <>
              <Image
                key={currentImage}
                src={images[currentImage]}
                alt={`${service.name} ${currentImage + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-opacity duration-500"
                loading="lazy"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-110"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", color: "white" }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-110"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", color: "white" }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              {images.length > 1 && (
                <div className="absolute bottom-3 right-3 flex gap-1">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); setCurrentImage(idx); }}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: idx === currentImage ? "1.25rem" : "0.375rem",
                        backgroundColor: idx === currentImage ? accent : "rgba(34, 34, 34, 0.9)",
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
              <ImageIcon className="h-12 w-12" style={{ color: "#444" }} />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <div
            className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              border: `1px solid ${accent}30`,
            }}
          >
            <ServiceIcon
              iconName={service.icon_name}
              className="h-5 w-5"
              style={{ color: accent }}
            />
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={seoUrl}>
            <span
              className="rounded-md px-2.5 py-1 font-oswald text-[10px] tracking-widest uppercase text-white"
              style={{ backgroundColor: `${accent}25`, color: accent, border: `1px solid ${accent}35` }}
            >
              {service.badge_garantia}
            </span>
          </Link>
          {service.discount_percentage > 0 && (
            <Link href={seoUrl}>
              <span
                className="rounded-md px-2.5 py-1 font-oswald text-[10px] tracking-widest uppercase"
                style={{ backgroundColor: "rgba(201, 168, 76, 0.15)", color: "#C9A84C", border: "1px solid rgba(201, 168, 76, 0.25)" }}
              >
                Até {service.discount_percentage}% OFF
              </span>
            </Link>
          )}
          {service.partner_id && (
            <Link href={seoUrl}>
              <span
                className="flex items-center gap-1 rounded-md px-2.5 py-1 font-oswald text-[10px] tracking-widest uppercase"
                style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.25)" }}
              >
                <Building2 className="h-3 w-3" />
                {service.partner_name || "Parceiro"}
              </span>
            </Link>
          )}
        </div>

        <Link href={seoUrl} className="block mt-4">
          <h3 className="font-montserrat text-sm font-bold uppercase tracking-wide text-white">
            {service.name}
          </h3>
        </Link>

        <Link href={seoUrl} className="block mt-2">
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#a0a0a0" }}>
            {service.description}
          </p>
        </Link>

        {/* Price */}
        {service.partner_id && service.price != null && service.price > 0 && (
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-oswald text-lg font-bold" style={{ color: accent }}>
              R$ {Number(service.price).toFixed(2).replace(".", ",")}
            </span>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Link
            href={seoUrl}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`,
              boxShadow: `0 4px 14px ${accent}35, 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)`,
            }}
          >
            Ver Detalhes
            <ArrowUpRight className="h-3 w-3 opacity-70" />
          </Link>
          <button
            onClick={handleSchedule}
            className="flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 hover:scale-105"
            style={{ borderColor: `${accent}25`, backgroundColor: `${accent}08`, color: accent }}
          >
            <CalendarCheck className="h-4 w-4" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
