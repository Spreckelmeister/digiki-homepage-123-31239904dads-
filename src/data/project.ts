export const projectData = {
  name: "DigiKI",
  fullName: "DigiKI – Digitalisierung & Künstliche Intelligenz an Grundschulen Osnabrück",
  claim: "Digitale Kompetenz und KI für alle Grundschulen in Stadt und Landkreis Osnabrück",
  surveyUrl: "/bestandsaufnahme",
  contactEmail: "krafft@osnabrueck.de",
  projectLead: "Kai Krafft",
  projectLeadRole: "Bildungskoordinator im Fachbereich 40-3 Bildung, Stadt Osnabrück",
  projectLeadAddress: "Bierstraße 20, 49074 Osnabrück",
};

export const stats = [
  { value: "300+", label: "Lehrkräfte", description: "werden geschult" },
  { value: "18", label: "Monate", description: "Projektlaufzeit" },
  { value: "50+", label: "Grundschulen", description: "in Stadt & Landkreis" },
  { value: "240.000 €", label: "Förderung", description: "von Stiftungen & Förderern" },
];

export const features = [
  {
    title: "Intensive Schulungen",
    description: "3-tägige praxisnahe Schulungen für Schulleitungen und Lehrkräfte zu digitalen Tools und KI im Unterricht.",
    icon: "GraduationCap" as const,
  },
  {
    title: "Tool-Lizenzen",
    description: "Stiftungsfinanzierte Lizenzen für adaptive Lernplattformen, die den individuellen Lernstand der Kinder berücksichtigen.",
    icon: "Laptop" as const,
  },
  {
    title: "Sprachförderung & DaZ",
    description: "Besonderer Schwerpunkt auf Sprachförderung und Mehrsprachigkeit mit KI-gestützten Werkzeugen.",
    icon: "Languages" as const,
  },
  {
    title: "Studentische Unterstützung",
    description: "Studierende begleiten Lehrkräfte direkt im Unterricht bei der Erprobung digitaler Werkzeuge.",
    icon: "Users" as const,
  },
  {
    title: "Best-Practice-Netzwerk",
    description: "Dokumentation erfolgreicher Beispiele und Peer-Learning zwischen den teilnehmenden Schulen.",
    icon: "Network" as const,
  },
  {
    title: "Digitale Infrastruktur",
    description: "Begleitende Arbeitsgruppe zur Verbesserung der technischen Ausstattung an den Schulen.",
    icon: "Server" as const,
  },
];

// Projektbeteiligte – mit echten Logos und Links zu den Homepages
export const partners = [
  { name: "Stadt Osnabrück", logo: "/images/logos/Osnabrueck_Logo_Claim_RGB_RZ.svg", url: "https://www.osnabrueck.de" },
  { name: "Landkreis Osnabrück", logo: "/images/logos/landkreis-os.png", url: "https://www.landkreis-osnabrueck.de" },
  { name: "KOS", logo: "/images/logos/KOS-Logo-Variante-01-horizontal-Printmedien-farbig.png", url: "https://www.kos.uni-osnabrueck.de" },
  { name: "RLSB Osnabrück", logo: "/images/logos/Logo RLSB OS transparent.png", url: "https://www.rlsb.de/organisation/dienststellen/regionalabteilung-osnabrueck" },
];

// Förderer – Stiftungen und Klaus Hellmann, mit Links zu den Homepages
export const funders = [
  { name: "Friedel & Gisela Bohnenkamp-Stiftung", logo: "/images/logos/Logo_Bohnenkamstiftung2021_RGB_Web.png", url: "https://www.bohnenkamp-stiftung.de" },
  { name: "Fromm-Stiftung", logo: "/images/logos/Logo_Fromm_Stiftung.png", url: "https://www.facebook.com/FROMMStiftung/?locale=de_DE" },
  { name: "Stiftung Stahlwerk Georgsmarienhütte", logo: "/images/logos/stahlwerk.png", url: "https://www.stiftung-stahlwerk.de" },
  { name: "Klaus Hellmann", logo: "/images/logos/Hellmann.jpeg", logoAlt: "Logo Hellmann Worldwide Logistics", url: "https://www.hellmann.com/de" },
];

