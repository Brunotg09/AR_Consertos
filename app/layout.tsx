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
  title: 'AR Consertos - Conserto de Eletrodomesticos e Eletronica Inverter',
  description:
    'AR Consertos em Itabaiana/SE. Conserto de eletrodomesticos, linha branca, eletronica avancada inverter. Garantia de 90 dias. Desde 2017.',
  keywords: [
    'conserto eletrodomesticos',
    'eletronica inverter',
    'Itabaiana',
    'Sergipe',
    'AR Consertos',
  ],
  icons: {
    icon: '/logo_ArConsertos.webp',
  },
  openGraph: {
    title: 'AR Consertos',
    description:
      'Conserto de eletrodomesticos e eletronica inverter em Itabaiana/SE',
    locale: 'pt_BR',
    type: 'website',
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
