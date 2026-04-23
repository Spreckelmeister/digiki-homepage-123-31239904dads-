import type { ReactNode } from "react";

/**
 * Markiert einen englischsprachigen Begriff innerhalb deutschem Fließtext,
 * damit Screen-Reader die korrekte Aussprache wählen.
 *
 * Nutzung nach WCAG 3.1.2 "Language of Parts" — empfohlen für Lehnwörter wie
 * "Best Practice", auch wenn sie umgangssprachlich in Deutsch geläufig sind.
 *
 * Rendert `<span lang="en">children</span>`; keine visuelle Auswirkung.
 */
export function En({ children }: { children: ReactNode }) {
  return <span lang="en">{children}</span>;
}
