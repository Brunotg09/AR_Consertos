"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const SKIP_PATHS = [
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/auth/callback",
  "/private/login",
  "/auth/verificar-email",
];

const TwoFAContext = createContext(null);

export function useTwoFA() {
  return useContext(TwoFAContext);
}

export function TwoFAProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const checkedRef = useRef<string>("");

  useEffect(() => {
    if (SKIP_PATHS.includes(pathname)) return;
    if (checkedRef.current === pathname) return;
    checkedRef.current = pathname;

    const check = async () => {
      // Short-circuit: check session first, skip if not logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email_2fa_enabled, two_fa_verified_at")
        .eq("id", session.user.id)
        .single();

      if (profile?.email_2fa_enabled && !profile?.two_fa_verified_at) {
        router.push(
          `/auth/verificar-email?email=${encodeURIComponent(session.user.email || "")}&redirect=${encodeURIComponent(pathname)}`
        );
      }
    };

    check();
  }, [pathname, router]);

  return (
    <TwoFAContext.Provider value={null}>
      {children}
    </TwoFAContext.Provider>
  );
}
