import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // If Supabase is not configured yet, allow public pages and block protected ones
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const isProtectedRoute =
      request.nextUrl.pathname.startsWith("/best-practice/datenbank") ||
      request.nextUrl.pathname.startsWith("/best-practice/admin") ||
      request.nextUrl.pathname.startsWith("/best-practice/konto") ||
      request.nextUrl.pathname.startsWith("/schulungsdashboard");

    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/best-practice/login";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

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
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes: redirect to login if not authenticated
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/best-practice/datenbank") ||
    request.nextUrl.pathname.startsWith("/best-practice/admin") ||
    request.nextUrl.pathname.startsWith("/schulungsdashboard");

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/best-practice/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Rolle einmal laden, wenn sie für eine der folgenden Regeln gebraucht wird.
  const path = request.nextUrl.pathname;
  let role: string | undefined;
  if (
    user &&
    (path.startsWith("/best-practice") || path.startsWith("/schulungsdashboard"))
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role?.toLowerCase();
  }

  // Schulungsteam ist NUR auf das Schulungs-Dashboard beschränkt. Im
  // /best-practice-Bereich sind ausschließlich Self-Service-Seiten (Konto,
  // Passwort) + Login erlaubt – alles andere leitet ins Dashboard um. (Steht
  // VOR der Admin-/Dashboard-Prüfung, damit kein Doppel-Redirect entsteht.)
  if (user && role === "schulungsteam" && path.startsWith("/best-practice")) {
    const allowed = [
      "/best-practice/konto",
      "/best-practice/passwort-vergessen",
      "/best-practice/passwort-zuruecksetzen",
      // Nur noch Redirect-Stub für alte E-Mail-Links („Code statt Link").
      "/best-practice/code-einloesen",
      "/best-practice/login",
    ].some((p) => path === p || path.startsWith(`${p}/`));
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/schulungsdashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Admin-Bereich: nur Admins.
  if (path.startsWith("/best-practice/admin") && user && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/best-practice/datenbank";
    return NextResponse.redirect(url);
  }

  // Schulungs-Dashboard: nur admin + schulungsteam.
  if (
    path.startsWith("/schulungsdashboard") &&
    user &&
    role !== "admin" &&
    role !== "schulungsteam"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/best-practice/datenbank";
    return NextResponse.redirect(url);
  }

  // If logged in and visiting login/register, redirect away.
  // Exception: ?confirmed=true means the user just verified their email and should see the login page
  const isAuthRoute =
    path === "/best-practice/login" || path === "/best-practice/registrieren";

  if (isAuthRoute && user && !request.nextUrl.searchParams.get("confirmed")) {
    const url = request.nextUrl.clone();
    // Schulungsteam → direkt ins Dashboard, sonst zur Datenbank.
    url.pathname =
      role === "schulungsteam" ? "/schulungsdashboard" : "/best-practice/datenbank";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
