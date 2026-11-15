import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin", "/tableau-de-bord", "/pour-toi", "/mes-annonces", "/mes-echanges", "/propositions",
          "/collaborations", "/messages", "/notifications", "/profil", "/competences", "/parametres",
          "/bienvenue", "/auth",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
