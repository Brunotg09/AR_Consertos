import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/minha-conta";

  // Prevent open redirect: only allow relative paths
  const safeNext = next.startsWith("/") && !next.includes("://") ? next : "/minha-conta";

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              httpOnly: true,
              secure: true,
              sameSite: "lax",
              path: "/",
              ...options,
            })
          );
        },
      },
    }
  );

  // OAuth callback: exchange code for session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
    return NextResponse.redirect(`${origin}/login?error=oauth_erro`);
  }

  // Token hash verification (magic link, email OTP, recovery)
  if (tokenHash && type) {
    if (type === "magiclink" || type === "email") {
      const { error } = await supabase.auth.verifyOtp({
        type: type as "magiclink" | "email",
        token: tokenHash,
        email: "",
      });
      if (!error) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
    }

    if (type === "recovery") {
      const { error } = await supabase.auth.verifyOtp({
        type: "recovery",
        token: tokenHash,
        email: "",
      });
      if (!error) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
    }

    return NextResponse.redirect(`${origin}/login?error=token_invalido`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
