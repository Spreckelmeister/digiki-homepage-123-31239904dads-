import type { Metadata } from "next";
import AnmeldungForm from "./AnmeldungForm";

export const metadata: Metadata = {
  title: "Klassen-Anmeldung",
  description:
    "Online-Anmeldung zur Klassenbildung. Eltern tragen Ihr Kind ein und können Wünsche für Mit­schüler*innen angeben. Die Daten gehen an die Schule.",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function Page({ params }: PageProps) {
  const { code } = await params;
  return <AnmeldungForm code={code} />;
}
