import type { Metadata } from "next";
import { AudioLines } from "lucide-react";
import ToolHeader from "../ToolHeader";
import AudioTrimmerApp from "./AudioTrimmerApp";

export const metadata: Metadata = {
  title: "Audio aufnehmen & trimmen",
  description:
    "Sprachnachricht im Browser aufnehmen oder MP3-Datei zuschneiden – alles komplett lokal, ohne Upload.",
  alternates: { canonical: "/werkzeuge/audio-trimmer" },
};

export default function Page() {
  return (
    <>
      <ToolHeader
        code="WZ-009"
        title="Audio aufnehmen & trimmen"
        description={
          <>
            Sprachnachricht aufnehmen oder eine vorhandene Audiodatei
            zuschneiden – <strong>komplett im Browser</strong>, ohne Upload.
          </>
        }
        icon={<AudioLines className="h-7 w-7 md:h-8 md:w-8 text-accent" strokeWidth={1.5} aria-hidden="true" />}
      />
      <section className="py-10 md:py-16 bg-bg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <AudioTrimmerApp />
        </div>
      </section>
    </>
  );
}
