import type { Metadata } from "next";
import { Captions } from "lucide-react";
import ToolHeader from "../ToolHeader";
import VideoUntertitelApp from "./VideoUntertitelApp";

export const metadata: Metadata = {
  title: "Automatische Video-Untertitel",
  description:
    "Generiert .vtt-Untertitel für Schul-Videos automatisch – Audio wird per FFmpeg extrahiert, Whisper transkribiert mit Zeitmarken. Komplett lokal im Browser.",
  alternates: { canonical: "/werkzeuge/video-untertitel" },
};

export default function Page() {
  return (
    <>
      {/* DNS + TLS vorab für FFmpeg-Core (unpkg) und Whisper-Modell (HF). */}
      <link rel="preconnect" href="https://unpkg.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://huggingface.co" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://cdn-lfs.huggingface.co" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://unpkg.com" />
      <link rel="dns-prefetch" href="https://huggingface.co" />
      <link rel="dns-prefetch" href="https://cdn-lfs.huggingface.co" />
      <ToolHeader
        code="WZ-015"
        title="Video-Untertitel"
        description={
          <>
            Generiert <strong>.vtt-Untertitel</strong> für Schul-Videos
            automatisch – das Audio wird mit <strong>FFmpeg im Browser</strong>{" "}
            extrahiert und Whisper transkribiert mit Zeitmarken. Nichts wird
            hochgeladen.
          </>
        }
        icon={
          <Captions
            className="h-7 w-7 md:h-8 md:w-8 text-accent"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        }
      />
      <section className="py-10 md:py-16 bg-bg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <VideoUntertitelApp />
        </div>
      </section>
    </>
  );
}
