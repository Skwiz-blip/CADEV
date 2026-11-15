import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1 },
    { path: "/explorer", priority: 0.9 },
    { path: "/developpeurs", priority: 0.9 },
    { path: "/comment-ca-marche", priority: 0.7 },
    { path: "/a-propos", priority: 0.6 },
    { path: "/inscription", priority: 0.6 },
    { path: "/connexion", priority: 0.3 },
    { path: "/conditions", priority: 0.2 },
    { path: "/confidentialite", priority: 0.2 },
  ];
  return pages.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    changeFrequency: "weekly",
    priority: page.priority,
  }));
}
