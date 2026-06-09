"use client";

import { useIsAdmin } from "@/lib/useIsAdmin";

/**
 * Rendert die Kinder nur, wenn die aktuell angemeldete Person ein Admin der
 * Best-Practice-Datenbank ist (profiles.role === "admin"). Solange der Status
 * lädt oder kein Admin vorliegt, wird nichts ausgegeben.
 *
 * Bewusst client-seitig, damit die umgebende Seite (z. B. /werkzeuge) statisch
 * bleiben kann – das interne Tool taucht im statischen HTML nicht auf.
 */
export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const isAdmin = useIsAdmin();
  if (isAdmin !== true) return null;
  return <>{children}</>;
}
