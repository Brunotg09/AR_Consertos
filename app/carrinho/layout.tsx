import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Carrinho',
  description:
    'Veja os itens no seu carrinho na AR Consertos.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function CarrinhoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
