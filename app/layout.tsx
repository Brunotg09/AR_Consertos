import { ChatProvider } from "@/components/ChatProvider";
import { ConditionalLayout } from "@/components/ConditionalLayout";
import { CartProvider } from "@/contexts/CartContext";
import { OfflineBanner } from "@/hooks/useOffline";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ar-consertos.vercel.app"),
  applicationName: "AR Consertos",
  title: {
    default: "AR Consertos - Conserto de Eletrodomésticos e Eletrônica",
    template: "%s | AR Consertos",
  },
  description:
    "AR Consertos em Itabaiana/SE. Conserto de eletrodomésticos, linha branca, eletrônica avançada inverter. Garantia de 90 dias. Desde 2017.",
  keywords: [
    "conserto eletrodomésticos",
    "eletrônica inverter",
    "conserto ar condicionado",
    "conserto geladeira",
    "conserto máquina de lavar",
    "linha branca",
    "Itabaiana",
    "Sergipe",
    "AR Consertos",
    "assistência técnica",
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
    <html lang="pt-BR" className="overflow-x-hidden">
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
                name: "AR Consertos",
                description:
                  "Conserto de eletrodomésticos e eletrônica inverter em Itabaiana/SE",
                url: "https://ar-consertos.vercel.app",
                telephone: "+55-79-99944-6596",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: "Itabaiana",
                  addressRegion: "SE",
                  addressCountry: "BR",
                },
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: -10.6842,
                  longitude: -37.4216,
                },
                areaServed: {
                  "@type": "City",
                  name: "Itabaiana",
                },
                priceRange: "$$",
                openingHours: "Mo-Fr 08:00-18:00, Sa 08:00-12:00",
              },
            ]),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col overflow-x-hidden">
        <OfflineBanner />
        <CartProvider>
          <ChatProvider>
            <ConditionalLayout>{children}</ConditionalLayout>
          </ChatProvider>
        </CartProvider>
      </body>
    </html>
  );
}
