import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, Prose } from "@/components/marketing/prose";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Quelles données DevBridge enregistre, pourquoi, et comment les supprimer.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageIntro
        eyebrow="Politique de confidentialité"
        title="Tes données, sans surprise."
        text="DevBridge enregistre le strict nécessaire pour organiser des échanges. Pas de publicité, pas de revente, pas de pistage."
      />
      <Prose>
        <section>
          <h2>Ce que nous enregistrons</h2>
          <ul>
            <li>
              <strong>Ton compte</strong> : adresse e-mail et mot de passe. Le mot de passe n&apos;est jamais stocké en
              clair, et personne ne peut le lire, pas même nous.
            </li>
            <li>
              <strong>Ton profil</strong> : nom, pays, ville, présentation, compétences, disponibilités, fuseau
              horaire, liens que tu choisis d&apos;ajouter, photo éventuelle.
            </li>
            <li>
              <strong>Ton activité</strong> : annonces, propositions, collaborations, tâches, livrables, messages,
              évaluations et signalements.
            </li>
            <li>
              <strong>Des cookies strictement nécessaires</strong> : ils maintiennent ta session. Aucun cookie
              publicitaire ni de mesure d&apos;audience tierce.
            </li>
          </ul>
        </section>

        <section>
          <h2>Ce qui est public, et ce qui ne l&apos;est pas</h2>
          <ul>
            <li>
              <strong>Public</strong> : ton profil, tes compétences, tes annonces en ligne, tes échanges terminés et
              les évaluations reçues. C&apos;est ce qui permet aux autres de te trouver.
            </li>
            <li>
              <strong>Réservé aux participants</strong> : les propositions, les espaces de collaboration, les tâches,
              les livrables, les fichiers joints et les messages.
            </li>
            <li>
              <strong>Jamais affiché</strong> : ton adresse e-mail. Elle n&apos;apparaît sur aucune page publique.
            </li>
          </ul>
          <p>
            Ces règles ne reposent pas sur la seule interface : elles sont appliquées dans la base de données, ligne
            par ligne.
          </p>
        </section>

        <section>
          <h2>À quoi servent ces données</h2>
          <p>
            À faire fonctionner le service : te proposer des correspondances, afficher tes échanges, te prévenir
            d&apos;une proposition, assurer la modération. Elles ne sont ni vendues, ni louées, ni utilisées pour de la
            publicité.
          </p>
        </section>

        <section>
          <h2>Où elles sont hébergées</h2>
          <p>
            Les données sont hébergées chez Supabase (base de données, comptes, fichiers) et l&apos;application chez
            Vercel. Ces prestataires agissent pour notre compte et n&apos;utilisent pas tes données pour leur propre
            usage.
          </p>
        </section>

        <section>
          <h2>Tes droits</h2>
          <ul>
            <li>
              <strong>Consulter et corriger</strong> : tout ton profil est modifiable depuis ton espace.
            </li>
            <li>
              <strong>Supprimer</strong> : la suppression du compte, dans les paramètres, efface définitivement ton
              profil et tout ce qui lui est rattaché.
            </li>
            <li>
              <strong>Poser une question</strong> :{" "}
              {site.contactEmail ? (
                <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
              ) : (
                <Link href="/a-propos#contact">la page de contact</Link>
              )}
              .
            </li>
          </ul>
        </section>

        <section>
          <h2>Sécurité</h2>
          <p>
            Les échanges avec le site sont chiffrés. L&apos;accès aux données est contrôlé côté serveur pour chaque
            requête, les fichiers envoyés sont limités en taille et en type, et les actions sensibles sont
            journalisées.
          </p>
          <p>
            Voir aussi les <Link href="/conditions">conditions d&apos;utilisation</Link>.
          </p>
          <p className="text-sm text-muted">Dernière mise à jour : novembre 2026.</p>
        </section>
      </Prose>
    </>
  );
}
