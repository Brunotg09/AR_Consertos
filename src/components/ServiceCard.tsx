"use client";

import { useState } from "react";
import Link from "next/link";
import { ServiceItem } from "@/data/services";
import { ServiceIcon } from "./ServiceIcon";
import { getServiceImages } from "@/data/serviceImages";
import { useCart } from "@/contexts/CartContext";
import { CalendarCheck, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

interface ServiceCardProps {
  service: ServiceItem;
  variant?: "convencional" | "inverter";
}

export function ServiceCard({ service, variant }: ServiceCardProps) {
  const type = variant || service.type;
  const isInverter = type === "inverter";
  const accent = isInverter ? "#8B5CF6" : "#E30613";
  const images = getServiceImages(service.id, service.totalImages);
  const [currentImage, setCurrentImage] = useState(0);
  const { addService } = useCart();

  const nextImage = () => setCurrentImage((p) => (p + 1) % images.length);
  const prevImage = () => setCurrentImage((p) => (p - 1 + images.length) % images.length);

  const handleSchedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    addService(service);
  };

  return (
    <div
      className="group relative overflow-hidden rounded-2xl transition-all duration-300"
      style={{
        background: "rgba(34, 34, 34, 0.45)",
        backdropFilter: "blur(16px) saturate(140%)",
        WebkitBackdropFilter: "blur(16px) saturate(140%)",
        border: "1px solid transparent",
        borderImage: isInverter
          ? "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(139,92,246,0.05), transparent) 1"
          : "linear-gradient(135deg, rgba(227,6,19,0.35), rgba(227,6,19,0.05), transparent) 1",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = "scale(1.02) translateY(-4px)";
        el.style.boxShadow = isInverter
          ? "0 12px 40px rgba(0,0,0,0.35), 0 0 50px rgba(139,92,246,0.18), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 12px 40px rgba(0,0,0,0.35), 0 0 50px rgba(227,6,19,0.18), inset 0 1px 0 rgba(255,255,255,0.06)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = "scale(1) translateY(0)";
        el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)";
      }}
    >
      {/* Image carousel */}
      <div className="relative h-[180px] w-full overflow-hidden">
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`${service.name} ${idx + 1}`}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
            style={{ opacity: idx === currentImage ? 1 : 0 }}
            loading="lazy"
          />
        ))}
        {/* Dark overlay at bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Icon seal */}
        <div
          className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${accent}30`,
          }}
        >
          <ServiceIcon
            iconName={service.iconName}
            className="h-5 w-5"
            style={{ color: accent }}
          />
        </div>

        {/* Arrows (show on hover) */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-110"
              style={{
                backgroundColor: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
                color: "white",
              }}
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-110"
              style={{
                backgroundColor: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
                color: "white",
              }}
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        {/* Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentImage(idx); }}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: idx === currentImage ? "1.25rem" : "0.375rem",
                  backgroundColor: idx === currentImage ? accent : "rgba(255,255,255,0.3)",
                }}
                aria-label={`Ir para imagem ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-md px-2.5 py-1 font-oswald text-[10px] tracking-widest uppercase text-white"
            style={{
              backgroundColor: `${accent}25`,
              color: accent,
              border: `1px solid ${accent}35`,
            }}
          >
            {service.badgeGarantia}
          </span>
          {service.discountPercentage > 0 && (
            <span
              className="rounded-md px-2.5 py-1 font-oswald text-[10px] tracking-widest uppercase"
              style={{
                backgroundColor: "rgba(201, 168, 76, 0.15)",
                color: "#C9A84C",
                border: "1px solid rgba(201, 168, 76, 0.25)",
              }}
            >
              Até {service.discountPercentage}% OFF
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-4 font-montserrat text-sm font-bold uppercase tracking-wide text-white">
          {service.name}
        </h3>

        {/* Description */}
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "#a0a0a0" }}>
          {service.description}
        </p>

        {/* Actions */}
        <div className="mt-5 flex items-center gap-3">
          <Link
            href={`/servico/${service.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`,
              boxShadow: `0 4px 14px ${accent}35, 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)`,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.boxShadow = `0 8px 28px ${accent}55, 0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.boxShadow = `0 4px 14px ${accent}35, 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)`;
            }}
          >
            Ver Detalhes
            <ArrowUpRight className="h-3 w-3 opacity-70" />
          </Link>
          <button
            onClick={handleSchedule}
            className="flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 hover:scale-105"
            style={{
              borderColor: `${accent}25`,
              backgroundColor: `${accent}08`,
              color: accent,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = accent;
              el.style.backgroundColor = `${accent}18`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = `${accent}25`;
              el.style.backgroundColor = `${accent}08`;
            }}
            aria-label="Agendar serviço"
          >
            <CalendarCheck className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
