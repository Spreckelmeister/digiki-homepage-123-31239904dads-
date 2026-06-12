import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import BackButton from "@/components/BackButton";
import MyEmailChanger from "@/components/best-practice/MyEmailChanger";
import MyPasswordChanger from "@/components/best-practice/MyPasswordChanger";
import MyAccountDeleter from "@/components/best-practice/MyAccountDeleter";

export const metadata: Metadata = {
  title: "Konto - DigiKI",
  description: "Kontoeinstellungen verwalten.",
  robots: { index: false, follow: false },
};

export default async function KontoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/best-practice/login?redirect=/best-practice/konto");

  const profile = await getCurrentProfile();

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <BackButton
                fallbackHref={
                  profile?.role?.toLowerCase() === "schulungsteam"
                    ? "/schulungsdashboard"
                    : "/best-practice/datenbank"
                }
                fallbackLabel={
                  profile?.role?.toLowerCase() === "schulungsteam"
                    ? "Zum Schulungs-Dashboard"
                    : "Zurück zur Datenbank"
                }
                className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors mb-4"
              />
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Mein Konto
              </h1>
              <p className="text-lg text-white/70 mt-2">
                Einstellungen für Ihren DigiKI-Zugang.
              </p>
            </div>
            <AuthStatus initialProfile={profile} />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 space-y-6">
          <MyEmailChanger currentEmail={user.email ?? ""} />
          <MyPasswordChanger email={user.email ?? ""} />

          {/* Danger zone – visuell abgesetzt */}
          <div className="pt-4">
            <MyAccountDeleter />
          </div>
        </div>
      </section>
    </>
  );
}
