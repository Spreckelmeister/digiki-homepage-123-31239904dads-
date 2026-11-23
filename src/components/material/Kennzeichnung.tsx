/**
 * Kennzeichnung der Ansicht mit dem abrufenden Konto (Nutzungsbedingungen,
 * Abschnitt 5). Liegt über der Unterlage, nimmt keine Klicks an.
 *
 * - Sichtbar: Name und Schule, klein in einer Ecke.
 * - Unsichtbar: die ersten acht Zeichen der Konto-Kennung als Kachelmuster
 *   über der ganzen Fläche. „difference" verschiebt jeden Bildpunkt um genau
 *   eine Helligkeitsstufe (von 256) – auf hellem wie auf dunklem Grund
 *   gleich wenig und mit bloßem Auge praktisch nicht zu sehen. In einem
 *   Bildschirmfoto (PNG) wird das Muster durch starkes Anheben des Kontrasts
 *   wieder lesbar; starke JPEG-Kompression oder ein Handyfoto verwischen es.
 *   Stärker (2–3 Stufen) übersteht es Kompression besser, war aber auf
 *   dunklen Flächen sichtbar.
 */
export default function Kennzeichnung({
  licensee,
  code,
}: {
  /** Sichtbarer Text, z. B. „Erika Muster · Grundschule Beispiel". */
  licensee: string;
  /** Kurzform der Konto-Kennung (Hex). */
  code: string;
}) {
  const safeCode = /^[0-9a-f]{4,32}$/.test(code) ? code : "";
  const tile = safeCode
    ? `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="190"><text x="10" y="100" transform="rotate(-24 170 95)" font-family="monospace" font-size="38" font-weight="700" fill="rgb(1,1,1)">${safeCode}</text></svg>`
      )}")`
    : undefined;

  return (
    <>
      {tile && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 select-none"
          style={{ backgroundImage: tile, mixBlendMode: "difference" }}
        />
      )}
      {licensee && (
        <p className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[80%] select-none truncate rounded bg-white/70 px-2 py-0.5 text-[11px] leading-tight text-black/60">
          Lizenziert für {licensee} · Zugriff wird protokolliert
        </p>
      )}
    </>
  );
}
