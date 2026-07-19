import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Recuperar Senha',
  description:
    'Recupere sua senha da AR Consertos.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function RecuperarSenhaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
