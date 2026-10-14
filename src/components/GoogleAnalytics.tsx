"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA4_ID || "";
const CONSENT_KEY = "ar_consertos_cookie_consent";

/** Retorna true se o usuário aceitou os cookies (usado p/ decidir se GA roda). */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

/**
 * Google Analytics 4 (gtag.js).
 *
 * - Só carrega se `NEXT_PUBLIC_GA4_ID` estiver definida (sem ela, não renderiza nada).
 * - Respeita o consentimento de cookies: só injeta o script se o usuário já
 *   aceitou (`localStorage[CONSENT_KEY] === "accepted"`). Se rejeitar (ou ainda
 *   não escolheu), o script NÃO roda — nada é enviado ao Google.
 * - `anonymize_ip` ligado por padrão (LGPD).
 *
 * Para ativar: crie a propriedade GA4 no painel do Google, copie a medição ID
 * (formato G-XXXXXXX) e adicione NEXT_PUBLIC_GA4_ID ao .env e ao Vercel.
 */
export function GoogleAnalytics() {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!GA_ID) return;
    setConsent(hasAnalyticsConsent());

    // Reage a mudanças de consentimento (mesma aba: evento custom do
    // CookieConsent; outra aba: evento nativo "storage")
    const onChange = () => setConsent(hasAnalyticsConsent());
    window.addEventListener("cookie-consent-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("cookie-consent-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  // Sem ID ou sem consentimento → não renderiza o script
  if (!GA_ID || !consent) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
