import type { Metadata } from "next";
import { TextCursorInput } from "lucide-react";
import ToolHeader from "../ToolHeader";
import LueckentextApp from "./LueckentextApp";

export const metadata: Metadata = {
  title: "Lückentext-Generator",
  description:
    "Text eintippen, Wörter per Klick in Lücken verwandeln oder jedes n-te Wort entfernen. Erstellt Arbeitsblatt + Lösung zum Drucken. Komplett lokal.",
  alternates: { canonical: "/werkzeuge/lueckentext" },
};

export default function Page() {
  return (
    <>
      <ToolHeader
        code="WZ-007"
        title="Lückentext-Generator"
        description={
          <>
            Text hineinkopieren, Wörter per Klick in Lücken verwandeln – oder
            jedes n-te Wort entfernen lassen. Arbeitsblatt und Lösung
            druckbar.
          </>
        }
        icon={<TextCursorInput className="h-7 w-7 md:h-8 md:w-8 text-accent" strokeWidth={1.5} aria-hidden="true" />}
      />
      <section className="py-10 md:py-16 bg-bg print:py-0 print:bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">
          <LueckentextApp />
        </div>
      </section>
    </>
  );
}
