import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Checkout',
  description:
    'Finalize seu pedido na AR Consertos.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
