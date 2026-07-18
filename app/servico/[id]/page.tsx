"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { servicesData } from "@/data/services";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useCart } from "@/contexts/CartContext";
import {
  CalendarCheck,
  ArrowLeft,
  Tag,
  Award,
  Image as ImageIcon,
} from "lucide-react";

export default function ServicoDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { addService } = useCart();
  const service = servicesData.find((s) => s.id === id);

  if (!service) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="font-bebas text-3xl text-white">Serviço não encontrado</h1>
        <p className="mt-2 text-sm" style={{ color: "#888888" }}>
          O serviço solicitado não existe em nosso catálogo.
        </p>
        <Link
          href="/servicos"
          className="mt-6 inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-bold text-white"
          style={{ backgroundColor: "#E30613" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Serviços
        </Link>
      </div>
    );
  }

  const isInverter = service.type === "inverter";
  const accent = isInverter ? "#8B5CF6" : "#E30613";

  // Simula galeria de imagens (placeholder)
  const imageSlots = Array.from({ length: service.totalImages }, (_, i) => i + 1);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href={isInverter ? "/inverter" : "/servicos"}
        className="inline-flex items-center gap-2 text-xs font-medium transition-colors hover:text-white"
        style={{ color: "#888888" }}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="mt-6 rounded-xl border border-white/10 p-6 sm:p-8" style={{ backgroundColor: "#1a1a1a" }}>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${accent}20` }}
            >
              <ServiceIcon
                iconName={service.iconName}
                className="h-7 w-7"
                style={{ color: accent }}
              />
            </div>
            <div>
              <span
                className="inline-block rounded px-2 py-0.5 font-oswald text-[10px] tracking-wider text-white"
                style={{ backgroundColor: accent }}
              >
                {service.badgeGarantia}
              </span>
              <h1 className="mt-1 font-bebas text-2xl tracking-wide text-white sm:text-3xl">
                {service.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" style={{ color: "#C9A84C" }} />
            <span className="text-xs font-medium" style={{ color: "#C9A84C" }}>
              {service.category}
            </span>
          </div>
        </div>

        {/* Descrição */}
        <p className="mt-6 text-sm leading-relaxed" style={{ color: "#F0F0F0" }}>
          {service.description}
        </p>

        {/* Galeria de ícones (placeholder) */}
        <div className="mt-8">
          <h3 className="font-montserrat text-sm font-bold text-white">
            Galeria
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {imageSlots.map((slot) => (
              <div
                key={slot}
                className="flex aspect-video items-center justify-center rounded-lg border border-white/10"
                style={{ backgroundColor: "#222222" }}
              >
                <div className="flex flex-col items-center gap-2" style={{ color: "#555555" }}>
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-[10px]">Imagem {slot}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info extras */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs" style={{ color: "#888888" }}>
            <Award className="h-3.5 w-3.5" style={{ color: "#C9A84C" }} />
            <span>Garantia de 90 dias</span>
          </div>
          {service.discountPercentage > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs" style={{ color: "#C9A84C" }}>
              <Tag className="h-3.5 w-3.5" />
              <span>Até {service.discountPercentage}% OFF no agendamento</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => addService(service)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            <CalendarCheck className="h-4 w-4" />
            Agendar Serviço
          </button>
        </div>
      </div>
    </div>
  );
}
