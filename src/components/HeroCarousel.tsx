"use client";

import { supabase } from "@/lib/supabase";
import { ArrowRight, Award, Cpu, Settings, Wrench, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
        const err = error as { message?: string };
        console.error("Error fetching banners:", err);
        if (err?.message?.includes("relation") || err?.message?.includes("not found")) {
          console.warn("Banners table may not exist or migrations not applied yet.");
        }
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

      <div className="relative mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="relative h-72 sm:h-96 lg:h-[28rem]">
          {banners.map((banner, index) => {
            const isActive = index === current;
            const slideAccent = banner.accent_color || "#E30613";
            const Icon = banner.icon_name
              ? iconMap[banner.icon_name] || Wrench
              : Wrench;
            const hasImage = !!banner.image_url;

            return (
              <div
                key={banner.id}
                className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border px-4 py-6 text-center transition-all duration-700 ease-out sm:px-8 sm:py-8 ${
                  isActive
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-10 pointer-events-none"
                }`}
                style={{
                  background: hasImage
                    ? `linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%), url(${banner.image_url})`
                    : "rgba(26, 26, 26, 0.6)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backdropFilter: hasImage
                    ? "none"
                    : "blur(20px) saturate(140%)",
                  WebkitBackdropFilter: hasImage
                    ? "none"
                    : "blur(20px) saturate(140%)",
                  borderColor: `${slideAccent}20`,
                  boxShadow: isActive
                    ? `0 0 60px ${slideAccent}10, 0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`
                    : "none",
                }}
              >
                {!hasImage && (
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-500 sm:mb-6 sm:h-16 sm:w-16"
                    style={{
                      backgroundColor: `${slideAccent}15`,
                      color: slideAccent,
                      transform: isActive ? "scale(1)" : "scale(0.9)",
                    }}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                )}
                <h2 className="font-bebas text-3xl tracking-widest text-white sm:text-5xl lg:text-6xl drop-shadow-lg">
                  {banner.title || ""}
                </h2>
                <p
                  className="mt-3 max-w-lg text-xs leading-relaxed sm:mt-4 sm:text-base drop-shadow-md"
                  style={{ color: "#d0d0d0" }}
                >
                  {banner.subtitle || ""}
                </p>
                {banner.link && (
                  <a
                    href={banner.link}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] sm:mt-8 sm:px-8 sm:py-3.5 sm:text-sm"
                    style={{
                      background: `linear-gradient(135deg, ${slideAccent} 0%, ${slideAccent}dd 100%)`,
                      boxShadow: `0 6px 20px ${slideAccent}40, 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)`,
                    }}
                  >
                    {banner.cta_label || "Saiba Mais"}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Indicators */}
        <div className="mt-8 flex justify-center gap-2">
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
}
