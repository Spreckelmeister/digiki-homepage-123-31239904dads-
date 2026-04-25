import type { Metadata } from "next";
import { Mic } from "lucide-react";
import ToolHeader from "../ToolHeader";
import AutoTranskriptionApp from "./AutoTranskriptionApp";

export const metadata: Metadata = {
  title: "Diktiergerät & Transkription",
  description:
    "Sprachnotiz aufnehmen oder Audio-Datei hochladen – die KI tippt auf Deutsch ab. Komplett lokal im Browser, kein Upload.",
  alternates: { canonical: "/werkzeuge/auto-transkription" },
};

export default function Page() {
  return (
    <>
      <ToolHeader
        code="WZ-012"
        title="Diktiergerät & Transkription"
        description={
          <>
            Sprachnotiz aufnehmen oder Audio-Datei laden – die KI tippt
            automatisch auf <strong>Deutsch</strong> ab. Whisper-Modell läuft
            in einem <strong>Web Worker direkt im Browser</strong>, Ihr
            Mikrofon-Signal verlässt das Gerät nicht.
          </>
        }
        icon={
          <Mic
            className="h-7 w-7 md:h-8 md:w-8 text-accent"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        }
      />
      <section className="py-10 md:py-16 bg-bg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <AutoTranskriptionApp />
        </div>
      </section>
    </>
  );
}
