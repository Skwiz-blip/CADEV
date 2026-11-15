import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, Prose } from "@/components/marketing/prose";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Les règles d'utilisation de DevBridge, écrites pour être lues.",
};

export default function TermsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Conditions d'utilisation"
        title="Les règles du jeu, en clair."
        text="En créant un compte, tu acceptes ces conditions. Elles tiennent en une page et se lisent en cinq minutes."
      />
      <Prose>
        <section>
          <h2>1. Ce qu&apos;est DevBridge</h2>
          <p>
            DevBridge met en relation des développeurs qui souhaitent échanger leurs compétences. La plateforme fournit
            les outils (profils, annonces, propositions, espaces de collaboration, messagerie) ; elle n&apos;est pas
            partie aux échanges que les membres concluent entre eux.
          </p>
          <p>
            Le service est gratuit. Aucune transaction financière n&apos;a lieu sur la plateforme, et DevBridge ne
            garantit ni le résultat d&apos;un échange, ni le niveau réel d&apos;un membre.
          </p>
        </section>

        <section>
          <h2>2. Ton compte</h2>
          <ul>
            <li>Tu fournis des informations exactes et tu ne te fais pas passer pour quelqu&apos;un d&apos;autre.</li>
            <li>Un compte est personnel. Tu es responsable de la confidentialité de ton mot de passe.</li>
            <li>Les niveaux de compétence sont déclarés par chaque membre. Ils ne sont ni vérifiés ni certifiés.</li>
            <li>Tu peux supprimer ton compte à tout moment depuis les paramètres.</li>
          </ul>
        </section>

        <section>
          <h2>3. Ce que tu t&apos;engages à respecter</h2>
          <ul>
            <li>Tenir tes engagements : quand tu acceptes un échange, tu t&apos;y investis ou tu préviens.</li>
            <li>Rester respectueux. Aucun harcèlement, aucune discrimination, aucune menace.</li>
            <li>Ne pas publier de contenu illégal, trompeur, publicitaire ou sans rapport avec l&apos;échange de compétences.</li>
            <li>Ne pas créer de faux échanges ni de fausses évaluations pour gonfler une réputation.</li>
            <li>Ne pas chercher à contourner les protections de la plateforme ni à accéder aux données d&apos;autrui.</li>
          </ul>
        </section>

        <section>
          <h2>4. Tes contenus</h2>
          <p>
            Tu restes propriétaire de ce que tu publies (profil, annonces, messages, livrables). Tu autorises DevBridge
            à l&apos;afficher aux personnes concernées pour faire fonctionner le service. Le code et les livrables
            échangés dans une collaboration appartiennent à leurs auteurs : mettez-vous d&apos;accord entre vous sur
            leur réutilisation.
          </p>
        </section>

        <section>
          <h2>5. Réputation et évaluations</h2>
          <p>
            Seules les personnes ayant terminé une collaboration ensemble peuvent s&apos;évaluer, une fois par
            collaboration. Les indicateurs d&apos;un profil ne reflètent que des actions enregistrées sur la
            plateforme. Une évaluation abusive peut être signalée et retirée.
          </p>
        </section>

        <section>
          <h2>6. Modération</h2>
          <p>
            Tout membre peut signaler une annonce, un profil ou une collaboration. L&apos;équipe de modération peut
            retirer un contenu ou suspendre un compte qui ne respecte pas ces conditions. Chaque décision est motivée
            et conservée dans un historique.
          </p>
        </section>

        <section>
          <h2>7. Profils de démonstration</h2>
          <p>
            Pour illustrer le fonctionnement de la plateforme, certains profils et échanges sont fictifs. Ils portent
            toujours la mention « Démo » et ne représentent pas de véritables membres.
          </p>
        </section>

        <section>
          <h2>8. Disponibilité et responsabilité</h2>
          <p>
            DevBridge est fourni « en l&apos;état ». Nous faisons de notre mieux pour que le service soit disponible et
            sûr, sans pouvoir garantir une absence totale d&apos;interruption ou d&apos;erreur. Les échanges entre
            membres relèvent de leur seule responsabilité.
          </p>
        </section>

        <section>
          <h2>9. Évolution de ces conditions</h2>
          <p>
            Ces conditions peuvent évoluer avec le service. En cas de changement important, les membres sont prévenus
            sur la plateforme avant son entrée en vigueur.
          </p>
          <p>
            Pour toute question :{" "}
            {site.contactEmail ? (
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
            ) : (
              <Link href="/a-propos#contact">la page de contact</Link>
            )}
            . Voir aussi la <Link href="/confidentialite">politique de confidentialité</Link>.
          </p>
          <p className="text-sm text-muted">Dernière mise à jour : novembre 2026.</p>
        </section>
      </Prose>
    </>
  );
}
