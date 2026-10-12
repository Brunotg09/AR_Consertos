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
  "/private",
  "/parceiro",
];

// Painéis administrativo/parceiro: redirecionam visitantes anônimos para a home
// (em vez de /login) para não revelar que a rota existe.
const PANEL_ROUTES = ["/private", "/parceiro"];

function matches(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function needsAuth(pathname: string): boolean {
  return matches(pathname, PROTECTED_ROUTES);
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
        // Painéis (admin/parceiro): volta para a home sem expor /login
        if (matches(pathname, PANEL_ROUTES)) {
          return NextResponse.redirect(new URL("/", request.url));
        }
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

    // ---- Role gates (painéis) — bloqueio no servidor, antes de baixar a página ----

    // /private → apenas administradores (registrados em user_private)
    if (matches(pathname, ["/private"])) {
      const { data: adminRow, error: adminError } = await supabase
        .from("user_private")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      // Fail-open apenas se a própria consulta for bloqueada (RLS);
      // "sem linha" de forma explícita = não é admin → bloqueia.
      if (!adminError && !adminRow) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    // /parceiro → apenas parceiros ativos (ou admin)
    if (matches(pathname, ["/parceiro"])) {
      let isPartner = false;

      const { data: partnerRow } = await supabase
        .from("partners")
        .select("id, active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (partnerRow && partnerRow.active !== false) {
        isPartner = true;
      } else {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("partner_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profileRow?.partner_id) {
          isPartner = true;
        } else {
          const { data: roleRow } = await supabase
            .from("user_roles")
            .select("role, partner_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (roleRow?.partner_id || roleRow?.role === "admin") {
            isPartner = true;
          }
        }
      }

      if (!isPartner) {
        return NextResponse.redirect(new URL("/", request.url));
      }
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
