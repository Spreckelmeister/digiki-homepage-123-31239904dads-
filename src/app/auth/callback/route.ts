import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;

  // Only allow safe relative paths — normalize to prevent path traversal
  const rawNext = requestUrl.searchParams.get("next") ?? "/best-practice/datenbank";
  let next: string;
  try {
    const parsed = new URL(rawNext, "http://localhost");
    next = parsed.pathname.startsWith("/") && !parsed.pathname.startsWith("//")
      ? parsed.pathname + parsed.search
      : "/best-practice/datenbank";
  } catch {
    next = "/best-practice/datenbank";
  }

  const origin = requestUrl.origin;

  // WICHTIG: Einen E-Mail-OTP (token_hash) NICHT per GET einlösen.
  // Automatische Link-Scanner in Schul-/Firmennetzwerken rufen E-Mail-
  // Links vorab auf; ein verifyOtp im GET würde den Einmal-Token dabei
  // verbrauchen, bevor die Person klickt (auch der 8-stellige Code wäre
  // dann tot, da es derselbe Token ist). Stattdessen leiten wir auf die
  // Bestätigungsseite um, die den Token erst beim echten Klick einlöst.
  // (Schützt auch bereits versendete E-Mails, die noch auf /auth/callback
  //  zeigen.)
  if (token_hash && type) {
    const params = new URLSearchParams({ token_hash, type });
    if (next) params.set("next", next);
    return NextResponse.redirect(`${origin}/auth/bestaetigen?${params.toString()}`);
  }

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // On error, redirect to login with a hint
  return NextResponse.redirect(
    `${origin}/best-practice/login?error=link-abgelaufen`
  );
}
