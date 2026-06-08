"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  /** Sinnvolles Ziel, falls die Seite direkt aufgerufen wurde
   *  (kein same-origin Referrer / keine History). */
  fallbackHref: string;
  /** Label für den Fallback-Link (z.B. „Zurück zur Übersicht"). */
  fallbackLabel: string;
  /** Optionales Label, wenn echte History-Navigation möglich ist
   *  (Default: „Zurück"). */
  backLabel?: string;
  className?: string;
}

/**
 * Geht beim Klick wirklich einen Schritt in der Browser-History zurück
 * (statt zu einer fixen Seite zu springen). Funktioniert dann, wenn der
 * User von einer anderen Seite UNSEREs Sites hierher kam.
 *
 * Wenn er die Seite direkt aufruft (Link aus E-Mail, neuer Tab, Bookmark)
 * gibt es keine sinnvolle History – dann fällt der Button auf einen
 * statischen Link mit dem mitgegebenen Fallback-Ziel zurück.
 */
export default function BackButton({
  fallbackHref,
  fallbackLabel,
  backLabel = "Zurück",
  className,
}: BackButtonProps) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // History muss mehr als nur den aktuellen Eintrag haben UND der
    // Referrer muss aus derselben Origin kommen – sonst würden wir
    // den User aus der App rauswerfen oder eine "Zurück geht ins
    // Leere"-Erfahrung schaffen.
    if (window.history.length <= 1) return;
    if (!document.referrer) return;
    try {
      const ref = new URL(document.referrer);
      if (ref.origin === window.location.origin) {
        setCanGoBack(true);
      }
    } catch {
      // Ungültiger Referrer → Fallback bleibt
    }
  }, []);

  if (canGoBack) {
    return (
      <button
        type="button"
        onClick={() => router.back()}
        className={className}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </button>
    );
  }

  return (
    <Link href={fallbackHref} className={className}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {fallbackLabel}
    </Link>
  );
}
