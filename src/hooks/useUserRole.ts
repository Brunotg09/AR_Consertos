"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, withTimeout } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export type UserRole = "admin" | "partner_gestor" | "partner_tech" | "client" | null;

export interface UserRoleInfo {
  role: UserRole;
  partnerId: string | null;
  loading: boolean;
  isAdmin: boolean;
  isPartnerGestor: boolean;
  isPartnerTech: boolean;
  refreshRole: () => Promise<void>;
}

export function useUserRole(): UserRoleInfo {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setPartnerId(null);
      setLoading(false);
      return;
    }

    try {
      // Check if admin
      const adminData = await withTimeout(
        () => supabase.from("user_private").select("id").eq("id", user.id).maybeSingle(),
        5000,
        null
      );

      if (adminData) {
        setRole("admin");
        setPartnerId(null);
        setLoading(false);
        return;
      }

      // Check role in user_roles
      const { data: roleData } = await withTimeout(
        () => supabase
          .from("user_roles")
          .select("role, partner_id")
          .eq("user_id", user.id)
          .in("role", ["admin", "partner_gestor", "partner_tech"])
          .maybeSingle(),
        5000,
        { data: null, error: null }
      );

      if (roleData) {
        setRole(roleData.role as UserRole);
        setPartnerId(roleData.partner_id || null);
      } else {
        setRole(null);
        setPartnerId(null);
      }
    } catch {
      setRole(null);
      setPartnerId(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchRole();
    }
  }, [authLoading, fetchRole]);

  return {
    role,
    partnerId,
    loading: authLoading || loading,
    isAdmin: role === "admin",
    isPartnerGestor: role === "partner_gestor",
    isPartnerTech: role === "partner_tech",
    refreshRole: fetchRole,
  };
}
