import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Eletrônica Inverter',
  description:
    'Serviço especializado em eletrônica inverter da AR Consertos em Itabaiana/SE. Conserto de ar condicionado, fontes de alimentação e mais.',
  alternates: {
    canonical: 'https://ar-consertos.vercel.app/inverter',
  },
};

export default function InverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
