import { redirect } from "next/navigation";

/**
 * „Code statt Link": Die separate Code-Eingabeseite ist abgeschafft – Codes
 * werden jetzt inline auf der jeweiligen Seite eingegeben (Anmeldung,
 * Passwort vergessen, Konto-Einstellungen). Dieser Stub fängt alte
 * E-Mail-Links ab und leitet sie an das passende Ziel weiter.
 */
export default async function CodeEinloesenPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  if (type === "recovery") redirect("/best-practice/passwort-vergessen");
  if (type === "account_deletion" || type === "email_change") {
    redirect("/best-practice/konto");
  }
  // signup, magiclink, unbekannt → Anmeldung (der Code-Login bestätigt die
  // E-Mail-Adresse automatisch mit).
  redirect("/best-practice/login");
}
