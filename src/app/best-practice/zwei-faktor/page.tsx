import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TwoFactorGate } from "@/components/best-practice/TwoFactor";

export const metadata: Metadata = {
  title: "Anmeldung bestätigen - DigiKI",
  description: "Zweiter Faktor für Admin-Konten.",
  robots: { index: false, follow: false },
};

/**
 * Zweiter Anmeldeschritt für Admins (Migration 036). Die Middleware leitet
 * Admins ohne bestätigten zweiten Faktor hierher um; alle anderen Konten
 * werden direkt zum Ziel weitergeleitet und merken von 2FA nichts.
 */
export default async function ZweiFaktorPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: rawRedirect } = await searchParams;
  const redirectTo =
    rawRedirect?.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/best-practice/admin";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/best-practice/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  // Kein Admin bzw. schon bestätigt (oder Migration 036 fehlt) → weiter.
  const { data: needsMfa, error } = await supabase.rpc("current_user_needs_mfa");
  if (error || !needsMfa) redirect(redirectTo);

  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Anmeldung bestätigen
          </h1>
          <p className="text-lg text-white/70">
            Zusätzlicher Schutz für Admin-Konten.
          </p>
        </div>
      </section>
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
          <TwoFactorGate redirectTo={redirectTo} email={user.email ?? ""} />
        </div>
      </section>
    </>
  );
}
