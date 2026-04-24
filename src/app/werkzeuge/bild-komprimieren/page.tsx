import type { Metadata } from "next";
import { Image as ImageIcon } from "lucide-react";
import ToolHeader from "../ToolHeader";
import BildKompressor from "./BildKompressor";

export const metadata: Metadata = {
  title: "Bilder komprimieren",
  description:
    "Fotos lokal im Browser verkleinern und komprimieren – ideal bevor Bilder ins Schul-LMS oder in ein Arbeitsblatt gehen. Kein Upload.",
  alternates: { canonical: "/werkzeuge/bild-komprimieren" },
};

export default function Page() {
  return (
    <>
      <ToolHeader
        code="WZ-008"
        title="Bilder komprimieren"
        description={
          <>
            Fotos <strong>lokal im Browser</strong> verkleinern und
            komprimieren – ideal bevor Bilder ins Schul-LMS oder in ein
            Arbeitsblatt gehen. Nichts wird hochgeladen.
          </>
        }
        icon={<ImageIcon className="h-7 w-7 md:h-8 md:w-8 text-accent" strokeWidth={1.5} aria-hidden="true" />}
      />
      <section className="py-10 md:py-16 bg-bg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <BildKompressor />
        </div>
      </section>
    </>
  );
}
