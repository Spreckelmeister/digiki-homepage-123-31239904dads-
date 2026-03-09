# DigiKI – Homepage

> **Digitalisierung & Künstliche Intelligenz an Grundschulen Osnabrück**

Offizielle Website des Förderprojekts DigiKI. Das Projekt unterstützt Grundschulen im Raum Osnabrück dabei, KI-gestützte Werkzeuge gezielt im Unterricht einzusetzen – mit Schwerpunkt auf Sprachförderung, Inklusion und praxiserprobten Best-Practice-Beispielen.

🌐 **Live:** [digiki-osnabrueck.de](https://digiki-osnabrueck.de) &nbsp;|&nbsp; GitHub: [Spreckelmeister/digiki-homepage](https://github.com/Spreckelmeister/digiki-homepage-123-31239904dads-)

---

## Tech-Stack

| Technologie | Version | Zweck |
|---|---|---|
| [Next.js](https://nextjs.org) | 15.5 | App Router, SSR/SSG |
| [React](https://react.dev) | 19 | UI-Framework |
| [TypeScript](https://www.typescriptlang.org) | 5.9 | Typsicherheit |
| [Tailwind CSS](https://tailwindcss.com) | v4 | Styling |
| [Supabase](https://supabase.com) | 2.x | Datenbank, Auth |
| [Lucide React](https://lucide.dev) | 0.468 | Icons |
| [react-markdown](https://github.com/remarkjs/react-markdown) | 10 | Markdown-Rendering |

Deployment: **Vercel** (automatisch via GitHub-Push)

---

## Projektstruktur

```
src/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Startseite
│   ├── ueber-das-projekt/      # Projektbeschreibung & Timeline
│   ├── fuer-schulen/           # Angebote für teilnehmende Schulen
│   │   ├── antrag-hilfskraefte/    # Formular: Studentische Hilfskräfte
│   │   └── antrag-tool-lizenzen/   # Formular: Tool-Lizenzen
│   ├── best-practice/          # Best-Practice-Bereich (teilw. auth-geschützt)
│   │   ├── page.tsx            # Übersicht
│   │   ├── datenbank/          # Beitragssuche (🔒 Login erforderlich)
│   │   ├── einreichen/         # Vorlage einreichen (öffentlich)
│   │   ├── login/              # Login
│   │   ├── registrieren/       # Registrierung
│   │   └── admin/              # Verwaltung (🔒 nur Admins)
│   ├── bestandsaufnahme/       # Digitale Bestandsaufnahme für Schulen
│   ├── api/
│   │   ├── address-search/     # Adressvervollständigung (rate-limited)
│   │   └── school-search/      # Schulsuche (rate-limited)
│   ├── impressum/
│   └── datenschutz/
├── components/
│   ├── Header.tsx / Footer.tsx
│   ├── best-practice/          # Alle Best-Practice-Komponenten
│   └── forms/                  # Wiederverwendbare Formulare
├── lib/
│   ├── types.ts
│   └── supabase/               # client.ts / server.ts / middleware.ts
└── middleware.ts               # Auth-Schutz für /best-practice/datenbank & /admin

public/
├── images/
│   ├── icons/                  # Seitenbilder (WebP / AVIF)
│   ├── logos/                  # Partner- und Institutionslogos
│   ├── hero/                   # Hero-Bilder
│   ├── team/                   # Teamfotos
│   ├── timeline/               # Zeitstrahl-Grafiken
│   └── best-practice/          # Best-Practice-Bilder
└── downloads/
    ├── Antrag_Studentische_Hilfskraefte_DigiKI.docx
    ├── Antrag_Tool_Lizenzen_DigiKI.docx
    └── Best-Practice-Vorlage-Grundschule.docx
```

---

## Seiten

| Pfad | Beschreibung | Auth |
|------|-------------|------|
| `/` | Startseite: Hero, Statistiken, Features, Partner | Öffentlich |
| `/ueber-das-projekt` | Projektbeschreibung, Timeline, Budget | Öffentlich |
| `/fuer-schulen` | Teilnahmeoptionen, Antragsformulare, Downloads, FAQ | Öffentlich |
| `/fuer-schulen/antrag-hilfskraefte` | Antrag auf studentische Hilfskräfte | Öffentlich |
| `/fuer-schulen/antrag-tool-lizenzen` | Antrag auf Tool-Lizenzen | Öffentlich |
| `/bestandsaufnahme` | Digitale Bestandsaufnahme für Schulen | Öffentlich |
| `/best-practice` | Best-Practice-Übersicht | Öffentlich |
| `/best-practice/einreichen` | Vorlage einreichen | Öffentlich |
| `/best-practice/datenbank` | Best-Practice-Beiträge durchsuchen | 🔒 Login |
| `/best-practice/admin` | Beiträge verwalten, Anträge prüfen | 🔒 Admin |
| `/impressum` | Impressum | Öffentlich |
| `/datenschutz` | Datenschutzerklärung | Öffentlich |

---

## Lokale Entwicklung

### Voraussetzungen

- Node.js >= 18
- npm >= 9

### Setup

```bash
# 1. Repository klonen
git clone https://github.com/Spreckelmeister/digiki-homepage-123-31239904dads-.git
cd digiki-homepage

# 2. Abhängigkeiten installieren
npm install

# 3. Umgebungsvariablen anlegen (siehe unten)
cp .env.local.example .env.local

# 4. Entwicklungsserver starten
npm run dev
```

Browser öffnen: http://localhost:3000

### Weitere Befehle

```bash
npm run build   # Produktions-Build
npm run start   # Produktions-Server starten
npm run lint    # ESLint ausführen
```

---

## Umgebungsvariablen

Datei `.env.local` im Projektstamm anlegen:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<dein-projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dein-anon-key>
```

Beide Werte sind im Supabase-Dashboard unter **Settings -> API** zu finden.

> **Hinweis:** Ohne diese Variablen läuft die Seite im eingeschränkten Modus – alle öffentlichen Seiten sind erreichbar, geschützte Bereiche (`/datenbank`, `/admin`) leiten automatisch zum Login weiter.

---

## Datenbank (Supabase)

Die SQL-Migrationen liegen im Projektstamm und müssen der Reihe nach im **Supabase SQL-Editor** ausgeführt werden:

| Datei | Inhalt |
|-------|--------|
| `supabase-migration.sql` | Basis-Schema: Tabellen, Policies |
| `supabase-migration-002-address-split.sql` | Adressfelder aufgeteilt |
| `supabase-migration-003-security-fixes.sql` | RLS-Sicherheitskorrekturen |
| `supabase-migration-004-bestandsaufnahme.sql` | Tabelle für Bestandsaufnahmen |
| `supabase-migration-005-email-lookup.sql` | E-Mail-Lookup-Funktionen (nur `authenticated`) |

> Alle Migrationen sind idempotent (`CREATE OR REPLACE` / `IF NOT EXISTS`) und können sicher mehrfach ausgeführt werden.

---

## Deployment

Die Seite ist für **Vercel** optimiert und wird bei jedem Push auf `main` automatisch neu gebaut.

### Ersteinrichtung

1. Repository auf [github.com](https://github.com) pushen
2. Auf [vercel.com](https://vercel.com) einloggen → **Add New Project**
3. GitHub-Repository auswählen → **Import**
4. Umgebungsvariablen (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in den Vercel-Einstellungen eintragen
5. **Deploy** klicken – fertig

Eigene Domain unter **Settings -> Domains** in Vercel hinterlegen.

---

## Bilder

Alle Seitenbilder liegen in `public/images/icons/` und werden als **WebP** oder **AVIF** ausgeliefert.

| Dateiname | Verwendet auf |
|-----------|--------------|
| `istock-kids-laptop-teacher.webp` | Startseite – Hero |
| `pexels-rdne-8499534.webp` | Startseite – Unsere Vision |
| `istock-team-motivation.webp` | Best Practice – Hero |
| `istock-kids-raise-hands.webp` | Best Practice – Beispiele durchsuchen |
| `istock-colleague-high-five.webp` | Best Practice – Praxiserprobte Inhalte |
| `unsplash-team-unity.avif` | Best Practice – Wachsende Sammlung |
| `istock-students-hands-up.webp` | Best Practice – Login |
| `istock-teacher-computer-class.webp` | Über das Projekt – Header |
| `istock-elearning-support.webp` | Über das Projekt – Warum DigiKI? |
| `istock-teacher-tablet-explains.webp` | Über das Projekt – Sprachförderung |
| `istock-woman-tablet-teaching.webp` | Über das Projekt – Budget |
| `istock-teacher-supports-students.webp` | Für Schulen – Hero |
| `istock-teacher-student-highfive.webp` | Für Schulen – Sie sind nicht allein |

> **Hinweis:** Die iStock-Bilder sind aktuell Vorschauversionen mit Wasserzeichen. Nach Freigabe des Budgets durch die Stiftungen werden sie durch lizenzierte Vollversionen (gleiche Dateinamen) ersetzt.

Logos der Förderpartner liegen in `public/images/logos/`.

---

## Sicherheit

- **HTTP-Security-Header** für alle Routen: `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `Permissions-Policy`
- **Row-Level Security (RLS)** in Supabase für alle Tabellen aktiv
- **API-Routen** (`/api/address-search`, `/api/school-search`): Rate-Limiting und Eingabelängenbegrenzung
- **Passwortmindestlänge** bei Registrierung: 8 Zeichen
- **Auth-Middleware** schützt `/best-practice/datenbank` und `/best-practice/admin`

---

## Kontakt

**Kai Krafft** – Bildungskoordinator Fachbereich 40-3 Bildung, Stadt Osnabrück
✉️ krafft@osnabrueck.de
