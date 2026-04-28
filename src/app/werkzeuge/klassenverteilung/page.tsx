import type { Metadata } from "next";
import { Network } from "lucide-react";
import ToolHeader from "../ToolHeader";
import KlassenverteilungApp from "./KlassenverteilungApp";

export const metadata: Metadata = {
  title: "Klassenverteilung",
  description:
    "Schüler*innen pädagogisch sinnvoll auf parallele Klassen verteilen – mit Wünschen, NoGo-Paaren, Geschwisterregeln, Geschlechterbalance und Fixierungen. Listen werden lokal im Browser gespeichert.",
  alternates: { canonical: "/werkzeuge/klassenverteilung" },
};

export default function Page() {
  return (
    <>
      <ToolHeader
        code="WZ-016"
        title="Klassenverteilung"
        description={
          <>
            Schüler*innen sinnvoll auf parallele Klassen verteilen – mit
            Wünschen, NoGo-Paaren, Geschwisterregeln und{" "}
            <strong>Geschlechterbalance</strong>. Optimiert in mehreren
            Durchläufen, Sie können einzelne Kinder fixieren oder verschieben.
          </>
        }
        icon={<Network className="h-7 w-7 md:h-8 md:w-8 text-accent" strokeWidth={1.5} aria-hidden="true" />}
      />
      <section className="py-10 md:py-14 bg-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <KlassenverteilungApp />
        </div>
      </section>
    </>
  );
}
