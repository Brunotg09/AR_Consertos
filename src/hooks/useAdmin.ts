"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, getSessionSafe, withTimeout } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export function useAdmin() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          const data = await withTimeout(
            () => supabase.from("user_private").select("id").eq("id", session.user.id).maybeSingle(),
            5000,
            null
          );
          if (!cancelled) setIsAdmin(!!data);
        } else {
          if (!cancelled) setIsAdmin(false);
        }
      }
    );

    getSessionSafe().then(async ({ data }) => {
      if (cancelled) return;
      const session = data.session;
      setUser(session?.user ?? null);
      if (session?.user) {
        const adminData = await withTimeout(
          () => supabase.from("user_private").select("id").eq("id", session.user.id).maybeSingle(),
          5000,
          null
        );
        if (!cancelled) setIsAdmin(!!adminData);
      } else {
        if (!cancelled) setIsAdmin(false);
      }
    });

    const timer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 6000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  }, []);

  return { user, isAdmin, loading, signOut };
}
