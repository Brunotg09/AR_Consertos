"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

const COOKIE_KEY = "ar_consertos_cookie_consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      setShow(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setShow(false);
  };

  const reject = () => {
    localStorage.setItem(COOKIE_KEY, "rejected");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t pointer-events-none"
      style={{
        backgroundColor: "#1a1a1a",
        borderColor: "#ffffff15",
      }}
    >
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8 pointer-events-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: "#C9A84C" }}
            />
            <div>
              <p className="text-sm font-medium text-white">
                Cookies e Privacidade
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "#888888" }}>
                Utilizamos cookies para melhorar sua experiência, manter sua
                sessão e analisar o desempenho do site. Ao continuar navegando,
                você concorda com o uso de cookies.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-3">
            <button
              onClick={reject}
              className="rounded-lg border px-4 py-2 text-xs font-medium transition-colors hover:bg-white/5"
              style={{
                borderColor: "#ffffff20",
                color: "#888888",
              }}
            >
              Rejeitar
            </button>
            <button
              onClick={accept}
              className="rounded-lg px-4 py-2 text-xs font-medium text-black transition-colors hover:opacity-90"
              style={{ backgroundColor: "#C9A84C" }}
            >
              Aceitar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
