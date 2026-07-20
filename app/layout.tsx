import './globals.css';
import type { Metadata } from 'next';
import { ConditionalLayout } from '@/components/ConditionalLayout';
import { CartProvider } from '@/contexts/CartContext';
import { ChatProvider } from '@/components/ChatProvider';
import { OfflineBanner } from '@/hooks/useOffline';

export const metadata: Metadata = {
  metadataBase: new URL('https://ar-consertos.vercel.app'),
  applicationName: 'AR Consertos',
  title: {
    default: 'AR Consertos - Conserto de Eletrodomésticos e Eletrônica',
    template: '%s | AR Consertos',
  },
  description:
    'AR Consertos em Itabaiana/SE. Conserto de eletrodomésticos, linha branca, eletrônica avançada inverter. Garantia de 90 dias. Desde 2017.',
  keywords: [
    'conserto eletrodomésticos',
    'eletrônica inverter',
    'conserto ar condicionado',
    'conserto geladeira',
    'conserto máquina de lavar',
    'linha branca',
    'Itabaiana',
    'Sergipe',
    'AR Consertos',
    'assistência técnica',
  ],
  authors: [{ name: 'AR Consertos' }],
  creator: 'AR Consertos',
  publisher: 'AR Consertos',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/logo_ArConsertos.webp',
    shortcut: '/logo_ArConsertos.webp',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'AR Consertos - Conserto de Eletrodomésticos e Eletrônica',
    description:
      'AR Consertos em Itabaiana/SE. Conserto de eletrodomésticos, linha branca, eletrônica avançada inverter.',
    url: 'https://ar-consertos.vercel.app',
    siteName: 'AR Consertos',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AR Consertos - Conserto de Eletrodomésticos e Eletrônica Inverter',
    description:
      'Conserto de eletrodomésticos e eletrônica inverter em Itabaiana/SE. Garantia de 90 dias.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://ar-consertos.vercel.app',
  },
  verification: {
    google: '1HEMZIn_wJ8Q0rbpOylZiRbhjQPq59J0hSLz_k6s-8Q',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'AR Consertos',
                url: 'https://ar-consertos.vercel.app/',
              },
              {
                '@context': 'https://schema.org',
                '@type': 'LocalBusiness',
                name: 'AR Consertos',
                description: 'Conserto de eletrodomésticos e eletrônica inverter em Itabaiana/SE',
                url: 'https://ar-consertos.vercel.app',
              telephone: '+55-79-99944-6596',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Itabaiana',
                addressRegion: 'SE',
                addressCountry: 'BR',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: -10.6842,
                longitude: -37.4216,
              },
              areaServed: {
                '@type': 'City',
                name: 'Itabaiana',
              },
              priceRange: '$$',
              openingHours: 'Mo-Fr 08:00-18:00, Sa 08:00-12:00',
            }]),
          }}
        />
      </head>
      <body
        className="min-h-screen flex flex-col"
      >
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
