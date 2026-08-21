import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutz",
  description:
    "Datenschutzerklärung der DigiKI-Projektwebsite. Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.",
  alternates: { canonical: "/datenschutz" },
};

export default function DatenschutzPage() {
  return (
    <>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Datenschutzerklärung
          </h1>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-border space-y-8">
            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                1. Datenschutz auf einen Blick
              </h2>
              <p className="text-text-light leading-relaxed">
                Die folgenden Hinweise geben einen einfachen Überblick darüber,
                was mit Ihren personenbezogenen Daten passiert, wenn Sie diese
                Website besuchen. Personenbezogene Daten sind alle Daten, mit
                denen Sie persönlich identifiziert werden können. Ausführliche
                Informationen zum Thema Datenschutz entnehmen Sie der unter
                diesem Text aufgeführten Datenschutzerklärung.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                2. Verantwortliche Stelle
              </h2>
              <p className="text-text-light leading-relaxed mb-2">
                Verantwortlich für die Datenverarbeitung auf dieser Website ist:
              </p>
              <address className="not-italic text-text-light leading-relaxed">
                <p className="font-semibold text-text">Stadt Osnabrück</p>
                <p>Kai Krafft – Bildungskoordinator im Fachbereich 40-3 Bildung</p>
                <p>Bierstraße 20</p>
                <p>49074 Osnabrück</p>
                <p className="mt-2">
                  E-Mail:{" "}
                  <a
                    href="mailto:krafft@osnabrueck.de"
                    className="text-primary underline"
                  >
                    krafft@osnabrueck.de
                  </a>
                </p>
              </address>
              <p className="text-text-light leading-relaxed mt-4">
                Verantwortliche Stelle ist die natürliche oder juristische
                Person, die allein oder gemeinsam mit anderen über die Zwecke
                und Mittel der Verarbeitung von personenbezogenen Daten
                entscheidet.
              </p>

              <h3 className="text-lg font-semibold text-text mt-6 mb-2">
                Datenschutzbeauftragte
              </h3>
              <address className="not-italic text-text-light leading-relaxed">
                <p className="font-semibold text-text">
                  Städtische Datenschutzbeauftragte
                </p>
                <p>Frau Claas</p>
                <p>Stadt Osnabrück</p>
                <p>Luisenstraße 18, 49074 Osnabrück</p>
                <p className="mt-2">
                  Telefon: 0541 323-3695
                </p>
                <p className="mt-1">
                  E-Mail:{" "}
                  <a
                    href="mailto:datenschutz@osnabrueck.de"
                    className="text-primary underline"
                  >
                    datenschutz@osnabrueck.de
                  </a>
                </p>
              </address>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                3. Datenerfassung auf dieser Website
              </h2>

              <h3 className="text-lg font-semibold text-text mb-2">
                Cookies und vergleichbare Speicher
              </h3>
              <p className="text-text-light leading-relaxed mb-2">
                Diese Website verwendet drei Kategorien von Browser-Speicher:
              </p>
              <ul className="list-disc ml-6 text-text-light space-y-2 mb-4">
                <li>
                  <strong>Technisch notwendige Cookies</strong>:
                  Session-Cookies zur sicheren Anmeldung in der
                  Best-Practice-Datenbank (gesetzt durch Supabase Auth).
                  Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO bzw. § 25 Abs. 2
                  Nr. 2 TDDDG (unbedingt erforderlich).
                </li>
                <li>
                  <strong>Consent-Eintrag</strong> (LocalStorage):{" "}
                  <code className="font-mono text-sm">digiki-cookie-consent</code>{" "}
                  – speichert Ihre Auswahl aus dem Cookie-Banner („accepted" /
                  „declined"), damit der Banner nicht bei jedem Aufruf erneut
                  erscheint. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO bzw.
                  § 25 Abs. 2 Nr. 2 TDDDG (Speicherung des Wunsches selbst ist
                  unbedingt erforderlich).
                </li>
                <li>
                  <strong>Optionaler LocalStorage</strong> in einzelnen
                  Werkzeugen (z.&thinsp;B. Klassenliste in der
                  Zufalls-Auswahl) – wird nur bei aktivem Speichern angelegt.
                  Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO.
                </li>
              </ul>
              <p className="text-text-light leading-relaxed mb-4">
                Sie können Browser-Speicher jederzeit löschen, indem Sie die
                Website-Daten für diese Domain zurücksetzen. Eine Deaktivierung
                technisch notwendiger Cookies kann die Funktionalität (z.&thinsp;B.
                Login) einschränken.
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Server-Log-Dateien
              </h3>
              <p className="text-text-light leading-relaxed mb-2">
                Der Hosting-Provider dieser Seiten (Vercel, siehe Ziffer 6)
                erhebt und speichert automatisch Informationen in sogenannten
                Server-Log-Dateien, die Ihr Browser automatisch übermittelt.
                Dies sind:
              </p>
              <ul className="list-disc ml-6 text-text-light space-y-1 mb-4">
                <li>Browsertyp und Browserversion</li>
                <li>Verwendetes Betriebssystem</li>
                <li>Referrer URL</li>
                <li>Hostname des zugreifenden Rechners</li>
                <li>Uhrzeit der Serveranfrage</li>
                <li>IP-Adresse</li>
              </ul>
              <p className="text-text-light leading-relaxed">
                Eine Zusammenführung dieser Daten mit anderen Datenquellen wird
                nicht vorgenommen. Die Erfassung erfolgt auf Grundlage von
                Art. 6 Abs. 1 lit. f DSGVO. Der Websitebetreiber hat ein
                berechtigtes Interesse an der technisch fehlerfreien Darstellung
                und der Sicherheit seiner Website.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                4. Werkzeuge für Lehrkräfte (lokale Verarbeitung im Browser)
              </h2>
              <p className="text-text-light leading-relaxed mb-4">
                Unter <strong>/werkzeuge</strong> bieten wir einfache, werbefreie
                Hilfs-Tools für den Unterricht an. Gemeinsames Prinzip aller
                Werkzeuge: Sie laufen{" "}
                <strong>vollständig in Ihrem Browser</strong>. Eingegebene
                Inhalte, hochgeladene Dateien, Mikrofon-Daten und erzeugte
                Ausgaben werden{" "}
                <strong>
                  zu keinem Zeitpunkt an unseren Server oder an Dritte
                  übermittelt
                </strong>
                . Beim Schließen des Browser-Tabs sind alle Daten verworfen –
                mit einer Ausnahme, die weiter unten unter „Zufalls-Auswahl"
                erläutert wird.
              </p>

              <p className="text-text-light leading-relaxed mb-4">
                Aktuell verfügbare Werkzeuge: QR-Code-Generator, Vollbild-Timer,
                Lärmampel, Zufalls-Auswahl, PDF-Werkzeuge (Zusammenfügen /
                Seiten extrahieren), Suchsel-Generator, Lückentext-Generator,
                Bilder komprimieren, Audio aufnehmen &amp; trimmen, sowie{" "}
                <strong>
                  KI-gestützte Werkzeuge für Texterkennung (Arbeitsblatt-Scanner),
                  Textdifferenzierung, Video-Untertitel, Diktiergerät &amp;
                  Audio-Transkription, Hintergrund entfernen und KI-Bild-Verbesserer
                </strong>
                .
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                QR-Code-Generator, Suchsel- und Lückentext-Generator
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Diese Werkzeuge erzeugen ihre Ausgabe clientseitig aus Ihren
                Eingaben (Link, Wortliste, Text). Die QR-Code-Berechnung nutzt
                die Open-Source-Bibliothek{" "}
                <code className="font-mono text-sm">qrcode</code>. Ergebnisse
                können als Grafik (PNG/SVG) heruntergeladen oder über den
                Druck-Dialog Ihres Browsers ausgedruckt werden. Es findet kein
                Abgleich mit einer Online-Datenbank statt.
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Vollbild-Timer
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Der Timer läuft als reine JavaScript-Anwendung in Ihrem Browser.
                Der End-Ton (dezenter Drei-Klang) wird lokal über die Web Audio
                API erzeugt; es werden <strong>keine Audio-Dateien</strong> von
                externen Servern geladen.
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Lärmampel (Mikrofonzugriff)
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Die Lärmampel greift über die{" "}
                <code className="font-mono text-sm">getUserMedia</code>-
                Schnittstelle Ihres Browsers auf das Mikrofon zu. Vor dem ersten
                Start fragt Ihr Browser aktiv Ihre Einwilligung ab. Aus dem
                Audiosignal wird <strong>ausschließlich der Lautstärkepegel</strong>{" "}
                (RMS-Wert) berechnet und farblich visualisiert. Es findet{" "}
                <strong>
                  keine Aufzeichnung, keine Analyse des gesprochenen Inhalts und
                  keine Übertragung
                </strong>{" "}
                der Audiodaten statt. Beim Beenden des Tools wird der
                Mikrofon-Stream sofort geschlossen. Rechtsgrundlage: Art. 6 Abs. 1
                lit. a DSGVO (Einwilligung durch aktive Mikrofon-Freigabe im
                Browser).
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Zufalls-Auswahl (lokale Klassenlisten)
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Die Zufalls-Auswahl kann optional Klassenlisten im{" "}
                <strong>Local Storage</strong> Ihres Browsers ablegen. Diese
                Speicherung findet{" "}
                <strong>ausschließlich auf Ihrem eigenen Gerät</strong> statt –
                es gibt keine Synchronisation mit unserem Server oder mit
                anderen Geräten. Sie können gespeicherte Listen jederzeit über
                die Oberfläche löschen oder komplett entfernen, indem Sie im
                Browser die Website-Daten für diese Domain zurücksetzen. Bitte
                speichern Sie in dieser Liste nur Vornamen bzw. interne Kürzel,
                keine weiteren personenbezogenen Daten. Rechtsgrundlage: Art. 6
                Abs. 1 lit. a DSGVO (Einwilligung durch aktives Sichern).
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                PDF-Werkzeuge (Zusammenfügen / Seiten extrahieren)
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Zum Zusammenfügen oder Zuschneiden von PDF-Dokumenten nutzen wir
                die clientseitige Open-Source-Bibliothek{" "}
                <code className="font-mono text-sm">pdf-lib</code>. Die
                ausgewählten PDFs verbleiben vollständig im Arbeitsspeicher
                Ihres Browsers. Ein Upload auf unsere oder fremde Server findet{" "}
                <strong>nicht</strong> statt. Das ist insbesondere bei sensiblen
                Dokumenten (z.&thinsp;B. Klassenarbeiten, Gutachten, Zeugnissen)
                relevant.
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Bilder komprimieren
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Hochgeladene Bilder werden ausschließlich lokal über die{" "}
                <code className="font-mono text-sm">Canvas</code>- und{" "}
                <code className="font-mono text-sm">createImageBitmap</code>-
                Schnittstellen Ihres Browsers skaliert und neu kodiert. Die
                Originalbilder und die komprimierten Ergebnisse verlassen Ihr
                Gerät nicht.
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Audio aufnehmen &amp; trimmen (Mikrofonzugriff)
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Wenn Sie die Aufnahme-Funktion nutzen, greift das Werkzeug über{" "}
                <code className="font-mono text-sm">getUserMedia</code> und den
                Browser-<code className="font-mono text-sm">MediaRecorder</code>
                {" "}auf Ihr Mikrofon zu; Ihr Browser fragt hierzu Ihre
                Einwilligung ab. Sowohl Eigenaufnahmen als auch hochgeladene
                Audiodateien werden vollständig im Arbeitsspeicher verarbeitet
                und liegen nur in Ihrem Browser-Tab vor. Beim Speichern des
                Zuschnitts erzeugt der Browser lokal eine WAV-Datei zum
                Download. Es erfolgt{" "}
                <strong>
                  keine Übertragung der Audiodaten an uns oder Dritte
                </strong>
                . Rechtsgrundlage bei Mikrofonzugriff: Art. 6 Abs. 1 lit. a DSGVO
                (Einwilligung durch aktive Mikrofon-Freigabe).
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                KI-gestützte Werkzeuge: Texterkennung, Textdifferenzierung,
                Video-Untertitel, Audio-Transkription, Hintergrund-Entfernen
                und Bild-Verbesserer
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Folgende Werkzeuge nutzen moderne <strong>Machine-Learning-Modelle</strong>,
                um Ihre Inhalte zu verarbeiten. Der zentrale Datenschutz-Grundsatz bleibt bestehen:
                <strong> Alle Verarbeitung erfolgt ausschließlich in Ihrem Browser</strong>.
                Ihre Inhalte werden weder an unsere Server noch an externe KI-Dienste übertragen.
              </p>

              <h4 className="text-base font-semibold text-text mb-2">
                Arbeitsblatt-Scanner (OCR – Texterkennung)
              </h4>
              <p className="text-text-light leading-relaxed mb-4">
                Das Werkzeug erkennt gedruckten und handschriftlichen Text aus
                PDF-Dateien und Bildern. Die Texterkennung basiert auf der
                Open-Source-Bibliothek <code className="font-mono text-sm">Tesseract.js</code>.
                Der Prozess:
              </p>
              <ol className="list-decimal ml-6 text-text-light space-y-2 mb-4">
                <li>Sie laden eine PDF oder ein Bild hoch → verbleibt im Arbeitsspeicher</li>
                <li>Das Sprachpaket für Deutsch (~14 MB) wird <strong>einmalig</strong> von{" "}
                  <code className="font-mono text-sm">tessdata.projectnaptha.com</code> heruntergeladen und lokal gecacht</li>
                <li>Die Texterkennung läuft in einem Web Worker (separate JavaScript-Thread) ab</li>
                <li>Der erkannte Text wird angezeigt und kann heruntergeladen werden</li>
                <li>Originalfoto und Erkennungsergebnis verlassen Ihr Gerät nicht</li>
              </ol>
              <p className="text-text-light leading-relaxed mb-4">
                Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
                Entlastung von Lehrkräften durch automatisierte Texterkennung).
              </p>

              <h4 className="text-base font-semibold text-text mb-2">
                Text-Differenzierer (KI-gestützte Vereinfachung)
              </h4>
              <p className="text-text-light leading-relaxed mb-4">
                Das Werkzeug vereinfacht komplexe Texte in leichtere Sprache.
                Hierfür nutzen wir ein Sprachmodell (<strong>Gemma-2</strong>), das
                über WebGPU (Grafikkarten-beschleunigte Berechnung) oder JavaScript
                direkt in Ihrem Browser läuft:
              </p>
              <ol className="list-decimal ml-6 text-text-light space-y-2 mb-4">
                <li>Sie geben oder laden einen Text ein</li>
                <li>
                  Das KI-Modell (Gemma-2-2B, 4-Bit-quantisiert, ~1,4 GB) wird{" "}
                  <strong>einmalig</strong> von{" "}
                  <code className="font-mono text-sm">huggingface.co</code>,{" "}
                  <code className="font-mono text-sm">cdn-lfs.huggingface.co</code>{" "}
                  und{" "}
                  <code className="font-mono text-sm">raw.githubusercontent.com</code>{" "}
                  (MLC-AI-Bibliothek) heruntergeladen und im Browser-Cache abgelegt
                </li>
                <li>Die Verarbeitung erfolgt lokal in Ihrem Browser (keine externe API)</li>
                <li>Der vereinfachte Text wird angezeigt</li>
              </ol>
              <p className="text-text-light leading-relaxed mb-4">
                Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
                Barriereabbau und Unterstützung von Schülern mit Lese-Schwierigkeiten).
              </p>

              <h4 className="text-base font-semibold text-text mb-2">
                Video-Untertitel-Generator (FFmpeg + Whisper)
              </h4>
              <p className="text-text-light leading-relaxed mb-4">
                Das Werkzeug erstellt automatisch Untertitel aus Video- oder
                Audiodateien:
              </p>
              <ol className="list-decimal ml-6 text-text-light space-y-2 mb-4">
                <li>Sie laden eine Video- oder Audiodatei hoch</li>
                <li>
                  <code className="font-mono text-sm">FFmpeg WASM</code> wird
                  von unserer eigenen Domain (Pfad{" "}
                  <code className="font-mono text-sm">/ffmpeg-core/</code>)
                  ausgeliefert – kein externes CDN – und extrahiert lokal die
                  Audiospur
                </li>
                <li>
                  Das Whisper-Spracherkennungsmodell{" "}
                  <code className="font-mono text-sm">
                    onnx-community/whisper-tiny
                  </code>{" "}
                  (~150 MB, fp32) wird einmalig von{" "}
                  <code className="font-mono text-sm">huggingface.co</code> /{" "}
                  <code className="font-mono text-sm">cdn-lfs.huggingface.co</code>{" "}
                  geladen und im Browser-Cache abgelegt
                </li>
                <li>
                  Die Spracherkennung erfolgt lokal in einem Web Worker (kein
                  Upload an externe Services)
                </li>
                <li>
                  Untertiteldatei (.vtt) wird generiert und kann heruntergeladen
                  werden
                </li>
              </ol>
              <p className="text-text-light leading-relaxed mb-4">
                Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
                Interesse an barrierefreiem Zugang zu Videomaterialien).
              </p>

              <h4 className="text-base font-semibold text-text mb-2">
                Diktiergerät &amp; Audio-Transkription (Mikrofon + Whisper)
              </h4>
              <p className="text-text-light leading-relaxed mb-4">
                Das Werkzeug nimmt Sprachnotizen über das Mikrofon auf oder
                akzeptiert eine bestehende Audio-Datei und erzeugt daraus einen
                Text auf Deutsch:
              </p>
              <ol className="list-decimal ml-6 text-text-light space-y-2 mb-4">
                <li>
                  Bei Mikrofon-Nutzung: Zugriff über{" "}
                  <code className="font-mono text-sm">getUserMedia</code> nach
                  expliziter Einwilligung im Browser-Dialog
                </li>
                <li>
                  Audio-Daten werden ausschließlich im Arbeitsspeicher des
                  Browser-Tabs gehalten – keine Server-Übermittlung
                </li>
                <li>
                  Das Whisper-Modell{" "}
                  <code className="font-mono text-sm">
                    onnx-community/whisper-tiny
                  </code>{" "}
                  (~150 MB, fp32) wird einmalig von{" "}
                  <code className="font-mono text-sm">huggingface.co</code> /{" "}
                  <code className="font-mono text-sm">cdn-lfs.huggingface.co</code>{" "}
                  geladen und im Browser-Cache abgelegt
                </li>
                <li>
                  Transkription läuft in einem Web Worker; das Transkript kann
                  bearbeitet, kopiert oder als .txt heruntergeladen werden
                </li>
                <li>
                  Beim Schließen des Tabs werden Aufnahme und Transkript
                  verworfen
                </li>
              </ol>
              <p className="text-text-light leading-relaxed mb-4">
                Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch
                aktive Mikrofon-Freigabe) bzw. Art. 6 Abs. 1 lit. f DSGVO
                (berechtigtes Interesse an Entlastung von Lehrkräften durch
                automatisierte Spracherkennung) bei Datei-Uploads.
              </p>

              <h4 className="text-base font-semibold text-text mb-2">
                Hintergrund entfernen (Foto-Freistellung)
              </h4>
              <p className="text-text-light leading-relaxed mb-4">
                Das Werkzeug entfernt automatisch den Hintergrund aus
                hochgeladenen Bildern. Es nutzt die Open-Source-Bibliothek{" "}
                <code className="font-mono text-sm">
                  @imgly/background-removal
                </code>{" "}
                (basierend auf einem ISNet-/U²-Net-Segmentierungsmodell):
              </p>
              <ol className="list-decimal ml-6 text-text-light space-y-2 mb-4">
                <li>Sie laden ein Bild hoch – verbleibt im Arbeitsspeicher</li>
                <li>
                  Modell- und WASM-Dateien werden einmalig vom imgly-CDN{" "}
                  <code className="font-mono text-sm">staticimgly.com</code>{" "}
                  geladen und im Browser-Cache abgelegt
                </li>
                <li>
                  Die Segmentierung läuft lokal über WebAssembly im Browser –
                  kein Bild-Upload an Dritte
                </li>
                <li>
                  Das freigestellte PNG kann heruntergeladen werden;
                  Originalbild und Ergebnis verlassen Ihr Gerät nicht
                </li>
              </ol>
              <p className="text-text-light leading-relaxed mb-4">
                Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
                Interesse an effizienter Erstellung von Unterrichtsmaterial).
              </p>

              <h4 className="text-base font-semibold text-text mb-2">
                KI-Bild-Verbesserer (Upscaling)
              </h4>
              <p className="text-text-light leading-relaxed mb-4">
                Das Werkzeug verdoppelt die Auflösung von Bildern per neuronalem
                Netz. Es nutzt die Open-Source-Bibliotheken{" "}
                <code className="font-mono text-sm">upscaler</code> /{" "}
                <code className="font-mono text-sm">@upscalerjs/default-model</code>{" "}
                und <code className="font-mono text-sm">@tensorflow/tfjs</code>:
              </p>
              <ol className="list-decimal ml-6 text-text-light space-y-2 mb-4">
                <li>Sie laden ein Bild hoch – verbleibt im Arbeitsspeicher</li>
                <li>
                  Das Upscaling-Modell ist als npm-Paket{" "}
                  <strong>direkt im JavaScript-Bundle enthalten</strong> und
                  wird mit der Seite ausgeliefert – es findet{" "}
                  <strong>kein Modell-Download von einem externen CDN</strong>{" "}
                  statt
                </li>
                <li>
                  Die Berechnung erfolgt lokal über TensorFlow.js (WebGL- oder
                  WASM-Backend Ihres Browsers)
                </li>
                <li>
                  Das hochskalierte Bild kann heruntergeladen werden;
                  Originalbild und Ergebnis verlassen Ihr Gerät nicht
                </li>
              </ol>
              <p className="text-text-light leading-relaxed mb-4">
                Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
                Interesse an besserer Lesbarkeit von Unterrichtsmaterial).
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Externe CDN-Quellen für KI-Modelle
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Die KI-Modelle und Sprachpakete werden von folgenden vertrauenswürdigen
                Quellen heruntergeladen (dies geschieht <strong>nur einmalig</strong>, danach wird
                lokal gecacht):
              </p>
              <ul className="list-disc ml-6 text-text-light space-y-1 mb-4">
                <li>
                  <code className="font-mono text-sm">tessdata.projectnaptha.com</code> –
                  Tesseract-Sprachpakete (Arbeitsblatt-Scanner / OCR)
                </li>
                <li>
                  <code className="font-mono text-sm">huggingface.co</code> /{" "}
                  <code className="font-mono text-sm">cdn-lfs.huggingface.co</code> –
                  Hugging-Face-Modellhub (Gemma-2 für Text-Differenzierer,
                  Whisper für Video-Untertitel und Diktiergerät)
                </li>
                <li>
                  <code className="font-mono text-sm">raw.githubusercontent.com</code> –
                  MLC-AI-Hilfsdateien (Tokenizer / Konfiguration) für den
                  Text-Differenzierer
                </li>
                <li>
                  <code className="font-mono text-sm">staticimgly.com</code> –
                  imgly-CDN für das Hintergrund-Entfernen-Modell
                </li>
              </ul>
              <p className="text-text-light leading-relaxed mb-4">
                FFmpeg WASM (Video-Untertitel) wird ausschließlich von unserer
                eigenen Domain ausgeliefert; das Bild-Verbesserer-Modell wird
                als npm-Paket im Bundle mitgegeben und kommt von keiner externen
                Quelle.
              </p>
              <p className="text-text-light leading-relaxed mb-4">
                <strong>Wichtig:</strong> Übertragen werden nur{" "}
                <strong>Modelle und Bibliotheken</strong>, nie Ihre persönlichen
                Inhalte (Bilder, Videos, Texte, Audio). Beim Download der
                Modell-Dateien wird Ihre IP-Adresse an die jeweiligen
                CDN-Anbieter übertragen (übliche CDN-Praxis). Eine Speicherung
                personenbezogener Daten beim Anbieter findet nach unserem
                Kenntnisstand nicht statt.
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Zweck und Rechtsgrundlage (Gesamt)
              </h3>
              <p className="text-text-light leading-relaxed">
                Die Bereitstellung der Werkzeuge dient der Entlastung von
                Lehrkräften im digitalen Unterricht und der Verbesserung von
                Barrierefreiheit. <strong>Bei allen Werkzeugen erfolgt die
                Verarbeitung ausschließlich in Ihrem Browser</strong>; keine
                personenbezogenen Daten werden an uns übertragen. Für die
                KI-gestützten Werkzeuge wird – zur Initialisierung – die
                IP-Adresse beim Download der Modelle von den o.&thinsp;g. CDNs
                übermittelt (standardmäßige CDN-Praxis); die Modelle selbst
                enthalten keine personenbezogenen Daten und Ihre Inhalte
                werden nicht an die CDN-Anbieter übertragen.
              </p>
              <p className="text-text-light leading-relaxed mt-4">
                <strong>Rechtsgrundlagen:</strong>
              </p>
              <ul className="list-disc ml-6 text-text-light space-y-2">
                <li>Für Mikrofonzugriff und Local-Storage-Nutzung: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)</li>
                <li>Für KI-Werkzeuge (Texterkennung, Textdifferenzierung, Video-Untertitel, Audio-Transkription):
                  Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Entlastung, Barriereabbau, Digitalisierungsunterstützung)</li>
                <li>Für den Aufruf der Werkzeug-Seiten selbst: Ziffer 3 (Server-Log-Dateien) und Ziffer 6 (Hosting / Vercel)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                5. Online-Formulare und Datenbank (Supabase)
              </h2>
              <p className="text-text-light leading-relaxed mb-4">
                Diese Website bietet Online-Formulare an, über die Schulen
                Anträge einreichen (Tool-Lizenzen, studentische Hilfskräfte,
                Best-Practice-Dokumentationen) und die digitale Bestandsaufnahme
                ausfüllen können. Außerdem kann ein Login-Konto für die
                Best-Practice-Datenbank erstellt werden. Die eingegebenen Daten
                werden über eine verschlüsselte Verbindung (HTTPS) an unseren
                Datenbank- und Authentifizierungs-Dienstleister
                <strong> Supabase</strong> übermittelt und dort gespeichert.
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Welche Daten werden erhoben?
              </h3>
              <ul className="list-disc ml-6 text-text-light space-y-1 mb-4">
                <li>Schulname und Schuladresse (Straße, PLZ, Ort)</li>
                <li>Name der Schulleitung und Kontaktperson</li>
                <li>E-Mail-Adresse, Telefonnummer</li>
                <li>Passwort (gesalzen und gehasht, nicht im Klartext)</li>
                <li>Angaben zu Schülerzahl und Lehrkräften</li>
                <li>
                  Formularspezifische Angaben (z.&thinsp;B. gewünschte Tools,
                  Unterstützungsbereiche, Unterrichtserfahrungen,
                  Selbsteinschätzungen zur Digitalisierung)
                </li>
              </ul>

              <h3 className="text-lg font-semibold text-text mb-2">
                Zweck und Rechtsgrundlage
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Die Verarbeitung erfolgt zur Bearbeitung Ihres Antrags bzw. Ihrer
                Teilnahme am DigiKI-Projekt auf Grundlage von Art. 6 Abs. 1 lit.
                b DSGVO (Vertragserfüllung) bzw. Art. 6 Abs. 1 lit. a DSGVO
                (Einwilligung bei der Best-Practice-Veröffentlichung und beim
                Konto-Anlegen im Rahmen der Bestandsaufnahme).
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Auftragsverarbeitung
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Die Daten werden bei der <strong>Supabase Inc.</strong>
                gespeichert. Supabase verarbeitet die Daten ausschließlich in
                unserem Auftrag und gemäß unseren Weisungen. Die Projekt-Server
                befinden sich in der EU (Region Irland). Ein
                Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO liegt
                vor.
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Speicherdauer
              </h3>
              <p className="text-text-light leading-relaxed">
                Die über die Formulare erhobenen Daten werden für die Dauer des
                DigiKI-Projekts gespeichert und nach Projektabschluss gelöscht,
                sofern keine gesetzlichen Aufbewahrungspflichten bestehen.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                6. Hosting, Bild-Speicher und Analyse (Vercel)
              </h2>
              <p className="text-text-light leading-relaxed mb-4">
                Die Webseite wird bei <strong>Vercel Inc.</strong> (440 N Barranca
                Ave #4133, Covina, CA 91723, USA) gehostet. Vercel verarbeitet
                die Daten ausschließlich nach dem{" "}
                <a
                  href="https://vercel.com/legal/dpa"
                  className="text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Auftragsverarbeitungsvertrag
                </a>{" "}
                (AVV gemäß Art. 28 DSGVO). Die Auslieferung erfolgt über
                EU-Server (Region Frankfurt, fra1); Vercel ist zudem nach dem
                EU-US Data Privacy Framework zertifiziert.
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Vercel Blob Storage (Bilder)
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Grafiken und Fotos der Website werden über Vercel Blob Storage
                ausgeliefert (CDN, EU-Region). Beim Laden eines Bildes wird Ihre
                IP-Adresse an Vercel übermittelt. Eine Speicherung personenbezogener
                Informationen erfolgt nicht.
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Vercel Analytics und Speed Insights (nur mit Einwilligung)
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Zur Reichweitenmessung und Performance-Analyse können wir{" "}
                <strong>Vercel Analytics</strong> und{" "}
                <strong>Vercel Speed Insights</strong> einsetzen. Beide Dienste
                werden ausschließlich geladen, <strong>nachdem</strong> Sie im
                Cookie-Banner aktiv auf{" "}
                <em>„Alle akzeptieren"</em> geklickt haben. Wenn Sie{" "}
                <em>„Nur notwendige"</em> wählen, werden weder das
                Analytics-Skript noch SpeedInsights nachgeladen und es findet
                keinerlei Datenübertragung an Vercel zu Analyse-Zwecken statt.
              </p>
              <p className="text-text-light leading-relaxed mb-4">
                Wenn Sie zugestimmt haben, erfassen die Dienste anonymisierte,
                aggregierte Kennzahlen (Seitenaufrufe, Gerätetyp, ungefähre
                geografische Region, Web-Vitals). Vercel selbst arbeitet dabei
                nach eigenen Angaben cookielos; es werden keine Profile gebildet
                und keine IP-Adressen dauerhaft gespeichert.
              </p>
              <p className="text-text-light leading-relaxed mb-4">
                Ihre Einwilligung können Sie jederzeit widerrufen, indem Sie im
                Browser den LocalStorage-Eintrag{" "}
                <code className="font-mono text-sm">digiki-cookie-consent</code>{" "}
                für diese Website löschen oder die Website-Daten zurücksetzen.
                Beim nächsten Aufruf erscheint der Cookie-Banner erneut.
              </p>
              <p className="text-text-light leading-relaxed">
                Rechtsgrundlage ist <strong>Art. 6 Abs. 1 lit. a DSGVO</strong>{" "}
                (Einwilligung) bzw. § 25 Abs. 1 TDDDG für das Speichern und
                Auslesen des Zustimmungs-Status auf Ihrem Endgerät.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                7. Microsoft Teams (Informationsveranstaltungen)
              </h2>
              <p className="text-text-light leading-relaxed mb-4">
                Auf dieser Website werden Links zu offenen
                Informationsveranstaltungen per <strong>Microsoft Teams</strong>{" "}
                veröffentlicht. Wenn Sie einen solchen Link anklicken, werden
                Sie auf die Server der Microsoft Corporation (One Microsoft Way,
                Redmond, WA 98052-6399, USA) bzw. Microsoft Ireland Operations
                Limited weitergeleitet. Die Stadt Osnabrück hat keinen Einfluss
                auf die dort stattfindende Datenverarbeitung.
              </p>
              <p className="text-text-light leading-relaxed mb-4">
                Bei Teilnahme an einer Teams-Besprechung verarbeitet Microsoft
                u.&thinsp;a. Ihren angezeigten Namen, Ihre IP-Adresse,
                Geräteinformationen sowie – je nach Aktivierung – Audio-, Video-
                und Chat-Inhalte. Weitere Informationen finden Sie in der{" "}
                <a
                  href="https://privacy.microsoft.com/de-de/privacystatement"
                  className="text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Datenschutzerklärung von Microsoft
                </a>
                .
              </p>
              <p className="text-text-light leading-relaxed">
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO (Einwilligung
                durch aktives Klicken auf den Teilnehmen-Link) bzw. Art. 6 Abs. 1
                lit. e DSGVO (Wahrnehmung einer Aufgabe im öffentlichen
                Interesse). Ein Auftritt in der Konferenz ist freiwillig –
                Kamera und Mikrofon können jederzeit deaktiviert werden.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                8. E-Mail-Versand (transaktionale Nachrichten)
              </h2>
              <p className="text-text-light leading-relaxed mb-4">
                Im Rahmen der Kontoregistrierung, Passwort-Wiederherstellung,
                E-Mail-Änderung und Formular-Einreichung versenden wir
                transaktionale E-Mails (z.&thinsp;B. 8-stellige Anmelde- und
                Verifizierungscodes, Bestätigungs-E-Mails bzw. -Links,
                Eingangsbestätigungen, System-Benachrichtigungen). Der Versand erfolgt über den
                spezialisierten Transaktions-E-Mail-Dienst{" "}
                <strong>Resend</strong> (Resend.com, Inc., 2261 Market Street
                #4537, San Francisco, CA 94114, USA). Dies gilt sowohl für
                E-Mails unserer Anwendung als auch für E-Mails, die durch
                Supabase Auth (vgl. Ziffer 5) ausgelöst werden – Supabase
                nutzt Resend als konfigurierten SMTP-Relay.
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Verarbeitete Daten
              </h3>
              <ul className="list-disc ml-6 text-text-light space-y-1 mb-4">
                <li>E-Mail-Adresse der Empfängerin / des Empfängers</li>
                <li>Name (sofern bekannt)</li>
                <li>Betreff und Inhalt der Nachricht</li>
                <li>
                  Zustelldaten (Zeitstempel, Zustellstatus, Bounce- und
                  Fehlermeldungen)
                </li>
              </ul>

              <h3 className="text-lg font-semibold text-text mb-2">
                Zweck und Rechtsgrundlage
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Die Verarbeitung dient der technischen Zustellung der E-Mails,
                der Erkennung von Zustellproblemen und dem Schutz vor
                Missbrauch. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
                (Vertragsanbahnung / Vertragserfüllung) für Registrierungs-
                und Antragsbestätigungen sowie Art. 6 Abs. 1 lit. f DSGVO
                (berechtigtes Interesse an einer zuverlässigen Kommunikation)
                für System-Benachrichtigungen.
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Auftragsverarbeitung und Serverstandort
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Mit Resend besteht ein Auftragsverarbeitungsvertrag gemäß
                Art. 28 DSGVO. Der technische Versand erfolgt über eine
                EU-Infrastruktur (Amazon Simple Email Service, Region
                eu-west-1 / Irland). Resend als Muttergesellschaft hat ihren
                Sitz in den USA; die Übermittlung personenbezogener Daten in
                die USA erfolgt auf Grundlage des EU-US Data Privacy
                Framework bzw. ergänzend auf Standardvertragsklauseln gemäß
                Art. 46 DSGVO. Weitere Informationen:{" "}
                <a
                  href="https://resend.com/legal/privacy-policy"
                  className="text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Datenschutzerklärung von Resend
                </a>
                {" "}und{" "}
                <a
                  href="https://resend.com/legal/dpa"
                  className="text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Auftragsverarbeitungsvertrag (DPA)
                </a>
                .
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Speicherdauer
              </h3>
              <p className="text-text-light leading-relaxed">
                Inhalt und Empfängeradresse einer Nachricht werden
                ausschließlich zum Zweck des jeweiligen Versands verarbeitet.
                Zustell-Metadaten (Status, Bounces, Zeitstempel) werden bei
                Resend gemäß deren Datenschutzerklärung typischerweise für
                wenige Wochen zu Zustelldiagnose-Zwecken vorgehalten und
                anschließend gelöscht.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                9. Externe Dienste und Schriftarten
              </h2>

              <h3 className="text-lg font-semibold text-text mb-2">
                OpenStreetMap Nominatim (Adress-Autovervollständigung)
              </h3>
              <p className="text-text-light leading-relaxed mb-4">
                Für die Adress-Vervollständigung in den Antragsformularen
                nutzen wir den Dienst Nominatim der OpenStreetMap Foundation.
                Die Anfragen werden über unseren Server weitergeleitet, sodass
                Ihre IP-Adresse <strong>nicht</strong> direkt an OpenStreetMap
                übermittelt wird. Es gelten die{" "}
                <a
                  href="https://osmfoundation.org/wiki/Privacy_Policy"
                  className="text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Datenschutzbestimmungen der OpenStreetMap Foundation
                </a>
                . Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
                Interesse an einer benutzerfreundlichen Adresseingabe).
              </p>

              <h3 className="text-lg font-semibold text-text mb-2">
                Schriftart Inter (self-hosted)
              </h3>
              <p className="text-text-light leading-relaxed">
                Die Schriftart „Inter" wird lokal über unseren Server
                ausgeliefert (Self-Hosting via <code>next/font</code>). Es
                findet <strong>keine</strong> Verbindung zu Google Fonts oder
                anderen externen Font-Servern statt.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                10. Transparenz (Open Source)
              </h2>
              <p className="text-text-light leading-relaxed">
                Der Quellcode dieser Website ist als Open-Source-Software
                veröffentlicht und unter{" "}
                <a
                  href="https://github.com/Spreckelmeister/digiki-homepage-123-31239904dads-"
                  className="text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DigiKI auf GitHub
                </a>{" "}
                einsehbar. Datenbank-Strukturen und Seitenquellcode sind
                vollständig offengelegt. Dies ermöglicht eine unabhängige
                Überprüfung der Datenverarbeitung.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                11. Ihre Rechte
              </h2>
              <p className="text-text-light leading-relaxed mb-4">
                Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen
                jederzeit folgende Rechte:
              </p>
              <ul className="list-disc ml-6 text-text-light space-y-1 mb-4">
                <li>
                  <strong>Auskunft</strong> über die gespeicherten Daten (Art. 15
                  DSGVO)
                </li>
                <li>
                  <strong>Berichtigung</strong> unrichtiger Daten (Art. 16 DSGVO)
                </li>
                <li>
                  <strong>Löschung</strong> Ihrer Daten (Art. 17 DSGVO)
                </li>
                <li>
                  <strong>Einschränkung</strong> der Verarbeitung (Art. 18 DSGVO)
                </li>
                <li>
                  <strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO)
                </li>
                <li>
                  <strong>Widerspruch</strong> gegen die Verarbeitung (Art. 21
                  DSGVO)
                </li>
                <li>
                  <strong>Widerruf</strong> erteilter Einwilligungen mit Wirkung
                  für die Zukunft (Art. 7 Abs. 3 DSGVO)
                </li>
              </ul>
              <p className="text-text-light">
                Für alle Anfragen wenden Sie sich bitte an:{" "}
                <a
                  href="mailto:krafft@osnabrueck.de"
                  className="text-primary underline"
                >
                  krafft@osnabrueck.de
                </a>
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                12. Recht auf Beschwerde
              </h2>
              <p className="text-text-light leading-relaxed">
                Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde
                über die Verarbeitung Ihrer personenbezogenen Daten zu
                beschweren. Die zuständige Aufsichtsbehörde ist die
                Landesbeauftragte für den Datenschutz Niedersachsen (LfD
                Niedersachsen), Prinzenstraße 5, 30159 Hannover.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
