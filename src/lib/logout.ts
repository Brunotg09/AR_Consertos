import { supabase } from "@/lib/supabase";

export async function fullLogout() {
  // 1. Clear two_fa_verified_at in database
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ two_fa_verified_at: null })
        .eq("id", user.id);
    }
  } catch {
    // ignore
  }

  // 2. Sign out from Supabase (clears auth tokens from cookies)
  await supabase.auth.signOut({ scope: "local" });

  // 3. Clear localStorage
  try {
    localStorage.clear();
  } catch {
    // ignore
  }

  // 4. Clear sessionStorage
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }

  // 5. Clear all cookies (path=/, all domains)
  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const name = cookie.split("=")[0].trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
    }
  } catch {
    // ignore
  }

  // 6. Clear IndexedDB (Supabase may cache here)
  try {
    if (indexedDB.databases) {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }
  } catch {
    // ignore
  }
}
