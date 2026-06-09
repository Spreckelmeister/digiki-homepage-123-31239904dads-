import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotebookPen } from "lucide-react";
import ToolHeader from "../ToolHeader";
import ClientEditor from "./ClientEditor";
import { getCurrentProfile } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Arbeitsblatt-Editor",
  description:
    "Erstellen Sie differenzierte Arbeitsblätter für die Grundschule – Silbentext, Lückentext, Rechenpäckchen, Schreiblinien, Suchsel und mehr. Druckfertig, mit Lösungsblatt, komplett lokal im Browser.",
  alternates: { canonical: "/werkzeuge/arbeitsblatt-editor" },
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
        code="WZ-018"
        title="Arbeitsblatt-Editor"
        description={
          <>
            Differenzierte Arbeitsblätter in Minuten – Silbentext, Lückentext,
            Rechenpäckchen, Schreiblinien und mehr.{" "}
            <strong>Druckfertig, mit Lösungsblatt</strong>, lokal im Browser.
          </>
        }
        icon={
          <NotebookPen
            className="h-7 w-7 md:h-8 md:w-8 text-accent"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        }
      />
      <section className="py-8 md:py-12 bg-bg print:py-0 print:bg-white">
        <div className="mx-auto max-w-[1400px] px-3 sm:px-4 lg:px-6 print:max-w-none print:px-0">
          <ClientEditor />
        </div>
      </section>
    </>
  );
}
