import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Serviços de Conserto',
  description:
    'Confira todos os serviços de conserto de eletrodomésticos da AR Consertos em Itabaiana/SE. Garantia de 90 dias.',
  alternates: {
    canonical: 'https://ar-consertos.vercel.app/servicos',
  },
};

export default function ServicosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
