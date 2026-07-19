import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Histórico de Pedidos',
  description:
    'Veja o histórico de serviços e pedidos na AR Consertos.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function HistoricoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
