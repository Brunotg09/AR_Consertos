"use client";

import { supabase } from "@/lib/supabase";
import { ArrowRight, Award, Cpu, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Banner {
  id: number;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link: string | null;
  sort_order: number;
}

// Default slides for fallback
const defaultSlides = [
  {
    id: "default-1",
    title: "CONSERTO DE ELETRODOMÉSTICOS",
    subtitle: "Linha branca, pequenos eletrodomésticos e climatização",
    cta: "Ver Serviços",
    link: "/servicos",
    accent: "#E30613",
    icon: Wrench,
  },
  {
    id: "default-2",
    title: "ELETRÔNICA AVANÇADA INVERTER",
    subtitle: "Reparo de placas de ar-condicionado inverter, inversores solares e fontes chaveadas",
    cta: "Ver Inverter",
    link: "/inverter",
    accent: "#8B5CF6",
    icon: Cpu,
  },
  {
    id: "default-3",
    title: "GARANTIA DE 90 DIAS",
    subtitle: "Confiança e qualidade em cada reparo. Atendimento em Itabaiana/SE desde 2017.",
    cta: "Fale Conosco",
    link: "/contato",
    accent: "#C9A84C",
    icon: Award,
  },
];

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBanners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setBanners(data);
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const next = useCallback(() => {
    const totalSlides = banners.length > 0 ? banners.length : defaultSlides.length;
    setCurrent((p) => (p + 1) % totalSlides);
  }, [banners.length]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  // Use banners if available, otherwise use defaults
  const slides = banners.length > 0 ? banners : defaultSlides;
  const accent = banners.length > 0 ? "#E30613" : (slides[current] as { accent?: string }).accent || "#E30613";

  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "#141414", isolation: "isolate" }}>
      {/* Subtle radial glow behind carousel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${accent}15 0%, transparent 70%)`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="relative h-80 sm:h-96 lg:h-[28rem]">
          {slides.map((slide, index) => {
            const isActive = index === current;
            const isDefaultSlide = "icon" in slide;
            const Icon = isDefaultSlide ? (slide as typeof defaultSlides[0]).icon : Wrench;
            const title = slide.title || "";
            const subtitle = slide.subtitle || "";
            const link = isDefaultSlide ? (slide as typeof defaultSlides[0]).link : (slide as Banner).link || "/servicos";
            const slideAccent = isDefaultSlide ? (slide as typeof defaultSlides[0]).accent : "#E30613";
            const imageUrl = !isDefaultSlide ? (slide as Banner).image_url : null;

            return (
              <div
                key={slide.id}
                className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border px-8 text-center transition-all duration-700 ease-out ${
                  isActive
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-10 pointer-events-none"
                }`}
                style={{
                  background: imageUrl
                    ? `linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%), url(${imageUrl})`
                    : "rgba(26, 26, 26, 0.6)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backdropFilter: imageUrl ? "none" : "blur(20px) saturate(140%)",
                  WebkitBackdropFilter: imageUrl ? "none" : "blur(20px) saturate(140%)",
                  borderColor: `${slideAccent}20`,
                  boxShadow: isActive
                    ? `0 0 60px ${slideAccent}10, 0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`
                    : "none",
                }}
              >
                {!imageUrl && (
                  <div
                    className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-500"
                    style={{
                      backgroundColor: `${slideAccent}15`,
                      color: slideAccent,
                      transform: isActive ? "scale(1)" : "scale(0.9)",
                    }}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                )}
                <h2 className="font-bebas text-4xl tracking-widest text-white sm:text-5xl lg:text-6xl drop-shadow-lg">
                  {title}
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed sm:text-base drop-shadow-md" style={{ color: "#d0d0d0" }}>
                  {subtitle}
                </p>
                <a
                  href={link}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03]"
                  style={{
                    background: `linear-gradient(135deg, ${slideAccent} 0%, ${slideAccent}dd 100%)`,
                    boxShadow: `0 6px 20px ${slideAccent}40, 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)`,
                  }}
                >
                  {isDefaultSlide ? (slide as typeof defaultSlides[0]).cta : "Saiba Mais"}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            );
          })}

        </div>

        {/* Indicators */}
        <div className="mt-8 flex justify-center gap-2">
          {slides.map((s, index) => {
            const slideAccent = "accent" in s ? s.accent : "#E30613";
            return (
              <button
                key={s.id}
                onClick={() => setCurrent(index)}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: index === current ? "2.5rem" : "0.5rem",
                  backgroundColor: index === current ? slideAccent : "#333333",
                  boxShadow: index === current ? `0 0 10px ${slideAccent}60` : "none",
                }}
                aria-label={`Ir para slide ${index + 1}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
