import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  Handshake,
  ListChecks,
  MessagesSquare,
  Send,
  Sparkles,
  UserRoundPen,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoopDiagram } from "@/components/marketing/hero-visual";
import { PageIntro } from "@/components/marketing/prose";
import { Button } from "@/components/ui/button";
import { SCORE_SCALE } from "@/lib/matching";

export const metadata: Metadata = {
  title: "Comment ça marche",
  description:
    "De la création du profil à l'échange terminé : les étapes d'un échange de compétences sur DevBridge.",
};

const STEPS: { icon: LucideIcon; title: string; text: string; detail: string }[] = [
  {
    icon: UserRoundPen,
    title: "Tu crées ton profil",
    text: "Tu indiques ce que tu sais faire, avec ton niveau, et ce que tu veux apprendre ou faire avancer.",
    detail: "Le niveau est déclaré par toi : DevBridge ne le présente jamais comme une certification.",
  },
  {
    icon: Sparkles,
    title: "DevBridge cherche tes complémentarités",
    text: "La page « Pour toi » liste les développeurs dont les compétences répondent aux tiennes, avec un score et ses raisons.",
    detail: "Tu peux aussi parcourir les annonces, ou en publier une.",
  },
  {
    icon: Send,
    title: "Tu proposes un échange",
    text: "Tu choisis ce que tu apportes, ce que tu attends, et tu te présentes en quelques lignes.",
    detail: "L'autre personne peut accepter, refuser, ou demander une modification.",
  },
  {
    icon: Handshake,
    title: "L'échange démarre, d'un commun accord",
    text: "Dès que la proposition est acceptée, un espace de collaboration s'ouvre pour vous deux.",
    detail: "Aucune collaboration n'est créée sans le consentement des deux personnes.",
  },
  {
    icon: ListChecks,
    title: "Vous découpez le travail en tâches",
    text: "Chacun crée des tâches, avec un responsable, une priorité et une échéance si besoin.",
    detail: "Un plan de départ est proposé en un clic pour ne pas partir d'une page blanche.",
  },
  {
    icon: ClipboardCheck,
    title: "Chaque livrable est validé par l'autre",
    text: "Tu décris ton résultat, tu ajoutes un lien ou un fichier ; ton partenaire valide ou demande une correction.",
    detail: "L'historique des validations est conservé. Personne ne valide son propre travail.",
  },
  {
    icon: BadgeCheck,
    title: "L'échange se termine, ton profil s'enrichit",
    text: "Quand tous les livrables sont validés, vous confirmez tous les deux la fin de l'échange, puis vous vous évaluez.",
    detail: "Tu obtiens une attestation publique à partager, et ton parcours de collaboration s'allonge.",
  },
];

const FAQ = [
  {
    question: "Est-ce que DevBridge est payant ?",
    answer:
      "Non. On échange du savoir-faire, pas de l'argent. Il n'y a ni paiement, ni jeton, ni abonnement.",
  },
  {
    question: "Et si personne ne veut ce que je propose ?",
    answer:
      "DevBridge cherche une boucle à trois : tu aides une personne, qui en aide une deuxième, qui t'aide à son tour. Tu peux aussi publier une aide ponctuelle ou une demande de mentorat.",
  },
  {
    question: "Comment le score de correspondance est-il calculé ?",
    answer:
      "Sur 100 points : compétences complémentaires, disponibilités, langue de travail, mode de collaboration et pays. Chaque point gagné est expliqué. Ce score aide à choisir, il ne mesure pas la valeur d'une personne.",
  },
  {
    question: "Je débute. Est-ce que j'ai ma place ?",
    answer:
      "Oui. Tout le monde sait faire quelque chose qu'une autre personne cherche à apprendre, et les mentors apprécient les débutants motivés.",
  },
  {
    question: "Que se passe-t-il en cas de désaccord ?",
    answer:
      "Chaque espace de collaboration contient un bouton de signalement. L'équipe de modération examine la situation, avec l'historique des livrables à l'appui.",
  },
  {
    question: "Ma connexion est instable. C'est un problème ?",
    answer:
      "Les pages sont légères, et ce que tu écris est gardé sur ton appareil tant que ce n'est pas envoyé. Tu ne perds pas un message parce que le réseau a coupé.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro
        eyebrow="Comment ça marche"
        title="D'un profil à un échange terminé, en sept étapes."
        text="DevBridge n'est pas un réseau social : c'est un endroit où un échange de compétences débouche sur un résultat que l'autre a validé."
      />

      <section className="px-4 pb-20 sm:px-6">
        <ol className="mx-auto max-w-3xl space-y-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="reveal flex gap-5 rounded-3xl bg-canvas p-6 sm:p-8">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-brand shadow-card">
                <step.icon className="size-6" aria-hidden />
              </span>
              <div>
                <p className="font-mono text-xs font-medium text-faint">Étape {index + 1}</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">{step.title}</h2>
                <p className="mt-2 text-ink/80">{step.text}</p>
                <p className="mt-2 text-sm text-muted">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-ink px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto grid grid-cols-1 max-w-5xl items-center gap-12 lg:grid-cols-2">
          <div className="reveal">
            <p className="text-sm font-semibold text-flow">Le score, sans boîte noire</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Cinq critères, cent points, zéro mystère.</h2>
            <p className="mt-4 text-lg text-white/70">
              Une correspondance n&apos;apparaît que s&apos;il existe au moins une compétence complémentaire. Le calcul
              est fait par le serveur, à partir de ce que chacun a réellement déclaré.
            </p>
          </div>
          <dl className="reveal space-y-3">
            {SCORE_SCALE.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-4 rounded-2xl bg-ink-2 px-5 py-4">
                <dt className="text-white">{row.label}</dt>
                <dd className="font-mono text-sm tabular-nums text-flow">{row.max} points</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto grid grid-cols-1 max-w-5xl items-center gap-12 rounded-[2rem] bg-flow-soft p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr]">
          <div className="reveal">
            <p className="text-sm font-semibold text-flow-strong">Quand il n&apos;y a pas de vis-à-vis</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink">La boucle d&apos;échange à trois</h2>
            <p className="mt-4 text-ink/80">
              Tu proposes React et tu cherches Docker. La personne qui maîtrise Docker, elle, cherche du design. Et la
              designer cherche justement React. À deux, rien n&apos;est possible ; à trois, tout le monde y gagne.
            </p>
            <p className="mt-3 text-ink/80">
              DevBridge détecte ces boucles et te les propose. Elles ne démarrent que si les trois personnes acceptent.
            </p>
          </div>
          <div className="reveal flex justify-center">
            <LoopDiagram />
          </div>
        </div>
      </section>

      <section className="bg-canvas px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="reveal flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-surface text-brand shadow-card">
              <MessagesSquare className="size-5" aria-hidden />
            </span>
            <h2 className="text-3xl font-semibold text-ink">Questions fréquentes</h2>
          </div>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details key={item.question} className="reveal group rounded-2xl bg-surface p-5 shadow-card open:pb-6 sm:p-6">
                <summary className="flex list-none items-center justify-between gap-4 text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-field text-xl leading-none text-muted transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-ink/80">{item.answer}</p>
              </details>
            ))}
          </div>
          <div className="reveal mt-12 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/inscription">
                Créer mon profil <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="white">
              <Link href="/explorer">Voir les échanges</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
