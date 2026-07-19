import './globals.css';
import type { Metadata } from 'next';
import { Inter, Montserrat, Oswald, Bebas_Neue } from 'next/font/google';
import { ConditionalLayout } from '@/components/ConditionalLayout';
import { CartProvider } from '@/contexts/CartContext';
import { ChatProvider } from '@/components/ChatProvider';
import { OfflineBanner } from '@/hooks/useOffline';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '700', '900'],
  display: 'swap',
});

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
});

const bebas = Bebas_Neue({
  subsets: ['latin'],
  variable: '--font-bebas',
  weight: '400',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://ar-consertos.vercel.app'),
  title: {
    default: 'AR Consertos - Conserto de Eletrodomésticos e Eletrônica Inverter em Itabaiana/SE',
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
    title: 'AR Consertos - Conserto de Eletrodomésticos e Eletrônica Inverter',
    description:
      'Conserto de eletrodomésticos e eletrônica inverter em Itabaiana/SE. Garantia de 90 dias.',
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${montserrat.variable} ${oswald.variable} ${bebas.variable} min-h-screen flex flex-col`}
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
