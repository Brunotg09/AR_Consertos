import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export async function requireAuth(): Promise<{ redirect?: string; user?: User }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: "/login" };
  }

  return { user };
}

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_private")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  return !error && !!data;
}

export async function requireAdmin(): Promise<{ redirect?: string; isAdmin?: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: "/private/login" };
  }

  const isAdmin = await checkIsAdmin(user.id);

  if (!isAdmin) {
    return { redirect: "/" };
  }

  return { isAdmin: true };
}
