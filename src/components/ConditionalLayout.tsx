"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

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

  if (isPrivate) {
    return <>{children}</>;
  }

  return (
    <FloatingWidgetProvider>
      <UpdateBanner />
      <Header />
      <main className="flex-1 w-full overflow-x-hidden pb-8 pt-[140px] sm:pt-[160px]">{children}</main>
      <Footer />
      <InstallBanner />
    </FloatingWidgetProvider>
  );
}
