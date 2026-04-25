import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import ToolHeader from "../ToolHeader";
import BildVerbessererApp from "./BildVerbessererApp";

export const metadata: Metadata = {
  title: "KI-Bild-Verbesserer",
  description:
    "Verdoppelt die Auflösung Ihrer Bilder per neuronalem Netz – komplett lokal im Browser. Keine Uploads, keine Server.",
  alternates: { canonical: "/werkzeuge/bild-verbesserer" },
};

export default function Page() {
  return (
    <>
      <ToolHeader
        code="WZ-010"
        title="KI-Bild-Verbesserer"
        description={
          <>
            Verdoppelt die Auflösung Ihrer Bilder per{" "}
            <strong>neuronalem Netz</strong> (2× Upscaling) – komplett{" "}
            <strong>lokal im Browser</strong>. Ideal für verpixelte Schul-Scans,
            alte Fotos oder Material aus dem Web.
          </>
        }
        icon={
          <Sparkles
            className="h-7 w-7 md:h-8 md:w-8 text-accent"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        }
      />
      <section className="py-10 md:py-16 bg-bg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <BildVerbessererApp />
        </div>
      </section>
    </>
  );
}
