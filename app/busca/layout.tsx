import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Buscar Serviços e Produtos',
  description:
    'Busque por serviços e produtos na AR Consertos em Itabaiana/SE.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function BuscaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
