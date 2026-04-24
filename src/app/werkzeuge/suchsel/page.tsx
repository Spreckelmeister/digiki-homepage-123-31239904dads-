import type { Metadata } from "next";
import { Grid3x3 } from "lucide-react";
import ToolHeader from "../ToolHeader";
import SuchselApp from "./SuchselApp";

export const metadata: Metadata = {
  title: "Suchsel-Generator",
  description:
    "Wortgitter aus Ihren Vokabeln erstellen – druckfertig, ohne Wasserzeichen, ohne Werbung. Läuft komplett lokal im Browser.",
  alternates: { canonical: "/werkzeuge/suchsel" },
};

export default function Page() {
  return (
    <>
      <ToolHeader
        code="WZ-006"
        title="Suchsel-Generator"
        description={
          <>
            Wortgitter aus Ihren Vokabeln oder Begriffen –{" "}
            <strong>druckfertig, ohne Wasserzeichen</strong>, ohne Werbung.
          </>
        }
        icon={<Grid3x3 className="h-7 w-7 md:h-8 md:w-8 text-accent" strokeWidth={1.5} aria-hidden="true" />}
      />
      <section className="py-10 md:py-16 bg-bg print:py-0 print:bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">
          <SuchselApp />
        </div>
      </section>
    </>
  );
}
