import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calculator, Lock } from "lucide-react";
import ToolHeader from "../ToolHeader";
import SchriftlichesRechnenApp from "./SchriftlichesRechnenApp";
import { getCurrentProfile } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Schriftliches Rechnen",
  description:
    "Schriftliche Addition, Subtraktion, Multiplikation und Division Schritt für Schritt animiert – am Smartboard oder Tablet. Mit Beispielen und Arbeitsblatt zum Ausdrucken. Komplett lokal im Browser.",
  alternates: { canonical: "/werkzeuge/schriftliches-rechnen" },
  // Internes Tool – noch nicht veröffentlicht: nicht indexieren.
  robots: { index: false, follow: false },
};

export default async function Page() {
  // Noch nicht veröffentlicht: nur für angemeldete Best-Practice-Admins.
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  return (
    <>
      <ToolHeader
        code="WZ-020"
        title="Schriftliches Rechnen"
        description={
          <>
            Die schriftlichen Rechenverfahren <strong>Schritt für Schritt animiert</strong> –
            Addition, Subtraktion, Multiplikation und Division am Smartboard. Mit
            anschaulichen Beispielen und <strong>Arbeitsblatt zum Ausdrucken</strong>.
          </>
        }
        icon={
          <Calculator
            className="h-7 w-7 md:h-8 md:w-8 text-accent"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        }
      />
      {/* Interner-Status-Hinweis – noch nicht veröffentlicht */}
      <div className="bg-text text-white print:hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2.5">
          <Lock className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
          <p className="text-sm leading-snug">
            <strong className="font-bold">Intern – noch nicht veröffentlicht.</strong>{" "}
            <span className="text-white/80">
              Dieses Werkzeug ist nur für angemeldete Admins sichtbar und erscheint nicht in der öffentlichen Werkzeug-Übersicht.
            </span>
          </p>
        </div>
      </div>
      <section className="py-8 md:py-12 bg-bg print:py-0 print:bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">
          <SchriftlichesRechnenApp />
        </div>
      </section>
    </>
  );
}
