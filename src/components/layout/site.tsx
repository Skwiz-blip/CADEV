import Link from "next/link";
import { publicNav, site } from "@/lib/site";
import type { Viewer } from "@/lib/types";
import { Logo } from "./logo";
import { AuthButtons, HeaderShell, MobileMenu, TopLink } from "./nav-client";

/**
 * En-tête du site public. Sans `viewer`, l'état connecté est déterminé dans le
 * navigateur : les pages vitrines restent ainsi entièrement statiques.
 */
export function SiteHeader({ viewer }: { viewer?: Viewer | null }) {
  const authenticated = viewer === undefined ? undefined : Boolean(viewer);
  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Navigation principale" className="mx-auto hidden items-center gap-1 md:flex">
          {publicNav.map((item) => (
            <TopLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <AuthButtons authenticated={authenticated} />
          <MobileMenu authenticated={authenticated} />
        </div>
      </div>
    </HeaderShell>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="no-print bg-ink text-white">
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo onDark />
          <p className="mt-4 max-w-xs text-sm text-white/70">{site.slogan}</p>
          <p className="mt-4 max-w-xs text-sm text-white/55">
            Une plateforme d&apos;échange de compétences, pour les développeurs africains, par les développeurs africains.
          </p>
        </div>
        <FooterColumn title="Plateforme">
          <FooterLink href="/explorer">Explorer les échanges</FooterLink>
          <FooterLink href="/developpeurs">Découvrir les développeurs</FooterLink>
          <FooterLink href="/comment-ca-marche">Comment ça marche</FooterLink>
          <FooterLink href="/a-propos">À propos</FooterLink>
        </FooterColumn>
        <FooterColumn title="Compte">
          <FooterLink href="/inscription">Créer un compte</FooterLink>
          <FooterLink href="/connexion">Connexion</FooterLink>
          <FooterLink href="/conditions">Conditions d&apos;utilisation</FooterLink>
          <FooterLink href="/confidentialite">Politique de confidentialité</FooterLink>
        </FooterColumn>
        <FooterColumn title="Contact">
          {site.contactEmail ? (
            <FooterLink href={`mailto:${site.contactEmail}`}>{site.contactEmail}</FooterLink>
          ) : (
            <FooterLink href="/a-propos#contact">Nous écrire</FooterLink>
          )}
          {site.social.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md text-sm text-white/70 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </FooterColumn>
      </div>
      <div className="bg-ink-2">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-white/55 sm:px-6">
          <p>© {year} DevBridge. Tous droits réservés.</p>
          <p>Projet présenté à la Coupe d&apos;Afrique des Développeurs 2026.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-md text-sm text-white/70 transition-colors hover:text-white">
      {children}
    </Link>
  );
}
