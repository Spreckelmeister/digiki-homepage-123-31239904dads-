import type { Metadata } from "next";
import { ScanText } from "lucide-react";
import ToolHeader from "../ToolHeader";
import ArbeitsblattScannerApp from "./ArbeitsblattScannerApp";

export const metadata: Metadata = {
  title: "Arbeitsblatt-Scanner",
  description:
    "Foto eines Arbeitsblattes oder Buchseite hochladen – die KI erkennt den Text auf Deutsch und macht ihn bearbeitbar. Komplett lokal im Browser.",
  alternates: { canonical: "/werkzeuge/arbeitsblatt-scanner" },
};

export default function Page() {
  return (
    <>
      {/* DNS + TLS vorab für Tesseract-Core (jsDelivr) und Sprachpaket. */}
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://tessdata.projectnaptha.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
      <link rel="dns-prefetch" href="https://tessdata.projectnaptha.com" />
      <ToolHeader
        code="WZ-013"
        title="Arbeitsblatt-Scanner"
        description={
          <>
            Foto eines Arbeitsblattes, Buchseite oder Tafelbildes hochladen –
            die KI erkennt den deutschen Text und macht ihn{" "}
            <strong>bearbeitbar</strong>. Praktisch für Ableitungen,
            Differenzierungen oder zum schnellen Übernehmen in andere
            Materialien. Alles <strong>lokal im Browser</strong>.
          </>
        }
        icon={
          <ScanText
            className="h-7 w-7 md:h-8 md:w-8 text-accent"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        }
      />
      <section className="py-10 md:py-16 bg-bg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <ArbeitsblattScannerApp />
        </div>
      </section>
    </>
  );
}
