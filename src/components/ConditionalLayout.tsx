"use client";

import { CookieBanner } from "@/components/CookieBanner";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const InstallBanner = dynamic(
  () => import("@/components/InstallBanner").then((mod) => mod.InstallBanner),
  { ssr: false }
);

const UpdateBanner = dynamic(
  () => import("@/components/UpdateBanner").then((mod) => mod.UpdateBanner),
  { ssr: false }
);

const FloatingWidgetProvider = dynamic(
  () => import("@/components/FloatingWidget").then((mod) => mod.FloatingWidgetProvider),
  { ssr: false }
);

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPrivate = pathname.startsWith("/private");
  const isParceiro = pathname.startsWith("/parceiro");

  if (isPrivate || isParceiro) {
    return <>{children}</>;
  }

  return (
    <FloatingWidgetProvider>
      <UpdateBanner />
      <Header />
      <main className="flex-1 w-full overflow-x-hidden pb-8 pt-[110px] sm:pt-[130px]">{children}</main>

      <Footer />
      <InstallBanner />
      <CookieBanner />
    </FloatingWidgetProvider>
  );
}