export const timelinePhases = [
  {
    phase: 1,
    title: "Vorbereitung & Bestandsaufnahme",
    period: "Monat 1–3",
    description: "Online-Bestandsaufnahme an allen Grundschulen, Planung der Schulungen, Auswahl der Tools und Aufbau der Projektstrukturen.",
    items: [
      "Versand der Online-Bestandsaufnahme",
      "Auswertung der Rückmeldungen",
      "Auswahl und Lizenzierung der Tools",
      "Aufbau des Projektteams",
    ],
  },
  {
    phase: 2,
    title: "Schulungen & Qualifizierung",
    period: "Monat 3–8",
    description: "Durchführung der intensiven 3-tägigen Schulungen für Schulleitungen und Lehrkräfte in mehreren Durchgängen.",
    items: [
      "3-tägige Intensivschulungen (mehrere Kohorten)",
      "Einführung in adaptive Lernplattformen",
      "KI im Unterricht: Chancen und Grenzen",
      "Schwerpunkt Sprachförderung & DaZ",
    ],
  },
  {
    phase: 3,
    title: "Erprobung im Unterricht",
    period: "Monat 6–12",
    description: "Lehrkräfte erproben die gelernten Methoden und Tools im eigenen Unterricht mit Begleitung durch studentische Unterstützung.",
    items: [
      "Einsatz der Tools im Unterricht",
      "Studentische Begleitung vor Ort",
      "Regelmäßige Reflexionstreffen",
      "Erste Best-Practice-Dokumentation",
    ],
  },
  {
    phase: 4,
    title: "Vertiefung & Vernetzung",
    period: "Monat 10–14",
    description: "Aufbau des Peer-Learning-Netzwerks, Vertiefungsfortbildungen und systematische Dokumentation der Erfahrungen.",
    items: [
      "Peer-Learning zwischen den Schulen",
      "Vertiefende KOS-Fortbildungen",
      "Best-Practice-Datenbank aufbauen",
      "AG Digitale Infrastruktur",
    ],
  },
  {
    phase: 5,
    title: "Verstetigung & Transfer",
    period: "Monat 14–17",
    description: "Sicherung der Ergebnisse, Entwicklung nachhaltiger Strukturen und Vorbereitung des Abschluss-Fachtags.",
    items: [
      "Ergebnissicherung und Dokumentation",
      "Empfehlungen für nachhaltige Strukturen",
      "Vorbereitung des Fachtags",
      "Planung der Fortführung",
    ],
  },
  {
    phase: 6,
    title: "Abschluss-Fachtag",
    period: "Monat 18",
    description: "Großer Abschluss-Fachtag als Auftakt für eine jährliche Institution mit Ergebnispräsentation und Vernetzung.",
    items: [
      "Präsentation der Projektergebnisse",
      "Best-Practice-Showcase",
      "Workshops und Vernetzung",
      "Ausblick und Verstetigung",
    ],
  },
];

export const participationOptions = [
  {
    title: "Intensivschulung",
    subtitle: "Das Kernformat",
    description: "3-tägige praxisnahe Schulung zu digitalen Tools und KI im Grundschulunterricht.",
    highlights: [
      "3 Tage intensive Fortbildung",
      "Kleine Gruppen (max. 25 Personen)",
      "Praxisnahe Übungen mit echten Tools",
      "Schwerpunkt Sprachförderung möglich",
      "Zertifikat",
    ],
    cta: "Bald verfügbar",
    ctaHref: "#kontakt",
    featured: true,
    disabled: true, // Hier wird der Button deaktiviert
  },
  {
    title: "Early Adopter",
    subtitle: "Für Vorreiter",
    description: "Erweiterte Begleitung für Schulen, die als Pilotschulen vorangehen und andere unterstützen möchten.",
    highlights: [
      "Intensivschulung inklusive",
      "Studentische Unterstützung im Unterricht",
      "Erweiterte Tool-Lizenzen",
      "Peer-Mentoring für andere Schulen",
      "Dokumentation als Best Practice",
    ],
    cta: "Mehr erfahren",
    ctaHref: "#downloads",
    featured: false,
  },
  {
    title: "KOS-Fortbildungen",
    subtitle: "Bedarfsgerecht",
    description: "Einzelne thematische Fortbildungen über das Kompetenzzentrum für Lehrerfortbildung.",
    highlights: [
      "Flexible Terminwahl",
      "Spezifische Themen wählbar",
      "Halbtags- oder Ganztagsformat",
      "Auch für einzelne Lehrkräfte",
      "Keine Voranmeldung als Schule nötig",
    ],
    cta: "Bald verfügbar",
    ctaHref: "#kontakt",
    featured: false,
    disabled: true, // Hier wird der Button deaktiviert
  },
];

