"use client";

import { usePathname } from "next/navigation";
import { ChatWidget } from "@/components/ChatWidget";

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show chat widget on private admin pages
  const isPrivatePage = pathname?.startsWith("/private");

  return (
    <>
      {children}
      {!isPrivatePage && <ChatWidget />}
    </>
  );
}
