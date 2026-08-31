"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const ChatWidget = dynamic(
  () => import("@/components/ChatWidget").then((mod) => mod.ChatWidget),
  { ssr: false }
);

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
