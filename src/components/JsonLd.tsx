import { projectData } from "@/data/project";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.digiki-osnabrueck.de";

export function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DigiKI",
    url: siteUrl,
    logo: `${siteUrl}/images/logos/DigiKI.png`,
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
