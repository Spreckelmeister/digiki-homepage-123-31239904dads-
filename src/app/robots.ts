import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.digiki-osnabrueck.de";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/best-practice/admin/",
          "/best-practice/datenbank",
          "/best-practice/login",
          "/best-practice/registrieren",
          "/best-practice/passwort-vergessen",
          "/best-practice/passwort-zuruecksetzen",
          "/auth/",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
