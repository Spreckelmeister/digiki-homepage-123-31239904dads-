import type { Metadata } from "next";
import WunschForm from "./WunschForm";

export const metadata: Metadata = {
  title: "Wunschzettel · Klassenbildung",
  description:
    "Online-Wunschzettel für die neue Klassenbildung. Wird über den QR-Code auf dem Eltern-Formular geöffnet. Daten bleiben im Browser, kein Server-Upload.",
  // Diese Seite ist nicht Teil der öffentlichen Sitemap; sie wird
  // ausschließlich über QR-Code mit Hash-Payload aufgerufen.
  robots: { index: false, follow: false },
  alternates: { canonical: "/werkzeuge/klassenverteilung/wunsch" },
};

export default function Page() {
  return <WunschForm />;
}
