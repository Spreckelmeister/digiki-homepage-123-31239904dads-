import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";
import AuthStatus from "@/components/best-practice/AuthStatus";
import DashboardApp from "@/components/schulungen/DashboardApp";

export const metadata: Metadata = {
  title: "Schulungs-Dashboard – DigiKI Osnabrück",
  description:
    "Verwaltung von Anmeldungen und Quoten für alle KOS-Fortbildungen.",
  robots: { index: false, follow: false },
};

export default async function SchulungsdashboardPage() {
  // Die Middleware schützt die Route bereits – dieser Check ist die
  // zweite Verteidigungslinie (Defense in Depth).
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/best-practice/login?redirect=/schulungsdashboard");
  }
  const role = profile.role?.toLowerCase();
  if (role !== "admin" && role !== "schulungsteam") {
    redirect("/best-practice/datenbank");
  }

  return (
    <>
      {/* Hero im Stil der bestehenden Admin-Bereiche */}
      <section className="bg-primary py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/90">
                KOS-Fortbildungen
              </p>
              <h1 className="mt-2 text-3xl md:text-4xl font-bold text-white">
                Schulungs-Dashboard
              </h1>
              <p className="mt-2 text-lg text-white/70">
                Anmeldungen importieren, Quoten im Blick behalten, Konflikte
                klären.
              </p>
            </div>
            <AuthStatus initialProfile={profile} />
          </div>
        </div>
      </section>

      <DashboardApp isAdmin={role === "admin"} />
    </>
  );
}
