# DevBridge

> Tes compétences ont de la valeur. Échangeons pour construire davantage.

DevBridge est une plateforme d'échange de compétences entre développeurs africains. Chacun indique ce qu'il sait faire et ce qu'il recherche ; la plateforme trouve les complémentarités, puis accompagne l'échange jusqu'à un résultat validé par les deux parties.

Projet présenté à la Coupe d'Afrique des Développeurs 2026 (Systalink Challenge).

---

## Sommaire

1. [Ce que fait la plateforme](#ce-que-fait-la-plateforme)
2. [Architecture](#architecture)
3. [Sécurité](#sécurité)
4. [Installation locale](#installation-locale)
5. [Brancher Supabase](#brancher-supabase)
6. [Déployer sur Vercel](#déployer-sur-vercel)
7. [Données et comptes de démonstration](#données-et-comptes-de-démonstration)
8. [Parcours de démonstration (3 minutes)](#parcours-de-démonstration-3-minutes)
9. [Tests](#tests)
10. [État du projet](#état-du-projet)

---

## Ce que fait la plateforme

### Le parcours principal

| Étape | Ce qui se passe |
| --- | --- |
| Inscription | Compte Supabase Auth, confirmation par e-mail, mot de passe oublié. |
| Accueil en 8 étapes | Identité, pays, présentation, savoir-faire, technologies, besoins, disponibilités, liens. Chaque étape est enregistrée ; on peut s'arrêter et reprendre. |
| Correspondances | Score sur 100 calculé dans la base, toujours accompagné de ses raisons. |
| Annonces | Échange réciproque, aide ponctuelle ou mentorat. Aperçu avant publication. |
| Propositions | Accepter, refuser ou demander une modification. Aucune collaboration sans l'accord des deux. |
| Collaboration | Tableau de tâches, livrables avec lien ou fichier, validation par l'autre participant, historique conservé. |
| Clôture | Possible seulement quand tous les livrables sont validés, et effective quand les deux confirment. |
| Réputation | Évaluation en 4 critères, réservée aux personnes ayant terminé un échange ensemble. |

### Le barème de correspondance

| Critère | Points |
| --- | --- |
| Compétences complémentaires (25 par sens) | 50 |
| Disponibilités communes, après conversion des fuseaux horaires | 20 |
| Langue de travail commune | 15 |
| Mode de collaboration compatible | 10 |
| Même pays | 5 |

Une correspondance n'existe que s'il y a au moins une compétence complémentaire : la plateforme ne recommande jamais quelqu'un sans pouvoir expliquer pourquoi. Le score est présenté comme une aide à la décision, pas comme une mesure scientifique.

### Les fonctionnalités en plus

Ces fonctionnalités répondent à des situations concrètes que le cahier des charges ne couvrait pas.

- **Boucle d'échange à trois.** Souvent, la personne qui peut t'aider n'a pas besoin de ce que tu proposes. DevBridge cherche alors un troisième développeur : A aide B, B aide C, C aide A. La boucle ne démarre que si les trois acceptent ; elle crée alors trois espaces de collaboration.
- **Coup de main express.** Une demande « je suis bloqué » prévient immédiatement jusqu'à 15 personnes qui proposent la compétence demandée (en priorité celles qui parlent la même langue), et reste mise en avant 72 heures. Limité à 3 par jour.
- **Créneaux à l'heure de chacun.** Les disponibilités communes s'affichent dans le fuseau de la personne qui lit, et dans celui de l'autre : « À ton heure : 18 h – 23 h · à la sienne : 21 h – 2 h ».
- **Plan de départ en un clic.** Quand un échange démarre, DevBridge propose des premières tâches adaptées aux compétences échangées (cadrage, transmission, mise en pratique).
- **Attestation publique vérifiable.** Chaque échange terminé donne une page publique, imprimable, qui atteste du déroulement (livrables validés, confirmation des deux parties) sans prétendre certifier un niveau.
- **Réactivité affichée.** Le profil indique le taux de réponse aux propositions et le délai habituel de réponse, calculés à partir des données réelles.
- **Relance des échanges qui s'essoufflent.** Après 7 jours sans activité, l'échange est signalé et un bouton « Relancer » pré-remplit un message.
- **Pensé pour les connexions fragiles.** Pages vitrines statiques, bandeau hors connexion, brouillons gardés sur l'appareil (annonce, proposition, message), message non envoyé conservé avec un bouton « Réessayer ».

### Les écrans

**Public** : accueil, explorer les échanges, découvrir les développeurs, profil public, annonce, attestation, comment ça marche, à propos, connexion, inscription, mot de passe oublié, conditions d'utilisation, politique de confidentialité.

**Espace connecté** : tableau de bord, pour toi, mes échanges (reçus, envoyés, en attente, en cours, terminés, refusés), collaborations, mes annonces, messagerie, notifications, mon profil, mes compétences, paramètres.

**Administration** : vue d'ensemble, utilisateurs (suspendre, réactiver), annonces (retirer, remettre en ligne), signalements, statistiques, historique des actions, gestion des données de démonstration.

---

## Architecture

```
Navigateur ──▶ Next.js 16 (Vercel) ──▶ Supabase
                │                        ├─ PostgreSQL : tables, règles d'accès (RLS), fonctions
                │                        ├─ Auth : comptes, sessions, e-mails
                │                        ├─ Storage : photos (public), pièces jointes (privé)
                └─ temps réel ◀──────────┴─ Realtime : messages et notifications
```

**Principe :** l'application ne lit ni n'écrit jamais directement dans les tables. Toutes les opérations passent par des fonctions PostgreSQL qui vérifient l'identité, les droits et l'état avant d'agir. La logique métier (score, transitions d'état, clôture, réputation) vit donc dans la base, au même endroit que les données qu'elle protège.

| Couche | Choix |
| --- | --- |
| Interface | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, Radix UI, Lucide |
| Formulaires | React Hook Form et Zod (mêmes schémas côté navigateur et côté serveur) |
| Données | Supabase : PostgreSQL, Auth, Storage, Realtime |
| Hébergement | Vercel (application), Supabase (données) |
| Qualité | ESLint, Vitest, PGlite (PostgreSQL embarqué), Playwright |

### Arborescence

```
supabase/
  migrations/          11 migrations versionnées (schéma → fonctions → sécurité → droits)
  devbridge.sql        les 11 migrations en un seul fichier, à coller dans Supabase
src/
  app/
    (site)/            pages vitrines, statiques
    (auth)/            connexion, inscription, mot de passe
    (discover)/        annonces, développeurs, attestations (publics)
    (app)/             espace connecté
    (welcome)/         accueil en 8 étapes
    (admin)/           administration
    auth/              retours des liens envoyés par e-mail
  components/          interface, par domaine
  lib/
    actions/           actions serveur (une par opération)
    api.ts             accès aux fonctions de la base
    matching.ts        explication des correspondances, fuseaux horaires
    validation.ts      schémas Zod
    labels.ts          tous les libellés (prêt pour une version anglaise)
    demo/seed.ts       scénario des données de démonstration
  proxy.ts             rafraîchissement de session et protection des routes
scripts/               données de démonstration, rôle administrateur, assemblage SQL
tests/
  db/                  tests de la base (PostgreSQL embarqué)
  unit/                tests de la logique applicative
  e2e/                 parcours complet dans un navigateur
```

### Base de données

21 tables : `profiles`, `app_admins`, `skills`, `user_skills`, `exchange_offers`, `offer_skills`, `exchange_proposals`, `proposal_skills`, `matches`, `exchange_loops`, `collaborations`, `collaboration_members`, `tasks`, `deliverables`, `conversations`, `messages`, `notifications`, `reviews`, `reports`, `activity_logs`, `admin_actions`.

Les compétences sont normalisées (catalogue de 100 entrées, extensible) : aucune compétence n'est stockée en texte libre.

---

## Sécurité

- **Row Level Security** activée sur les 21 tables. Le navigateur ne peut lire que ce que les règles autorisent.
- **Aucune écriture directe** : le seul droit d'écriture accordé au navigateur porte sur son propre profil, et seulement sur les colonnes non sensibles. Statut, marque de démonstration et score de complétion ne sont pas modifiables côté client.
- **Rôle administrateur** dans une table séparée (`app_admins`), sans aucun droit d'écriture côté client. Il ne s'accorde qu'avec la clé secrète (`npm run admin:grant`).
- **Fonctions internes** dans un schéma `private` non appelable depuis l'API. Un test vérifie qu'aucune fonction publique n'est restée ouverte par erreur.
- **Contrôles métier dans la base** : on ne valide pas son propre livrable, on n'évalue que quelqu'un avec qui on a terminé un échange, on ne clôture pas sans livrables validés, une proposition ne s'accepte que par son destinataire, etc.
- **Limitation des abus** : 30 messages par minute, 20 propositions, 10 annonces, 3 demandes express, 5 boucles et 10 signalements par jour.
- **Fichiers** : photos limitées à 2 Mo (images), pièces jointes à 10 Mo (images, PDF, texte, Markdown, JSON, ZIP), lisibles par les seuls membres de la collaboration, via des liens temporaires de 10 minutes.
- **Données personnelles** : l'adresse e-mail n'apparaît sur aucune page publique (vérifié par les tests).
- **Comptes suspendus** : plus d'écriture, plus de visibilité publique, plus de correspondances.
- **En-têtes HTTP** : HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Redirections** : seules les redirections internes sont acceptées après connexion (pas de redirection ouverte).
- La clé secrète Supabase n'est lue que côté serveur et n'est jamais préfixée par `NEXT_PUBLIC_`.

---

## Installation locale

Prérequis : Node.js 22.12 ou plus récent.

```bash
npm install
cp .env.example .env.local     # puis remplir les valeurs (voir ci-dessous)
npm run dev                    # http://localhost:3000
```

Sans les variables Supabase, les pages vitrines s'affichent et les autres pages expliquent ce qui manque.

### Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` puis `npm start` | Version de production |
| `npm run check` | Types, lint et tests |
| `npm test` | Tests de la base et de la logique (76 tests) |
| `npm run test:e2e` | Parcours complet dans un navigateur (22 étapes) |
| `npm run db:bundle` | Régénère `supabase/devbridge.sql` après modification d'une migration |
| `npm run db:check` | Vérifie que le projet Supabase est prêt (script appliqué, accès fermés aux visiteurs) |
| `npm run seed` | Crée ou recrée les données de démonstration |
| `npm run seed:purge` | Supprime toutes les données de démonstration |
| `npm run admin:grant -- personne@exemple.com` | Donne le rôle administrateur (`--revoke` pour le retirer) |

---

## Brancher Supabase

1. **Créer un projet** sur [supabase.com](https://supabase.com), réservé à DevBridge.
2. **Créer la base** : *SQL Editor* → *New query* → coller le contenu de `supabase/devbridge.sql` → *Run*. Le script crée les tables, les fonctions, les règles d'accès, les deux espaces de fichiers, le catalogue de compétences, et active le temps réel sur les messages et les notifications. Il s'exécute dans une transaction : en cas d'erreur, rien n'est appliqué.
   Vérifier ensuite avec `npm run db:check`.
3. **Récupérer les clés** : *Project Settings* → *API*. L'adresse du projet et la clé publique (`anon` ou `publishable`) vont dans `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` ; la clé secrète (`service_role` ou `secret`) dans `SUPABASE_SERVICE_ROLE_KEY`.
4. **Configurer l'authentification** : *Authentication* → *URL Configuration* :
   - *Site URL* : l'adresse publique du site (par exemple `https://devbridge.vercel.app`).
   - *Redirect URLs* : ajouter `https://<ton-domaine>/auth/callback` et `http://localhost:3000/auth/callback`.
5. **E-mails** : la confirmation de l'adresse est activée par défaut. Le service d'e-mail intégré de Supabase est limité à quelques envois par heure ; pour la production, renseigner un SMTP (*Authentication* → *Emails* → *SMTP Settings*). Les modèles d'e-mail peuvent être traduits en français dans le même menu.
6. **Données de démonstration** (facultatif) : renseigner `DEMO_PASSWORD` dans `.env.local`, puis `npm run seed`.
7. **Premier administrateur** : s'inscrire sur le site, puis `npm run admin:grant -- ton@adresse.com`.

### Variables d'environnement

| Variable | Où | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | navigateur et serveur | Adresse publique, sans barre finale |
| `NEXT_PUBLIC_SUPABASE_URL` | navigateur et serveur | Adresse du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navigateur et serveur | Clé publique (protégée par les règles d'accès) |
| `SUPABASE_SERVICE_ROLE_KEY` | serveur uniquement | Clé secrète : démonstration et suppression des fichiers d'un compte |
| `NEXT_PUBLIC_DEMO_MODE` | navigateur et serveur | `true` affiche la connexion en un clic aux comptes de démonstration |
| `DEMO_PASSWORD` | serveur uniquement | Mot de passe des comptes de démonstration (10 caractères minimum) |
| `DEMO_EMAIL_DOMAIN` | serveur uniquement | Domaine des adresses fictives (`demo.devbridge.test` par défaut) |
| `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_SOCIAL_*` | navigateur | Coordonnées du pied de page (masquées si vides) |

---

## Déployer sur Vercel

1. Pousser le projet sur un dépôt Git (GitHub, GitLab ou Bitbucket).
2. Sur [vercel.com](https://vercel.com) : *Add New* → *Project* → importer le dépôt. Le cadre Next.js est détecté automatiquement.
3. Renseigner **toutes** les variables d'environnement du tableau ci-dessus **avant** le premier déploiement : les variables `NEXT_PUBLIC_*` sont intégrées au moment de la compilation.
4. Déployer, puis reporter l'adresse obtenue dans `NEXT_PUBLIC_SITE_URL` (Vercel) et dans la configuration d'authentification de Supabase (étape 4 ci-dessus). Redéployer.
5. Vérifier sur le site en ligne : inscription, e-mail de confirmation, connexion, puis le parcours de démonstration.

En ligne de commande : `vercel` (aperçu) puis `vercel --prod`.

---

## Données et comptes de démonstration

`npm run seed` (ou le bouton de l'espace d'administration) crée dix profils fictifs répartis dans dix pays, toujours marqués « Démo » sur toutes les pages :

| Profil | Pays | Propose | Recherche |
| --- | --- | --- | --- |
| Kodjo Mensah | Togo | Flutter, Dart | Python, Intelligence artificielle |
| Amina Diallo | Sénégal | Python, Machine Learning | Flutter, Dart |
| Kwame Asante | Ghana | React, Node.js | UI/UX, Figma |
| Chisom Okafor | Nigeria | UI/UX, Figma | React |
| Youssef Benali | Maroc | Docker, DevOps, CI/CD | Back-End, Django |
| Wanjiru Kamau | Kenya | Django, Back-End | Docker |
| Aïcha Traoré | Côte d'Ivoire | Paiement mobile, Laravel | React Native |
| Mariam Coulibaly | Mali | Intelligence artificielle | Paiement mobile |
| Thabo Nkosi | Afrique du Sud | React Native | Cybersécurité |
| Salma Haddad | Tunisie | Cybersécurité | React Native |

Le scénario prépare les situations demandées : un échange terminé et évalué (Wanjiru ⇄ Youssef), un échange en cours montrant les quatre états d'une tâche (Kwame ⇄ Chisom), une proposition en attente (Salma → Thabo), huit annonces dont une demande express, deux correspondances réciproques et une boucle à trois possible (Kodjo → Aïcha → Mariam → Kodjo). L'histoire est étalée sur plusieurs semaines pour que les profils aient un parcours crédible.

Kodjo et Amina n'ont volontairement aucun échange entre eux : le parcours se joue en direct devant le jury.

**Comptes de démonstration** : `kodjo@demo.devbridge.test` et `amina@demo.devbridge.test`, mot de passe = valeur de `DEMO_PASSWORD`. Avec `NEXT_PUBLIC_DEMO_MODE=true`, la page de connexion propose aussi un accès en un clic (le mot de passe reste sur le serveur). Ces comptes ne peuvent ni changer de mot de passe ni être supprimés depuis l'application.

**Réinitialiser** : `npm run seed`, ou *Administration* → *Réinitialiser la démonstration*. Seuls les profils de démonstration sont touchés.

**Avant d'accueillir de vrais membres** : `npm run seed:purge`, ou le bouton *Supprimer la démonstration*.

---

## Parcours de démonstration (3 minutes)

Ouvrir deux navigateurs (ou une fenêtre privée), un pour chaque compte.

1. **Kodjo** se connecte. Son profil est complété à 65 % : il ajoute sa présentation et ses disponibilités depuis *Compléter mon profil*.
2. Il publie l'annonce « Flutter contre Python » : aperçu, puis publication.
3. **Amina** se connecte et ouvre *Pour toi* : Kodjo apparaît avec un score de 95.
4. Elle lit les raisons : « Cette personne recherche précisément une compétence que tu proposes : Python », les créneaux communs à son heure, la langue partagée.
5. Elle répond à l'annonce : les compétences qui se croisent sont déjà cochées ; elle écrit son message et envoie.
6. **Kodjo** voit la proposition sur son tableau de bord et l'accepte.
7. L'espace de collaboration s'ouvre. *Proposer un plan de départ* crée les premières tâches.
8. Chacun ajoute ou ajuste ses tâches.
9. Chacun soumet ses livrables ; l'autre les valide (ou demande une correction : l'historique est conservé).
10. Les deux confirment la fin de l'échange. Amina évalue Kodjo ; l'attestation publique est disponible ; les deux profils affichent l'échange terminé.

Pour aller plus loin : la boucle à trois dans *Pour toi* (compte Kodjo), la demande express dans *Explorer*, la messagerie, l'administration.

---

## Tests

| Suite | Contenu | Résultat |
| --- | --- | --- |
| `tests/db` | Les 11 migrations appliquées sur un vrai PostgreSQL embarqué (PGlite), avec les rôles Supabase reproduits. RLS, droits, correspondance, parcours complet, boucles, express, modération, suspension, messagerie, limitation, suppression de compte, script SQL unique, scénario de démonstration. | 64 tests réussis |
| `tests/unit` | Explication des correspondances, conversion des fuseaux horaires, validation des formulaires, redirections sûres, dates. | 12 tests réussis |
| `tests/e2e` | Le parcours du jury dans Chrome, à deux personnes, contre la vraie base (mini-serveur compatible Supabase) : 22 étapes, dont l'inscription, l'accueil en 8 étapes, l'administration, le contrôle d'accès et l'affichage sur téléphone (aucun débordement horizontal). | 22 étapes réussies, aucune erreur dans la console |

Le test de bout en bout enregistre des captures d'écran dans `tests/e2e/.captures`.

**Non couvert par les tests automatiques** : le temps réel (en test, l'application bascule sur son rattrapage périodique, qui est donc vérifié), l'envoi effectif de fichiers vers Supabase Storage et l'envoi des e-mails de confirmation. Ces trois points sont à vérifier sur le projet Supabase réel.

---

## État du projet

**Terminé et testé** : tout le parcours principal, les fonctionnalités en plus, l'administration, les données de démonstration, la sécurité, l'affichage sur téléphone.

**À faire par une personne** :
- Créer le projet Supabase et y exécuter `supabase/devbridge.sql`.
- Déployer sur Vercel et reporter l'adresse dans Supabase.
- Configurer un SMTP pour les e-mails en production.
- Vérifier en ligne le temps réel, les pièces jointes et les e-mails.

**Systalink** : le cahier des charges mentionne une étape obligatoire « Produit Systalink actif ». Aucune documentation publique sur cette étape ni sur une intégration Systalink n'a été trouvée ; rien n'a donc été inventé ni simulé. Il faut fournir les consignes officielles de la compétition (ou l'accès au tableau de bord) pour savoir ce qui est attendu.

**Hors périmètre de cette version** (choix du cahier des charges) : paiement, fil d'actualité, visioconférence, application mobile native, recherche sémantique, gamification. L'interface est en français ; tous les libellés sont centralisés dans `src/lib/labels.ts` pour une future version anglaise.
