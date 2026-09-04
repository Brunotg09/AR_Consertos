"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, getSessionSafe, withTimeout } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "partner_gestor" | "partner_tech" | "client" | null;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkUserRole = async (userId: string) => {
      try {
        // Run admin check and role check in parallel
        const [adminData, roleResult] = await Promise.all([
          withTimeout(
            () => supabase.from("user_private").select("id").eq("id", userId).maybeSingle(),
            5000,
            null
          ),
          withTimeout(
            () => supabase
              .from("user_roles")
              .select("role, partner_id")
              .eq("user_id", userId)
              .in("role", ["admin", "partner_gestor", "partner_tech"])
              .maybeSingle(),
            5000,
            { data: null, error: null }
          ),
        ]);

        if (cancelled) return;

        setIsAdmin(!!adminData);

        const roleData = roleResult?.data;

        if (roleData) {
          setUserRole(roleData.role as UserRole);
          setPartnerId(roleData.partner_id || null);
        } else {
          // Fallback: check profiles.partner_id only if no role found
          const { data: profileData } = await withTimeout(
            () => supabase
              .from("profiles")
              .select("partner_id")
              .eq("id", userId)
              .maybeSingle(),
            5000,
            { data: null, error: null }
          );

          if (!cancelled && profileData?.partner_id) {
            setUserRole("partner_gestor");
            setPartnerId(profileData.partner_id);
          } else if (!cancelled) {
            setUserRole(null);
            setPartnerId(null);
          }
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setUserRole(null);
          setPartnerId(null);
        }
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          checkUserRole(session.user.id);
        } else {
          setIsAdmin(false);
          setUserRole(null);
          setPartnerId(null);
        }
      }
    );

    getSessionSafe().then(({ data }) => {
      if (cancelled) return;
      const session = data.session;
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkUserRole(session.user.id);
      } else {
        setIsAdmin(false);
        setUserRole(null);
        setPartnerId(null);
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const { fullLogout } = await import("@/lib/logout");
    await fullLogout();
    setUser(null);
    setIsAdmin(false);
    setUserRole(null);
    setPartnerId(null);
  }, []);

  return { user, isAdmin, userRole, partnerId, loading, signOut };
}
