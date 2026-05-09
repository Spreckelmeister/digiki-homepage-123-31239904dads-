# Info-Veranstaltung wieder aktivieren

Checkliste für den Fall, dass eine neue Online-Infoveranstaltung
ansteht. Der Code für die letzte Veranstaltung (8. Mai 2026) liegt
deaktiviert im Projekt und muss nur an den richtigen Stellen
einkommentiert und mit den neuen Termindaten gefüllt werden.

## Reihenfolge

### 1) `src/components/InfoEventBanner.tsx`
Drei Konstanten oben in der Datei aktualisieren:

```ts
const EVENT_DATE_ISO = "2026-05-08T12:00:00+02:00";   // neuen Beginn (ISO 8601)
const EVENT_END_ISO  = "2026-05-08T13:00:00+02:00";   // neues Ende (Banner verschwindet danach)
const STORAGE_KEY    = "digiki-info-banner-2026-05-08"; // neuer Key, damit auch Nutzer:innen, die letztes Mal geschlossen haben, den Banner wieder sehen
```

> Tipp: Den `STORAGE_KEY` immer mit dem Eventdatum versehen — dann
> kommt der Banner bei jedem neuen Termin garantiert zurück.

### 2) `src/components/JsonLd.tsx`
Im `events`-Array innerhalb der `EventsJsonLd`-Funktion den Eintrag
auf den neuen Termin setzen (für Suchmaschinen / strukturierte Daten):

```ts
const events = [
  {
    name: "DigiKI Informationskonferenz – 8. Mai 2026",
    startDate: "2026-05-08T12:00:00+02:00",
    endDate:   "2026-05-08T13:00:00+02:00",
    url: "https://teams.microsoft.com/meet/...",
  },
];
```

### 3) `src/data/project.ts`
Im `newsItems`-Array den auskommentierten Block einkommentieren und
die Werte auf den neuen Termin aktualisieren (Datum, Uhrzeit,
Teams-URL, Meeting-ID, Passcode, ggf. ICS-Datei).

### 4) `src/app/layout.tsx`
Zwei Zeilen einkommentieren:

```tsx
import InfoEventBanner from "@/components/InfoEventBanner";
// ...
<InfoEventBanner />
```

### 5) `src/app/page.tsx`
Zwei Stellen einkommentieren:

```tsx
import { EventsJsonLd } from "@/components/JsonLd";
// ...
<EventsJsonLd />
```

Und im Aktuelles-Abschnitt das `false && ` entfernen, sodass aus

```tsx
{false && newsItems.filter((i) => i.type === "event").map((item) => {
```

wieder

```tsx
{newsItems.filter((i) => i.type === "event").map((item) => {
```

wird.

## Was sonst noch da ist (muss nicht angefasst werden)

- `src/components/InfoEventBanner.tsx` — komplette Komponente bleibt
- `src/components/JsonLd.tsx` — `EventsJsonLd`-Funktion bleibt
- `src/app/globals.css` — `.info-banner` Animation bleibt
- `NewsItem`-Typ in `src/data/project.ts` enthält `type` + `dates` als
  optionale Felder — keine Typänderung beim Reaktivieren nötig

## ICS-Datei

Wenn ein Kalender-Download (`.ics`) angeboten werden soll: Datei nach
`public/downloads/digiki-infokonferenz-<DD-MM-YYYY>.ics` legen und im
`newsItems`-Block oben unter `icsUrl` referenzieren.

## Schnelltest nach dem Reaktivieren

1. `npx tsc --noEmit` — TypeScript muss clean durchlaufen
2. Dev-Server starten, Startseite öffnen → Banner oben sichtbar?
3. „Jetzt anmelden" klicken → scrollt zur Event-Karte unten?
4. Event-Karte zeigt korrektes Datum, Zeit, Teams-Link, Meeting-ID, Passcode?
5. Im Inkognito-Modus prüfen, dass der `STORAGE_KEY` neu ist und der Banner zuverlässig auftaucht