export const faqItems = [
  {
    question: "Wer kann an DigiKI teilnehmen?",
    answer: "Alle Grundschulen in der Stadt und im Landkreis Osnabrück können teilnehmen. Das Angebot richtet sich an Schulleitungen und Lehrkräfte, die digitale Kompetenzen und den Einsatz von KI im Unterricht stärken möchten.",
  },
  {
    question: "Ist die Teilnahme kostenlos?",
    answer: "Ja, die Teilnahme an allen Angeboten ist für die Schulen kostenlos. Das Projekt wird durch regionale Stiftungen und private Förderer finanziert – darunter die Friedel & Gisela Bohnenkamp-Stiftung, die Fromm-Stiftung, die Stiftung Stahlwerk Georgsmarienhütte und Klaus Hellmann.",
  },
  {
    question: "Welche Tools und Plattformen werden eingesetzt?",
    answer: "Es werden verschiedene adaptive Lernplattformen eingesetzt, die den individuellen Lernstand der Kinder berücksichtigen. Die genaue Auswahl wird nach der Bestandsaufnahme bekanntgegeben und orientiert sich an den Bedarfen der teilnehmenden Schulen.",
  },
  {
    question: "Wie viel Zeit muss ich als Lehrkraft investieren?",
    answer: "Die Intensivschulung umfasst 3 Tage. Darüber hinaus ist eine Erprobungsphase im eigenen Unterricht vorgesehen, die flexibel gestaltet werden kann. Die einzelnen KOS-Fortbildungen sind als Halbtags- oder Ganztagsveranstaltungen geplant.",
  },
  {
    question: "Benötige ich besondere technische Vorkenntnisse?",
    answer: "Nein, die Schulungen sind für alle Kompetenzniveaus konzipiert. Wir holen Sie dort ab, wo Sie stehen – von Grundlagen bis hin zu fortgeschrittenen Anwendungen von KI im Unterricht.",
  },
  {
    question: "Was ist die Online-Bestandsaufnahme?",
    answer: "Die Online-Bestandsaufnahme ist ein kurzer Fragebogen (ca. 10 Minuten), mit dem wir den aktuellen Stand der digitalen Ausstattung und die Bedarfe Ihrer Schule erfassen. Die Ergebnisse helfen uns, die Angebote passgenau zu gestalten.",
  },
  {
    question: "Wie werden die Tool-Lizenzen finanziert?",
    answer: "Die Lizenzen für adaptive Lernplattformen werden aus den Projektmitteln der Stiftungen und Förderer finanziert. Für die teilnehmenden Schulen entstehen keine Kosten. Die Lizenzen gelten zunächst für die Projektlaufzeit von 18 Monaten.",
  },
  {
    question: "Was passiert nach den 18 Monaten?",
    answer: "Ziel ist es, nachhaltige Strukturen aufzubauen, die über die Projektlaufzeit hinaus bestehen. Der Abschluss-Fachtag soll als jährliche Institution etabliert werden, und die Best-Practice-Datenbank bleibt als Ressource erhalten.",
  },
];

export const newsItems = [
  {
    id: "1",
    title: "DigiKI-Projekt startet",
    date: "2026-04-15",
    summary: "Das Projekt DigiKI startet am 15. April 2026! Alle Grundschulen in Stadt und Landkreis Osnabrück sind herzlich zur Teilnahme eingeladen.",
    slug: "projekt-gestartet",
  },
  {
    id: "2",
    title: "Online-Bestandsaufnahme ab 15. April",
    date: "2026-04-15",
    summary: "Ab dem 15. April startet die Online-Bestandsaufnahme an allen Grundschulen. Der kurze Fragebogen (ca. 10 Min.) hilft uns, die Angebote passgenau zu gestalten.",
    slug: "bestandsaufnahme",
  },
  {
    id: "4",
    title: "Informationskonferenzen: Jetzt teilnehmen",
    date: "2026-05-04",
    summary: "Lernen Sie DigiKI in einer unserer Online-Videokonferenzen per Microsoft Teams kennen und stellen Sie Ihre Fragen direkt an das Team.",
    slug: "onlinekonferenzen",
    type: "event" as const,
    dates: [
      {
        label: "Montag, 4. Mai 2026",
        time: "15:30 Uhr",
        joinUrl: "https://teams.microsoft.com/meet/39577880545452?p=oSRgpU19DXBOmrTEET",
        meetingId: "395 778 805 454 52",
        passcode: "v9Uj3Qz7",
        icsUrl: "/downloads/digiki-infokonferenz-04-05-2026.ics",
      },
      {
        label: "Freitag, 8. Mai 2026",
        time: "12:00 Uhr",
        joinUrl: "https://teams.microsoft.com/meet/32306686851328?p=zGyTsk1lwUEFPCqJPu",
        meetingId: "323 066 868 513 28",
        passcode: "FC2wn7CS",
        icsUrl: "/downloads/digiki-infokonferenz-08-05-2026.ics",
      },
    ],
  },
  {
    id: "3",
    title: "Pilotschulung vor den Sommerferien",
    date: "2026-06-01",
    summary: "Noch vor den Sommerferien 2026 findet die erste Pilotschulung statt. Weitere Informationen zur Anmeldung folgen in Kürze.",
    slug: "pilotschulung",
  },
];
