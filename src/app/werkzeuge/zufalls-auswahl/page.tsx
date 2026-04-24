import type { Metadata } from "next";
import { Shuffle } from "lucide-react";
import ToolHeader from "../ToolHeader";
import ZufallsAuswahlApp from "./ZufallsAuswahlApp";

export const metadata: Metadata = {
  title: "Zufalls-Auswahl",
  description:
    "Namen aus einer Liste zufällig aufrufen oder in Gruppen einteilen. Listen werden nur lokal im Browser gespeichert – keine Accounts, keine Uploads.",
  alternates: { canonical: "/werkzeuge/zufalls-auswahl" },
};

export default function Page() {
  return (
    <>
      <ToolHeader
        code="WZ-004"
        title="Zufalls-Auswahl"
        description={
          <>
            Namen aus der Klassenliste zufällig aufrufen oder in Gruppen
            einteilen. Die Listen werden nur auf <strong>Ihrem Gerät</strong>{" "}
            gespeichert – kein Account, kein Upload.
          </>
        }
        icon={<Shuffle className="h-7 w-7 md:h-8 md:w-8 text-accent" strokeWidth={1.5} aria-hidden="true" />}
      />
      <section className="py-10 md:py-16 bg-bg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <ZufallsAuswahlApp />
        </div>
      </section>
    </>
  );
}
