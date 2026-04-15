# DigiKI – Homepage

> **Digitalisierung & Künstliche Intelligenz an Grundschulen Osnabrück**

Offizielle Website des Förderprojekts DigiKI. Das Projekt befähigt alle
Grundschulen in Stadt und Landkreis Osnabrück zu digitaler Kompetenz und
sachgerechtem Umgang mit KI – mit kostenlosen Schulungen, Tool-Lizenzen und
studentischer Unterstützung.

🌐 **Live:** [digiki-os.de](https://www.digiki-os.de)
📦 **Repo:** [Spreckelmeister/digiki-homepage](https://github.com/Spreckelmeister/digiki-homepage-123-31239904dads-)

---

## Tech-Stack

| Technologie | Version | Zweck |
|---|---|---|
| [Next.js](https://nextjs.org) | 15.5 (App Router) | SSR/SSG, API-Routen |
| [React](https://react.dev) | 19 | UI-Framework |
| [TypeScript](https://www.typescriptlang.org) | 5.9 | Typsicherheit |
| [Tailwind CSS](https://tailwindcss.com) | v4 | Styling |
| [Supabase](https://supabase.com) | 2.x | Datenbank, Auth, RLS |
| [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) | 2.x | Lizenzierte Bilder außerhalb des Repos |
| [Framer Motion](https://www.framer.com/motion/) | 12 | Dezente Animationen |
| [Lucide React](https://lucide.dev) | 0.468 | Icons |
| [Nodemailer](https://nodemailer.com) | 8 | Transaktions-Mails |
| [react-markdown](https://github.com/remarkjs/react-markdown) | 10 | Markdown-Rendering |

**Hosting:** Vercel (Region `fra1`) – automatisches Deploy bei jedem Push auf `main`.

---

## Projektstruktur

```
src/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # Startseite
│   ├── layout.tsx                    # Globales Layout, Meta-Tags, noimageindex
│   ├── ueber-das-projekt/            # Projektbeschreibung & Timeline
│   ├── fuer-schulen/                 # Teilnahmeoptionen + Anträge
│   │   ├── antrag-hilfskraefte/
│   │   └── antrag-tool-lizenzen/
│   ├── bestandsaufnahme/             # 9-stufige Online-Umfrage für Schulen
│   ├── best-practice/
│   │   ├── page.tsx                  # Übersicht ("Bald verfügbar")
│   │   ├── datenbank/                # 🔒 Login – Beispiele durchsuchen
│   │   ├── einreichen/               # Beitrag einreichen (Login-pflichtig)
│   │   ├── login/ | registrieren/
│   │   ├── passwort-vergessen/ | passwort-zuruecksetzen/
│   │   ├── meine-einreichungen/      # Eigene Anträge verwalten
│   │   ├── meine-bestandsaufnahme/   # Eigene Bestandsaufnahme bearbeiten
│   │   └── admin/                    # 🔒 Admin – Beiträge, Anträge, Bestandsaufnahmen
│   ├── api/
│   │   ├── register-bestandsaufnahme/    # Submit der Bestandsaufnahme
│   │   ├── update-bestandsaufnahme/      # Edit-Mode
│   │   ├── send-confirmation/            # Bestätigungs-Mail (Nodemailer)
│   │   ├── address-search/               # Adressvervollständigung (rate-limited)
│   │   └── school-search/                # Schulsuche (rate-limited)
│   ├── auth/callback/                # Supabase Auth-Callback
│   ├── barrierefreiheit/             # Erklärung zur Barrierefreiheit
│   ├── impressum/ | datenschutz/
│
├── components/
│   ├── Header.tsx | Footer.tsx
│   ├── CountdownBadge.tsx            # Hero-Countdown zum Projektstart
│   ├── StatCounter.tsx               # Animierter Count-up für Statistiken
│   ├── ProtectedImage.tsx            # next/image + Download-Schutz
│   ├── AnimatedSection.tsx           # Opacity-Fade beim Scroll (kein Y-Shift)
│   ├── Accordion.tsx                 # FAQ, CLS-frei mit scrollHeight
│   ├── best-practice/                # Auth-Status, Admin-Nav, Datenansicht
│   └── forms/                        # BestandsaufnahmeForm, OtherInput, …
│
├── data/
│   ├── project.ts                    # Projekt-Stammdaten (Stats, Events, Partner)
│   └── images.generated.ts           # AUTO-GENERATED – Vercel-Blob-URLs
│
├── lib/
│   ├── supabase/                     # client.ts / server.ts / middleware.ts
│   └── useIsAdmin.ts
│
└── middleware.ts                     # Auth-Schutz /best-practice/datenbank & /admin

scripts/
└── upload-images.ts                  # Lädt lizenzierte Bilder zu Vercel Blob

private-images/                       # 🚫 git-ignored – iStock-Rohdateien lokal
public/
├── images/
│   ├── icons/                        # Kleine Bilder, die nicht lizenziert sind
│   └── logos/                        # Partner- und Institutionslogos
└── downloads/                        # .ics-Kalender, DOCX-Vorlagen

supabase-email-templates/             # HTML-Templates für Supabase Auth-Mails
supabase-migration-*.sql              # SQL-Migrationen (Reihenfolge siehe unten)
```

---

## Seiten

| Pfad | Beschreibung | Auth |
|------|-------------|------|
| `/` | Startseite: Hero mit Countdown, Stats, Zitat, Features, Events, Partner | Öffentlich |
| `/ueber-das-projekt` | Projektbeschreibung, Timeline, Budget | Öffentlich |
| `/fuer-schulen` | Teilnahmeoptionen, Statistik-Streifen, FAQ, Anträge | Öffentlich |
| `/fuer-schulen/antrag-hilfskraefte` | Antrag auf studentische Hilfskräfte | Öffentlich |
| `/fuer-schulen/antrag-tool-lizenzen` | Antrag auf Tool-Lizenzen | Öffentlich |
| `/bestandsaufnahme` | 9-stufige Umfrage + automatisches Konto-Anlegen | Öffentlich |
| `/best-practice` | Übersicht (mit „Bald verfügbar"-Section) | Öffentlich |
| `/best-practice/datenbank` | Beiträge durchsuchen | 🔒 Login |
| `/best-practice/einreichen` | Beitrag einreichen | 🔒 Login |
| `/best-practice/meine-einreichungen` | Eigene Anträge bearbeiten | 🔒 Login |
| `/best-practice/meine-bestandsaufnahme` | Eigene Bestandsaufnahme bearbeiten | 🔒 Login |
| `/best-practice/admin` | Beiträge, Anträge, Bestandsaufnahmen verwalten | 🔒 Admin |
| `/barrierefreiheit` | Erklärung zur Barrierefreiheit (NBGG/BITV 2.0) | Öffentlich |
| `/impressum` | Impressum | Öffentlich |
| `/datenschutz` | Datenschutzerklärung | Öffentlich |

---

## Lokale Entwicklung

### Voraussetzungen

- Node.js ≥ 20
- npm ≥ 10
- Zugang zum Supabase-Projekt (für Datenbank) und Vercel-Projekt (für Blob-Upload)

### Setup

```bash
git clone https://github.com/Spreckelmeister/digiki-homepage-123-31239904dads-.git
cd digiki-homepage
npm install

# Umgebungsvariablen vom Vercel-Projekt ziehen:
npx vercel link         # einmalig Projekt verknüpfen
npx vercel env pull .env.local

npm run dev             # → http://localhost:3000
```

### npm-Skripte

```bash
npm run dev              # Entwicklungsserver
npm run build            # Produktions-Build
npm run start            # Produktions-Server starten
npm run lint             # ESLint
npm run upload-images    # Bilder aus private-images/ zu Vercel Blob hochladen
```

---

## Umgebungsvariablen

Alle Variablen werden im Vercel-Projekt verwaltet und per `vercel env pull`
nach `.env.local` gezogen (nicht manuell setzen).

| Variable | Zweck |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `NEXT_PUBLIC_SITE_URL` | Kanonische Domain (für Auth-Callbacks) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Schreibzugriff (nur für `upload-images`) |
| `SMTP_*` | Mail-Zugangsdaten für Nodemailer |

---

## Datenbank (Supabase)

Die Migrationen werden **in aufsteigender Reihenfolge** im Supabase SQL-Editor
ausgeführt. Alle Migrationen sind idempotent (`CREATE OR REPLACE` /
`IF NOT EXISTS`).

| Datei | Inhalt |
|-------|--------|
| `supabase-migration.sql` | Basis-Schema: Tabellen, Policies |
| `…-002-address-split.sql` | Adressfelder aufgeteilt |
| `…-003-security-fixes.sql` | RLS-Sicherheitskorrekturen |
| `…-004-bestandsaufnahme.sql` | Tabelle `bestandsaufnahme_responses` |
| `…-005-email-lookup.sql` / `-rls-bestandsaufnahme.sql` | Auth-Lookup-Funktionen |
| `…-006-account-registration.sql` | Konto-Anlage bei Bestandsaufnahme |
| `…-007-bestandsaufnahme-submissions.sql` | RPC zum Abfragen eigener Daten |
| `…-008-bestandsaufnahme-update-policy.sql` | Update-Policy für Nutzer |
| `…-009-get-my-bestandsaufnahme.sql` | RPC `get_my_bestandsaufnahme()` |
| `…-010-fix-get-my-submissions.sql` | Bugfix für RPC |
| `…-011-full-submission-details.sql` | Vollständige Daten für eigene Einreichungen |
| `…-012-reject-admin-applications.sql` | Admin-Konten dürfen keine Anträge stellen |
| `…-013-training-needs-other.sql` | Freitextspalte für „Sonstiges" (Frage 26) |
| `…-014-ai-purposes-other.sql` | Freitextspalte für „Sonstiges" (Frage 21) |

---

## Bilder & Lizenzen

Alle lizenzierten iStock-Fotos liegen **außerhalb des Repos** im Vercel Blob
Store. Workflow:

1. Bilder werden in den lokalen, git-ignorierten Ordner
   [`private-images/`](private-images/) gelegt.
2. `npm run upload-images` lädt sie nach Vercel Blob hoch und schreibt die URLs
   nach [`src/data/images.generated.ts`](src/data/images.generated.ts).
3. Seiten binden die Bilder über
   [`<ProtectedImage>`](src/components/ProtectedImage.tsx) ein (blockiert
   Rechtsklick/Drag, verhindert `noimageindex` Google-Indexierung).

**Im Repo verbleiben nur:**
- `public/images/logos/` – Partner- und Förderer-Logos (öffentlich)
- `public/images/icons/pexels-rdne-8499534.webp` – CC0-lizenziert

Die `Cross-Origin-Resource-Policy` für `/images/*` ist auf `cross-origin`
gesetzt, damit Logos in den E-Mail-Clients (Gmail, Outlook …) geladen werden
können – alle anderen Pfade bleiben auf `same-origin`.

---

## E-Mails

Template-Dateien liegen im Ordner
[`supabase-email-templates/`](supabase-email-templates/):

- `confirm-signup.html` – Willkommens-Mail nach Registrierung
- `reset-password.html` – Passwort-Reset-Link
- `password-changed.html` – Bestätigung nach Passwort-Änderung

Die Templates müssen manuell im **Supabase-Dashboard** (Authentication → Email
Templates) eingefügt werden. Alle Logos werden als PNG eingebunden (nicht SVG,
da Email-Clients SVG meist nicht rendern).

---

## Deployment

Push auf `main` → Vercel baut und deployed automatisch.

### Ersteinrichtung

1. Repository auf GitHub pushen
2. In Vercel: **Add New Project** → Repo auswählen → Import
3. Umgebungsvariablen übernehmen (Supabase, SMTP, BLOB_READ_WRITE_TOKEN)
4. Domain unter **Settings → Domains** verbinden

### Vercel-Features im Einsatz

- **Analytics** – anonyme Seitenaufrufe
- **Speed Insights** – Web Vitals (CLS, INP, LCP)
- **Blob Storage** – Bilderablage
- **Deployments** – automatische Preview-URLs pro PR

---

## Performance & Accessibility

- **Web Vitals** (Ziel-P75): LCP < 2.5 s, INP < 200 ms, CLS < 0.1
- Bilder: `next/image` mit `aspect-ratio` auf Containern → kein CLS beim Laden
- Animationen verzichten auf Y-Shift (`AnimatedSection`, `StatCounter`) → kein CLS
- `CountdownBadge` initialisiert `daysLeft` im `useState`-Initializer → kein
  SSR/Client-Mismatch
- `Accordion` nutzt dynamisches `scrollHeight` statt fixem `max-h-96`
- `<meta robots="…noimageindex">` im Root-Layout → keine Bilder in Google-Bildersuche

---

## Sicherheit

- **HTTP-Security-Header** global: `X-Frame-Options: DENY`,
  `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Resource-Policy: same-origin` (außer `/images/*`),
  `Permissions-Policy`, strikte `Content-Security-Policy`
- **Row-Level Security (RLS)** in Supabase für alle Tabellen aktiv
- **API-Rate-Limiting** auf den Suchrouten
- **Honeypot-Feld** im Bestandsaufnahme-Formular gegen Bots
- **Passwort-Regeln**: min. 8 Zeichen, Groß-/Kleinbuchstabe, Ziffer, Sonderzeichen
- **Auth-Middleware** schützt `/best-practice/datenbank` und `/best-practice/admin`

---

## Bestandsaufnahme-Formular

Mehrstufiges Formular mit **9 Abschnitten** (Teil A–H + Konto-Anlage).
Besonderheiten:

- Submit-Guard via `submitIntentRef` – nur ein Klick auf „Einreichen" löst den
  Supabase-Signup aus (kein versehentliches Abschicken durch Enter/Autofill)
- Bei jedem Step-Wechsel wird die Fehlermeldung zurückgesetzt
- Auto-Scroll zum Seitenanfang, wenn eine Fehlermeldung erscheint
- Pflichtfeld-Validierung pro Step (Teil H / Fragen 38+39 optional)
- „Sonstiges"-Eingabefelder werden erst eingeblendet und validiert, wenn die
  Option angewählt ist
- Admin-/Test-Einträge (School-Name enthält „Test" oder „Admin") werden im
  Admin-Listing automatisch ausgeblendet

---

## Kontakt

**Kai Krafft** – Bildungskoordinator im Fachbereich 40-3 Bildung, Stadt Osnabrück

✉️ [krafft@osnabrueck.de](mailto:krafft@osnabrueck.de)
