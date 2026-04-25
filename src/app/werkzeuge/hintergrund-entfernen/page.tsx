import type { Metadata } from "next";
import { Scissors } from "lucide-react";
import ToolHeader from "../ToolHeader";
import HintergrundEntfernenApp from "./HintergrundEntfernenApp";

export const metadata: Metadata = {
  title: "Hintergrund-Entferner",
  description:
    "Stellt Personen, Logos, Produkte oder Tiere automatisch frei – mit transparentem Hintergrund. Komplett lokal im Browser, kein Upload.",
  alternates: { canonical: "/werkzeuge/hintergrund-entfernen" },
};

export default function Page() {
  return (
    <>
      {/* DNS + TLS vorab aufbauen, damit der erste Modell-Fetch schneller ist. */}
      <link rel="preconnect" href="https://staticimgly.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://staticimgly.com" />
      <ToolHeader
        code="WZ-011"
        title="Hintergrund-Entferner"
        description={
          <>
            Stellt beliebige Motive automatisch frei – per <strong>neuronalem Netz</strong>{" "}
            direkt im Browser. Ergebnis als <strong>transparentes PNG</strong>{" "}
            für Arbeitsblätter, Steckbriefe oder Klassenfotos. Nichts wird
            hochgeladen.
          </>
        }
        icon={
          <Scissors
            className="h-7 w-7 md:h-8 md:w-8 text-accent"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        }
      />
      <section className="py-10 md:py-16 bg-bg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <HintergrundEntfernenApp />
        </div>
      </section>
    </>
  );
}
