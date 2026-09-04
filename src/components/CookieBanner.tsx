"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, Settings } from "lucide-react";

const COOKIE_KEY = "ar_conserto_cookie_consent";

interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  date: string;
}

function getStoredConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(COOKIE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveConsent(consent: CookieConsent) {
  localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function acceptAll() {
    saveConsent({ essential: true, analytics: true, date: new Date().toISOString() });
    setVisible(false);
  }

  function acceptEssential() {
    saveConsent({ essential: true, analytics: false, date: new Date().toISOString() });
    setVisible(false);
  }

  function saveCustom() {
    saveConsent({ essential: true, analytics, date: new Date().toISOString() });
    setVisible(false);
  }

  function openSettings() {
    const consent = getStoredConsent();
    if (consent) setAnalytics(consent.analytics);
    setCustomOpen(true);
    setVisible(true);
  }

  // Expõe a função globalmente para o footer chamar
  useEffect(() => {
    (window as any).openCookieSettings = openSettings;
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[500] border-t border-white/10"
      style={{ backgroundColor: "#111111" }}
    >
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-5 px-4 py-5 sm:flex-row sm:items-center sm:gap-5 sm:px-6 lg:px-8">
        {/* Texto */}
        <div className="flex-1 min-w-[280px]">
          <div className="mb-1.5 flex items-center gap-2">
            <Cookie className="h-4 w-4" style={{ color: "#C9A84C" }} />
            <h4 className="font-bebas text-lg tracking-wide text-white">
              Este site utiliza cookies
            </h4>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#888" }}>
            Utilizamos cookies para melhorar sua experiência, funcionalidades do site e
            estatísticas de acesso. Ao continuar navegando, você concorda com nossa{" "}
            <Link href="/politica-de-privacidade" className="underline hover:text-white transition-colors" style={{ color: "#C9A84C" }}>
              Política de Privacidade
            </Link>.
          </p>
        </div>

        {/* Botões */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={acceptAll}
            className="rounded-lg px-5 py-2.5 text-xs font-bold text-white transition-all hover:brightness-110"
            style={{ backgroundColor: "#E30613" }}
          >
            Aceitar Todos
          </button>
          <button
            onClick={acceptEssential}
            className="rounded-lg border px-5 py-2.5 text-xs font-bold transition-all hover:bg-white/5"
            style={{ borderColor: "#C9A84C", color: "#C9A84C" }}
          >
            Apenas Essenciais
          </button>
          <button
            onClick={() => setCustomOpen(!customOpen)}
            className="rounded-lg border border-white/15 bg-white/[0.06] px-5 py-2.5 text-xs font-bold transition-all hover:bg-white/10"
            style={{ color: "#d0d0d0" }}
          >
            <Settings className="mr-1.5 inline h-3.5 w-3.5" />
            Personalizar
          </button>
        </div>
      </div>

      {/* Painel de personalização */}
      {customOpen && (
        <div className="mx-auto max-w-[1280px] border-t border-white/[0.06] px-4 pt-4 pb-2 sm:px-6 lg:px-8">
          <div className="space-y-1">
            {/* Essenciais */}
            <div className="flex items-center justify-between py-2.5">
              <div>
                <span className="text-sm" style={{ color: "#d0d0d0" }}>Cookies Essenciais</span>
                <p className="text-[11px]" style={{ color: "#888" }}>
                  Necessários para o funcionamento do site (sessão, carrinho, login)
                </p>
              </div>
              <div
                className="relative h-[22px] w-[40px] cursor-not-allowed rounded-full opacity-50"
                style={{ backgroundColor: "#E30613" }}
              >
                <div className="absolute left-[22px] top-[2px] h-[18px] w-[18px] rounded-full bg-white" />
              </div>
            </div>
            {/* Analytics */}
            <div className="flex items-center justify-between py-2.5">
              <div>
                <span className="text-sm" style={{ color: "#d0d0d0" }}>Cookies de Analytics</span>
                <p className="text-[11px]" style={{ color: "#888" }}>
                  Estatísticas de uso para melhorar o site
                </p>
              </div>
              <button
                onClick={() => setAnalytics(!analytics)}
                className={`relative h-[22px] w-[40px] rounded-full transition-colors ${
                  analytics ? "" : "bg-white/10"
                }`}
                style={analytics ? { backgroundColor: "#E30613" } : {}}
              >
                <div
                  className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${
                    analytics ? "translate-x-[22px]" : "translate-x-[2px]"
                  }`}
                />
              </button>
            </div>
          </div>
          <div className="mt-3 flex justify-end pb-2">
            <button
              onClick={saveCustom}
              className="rounded-lg px-4 py-2 text-xs font-bold text-white transition-all hover:brightness-110"
              style={{ backgroundColor: "#E30613" }}
            >
              Salvar Preferências
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
