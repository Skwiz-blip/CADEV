export const site = {
  name: "DevBridge",
  slogan: "Tes compétences ont de la valeur. Échangeons pour construire davantage.",
  description:
    "La plateforme d'échange de compétences entre développeurs africains : trouve la personne qui complète ton savoir-faire, échange, et réalisez quelque chose de concret ensemble.",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  social: [
    { label: "GitHub", href: process.env.NEXT_PUBLIC_SOCIAL_GITHUB || null },
    { label: "LinkedIn", href: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || null },
    { label: "X", href: process.env.NEXT_PUBLIC_SOCIAL_X || null },
  ].filter((item): item is { label: string; href: string } => Boolean(item.href)),
} as const;

export const publicNav = [
  { href: "/", label: "Accueil" },
  { href: "/explorer", label: "Explorer" },
  { href: "/developpeurs", label: "Développeurs" },
  { href: "/comment-ca-marche", label: "Comment ça marche" },
] as const;
