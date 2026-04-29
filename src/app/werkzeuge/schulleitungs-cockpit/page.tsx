import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import ToolHeader from "../ToolHeader";
import CockpitApp from "./CockpitApp";

export const metadata: Metadata = {
  title: "Schulleitungs-Cockpit",
  description:
    "Schuljahresplanung für Schulleitungen: Termine, Pflichttermine Niedersachsen, Konflikte mit Feiertagen und Ferien, Brückentage und iCal-Export. Daten bleiben lokal im Browser.",
  alternates: { canonical: "/werkzeuge/schulleitungs-cockpit" },
};

export default function Page() {
  return (
    <>
      <ToolHeader
        code="WZ-017"
        title="Schulleitungs-Cockpit"
        description={
          <>
            Schuljahresplanung in einer Ansicht: Termine, Pflichttermine
            Niedersachsen, Konflikt-Erkennung mit Feiertagen und Ferien,
            Brückentage und <strong>iCal-Export</strong>. Daten bleiben
            lokal im Browser.
          </>
        }
        icon={<CalendarClock className="h-7 w-7 md:h-8 md:w-8 text-accent" strokeWidth={1.5} aria-hidden="true" />}
      />
      <section className="py-10 md:py-14 bg-bg print:py-0 print:bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 print:px-0">
          <CockpitApp />
        </div>
      </section>
    </>
  );
}
