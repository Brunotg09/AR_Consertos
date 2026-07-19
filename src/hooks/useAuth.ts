"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, getSessionSafe, withTimeout } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAdmin = async (userId: string) => {
      try {
        const data = await withTimeout(
          () => supabase.from("user_private").select("id").eq("id", userId).maybeSingle(),
          5000,
          null
        );
        if (!cancelled) setIsAdmin(!!data);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          checkAdmin(session.user.id);
        } else {
          setIsAdmin(false);
        }
      }
    );

    getSessionSafe().then(({ data }) => {
      if (cancelled) return;
      const session = data.session;
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkAdmin(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      cancelled = true;
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
