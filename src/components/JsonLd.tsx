import { projectData } from "@/data/project";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://digiki-os.de";

export function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DigiKI",
    url: siteUrl,
    logo: `${siteUrl}/images/logos/DigiKI_Logo_v5.svg`,
    description: projectData.claim,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Bierstraße 20",
      addressLocality: "Osnabrück",
      postalCode: "49074",
      addressCountry: "DE",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: projectData.contactEmail,
      contactType: "customer service",
      availableLanguage: "German",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function EventsJsonLd() {
  const events = [
    {
      name: "DigiKI Informationskonferenz – 4. Mai 2026",
      startDate: "2026-05-04T15:30:00+02:00",
      endDate: "2026-05-04T16:30:00+02:00",
      url: "https://teams.microsoft.com/meet/39577880545452?p=oSRgpU19DXBOmrTEET",
    },
    {
      name: "DigiKI Informationskonferenz – 8. Mai 2026",
      startDate: "2026-05-08T12:00:00+02:00",
      endDate: "2026-05-08T13:00:00+02:00",
      url: "https://teams.microsoft.com/meet/32306686851328?p=zGyTsk1lwUEFPCqJPu",
    },
  ];

  const jsonLd = events.map((event) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "VirtualLocation",
      url: event.url,
    },
    organizer: {
      "@type": "Organization",
      name: "DigiKI – Stadt Osnabrück",
      url: siteUrl,
    },
    description:
      "Offene Informationsveranstaltung: Lernen Sie das DigiKI-Projekt kennen und stellen Sie Ihre Fragen direkt an das Team.",
    isAccessibleForFree: true,
    image: `${siteUrl}/images/og-image.png`,
  }));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function FAQPageJsonLd({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
