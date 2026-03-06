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

### Bild-Policy (verbindlich)

- Zielgruppe und Motiv: Fokus auf **Grundschule**, Unterrichtssituationen, Lernbegleitung, Lehrkraefte im Schulkontext.
- Stil: konsistente, freundliche und realistische Foto-Sprache; keine zusammengewuerfelten Stock-Motive mit stark abweichender Farbwirkung.
- Bevorzugte Motive fuer Inhaltsseiten: 
	- `/images/icons/pexels-rdne-8499534.jpg`
	- `/images/icons/pexels-august-de-richelieu-4260477.jpg`
	- `/images/icons/pexels-pavel-danilyuk-8423046.jpg`
- Nicht mehr verwenden (Public-Seiten):
	- `istockphoto-*`
	- geloeschte Dateinamen, die nicht mehr im `public/images/icons`-Ordner liegen
- Alt-Texte: immer konkret zur Unterrichtsszene formulieren (wer, was, Kontext Grundschule), keine generischen Begriffe wie "Technologie" oder "Analyse".

## Kontakt

Kai Krafft – Bildungskoordinator, Stadt Osnabrück
krafft@osnabrueck.de
