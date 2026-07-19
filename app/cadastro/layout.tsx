import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Criar Conta',
  description:
    'Cadastre-se na AR Consertos e acompanhe seus serviços e pedidos.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function CadastroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
