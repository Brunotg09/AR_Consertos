import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_NO_AUTH = [
  "/login",
  "/cadastro",
  "/recuperar-senha",
];

const PROTECTED_ROUTES = [
  "/minha-conta",
  "/carrinho",
  "/checkout",
  "/historico",
  "/pedido",
];

function needsAuth(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Static + API — skip
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/robots.ts" ||
    pathname === "/sitemap.ts"
  ) {
    return NextResponse.next();
  }

  // Auth pages — always allow
  if (
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/recuperar-senha" ||
    pathname.startsWith("/auth/callback") ||
    pathname === "/private/login"
  ) {
    return NextResponse.next();
  }

  // Verification page — always allow (user needs to reach it)
  if (pathname === "/auth/verificar-email") {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
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
                sameSite: "lax" as const,
                path: "/",
                ...options,
              })
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Not logged in — only redirect if route needs auth
    if (!user) {
      if (needsAuth(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // Logged in — check 2FA status
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("email_2fa_enabled, two_fa_verified_at")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // 2FA enabled but NOT verified → BLOCK EVERYTHING (except verify page)
    if (profile.email_2fa_enabled === true && !profile.two_fa_verified_at) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/verificar-email";
      url.searchParams.set("email", user.email || "");
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
