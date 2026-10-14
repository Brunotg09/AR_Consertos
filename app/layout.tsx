import { ChatProvider } from "@/components/ChatProvider";
import { ConditionalLayout } from "@/components/ConditionalLayout";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/contexts/CartContext";
import { TwoFAProvider } from "@/contexts/TwoFAProvider";
import { OfflineBanner } from "@/hooks/useOffline";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ar-consertos.vercel.app"),
  applicationName: "AR Consertos",
  title: {
    default: "AR Consertos - Conserto de Eletrodomésticos e Eletrônica",
    template: "%s | AR Consertos",
  },
  description:
    "Assistência técnica em Itabaiana/SE. Conserto de ar condicionado, geladeira, máquina de lavar, microondas e linha branca. Orçamento grátis e garantia de 90 dias. AR Consertos!",
  keywords: [
    // Principal + localização (o que o cliente digita no Google)
    "assistência técnica em Itabaiana",
    "conserto de ar condicionado em Itabaiana",
    "conserto de eletrodomésticos em Itabaiana",
    "assistência técnica de eletrodomésticos Sergipe",
    "conserto de ar condicionado Sergipe",
    // Serviços específicos (intenção de contratação)
    "conserto de ar condicionado split",
    "manutenção de ar condicionado",
    "instalação de ar condicionado",
    "higienização de ar condicionado",
    "conserto de geladeira",
    "conserto de máquina de lavar",
    "conserto de microondas",
    "conserto de fogão e cooktop",
    "conserto de linha branca",
    "eletrônica inverter",
    "inversor solar",
    "conserto de eletrônica avançada",
    // Gatilhos que atraem público
    "orçamento grátis",
    "garantia de 90 dias",
    "conserto perto de mim",
    "AR Consertos",
    "Itabaiana",
    "Sergipe",
  ],
  authors: [{ name: "AR Consertos" }],
  creator: "AR Consertos",
  publisher: "AR Consertos",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/logo_ArConsertos.webp", sizes: "any", type: "image/webp" },
    ],
    shortcut: "/icons/icon-192x192.png",
    apple: "/icons/icon-512x512.png",
  },
  manifest: "/manifest.json",
  themeColor: "#C9A84C",
  openGraph: {
    title: "AR Consertos - Conserto de Eletrodomésticos e Eletrônica",
    description:
      "AR Consertos em Itabaiana/SE. Conserto de eletrodomésticos, linha branca, eletrônica avançada inverter.",
    url: "https://ar-consertos.vercel.app",
    siteName: "AR Consertos",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "https://ar-consertos.vercel.app/logo_ArConsertos.webp",
        width: 512,
        height: 512,
        alt: "AR Consertos - Conserto de Eletrodomésticos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AR Consertos - Conserto de Eletrodomésticos e Eletrônica Inverter",
    description:
      "Conserto de eletrodomésticos e eletrônica inverter em Itabaiana/SE. Garantia de 90 dias.",
    images: ["https://ar-consertos.vercel.app/logo_ArConsertos.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://ar-consertos.vercel.app",
  },
  verification: {
    google: "1HEMZIn_wJ8Q0rbpOylZiRbhjQPq59J0hSLz_k6s-8Q",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="overflow-x-hidden" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="theme-color" content="#C9A84C" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="AR Consertos" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "AR Consertos",
                url: "https://ar-consertos.vercel.app/",
              },
              {
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                "@id": "https://ar-consertos.vercel.app/#business",
                name: "AR Consertos - Assistência Técnica & Eletrônica Inverter",
                description:
                  "Conserto de eletrodomésticos, linha branca e eletrônica inverter em Itabaiana/SE. Garantia de 90 dias desde 2017.",
                url: "https://ar-consertos.vercel.app",
                telephone: "+55-79-99944-6596",
                image: "https://ar-consertos.vercel.app/logo_ArConsertos.webp",
                logo: "https://ar-consertos.vercel.app/logo_ArConsertos.webp",
                address: {
                  "@type": "PostalAddress",
                  // TODO: adicionar streetAddress (rua) e bairro quando souber —
                  // completa ainda mais o rich result local
                  postalCode: "49500-000",
                  addressLocality: "Itabaiana",
                  addressRegion: "SE",
                  addressCountry: "BR",
                },
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: -10.6842,
                  longitude: -37.4216,
                },
                areaServed: [
                  { "@type": "City", name: "Itabaiana" },
                  { "@type": "State", name: "Sergipe" },
                ],
                priceRange: "$$",
                openingHoursSpecification: [
                  {
                    "@type": "OpeningHoursSpecification",
                    dayOfWeek: [
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                    ],
                    opens: "08:00",
                    closes: "18:00",
                  },
                  {
                    "@type": "OpeningHoursSpecification",
                    dayOfWeek: "Saturday",
                    opens: "08:00",
                    closes: "12:00",
                  },
                ],
                brand: [
                  "Samsung",
                  "LG",
                  "Brastemp",
                  "Electrolux",
                  "Consul",
                  "Gree",
                  "Midea",
                ],
                sameAs: ["https://www.instagram.com/a.rconsertos/"],
              },
              {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: [
                  {
                    "@type": "Question",
                    name: "Vocês consertam ar condicionado em Itabaiana?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Sim! A AR Consertos realiza manutenção, instalação e conserto de ar condicionado split e inverter em Itabaiana/SE e região, com garantia de 90 dias.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Qual é a garantia dos serviços da AR Consertos?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Todos os serviços executados pela AR Consertos possuem garantia de 90 dias para o mesmo defeito.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Quais formas de pagamento são aceitas?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Aceitamos PIX, cartão de crédito e cartão de débito, com pagamento confirmado de forma segura via Mercado Pago.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Como faço para agendar um conserto?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Escolha o serviço no site e agende pelo WhatsApp (79) 99944-6596. Você acompanha o pedido pelo painel do cliente.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Quais marcas de eletrodomésticos vocês atendem?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Atendemos as principais marcas do mercado: Samsung, LG, Brastemp, Electrolux, Consul, Gree e Midea, entre outras.",
                    },
                  },
                ],
              },
            ]),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col overflow-x-hidden">
        <ThemeProvider attribute="class" defaultTheme="dark">
          <OfflineBanner />
          <CartProvider>
            <TwoFAProvider>
              <ChatProvider>
                <ConditionalLayout>{children}</ConditionalLayout>
              </ChatProvider>
            </TwoFAProvider>
          </CartProvider>
          <Toaster />
          <GoogleAnalytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
