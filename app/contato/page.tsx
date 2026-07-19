import { Phone, Instagram, MapPin, Mail, Clock, Wrench } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Contato',
  description:
    'Entre em contato com a AR Consertos em Itabaiana/SE. Telefone, WhatsApp, Instagram, endereço e horário de funcionamento.',
  alternates: {
    canonical: 'https://ar-consertos.vercel.app/contato',
  },
};

export default function ContatoPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="h-1 w-8 rounded" style={{ backgroundColor: "#C9A84C" }} />
        <h1 className="font-bebas text-3xl tracking-wide text-white sm:text-4xl">
          CONTATO
        </h1>
      </div>
      <p className="mt-2 text-sm" style={{ color: "#888888" }}>
        Fale com a AR Consertos em Itabaiana/SE
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Telefone */}
        <a
          href="tel:+5579999446596"
          className="flex items-start gap-4 rounded-xl border border-white/10 p-5 transition-all hover:border-ar-red/50"
          style={{ backgroundColor: "#1a1a1a" }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "#E3061320" }}
          >
            <Phone className="h-5 w-5" style={{ color: "#E30613" }} />
          </div>
          <div>
            <h3 className="font-montserrat text-sm font-bold text-white">Telefone / WhatsApp</h3>
            <p className="mt-1 text-sm" style={{ color: "#F0F0F0" }}>
              (79) 9 9944-6596
            </p>
            <p className="mt-1 text-xs" style={{ color: "#888888" }}>
              Clique para ligar ou enviar mensagem
            </p>
          </div>
        </a>

        {/* Instagram */}
        <a
          href="https://instagram.com/A.RCONSERTOS"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-4 rounded-xl border border-white/10 p-5 transition-all hover:border-ar-red/50"
          style={{ backgroundColor: "#1a1a1a" }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "#E3061320" }}
          >
            <Instagram className="h-5 w-5" style={{ color: "#E30613" }} />
          </div>
          <div>
            <h3 className="font-montserrat text-sm font-bold text-white">Instagram</h3>
            <p className="mt-1 text-sm" style={{ color: "#F0F0F0" }}>
              @A.RCONSERTOS
            </p>
            <p className="mt-1 text-xs" style={{ color: "#888888" }}>
              Siga-nos para novidades e promoções
            </p>
          </div>
        </a>

        {/* Endereço */}
        <div
          className="flex items-start gap-4 rounded-xl border border-white/10 p-5"
          style={{ backgroundColor: "#1a1a1a" }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "#C9A84C20" }}
          >
            <MapPin className="h-5 w-5" style={{ color: "#C9A84C" }} />
          </div>
          <div>
            <h3 className="font-montserrat text-sm font-bold text-white">Endereço</h3>
            <p className="mt-1 text-sm" style={{ color: "#F0F0F0" }}>
              Itabaiana, Sergipe
            </p>
            <p className="mt-1 text-xs" style={{ color: "#888888" }}>
              Atendimento com hora marcada
            </p>
          </div>
        </div>

        {/* Horário */}
        <div
          className="flex items-start gap-4 rounded-xl border border-white/10 p-5"
          style={{ backgroundColor: "#1a1a1a" }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "#C9A84C20" }}
          >
            <Clock className="h-5 w-5" style={{ color: "#C9A84C" }} />
          </div>
          <div>
            <h3 className="font-montserrat text-sm font-bold text-white">Horário de Atendimento</h3>
            <p className="mt-1 text-sm" style={{ color: "#F0F0F0" }}>
              Segunda a Sexta: 8h às 18h
            </p>
            <p className="mt-1 text-sm" style={{ color: "#F0F0F0" }}>
              Sábado: 8h às 12h
            </p>
          </div>
        </div>

        {/* E-mail */}
        <a
          href="mailto:contato@arconsertos.com.br"
          className="flex items-start gap-4 rounded-xl border border-white/10 p-5 transition-all hover:border-ar-red/50 sm:col-span-2"
          style={{ backgroundColor: "#1a1a1a" }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "#E3061320" }}
          >
            <Mail className="h-5 w-5" style={{ color: "#E30613" }} />
          </div>
          <div>
            <h3 className="font-montserrat text-sm font-bold text-white">E-mail</h3>
            <p className="mt-1 text-sm" style={{ color: "#F0F0F0" }}>
              contato@arconsertos.com.br
            </p>
            <p className="mt-1 text-xs" style={{ color: "#888888" }}>
              Resposta em até 24h úteis
            </p>
          </div>
        </a>
      </div>

      {/* CTA final */}
      <div className="mt-10 rounded-xl border border-white/10 p-8 text-center" style={{ backgroundColor: "#1a1a1a" }}>
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: "#E3061320" }}
        >
          <Wrench className="h-7 w-7" style={{ color: "#E30613" }} />
        </div>
        <h2 className="mt-4 font-bebas text-2xl text-white">
          PRECISA DE CONSERTO?
        </h2>
        <p className="mt-2 text-sm" style={{ color: "#888888" }}>
          Entre em contato pelo WhatsApp e agende seu atendimento com garantia de 90 dias.
        </p>
        <a
          href="https://wa.me/5579999446596"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-md px-8 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#E30613" }}
        >
          <Phone className="h-4 w-4" />
          Falar no WhatsApp
        </a>
      </div>
    </div>
  );
}
