import { createServiceClient } from "@/lib/schulungen/server";

// Protokoll der Zugriffe auf Schulungsmaterial (Migration 044): je Öffnen
// einer Unterlage eine Zeile mit Konto, Unterlage und Zeitpunkt – ohne
// IP-Adresse. Zugesagt in den Nutzungsbedingungen
// (/schulungsmaterial/nutzungsbedingungen).

const KEEP_DAYS = 90;

/**
 * Schreibt einen Zugriff mit. Fehler (z. B. fehlende Migration) halten die
 * Anzeige nicht auf.
 */
export async function logMaterialAccess(
  userId: string,
  material: { id: string; title: string }
): Promise<void> {
  try {
    const admin = createServiceClient();
    const { error } = await admin.from("schulungsmaterial_zugriffe").insert({
      user_id: userId,
      material_id: material.id,
      material_title: material.title,
    });
    if (error) {
      console.error("[material/zugriff] schreiben:", error.message);
      return;
    }
    // Gelegentlich aufräumen (etwa jeder 20. Zugriff).
    if (Math.random() < 0.05) {
      const limit = new Date(Date.now() - KEEP_DAYS * 86400 * 1000).toISOString();
      await admin.from("schulungsmaterial_zugriffe").delete().lt("opened_at", limit);
    }
  } catch (error) {
    console.error("[material/zugriff] schreiben:", error);
  }
}
