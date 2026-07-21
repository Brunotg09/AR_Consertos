"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { InstallBanner } from "@/components/InstallBanner";
import { UpdateBanner } from "@/components/UpdateBanner";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPrivate = pathname.startsWith("/private");

  if (isPrivate) {
    return <>{children}</>;
  }

  return (
    <>
      <UpdateBanner />
      <Header />
      <main className="flex-1 w-full overflow-x-hidden pb-8">{children}</main>
      <Footer />
      <InstallBanner />
    </>
  );
}
