"use client";

import Link from "next/link";
import { Phone, Instagram, MapPin, Mail, Clock, ArrowRight } from "lucide-react";

export function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "#0d1f2d",
      }}
    >
      {/* Gradient top border */}
      <div
        className="h-[2px] w-full"
        style={{
          background: "linear-gradient(90deg, transparent 0%, #E30613 20%, #8B5CF6 50%, #C9A84C 80%, transparent 100%)",
          opacity: 0.6,
        }}
      />

      {/* Faixa superior — info com fundo levemente diferente */}
      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div className="mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] sm:justify-between">
            <div className="flex items-center gap-2" style={{ color: "#888888" }}>
              <MapPin className="h-3.5 w-3.5" style={{ color: "#C9A84C" }} />
              <span>Itabaiana/SE</span>
            </div>
            <div className="flex items-center gap-2" style={{ color: "#888888" }}>
              <Mail className="h-3.5 w-3.5" style={{ color: "#C9A84C" }} />
              <a href="mailto:contato@arconsertos.com.br" className="hover:text-white hover:underline transition-colors">
                contato@arconsertos.com.br
              </a>
            </div>
            <div className="flex items-center gap-2" style={{ color: "#888888" }}>
              <Clock className="h-3.5 w-3.5" style={{ color: "#C9A84C" }} />
              <span>Seg - Sex: 8h às 18h | Sáb: 8h às 12h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Faixa principal — contato */}
      <div className="mx-auto px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-10 sm:flex-row">
          {/* Esquerda: badge contato premium */}
          <div className="flex items-center gap-3">
            <a
              href="tel:+5579999446596"
              className="group flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #E30613 0%, #b80510 100%)",
                boxShadow: "0 4px 14px rgba(227,6,19,0.35), 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 28px rgba(227,6,19,0.5), 0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(227,6,19,0.35), 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)";
              }}
            >
              <Phone className="h-4 w-4" />
              CONTATO
              <ArrowRight className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Centro: nome + telefone */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
            <span className="font-montserrat text-xl font-bold tracking-tight text-white">
              ANTHONY
            </span>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" style={{ color: "#E30613" }} />
              <a
                href="tel:+5579999446596"
                className="font-inter text-white hover:underline transition-colors"
              >
                (79) 9 9944-6596
              </a>
            </div>
          </div>

          {/* Direita: Instagram com hover roxo */}
          <a
            href="https://instagram.com/A.RCONSERTOS"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2.5 transition-all duration-200 hover:scale-110"
          >
            <Instagram className="h-6 w-6 transition-colors duration-200 group-hover:text-[#8B5CF6]" style={{ color: "#E30613" }} />
            <span className="font-inter text-sm text-white transition-colors group-hover:text-[#8B5CF6]">
              @A.RCONSERTOS
            </span>
          </a>
        </div>
      </div>

      {/* Faixa inferior — copyright */}
      <div
        className="border-t border-white/[0.04]"
        style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
      >
        <div className="mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-3 text-[11px] sm:flex-row" style={{ color: "#666666" }}>
            <span>© 2026 AR Consertos · Todos os direitos reservados</span>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:ml-auto">
              <button
                onClick={() => (window as any).openCookieSettings?.()}
                className="transition-colors hover:text-white hover:underline"
                style={{ color: "#C9A84C" }}
              >
                🍪 Configurar Cookies
              </button>
              <Link
                href="/politica-de-privacidade"
                className="transition-colors hover:text-white hover:underline"
              >
                Política de Privacidade (LGPD)
              </Link>
              <Link
                href="/termos-de-uso"
                className="transition-colors hover:text-white hover:underline"
              >
                Termos de Uso
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
