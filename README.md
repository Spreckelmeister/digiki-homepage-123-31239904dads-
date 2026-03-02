# DigiKI – Homepage

Website des Projekts **DigiKI – Digitalisierung & Künstliche Intelligenz an Grundschulen Osnabrück**.

## Tech-Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Lucide React** (Icons)

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Dann im Browser: [http://localhost:3000](http://localhost:3000)

## Seiten

| Pfad | Beschreibung |
|------|-------------|
| `/` | Startseite mit Hero, Statistiken, Features, Partner |
| `/ueber-das-projekt` | Projektbeschreibung, Timeline, Budget |
| `/fuer-schulen` | Teilnahmeoptionen, Downloads, FAQ |
| `/impressum` | Impressum |
| `/datenschutz` | Datenschutzerklärung |

## Deployment

Die Seite ist für **Vercel** optimiert:

1. Repository auf GitHub pushen
2. Auf [vercel.com](https://vercel.com) mit GitHub verbinden
3. Projekt importieren – fertig!

Eigene Domain kann jederzeit in den Vercel-Einstellungen verbunden werden.

## Bilder

Logos und Bilder liegen in `/public/images/`. Neue Bilder dort ablegen und im Code referenzieren.

## Kontakt

Kai Krafft – Bildungskoordinator, Stadt Osnabrück
krafft@osnabrueck.de
