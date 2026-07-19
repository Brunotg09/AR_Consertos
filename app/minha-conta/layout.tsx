import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Minha Conta',
  description:
    'Gerencie seu perfil e dados na AR Consertos.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function MinhaContaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
