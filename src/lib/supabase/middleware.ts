import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // If Supabase is not configured yet, allow public pages and block protected ones
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const isProtectedRoute =
      request.nextUrl.pathname.startsWith("/best-practice/datenbank") ||
      request.nextUrl.pathname.startsWith("/best-practice/admin");

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
    request.nextUrl.pathname.startsWith("/best-practice/admin");

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/best-practice/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Admin routes: check admin role
  if (request.nextUrl.pathname.startsWith("/best-practice/admin") && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/best-practice/datenbank";
      return NextResponse.redirect(url);
    }
  }

  // If logged in and visiting login/register, redirect to datenbank
  const isAuthRoute =
    request.nextUrl.pathname === "/best-practice/login" ||
    request.nextUrl.pathname === "/best-practice/registrieren";

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/best-practice/datenbank";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
