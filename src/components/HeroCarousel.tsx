"use client";

import { supabase } from "@/lib/supabase";
import { Award, Cpu, Settings, Wrench, Zap } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

const iconMap: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  Wrench,
  Cpu,
  Award,
  Zap,
  Settings,
};

interface Banner {
  id: number;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  link: string | null;
  sort_order: number;
  accent_color: string;
  cta_label: string;
  icon_name: string | null;
}

export const HeroCarousel = memo(function HeroCarousel() {
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const next = useCallback(() => {
    if (banners.length === 0) return;
    setCurrent((p) => (p + 1) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[current];
  const accent = currentBanner?.accent_color || "#E30613";

  return (
    <section className="relative overflow-hidden">
      {/* Subtle radial glow behind carousel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${accent}15 0%, transparent 70%)`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-3 py-8 sm:px-4 sm:py-8 lg:px-8 lg:py-8">
        {/* 2.4:1 ratio container — removido h fixo, agora usa aspect-ratio */}
        <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "2.4 / 1" }}>
          {banners.map((banner, index) => {
            const isActive = index === current;
            const slideAccent = banner.accent_color || "#E30613";
            const Icon = banner.icon_name
              ? iconMap[banner.icon_name] || Wrench
              : Wrench;
            const hasImage = !!banner.image_url;

            const bannerContent = (
              <>
                {/* Background */}
                {hasImage ? (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${banner.image_url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "rgba(26, 26, 26, 0.6)",
                      backdropFilter: "blur(20px) saturate(140%)",
                      WebkitBackdropFilter: "blur(20px) saturate(140%)",
                    }}
                  />
                )}

                {/* Gradient overlay — escuro embaixo para legibilidade do texto */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.05) 70%, transparent 100%)",
                  }}
                />

                {/* Border + glow */}
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    borderColor: `${slideAccent}20`,
                    boxShadow: isActive
                      ? `0 0 60px ${slideAccent}10, 0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`
                      : "none",
                    border: `1px solid ${slideAccent}20`,
                  }}
                />

                {/* Texto no canto inferior esquerdo */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-14">
                  <div className="max-w-xl">
                    {!hasImage && (
                      <div
                        className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl sm:h-12 sm:w-12"
                        style={{
                          backgroundColor: `${slideAccent}15`,
                          color: slideAccent,
                        }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                    )}
                    {banner.title && (
                      <h2 className="font-bebas text-2xl tracking-widest text-white sm:text-4xl lg:text-5xl drop-shadow-lg">
                        {banner.title}
                      </h2>
                    )}
                    {banner.subtitle && (
                      <p
                        className="mt-2 max-w-md text-xs leading-relaxed sm:mt-3 sm:text-sm drop-shadow-md"
                        style={{ color: "#d0d0d0" }}
                      >
                        {banner.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </>
            );

            if (banner.link) {
              return (
                <a
                  key={banner.id}
                  href={banner.link}
                  className={`absolute inset-0 transition-all duration-700 ease-out ${
                    isActive
                      ? "opacity-100 translate-x-0 z-10"
                      : "opacity-0 translate-x-10 pointer-events-none"
                  }`}
                  aria-label={banner.title || "Banner"}
                >
                  {bannerContent}
                </a>
              );
            }

            return (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-all duration-700 ease-out ${
                  isActive
                    ? "opacity-100 translate-x-0 z-10"
                    : "opacity-0 translate-x-10 pointer-events-none"
                }`}
              >
                {bannerContent}
              </div>
            );
          })}
        </div>

        {/* Indicators */}
        <div className="mt-6 flex justify-center gap-2">
          {banners.map((banner, index) => {
            const slideAccent = banner.accent_color || "#E30613";
            return (
              <button
                key={banner.id}
                onClick={() => setCurrent(index)}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: index === current ? "2.5rem" : "0.5rem",
                  backgroundColor: index === current ? slideAccent : "#333333",
                  boxShadow:
                    index === current ? `0 0 10px ${slideAccent}60` : "none",
                }}
                aria-label={`Ir para slide ${index + 1}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
});
