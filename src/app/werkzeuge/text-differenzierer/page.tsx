import type { Metadata } from "next";
import { Wand2 } from "lucide-react";
import ToolHeader from "../ToolHeader";
import TextDifferenziererApp from "./TextDifferenziererApp";

export const metadata: Metadata = {
  title: "KI-Text-Differenzierer",
  description:
    "Texte für die Klasse vereinfachen, zusammenfassen oder anspruchsvoller machen – mit einem Sprachmodell, das komplett auf Ihrer GPU im Browser läuft.",
  alternates: { canonical: "/werkzeuge/text-differenzierer" },
};

export default function Page() {
  return (
    <>
      {/* DNS + TLS vorab für WebLLM-Modell (HF + GitHub Raw für Konfig-Shards). */}
      <link rel="preconnect" href="https://huggingface.co" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://cdn-lfs.huggingface.co" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://raw.githubusercontent.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://huggingface.co" />
      <link rel="dns-prefetch" href="https://cdn-lfs.huggingface.co" />
      <link rel="dns-prefetch" href="https://raw.githubusercontent.com" />
      <ToolHeader
        code="WZ-014"
        title="KI-Text-Differenzierer"
        description={
          <>
            Texte mit einem <strong>Sprachmodell</strong> für die Klasse
            anpassen – vereinfachen, zusammenfassen, in Stichpunkte umwandeln
            oder Verständnisfragen erstellen. Läuft{" "}
            <strong>komplett auf Ihrer GPU im Browser</strong> (WebGPU). Nichts
            wird an einen Server gesendet.
          </>
        }
        icon={
          <Wand2
            className="h-7 w-7 md:h-8 md:w-8 text-accent"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        }
      />
      <section className="py-10 md:py-16 bg-bg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <TextDifferenziererApp />
        </div>
      </section>
    </>
  );
}
