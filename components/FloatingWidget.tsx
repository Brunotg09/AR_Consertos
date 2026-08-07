"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

type Occasion =
  | "welcome"
  | "help"
  | "schedule"
  | "buy"
  | "success"
  | "thanks";

interface FloatingWidgetContextType {
  trigger: (occasion: Occasion) => void;
}

const FloatingWidgetContext = createContext<FloatingWidgetContextType | null>(null);

export function useFloatingWidget() {
  const context = useContext(FloatingWidgetContext);
  if (!context) {
    throw new Error("useFloatingWidget must be used within a FloatingWidgetProvider");
  }
  return context;
}

const occasionConfig: Record<Occasion, { video: string; message: string; accent: string; accentGlow: string }> = {
  welcome: {
    video: "/videos/welcome.webm",
    message: "Bem-vindo a AR Consertos!",
    accent: "#C9A84C",
    accentGlow: "rgba(201, 168, 76, 0.25)",
  },
  help: {
    video: "/videos/help.webm",
    message: "Como posso te ajudar?",
    accent: "#8B5CF6",
    accentGlow: "rgba(139, 92, 246, 0.25)",
  },
  schedule: {
    video: "/videos/schedule.webm",
    message: "Vamos agendar seu conserto?",
    accent: "#E30613",
    accentGlow: "rgba(227, 6, 19, 0.25)",
  },
  buy: {
    video: "/videos/buy.webm",
    message: "Interessado em algum produto?",
    accent: "#C9A84C",
    accentGlow: "rgba(201, 168, 76, 0.25)",
  },
  success: {
    video: "/videos/success.webm",
    message: "Otima escolha!",
    accent: "#10B981",
    accentGlow: "rgba(16, 185, 129, 0.25)",
  },
  thanks: {
    video: "/videos/thanks.webm",
    message: "Obrigado por escolher a AR Consertos!",
    accent: "#8B5CF6",
    accentGlow: "rgba(139, 92, 246, 0.25)",
  },
};

/* ─── Video Cache Manager ─── */
const CACHE_NAME = "ar-widget-videos-v1";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

async function getCachedVideo(url: string): Promise<string | null> {
  try {
    if (!("caches" in window)) return null;
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }
    return null;
  } catch {
    return null;
  }
}

async function cacheVideo(url: string): Promise<void> {
  try {
    if (!("caches" in window)) return;
    const cache = await caches.open(CACHE_NAME);
    const existing = await cache.match(url);
    if (existing) return;
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response.clone());
    }
  } catch {}
}

function clearExpiredCache(): void {
  try {
    if (!("caches" in window)) return;
    caches.open(CACHE_NAME).then(async (cache) => {
      const keys = await cache.keys();
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const dateHeader = response.headers.get("sw-cache-date");
          if (dateHeader) {
            if (Date.now() - new Date(dateHeader).getTime() > CACHE_DURATION_MS) {
              await cache.delete(request);
            }
          }
        }
      }
    });
  } catch {}
}

/* ─── Provider ─── */
interface FloatingWidgetProps {
  children: ReactNode;
}

export function FloatingWidgetProvider({ children }: FloatingWidgetProps) {
  const [currentOccasion, setCurrentOccasion] = useState<Occasion | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const trigger = useCallback((occasion: Occasion) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCurrentOccasion(occasion);
    setIsVisible(true);
    timeoutRef.current = setTimeout(() => setIsVisible(false), 6000);
  }, []);

  useEffect(() => {
    clearExpiredCache();
    const timer = setTimeout(() => trigger("welcome"), 1500);
    return () => {
      clearTimeout(timer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [trigger]);

  return (
    <FloatingWidgetContext.Provider value={{ trigger }}>
      {children}
      {isVisible && currentOccasion && (
        <FloatingWidgetDisplay
          occasion={currentOccasion}
          onClose={() => {
            setIsVisible(false);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }}
        />
      )}
    </FloatingWidgetContext.Provider>
  );
}

/* ─── Display: Character bottom-left, speech bubble above ─── */
function FloatingWidgetDisplay({
  occasion,
  onClose,
}: {
  occasion: Occasion;
  onClose: () => void;
}) {
  const config = occasionConfig[occasion];
  const [videoSrc, setVideoSrc] = useState<string>(config.video);
  const [phase, setPhase] = useState<"enter" | "idle" | "exit">("enter");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadVideo() {
      const cached = await getCachedVideo(config.video);
      if (cancelled) return;
      if (cached) {
        setVideoSrc(cached);
      } else {
        cacheVideo(config.video);
      }
    }
    loadVideo();
    return () => { cancelled = true; };
  }, [config.video]);

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("idle"), 600);
    const exitTimer = setTimeout(() => setPhase("exit"), 5000);
    const removeTimer = setTimeout(onClose, 6000);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [onClose]);

  return (
    <div
      className="fixed bottom-0 left-0 z-50 pointer-events-auto"
      style={{
        animation: phase === "exit"
          ? "widgetExitBottom 0.45s cubic-bezier(0.55, 0, 1, 0.45) forwards"
          : "widgetEnterBottom 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      {/* Speech Bubble - sits ABOVE the character */}
      <div
        className="relative ml-6 mb-0"
        style={{
          maxWidth: "320px",
          width: "max-content",
          animation: "bubbleAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
        }}
      >
        <div
          className="relative rounded-2xl rounded-br-sm px-5 py-3.5"
          style={{
            background: "rgba(18, 18, 18, 0.88)",
            backdropFilter: "blur(24px) saturate(150%)",
            WebkitBackdropFilter: "blur(24px) saturate(150%)",
            border: `1px solid rgba(255, 255, 255, 0.06)`,
            boxShadow: `
              0 12px 40px rgba(0, 0, 0, 0.5),
              0 0 60px ${config.accentGlow},
              inset 0 1px 0 rgba(255, 255, 255, 0.04)
            `,
          }}
        >
          {/* Accent dot */}
          <div
            className="absolute top-3.5 left-4 w-2 h-2 rounded-full"
            style={{ background: config.accent, boxShadow: `0 0 8px ${config.accentGlow}` }}
          />

          {/* Message */}
          <p
            className="text-[15px] font-medium leading-snug pl-4"
            style={{
              color: "#f0f0f0",
              fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
            }}
          >
            {config.message}
          </p>

          
        </div>

        {/* Tail pointing down to character */}
        <div
          className="absolute -bottom-2 left-10 w-4 h-4 rotate-45"
          style={{
            background: "rgba(18, 18, 18, 0.88)",
            borderRight: "1px solid rgba(255, 255, 255, 0.06)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        />
      </div>

      {/* Character - BIG, NO BORDER, NO RING */}
      <div
        className="relative"
        style={{
          width: "260px",
          height: "330px",
          animation: "characterRise 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both",
        }}
      >
        {/* Subtle ground glow */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-2xl"
          style={{ background: config.accentGlow, opacity: 0.5 }}
        />

        {/* Video */}
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-80 h-80 object-contain z-10"
          style={{
            filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.4))",
          }}
        />
      </div>
    </div>
  );
}

export default function FloatingWidget() {
  return null;
}
