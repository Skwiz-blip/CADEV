import { ArrowRight, Globe2, Handshake, Scale, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/marketing/prose";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "DevBridge veut faire de l'échange de compétences un réflexe entre développeurs africains.",
};

const PRINCIPLES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Handshake,
    title: "La valeur, ce sont les échanges réalisés",
    text: "Ni abonnés, ni likes, ni publications. Un profil DevBridge raconte ce qui a été construit avec d'autres, et validé par eux.",
  },
  {
    icon: Scale,
    title: "Rien ne se fait sans accord",
    text: "Une collaboration ne naît que d'une proposition acceptée. Un échange ne se termine que lorsque les deux personnes le confirment.",
  },
  {
    icon: Globe2,
    title: "Tout le continent, pas quelques capitales",
    text: "Cinquante-quatre pays, des dizaines de langues, plusieurs fuseaux horaires : la plateforme est pensée pour cette diversité.",
  },
  {
    icon: ShieldCheck,
    title: "Honnête par construction",
    text: "Un niveau déclaré n'est pas une certification. Un score n'est pas une vérité. Un profil de démonstration est marqué comme tel.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="À propos"
        title="Le savoir est un baobab : personne ne peut l'embrasser seul."
        text="Partout sur le continent, des développeurs avancent seuls sur leurs projets. Ils butent sur une technologie qu'un autre maîtrise, et maîtrisent ce qu'un autre cherche à apprendre. DevBridge les met en relation."
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-5 text-lg text-ink/85">
          <p>
            Ce proverbe éwé, une langue parlée au Togo et au Ghana, dit qu&apos;il faut plusieurs bras pour faire le tour
            d&apos;un baobab. Le savoir technique, c&apos;est pareil : personne ne maîtrise tout, mais à plusieurs, on
            en fait le tour. C&apos;est l&apos;idée de DevBridge.
          </p>
          <p>
            Les plateformes existantes permettent de publier, de discuter, de partager du code ou de présenter un
            profil. Elles n&apos;organisent pas ce qui manque le plus : <strong className="font-semibold text-ink">un
            échange concret entre deux personnes dont les compétences se complètent</strong>.
          </p>
          <p>
            Sur DevBridge, on ne vient pas seulement avec une annonce. On vient avec deux choses : ce que l&apos;on sait
            faire, et ce dont on a besoin. La plateforme cherche les complémentarités, puis accompagne l&apos;échange
            jusqu&apos;à un résultat validé par l&apos;autre.
          </p>
          <p>
            Faire appel à un spécialiste coûte cher. Échanger son savoir-faire ne coûte que du temps, et profite aux
            deux. C&apos;est une économie collaborative du savoir technique, à l&apos;échelle du continent.
          </p>
        </div>
      </section>

      <section className="bg-canvas px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="reveal text-3xl font-semibold text-ink sm:text-4xl">Ce à quoi nous tenons</h2>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {PRINCIPLES.map((principle) => (
              <article key={principle.title} className="reveal rounded-3xl bg-surface p-7 shadow-card">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <principle.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-ink">{principle.title}</h3>
                <p className="mt-2 text-muted">{principle.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="reveal text-3xl font-semibold text-ink">Ce que DevBridge ne fait pas (encore)</h2>
          <p className="reveal mt-4 text-lg text-ink/85">
            Cette première version se concentre sur un seul parcours, de la rencontre à l&apos;échange terminé. Il
            n&apos;y a donc ni paiement, ni fil d&apos;actualité, ni visioconférence intégrée, ni application mobile
            native. Ces idées attendront que le cœur du produit ait fait ses preuves.
          </p>

          <div id="contact" className="reveal mt-14 scroll-mt-28 rounded-3xl bg-ink p-8 sm:p-10">
            <h2 className="text-2xl font-semibold text-white">Nous écrire</h2>
            <p className="mt-3 text-white/70">
              Une question, une idée, un problème à signaler ? DevBridge se construit avec celles et ceux qui
              l&apos;utilisent.
            </p>
            {site.contactEmail ? (
              <a
                href={`mailto:${site.contactEmail}`}
                className="mt-5 inline-block rounded-lg text-lg font-semibold text-flow hover:underline"
              >
                {site.contactEmail}
              </a>
            ) : (
              <p className="mt-5 text-white/85">
                Depuis ton espace, le bouton « Signaler » de chaque annonce et de chaque collaboration arrive
                directement à l&apos;équipe de modération.
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/inscription">
                  Rejoindre DevBridge <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="white">
                <Link href="/comment-ca-marche">Comment ça marche</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
