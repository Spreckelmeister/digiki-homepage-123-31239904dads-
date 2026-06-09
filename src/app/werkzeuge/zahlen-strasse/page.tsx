import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Route, Lock } from "lucide-react";
import ToolHeader from "../ToolHeader";
import ZahlenStrasseApp from "./ZahlenStrasseApp";
import { getCurrentProfile } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Zahlen-Straße",
  description:
    "Spielerisches Nachfahren der Ziffern 1–10 für Grundschulkinder am Tablet oder Smartboard – mit Stufen, Fortschritt und sofortiger Rückmeldung. Komplett lokal im Browser.",
  alternates: { canonical: "/werkzeuge/zahlen-strasse" },
  // Internes Tool – noch nicht veröffentlicht: nicht indexieren.
  robots: { index: false, follow: false },
};

export default async function Page() {
  // Noch nicht veröffentlicht: nur für angemeldete Best-Practice-Admins
  // zugänglich. Alle anderen (inkl. nicht angemeldete Besucher) erhalten 404.
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  return (
    <>
      <ToolHeader
        code="WZ-019"
        title="Zahlen-Straße"
        description={
          <>
            Die Ziffern 1–10 spielerisch nachfahren – am{" "}
            <strong>Tablet oder Smartboard</strong>. Mit Stufen, Fortschritt
            und sofortiger Rückmeldung, komplett lokal im Browser.
          </>
        }
        icon={
          <Route
            className="h-7 w-7 md:h-8 md:w-8 text-accent"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        }
      />
      {/* Interner-Status-Hinweis – noch nicht veröffentlicht */}
      <div className="bg-text text-white">
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
      <section className="py-8 md:py-12 bg-bg">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ZahlenStrasseApp />
        </div>
      </section>
    </>
  );
}
