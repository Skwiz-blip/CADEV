import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Permet d'ajouter DevBridge à l'écran d'accueil du téléphone. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DevBridge",
    short_name: "DevBridge",
    description: site.description,
    lang: "fr",
    start_url: "/tableau-de-bord",
    display: "standalone",
    background_color: "#F4F6FA",
    theme_color: "#101B36",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
