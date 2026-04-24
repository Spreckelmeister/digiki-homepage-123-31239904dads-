import type { Metadata } from "next";
import { FileText } from "lucide-react";
import ToolHeader from "../ToolHeader";
import PdfTools from "./PdfTools";

export const metadata: Metadata = {
  title: "PDF-Werkzeuge",
  description:
    "PDFs zusammenfügen oder Seiten extrahieren – rein lokal im Browser, keine Uploads auf fremde Server. Ideal für sensible Unterrichtsdokumente.",
  alternates: { canonical: "/werkzeuge/pdf" },
};

export default function Page() {
  return (
    <>
      <ToolHeader
        code="WZ-005"
        title="PDF-Werkzeuge"
        description={
          <>
            PDFs zusammenfügen oder einzelne Seiten extrahieren – rein{" "}
            <strong>lokal im Browser</strong>, keine Uploads auf fremde
            Server. Sensible Dokumente bleiben auf Ihrem Gerät.
          </>
        }
        icon={<FileText className="h-7 w-7 md:h-8 md:w-8 text-accent" strokeWidth={1.5} aria-hidden="true" />}
      />
      <section className="py-10 md:py-16 bg-bg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <PdfTools />
        </div>
      </section>
    </>
  );
}
