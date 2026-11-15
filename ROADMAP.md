# PROMPT MAÎTRE — CONCEPTION ET DÉVELOPPEMENT COMPLET DE DEVBRIDGE

## 1. TON RÔLE

Tu es une équipe multidisciplinaire composée de :

- Un architecte logiciel senior.
- Un Product Manager spécialisé dans les plateformes collaboratives.
- Un UX/UI Designer spécialisé dans les produits SaaS modernes.
- Un développeur Full-Stack senior.
- Un ingénieur spécialisé en sécurité et bases de données.
- Un spécialiste des produits numériques africains.
- Un ingénieur QA chargé de vérifier chaque fonctionnalité.

Ta mission est de concevoir et développer une plateforme web complète, professionnelle, moderne, fonctionnelle et responsive appelée **DevBridge**.

Tu ne dois pas produire une simple maquette, un prototype statique ou un dashboard rempli de données fictives sans interaction.

Tu dois construire un véritable produit numérique, avec une architecture propre, une base de données, une authentification, des fonctionnalités fonctionnelles, des interactions réelles et un déploiement accessible en ligne.

Tu dois prendre des décisions techniques cohérentes, anticiper les problèmes et privilégier la qualité du produit.

---

# 2. PRÉSENTATION DU PROJET

## Nom

DevBridge

## Slogan

« Tes compétences ont de la valeur. Échangeons pour construire davantage. »

## Positionnement

DevBridge est une plateforme d'échange collaboratif conçue pour les développeurs africains, par les développeurs africains.

Elle permet aux développeurs de mettre en commun leurs compétences, de trouver des personnes complémentaires, d'échanger leur savoir-faire et de collaborer sur des tâches concrètes.

## Contexte et problème

En Afrique, de nombreux développeurs travaillent individuellement sur des projets et rencontrent régulièrement des difficultés :

- Ils ne trouvent pas facilement quelqu'un maîtrisant une technologie particulière.
- Ils ont des compétences qu'ils pourraient mettre à disposition d'autres développeurs.
- Ils ont besoin d'aide sur certaines parties de leurs projets.
- Ils souhaitent apprendre de nouvelles technologies en pratiquant.
- Ils ont du mal à trouver des collaborateurs sérieux.
- Ils manquent parfois de ressources financières pour faire appel à des spécialistes.
- Ils possèdent des connaissances qui pourraient être utiles à d'autres développeurs.

Les plateformes existantes permettent principalement de publier du contenu, de discuter, de partager du code ou de présenter son profil.

DevBridge veut explorer une autre approche : organiser des échanges de compétences qui débouchent sur des réalisations concrètes.

## Vision

Faire de DevBridge un espace où un développeur africain peut trouver les compétences qui lui manquent et apporter en retour celles qu'il possède.

La plateforme doit encourager une économie collaborative du savoir-faire technique.

## Principe fondamental

Un développeur ne vient pas seulement publier une annonce ou discuter.

Il vient avec deux éléments :

1. Ce qu'il sait faire et peut apporter.
2. Ce dont il a besoin pour progresser ou faire avancer son projet.

DevBridge cherche les complémentarités et facilite les échanges entre les développeurs.

Exemple :

- Kodjo maîtrise Flutter et cherche de l'aide en intelligence artificielle.
- Amina maîtrise Python et le Machine Learning, mais souhaite apprendre Flutter.
- DevBridge détecte leur complémentarité et leur propose un échange.
- Kodjo aide Amina sur Flutter.
- Amina aide Kodjo sur son intégration IA.
- Les deux réalisent leurs tâches et valident l'échange.
- Leurs profils enregistrent leurs contributions.

L'échange peut également prendre la forme d'une contribution ponctuelle, d'une séance de mentorat ou d'une collaboration sur un projet.

**La valeur de DevBridge repose sur les échanges réalisés, pas sur les publications ou les abonnés.**

---

# 3. OBJECTIFS DU PRODUIT

La plateforme doit répondre à six objectifs :

1. Permettre aux développeurs africains de présenter leurs compétences réelles.
2. Faciliter la découverte de développeurs complémentaires.
3. Organiser des échanges de compétences sans nécessairement passer par une transaction financière.
4. Permettre de transformer un échange en tâches et livrables concrets.
5. Valoriser les contributions et les collaborations terminées.
6. Créer un réseau de collaboration technique entre pays africains.

La plateforme doit être accessible aux débutants, étudiants, développeurs indépendants, professionnels et membres de petites équipes.

---

# 4. IDENTITÉ VISUELLE ET DIRECTION ARTISTIQUE

Je veux un produit qui donne immédiatement une impression de sérieux, de modernité et de maturité.

Ne reproduis pas le design d'un réseau social classique.

Ne reproduis pas Reddit, Discord, LinkedIn ou GitHub.

Inspire-toi des standards visuels des meilleurs produits SaaS et plateformes de collaboration.

## Direction artistique

- Design moderne, minimaliste et professionnel.
- Interface très soignée.
- Hiérarchie visuelle claire.
- Typographie élégante et lisible.
- Espacements généreux.
- Cartes bien structurées.
- Bordures discrètes.
- Ombres très légères.
- Icônes cohérentes.
- Micro-interactions fluides.
- Animations discrètes et utiles.
- Navigation intuitive.

## Palette de couleurs

Utiliser une identité technologique reconnaissable :

- Bleu nuit : `#101B36`
- Bleu principal : `#2457E8`
- Cyan : `#28B8D5`
- Blanc : `#FFFFFF`
- Gris clair : `#F4F6FA`
- Gris texte : `#64748B`
- Vert succès : `#16A36A`
- Orange accent : `#F59E0B`

Le bleu doit être la couleur dominante.

Le cyan sert à mettre en valeur les échanges, connexions et correspondances.

Éviter les dégradés excessifs et les couleurs trop saturées.

## Typographie

Utiliser une police moderne comme Inter ou Geist.

Les titres doivent être affirmés, les textes secondaires discrets et les données facilement lisibles.

## Responsive design

L'interface doit être parfaitement adaptée :

- Aux ordinateurs.
- Aux tablettes.
- Aux smartphones.

Concevoir d'abord une expérience desktop complète, puis adapter intelligemment la navigation mobile.

Sur mobile, privilégier une navigation basse simple et une présentation en cartes.

---

# 5. ARCHITECTURE GÉNÉRALE DE L'APPLICATION

Créer les espaces suivants :

### Pages publiques

- Accueil.
- Découvrir les échanges.
- Découvrir les développeurs.
- Comment ça fonctionne.
- À propos.
- Connexion.
- Inscription.
- Conditions d'utilisation.
- Politique de confidentialité.

### Espace utilisateur connecté

- Tableau de bord.
- Mon profil.
- Mes compétences.
- Explorer les échanges.
- Trouver des développeurs.
- Mes propositions.
- Mes échanges.
- Mes collaborations.
- Messagerie.
- Notifications.
- Paramètres.

### Administration

- Tableau de bord administrateur.
- Gestion des utilisateurs.
- Modération des annonces.
- Gestion des signalements.
- Statistiques générales.

Ne pas afficher les fonctionnalités administratives aux utilisateurs ordinaires.

---

# 6. PAGE D'ACCUEIL

La page d'accueil doit être une véritable page de présentation produit, et non un simple écran de connexion.

## Section 1 : Header

Créer une barre de navigation élégante avec :

À gauche :
- Logo DevBridge.
- Nom DevBridge.

Au centre :
- Accueil.
- Explorer.
- Développeurs.
- Comment ça marche.

À droite :
- Connexion.
- Bouton « Rejoindre DevBridge ».

Le header doit être sticky au défilement.

Sur mobile, utiliser un menu compact.

## Section 2 : Hero

Titre principal :

« Les bonnes compétences méritent de se rencontrer. »

Sous-titre :

« Trouve les développeurs qui complètent tes compétences. Échange ton savoir-faire, collabore sur des projets concrets et construisons ensemble l'écosystème technologique africain. »

Deux boutons :

- « Trouver un échange »
- « Découvrir la plateforme »

Ajouter une illustration visuelle représentant plusieurs développeurs reliés par des connexions.

L'illustration doit symboliser les compétences qui se complètent et les collaborations.

Ne pas utiliser de clichés africains ou d'illustrations génériques de personnes avec des ordinateurs.

## Section 3 : Comment ça fonctionne

Présenter trois étapes :

1. Partage tes compétences.
2. Trouve une complémentarité.
3. Échange et réalise quelque chose ensemble.

Chaque étape doit avoir une illustration ou une icône pertinente.

## Section 4 : Exemples d'échanges

Afficher quelques exemples réalistes :

- Flutter contre Python.
- UI/UX contre développement Front-End.
- Déploiement Cloud contre intégration IA.
- React contre développement mobile.

Préciser qu'il s'agit d'exemples d'échanges.

## Section 5 : Découverte des développeurs

Afficher quelques profils de démonstration avec :

- Avatar.
- Nom.
- Pays.
- Compétences.
- Ce qu'ils proposent.
- Ce qu'ils recherchent.

## Section 6 : Appel à l'action

Titre :

« Tu as des compétences. Quelqu'un en a besoin. »

Bouton :

« Rejoindre la communauté »

## Section 7 : Footer

Inclure :

- Logo.
- Description.
- Navigation.
- Contact.
- Réseaux sociaux.
- Conditions d'utilisation.
- Politique de confidentialité.
- Copyright.

---

# 7. AUTHENTIFICATION ET INSCRIPTION

Mettre en place une authentification réelle.

Utiliser Supabase Auth.

## Inscription

Champs :

- Prénom.
- Nom.
- Adresse e-mail.
- Mot de passe.
- Confirmation du mot de passe.
- Pays.
- Acceptation des conditions.

Prévoir :

- Validation des champs.
- Vérification de l'adresse e-mail.
- Gestion des erreurs.
- Indicateur de chargement.
- Confirmation d'inscription.

## Connexion

Champs :

- Adresse e-mail.
- Mot de passe.

Prévoir :

- Mot de passe oublié.
- Réinitialisation.
- Gestion des sessions.
- Déconnexion.
- Protection des pages privées.

Ne jamais stocker les mots de passe en clair.

## Profil après inscription

Après création du compte, proposer un onboarding progressif.

Étapes :

1. Informations personnelles.
2. Pays et localisation.
3. Présentation.
4. Compétences.
5. Technologies maîtrisées.
6. Compétences recherchées.
7. Disponibilités.
8. Liens professionnels.

L'utilisateur doit pouvoir passer certaines étapes non obligatoires et compléter son profil plus tard.

---

# 8. PROFIL DÉVELOPPEUR

Créer une page de profil professionnelle.

Chaque profil contient :

## Informations personnelles

- Photo ou avatar.
- Nom complet.
- Nom d'utilisateur.
- Pays.
- Ville facultative.
- Biographie.
- Niveau d'expérience.
- Domaine principal.
- Langues parlées.
- Disponibilité.
- Date d'inscription.

## Compétences proposées

Exemples :

- Python.
- JavaScript.
- TypeScript.
- React.
- Flutter.
- Django.
- Node.js.
- Machine Learning.
- Data Engineering.
- UI/UX Design.
- DevOps.
- Cybersécurité.

Chaque compétence peut avoir un niveau déclaré :

- Débutant.
- Intermédiaire.
- Avancé.
- Expert.

Ne pas présenter un niveau déclaré comme une certification vérifiée.

## Compétences recherchées

Afficher les domaines dans lesquels le développeur souhaite progresser ou recevoir de l'aide.

## Activité

Créer une section appelée :

« Mon parcours de collaboration »

Afficher :

- Échanges terminés.
- Collaborations en cours.
- Contributions réalisées.
- Compétences partagées.
- Personnes aidées.
- Projets auxquels il a participé.

Créer une visualisation annuelle ou mensuelle de l'activité, inspirée des calendriers de contributions GitHub, mais adaptée aux échanges.

Chaque case représente une activité ou contribution réellement enregistrée.

## Liens externes

- GitHub.
- Portfolio.
- LinkedIn.
- Site personnel.

Ne pas inventer de vérification des comptes externes.

---

# 9. CŒUR DU PRODUIT : LE SYSTÈME D'ÉCHANGE

C'est la fonctionnalité la plus importante.

Elle doit être particulièrement soignée.

Créer une section intitulée :

« Explorer les échanges »

L'utilisateur doit pouvoir découvrir des offres, des demandes et des opportunités de collaboration.

## Types d'échanges

Prévoir trois catégories :

### A. Échange réciproque

Deux développeurs mettent leurs compétences en commun.

Exemple :

- Personne A propose du développement Flutter.
- Personne A recherche de l'aide en Python.
- Personne B propose Python.
- Personne B recherche Flutter.

Le système identifie une correspondance.

### B. Aide ponctuelle

Un développeur propose une compétence pour aider une autre personne sur une tâche précise.

Exemple :

« Je peux vous aider à configurer votre pipeline CI/CD. »

### C. Mentorat et apprentissage

Un développeur expérimenté propose d'accompagner un autre développeur sur une technologie ou un sujet.

Exemple :

« Je propose deux séances pour vous apprendre les bases de Docker. »

## Création d'une proposition

Créer un formulaire complet.

Champs :

- Titre.
- Description.
- Type d'échange.
- Compétence proposée.
- Compétence recherchée.
- Technologies concernées.
- Niveau souhaité.
- Type de collaboration.
- Durée estimée.
- Disponibilités.
- Langue.
- Pays.
- Liens facultatifs.
- Conditions particulières.

Types de collaboration :

- À distance.
- En présentiel.
- Hybride.

Durées :

- Moins d'une heure.
- Quelques heures.
- Quelques jours.
- Plusieurs semaines.

Ajouter une prévisualisation avant publication.

## Filtres de recherche

Permettre de filtrer par :

- Compétence.
- Technologie.
- Pays.
- Langue.
- Type d'échange.
- Niveau.
- Disponibilité.
- Date de publication.

Ajouter une recherche textuelle.

## Cartes d'échange

Chaque carte doit afficher :

- Auteur.
- Pays.
- Titre.
- Compétences proposées.
- Compétences recherchées.
- Type d'échange.
- Disponibilité.
- Date de publication.
- Bouton « Voir les détails ».
- Bouton « Proposer un échange ».

Les cartes doivent être élégantes et compactes.

---

# 10. SYSTÈME DE CORRESPONDANCE INTELLIGENTE

Créer un moteur de matching.

Il s'agit de l'une des fonctionnalités différenciantes de DevBridge.

Le système doit analyser :

- Les compétences proposées par l'utilisateur A.
- Les compétences recherchées par A.
- Les compétences proposées par B.
- Les compétences recherchées par B.
- Les disponibilités.
- Les langues.
- Le type de collaboration.
- Les préférences de travail.

## Logique de correspondance

Exemple :

Utilisateur A :

- Propose : Flutter.
- Recherche : Python.

Utilisateur B :

- Propose : Python.
- Recherche : Flutter.

Résultat : correspondance réciproque forte.

Autre exemple :

Utilisateur A :

- Propose : React.
- Recherche : UI/UX.

Utilisateur B :

- Propose : UI/UX.
- Recherche : React.

Résultat : correspondance réciproque.

## Score de correspondance

Créer un score explicable sur 100.

Exemple de pondération :

- Complémentarité des compétences : 50 points.
- Compatibilité des disponibilités : 20 points.
- Compatibilité linguistique : 15 points.
- Type de collaboration : 10 points.
- Proximité géographique facultative : 5 points.

Le score doit être calculé côté serveur.

Ne pas présenter ce score comme une mesure scientifique de compatibilité.

Afficher les raisons de la recommandation :

« Cette personne recherche précisément une compétence que tu proposes. »

« Vous avez des disponibilités compatibles. »

« Vous partagez une langue de travail. »

## Interface de matching

Créer une page « Pour toi ».

Afficher :

- Les meilleures correspondances.
- Le pourcentage de compatibilité.
- Les raisons de la correspondance.
- Les compétences complémentaires.
- Un bouton pour consulter le profil.
- Un bouton pour proposer un échange.

Prévoir un état vide si aucune correspondance n'est disponible.

---

# 11. PROCESSUS DE PROPOSITION ET D'ACCEPTATION

Le processus doit être parfaitement fonctionnel.

Lorsqu'un utilisateur trouve une proposition intéressante :

1. Il clique sur « Proposer un échange ».
2. Il consulte les compétences proposées par l'autre personne.
3. Il choisit ce qu'il peut apporter.
4. Il précise ce qu'il recherche.
5. Il écrit un message de présentation.
6. Il envoie sa proposition.

Le destinataire reçoit une notification.

Il peut :

- Accepter.
- Refuser.
- Demander une modification.

Lorsque les deux parties acceptent, créer un échange actif.

Ne jamais créer automatiquement une collaboration sans consentement des deux utilisateurs.

## États d'une proposition

- En attente.
- Acceptée.
- Refusée.
- Modification demandée.
- Annulée.

---

# 12. ESPACE DE COLLABORATION

Lorsqu'un échange est accepté, créer un espace dédié.

Chaque collaboration doit disposer de :

- Un titre.
- Une description.
- Les participants.
- Les objectifs.
- Les compétences échangées.
- Les tâches.
- Les livrables.
- Une messagerie.
- Une date de création.
- Un statut.

## Gestion des tâches

Chaque participant peut créer une tâche.

Une tâche contient :

- Titre.
- Description.
- Responsable.
- Date limite facultative.
- Priorité.
- Statut.
- Liens et pièces jointes facultatifs.

Statuts :

- À faire.
- En cours.
- En révision.
- Terminée.

## Validation des livrables

Lorsqu'un participant termine une tâche :

1. Il marque la tâche comme terminée.
2. Il fournit une description du résultat.
3. Il peut ajouter un lien GitHub ou une pièce jointe.
4. L'autre participant examine le résultat.
5. Il valide ou demande une correction.

L'historique des validations doit être conservé.

Un échange ne peut être considéré comme terminé que lorsque les participants ont validé les livrables prévus.

Prévoir un mécanisme de signalement en cas de désaccord.

---

# 13. MESSAGERIE

Créer une véritable interface de messagerie.

La messagerie doit être moderne, fluide et simple.

## Fonctionnalités

- Liste des conversations.
- Avatar.
- Nom du correspondant.
- Dernier message.
- Date.
- Indicateur de messages non lus.
- Historique de conversation.
- Envoi de messages.
- Horodatage.
- État d'envoi.
- Indicateur de chargement.

Les messages doivent être enregistrés en base de données.

Utiliser les fonctionnalités temps réel de Supabase si elles sont disponibles et correctement configurées.

La messagerie ne doit pas être une simple interface décorative.

Les utilisateurs doivent pouvoir communiquer après une proposition ou dans le cadre d'une collaboration.

Prévoir les états :

- Chargement.
- Aucune conversation.
- Erreur d'envoi.
- Conversation active.

---

# 14. NOTIFICATIONS

Créer un système de notifications.

Types :

- Nouvelle proposition reçue.
- Proposition acceptée.
- Proposition refusée.
- Modification demandée.
- Nouveau message.
- Nouvelle correspondance.
- Tâche assignée.
- Tâche terminée.
- Livrable à valider.
- Collaboration terminée.

Afficher :

- Badge de notifications non lues.
- Liste des notifications.
- Date.
- Type.
- Lien vers l'élément concerné.
- Marquer comme lu.
- Tout marquer comme lu.

Les notifications doivent être persistées.

---

# 15. TABLEAU DE BORD

Créer un dashboard personnalisé.

Le dashboard doit donner une vue immédiate de l'activité de l'utilisateur.

## En-tête

Afficher :

« Bonjour, [Prénom] »

Sous-titre :

« Voici ce qui se passe dans ton espace DevBridge. »

## Statistiques

Afficher :

- Échanges actifs.
- Propositions reçues.
- Échanges terminés.
- Correspondances disponibles.

Les statistiques doivent provenir de la base de données.

## Section : Tes meilleures correspondances

Présenter trois à cinq développeurs complémentaires.

## Section : Tes échanges en cours

Afficher les collaborations actives avec leur progression.

## Section : Activité récente

Afficher les événements récents.

## Section : Compléter mon profil

Afficher un indicateur de complétion du profil.

Ne pas afficher de statistiques inventées.

---

# 16. RECHERCHE DE DÉVELOPPEURS

Créer un espace permettant de découvrir les développeurs de la plateforme.

Chaque résultat présente :

- Photo.
- Nom.
- Pays.
- Biographie courte.
- Compétences principales.
- Compétences recherchées.
- Disponibilité.
- Bouton « Voir le profil ».
- Bouton « Proposer un échange ».

Filtres :

- Pays.
- Technologies.
- Domaine.
- Expérience.
- Langue.
- Disponibilité.

La recherche doit être réelle et connectée à la base de données.

---

# 17. ESPACE PERSONNEL

Créer une page « Mes échanges ».

Organiser les propositions et collaborations en plusieurs onglets :

- Reçus.
- Envoyés.
- En attente.
- En cours.
- Terminés.
- Refusés.

Chaque élément doit permettre d'accéder aux détails.

Ajouter une recherche et des filtres.

---

# 18. SYSTÈME DE RÉPUTATION

La réputation ne doit pas dépendre du nombre de publications ou de likes.

Elle doit refléter des réalisations vérifiables.

Créer des indicateurs :

- Échanges terminés.
- Tâches validées.
- Collaborations réalisées.
- Personnes accompagnées.
- Contributions acceptées.

Prévoir des évaluations après une collaboration.

Chaque participant peut évaluer :

- La communication.
- Le respect des engagements.
- La qualité du travail.
- La collaboration générale.

Ajouter un commentaire facultatif.

Éviter les classements agressifs ou les mécanismes de popularité.

Ne pas permettre à un utilisateur d'évaluer quelqu'un avec qui il n'a pas collaboré.

Prévoir des protections contre les faux échanges et les évaluations abusives.

---

# 19. ADMINISTRATION

Créer une interface d'administration sécurisée.

Seuls les administrateurs autorisés peuvent y accéder.

## Dashboard administrateur

Afficher les statistiques réelles :

- Nombre d'utilisateurs.
- Nombre de propositions.
- Nombre d'échanges actifs.
- Nombre d'échanges terminés.
- Nombre de signalements.

## Gestion des utilisateurs

- Consulter les profils.
- Suspendre un compte.
- Réactiver un compte.
- Consulter les signalements.

## Modération

- Examiner les propositions signalées.
- Supprimer les contenus non conformes.
- Traiter les abus.
- Conserver un historique des actions.

Ne jamais attribuer le rôle administrateur à un utilisateur par simple modification d'un champ accessible côté client.

---

# 20. BASE DE DONNÉES

Utiliser Supabase avec PostgreSQL.

Concevoir une base relationnelle cohérente.

Tables minimales :

### profiles

- id
- username
- first_name
- last_name
- avatar_url
- country
- city
- bio
- experience_level
- languages
- github_url
- portfolio_url
- linkedin_url
- availability
- profile_completion
- created_at
- updated_at

### skills

- id
- name
- category
- description

### user_skills

- id
- user_id
- skill_id
- skill_level
- skill_type
- created_at

skill_type doit distinguer les compétences proposées des compétences recherchées.

### exchange_offers

- id
- user_id
- title
- description
- exchange_type
- proposed_skills
- requested_skills
- collaboration_type
- estimated_duration
- availability
- language
- status
- created_at
- updated_at

### exchange_proposals

- id
- offer_id
- sender_id
- receiver_id
- message
- proposed_contribution
- requested_contribution
- status
- created_at
- updated_at

### matches

- id
- user_a
- user_b
- compatibility_score
- match_reasons
- status
- created_at

### collaborations

- id
- proposal_id
- title
- description
- status
- start_date
- end_date
- created_at

### collaboration_members

- id
- collaboration_id
- user_id
- role

### tasks

- id
- collaboration_id
- title
- description
- assigned_to
- status
- priority
- due_date
- created_at
- updated_at

### deliverables

- id
- task_id
- submitted_by
- description
- external_url
- attachment_url
- validation_status
- reviewed_by
- created_at

### conversations

- id
- collaboration_id
- created_at

### conversation_members

- id
- conversation_id
- user_id

### messages

- id
- conversation_id
- sender_id
- content
- read_at
- created_at

### notifications

- id
- user_id
- type
- title
- content
- related_entity_id
- is_read
- created_at

### reviews

- id
- collaboration_id
- reviewer_id
- reviewed_user_id
- communication_rating
- reliability_rating
- quality_rating
- comment
- created_at

### reports

- id
- reporter_id
- reported_user_id
- reason
- description
- status
- created_at

### activity_logs

- id
- user_id
- event_type
- entity_type
- entity_id
- metadata
- created_at

Adapter les types, relations, index et contraintes en fonction de l'architecture réellement retenue.

Créer des migrations SQL propres et versionnées.

Ne pas stocker les compétences sous forme de texte libre lorsqu'une relation normalisée est nécessaire.

---

# 21. SÉCURITÉ

La sécurité est obligatoire.

Mettre en place :

- Row Level Security sur les tables Supabase.
- Contrôle des accès côté serveur.
- Validation des données.
- Protection contre les accès non autorisés.
- Protection des informations personnelles.
- Gestion des sessions.
- Contrôle des fichiers envoyés.
- Limitation des abus.
- Vérification des rôles.
- Protection des routes privées.

Règles importantes :

Un utilisateur ne peut modifier que son propre profil.

Un utilisateur ne peut consulter que les conversations dont il est membre.

Un utilisateur ne peut modifier que les tâches auxquelles il est autorisé à accéder.

Un utilisateur ne peut valider que les livrables qui lui sont destinés.

Les administrateurs disposent de permissions spécifiques.

Ne jamais exposer les clés secrètes Supabase dans le frontend.

Ne jamais faire confiance aux données envoyées par le navigateur pour les opérations sensibles.

---

# 22. STACK TECHNIQUE

Privilégier une architecture simple et maintenable.

Stack recommandée :

### Frontend

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Lucide Icons.
- React Hook Form.
- Zod.

### Backend et données

- Supabase.
- PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- Supabase Realtime lorsque pertinent.

### Déploiement

- Vercel pour l'application.
- Supabase pour la base de données et les services backend.

### Qualité

- ESLint.
- TypeScript strict.
- Tests unitaires sur les fonctions importantes.
- Tests des parcours critiques.
- Gestion centralisée des erreurs.

Utiliser des versions stables et compatibles.

Avant de choisir une bibliothèque supplémentaire, vérifier qu'elle est réellement nécessaire.

Ne pas multiplier les dépendances.

---

# 23. EXPÉRIENCE UTILISATEUR ET DÉTAILS D'INTERFACE

Chaque fonctionnalité doit avoir ses états :

- Chargement.
- Succès.
- Erreur.
- État vide.
- Données indisponibles.

Ajouter des skeleton loaders sur les pages qui chargent des données.

Utiliser des toasts pour confirmer les actions.

Prévoir des dialogues de confirmation avant les opérations importantes.

Les formulaires doivent avoir :

- Des labels explicites.
- Des messages d'erreur utiles.
- Une validation cohérente.
- Des états de soumission.
- Une protection contre les doubles soumissions.

Les boutons doivent avoir un comportement réel.

Ne créer aucun bouton décoratif.

Aucune route ne doit mener vers une page vide.

Aucun lien ne doit pointer vers une destination inexistante.

---

# 24. CONTENU ET LOCALISATION AFRICAINE

DevBridge doit être pensé pour un public africain diversifié.

Prévoir dès la conception :

- Le français comme langue principale.
- Une architecture compatible avec une future version anglaise.
- La sélection du pays.
- Des fuseaux horaires.
- Des disponibilités exprimées dans le fuseau local.
- Des connexions parfois lentes.
- Une interface légère.
- Une bonne expérience sur smartphone.

Ne pas réduire l'Afrique à quelques pays.

Prévoir une liste de pays africains extensible.

Éviter de présumer que tous les développeurs ont accès à des ordinateurs puissants ou à une connexion permanente.

---

# 25. DONNÉES DE DÉMONSTRATION

Créer des données de démonstration réalistes.

Exemples de développeurs :

- Kodjo — Togo — Flutter, Dart — recherche Python et IA.
- Amina — Sénégal — Python, Machine Learning — recherche Flutter.
- Kwame — Ghana — React, Node.js — recherche UI/UX.
- Chisom — Nigeria — UI/UX, Figma — recherche React.
- Youssef — Maroc — DevOps, Docker — recherche Backend.

Créer plusieurs propositions cohérentes.

Créer au moins deux exemples de correspondances réciproques.

Créer des collaborations avec différentes situations :

- Une en attente.
- Une active.
- Une terminée.

Les données de démonstration doivent être clairement identifiées comme telles.

Ne jamais présenter des utilisateurs fictifs comme de véritables membres inscrits.

Prévoir un moyen simple de réinitialiser les données de démonstration.

---

# 26. FONCTIONNALITÉS À NE PAS DÉVELOPPER DANS LE MVP

Ne pas disperser le développement dans des fonctionnalités secondaires.

Pour la première version, ne pas développer :

- Un réseau social complet.
- Un fil d'actualité avec likes.
- Un système de paiement.
- Une cryptomonnaie.
- Une économie de tokens.
- Une visioconférence intégrée.
- Une application mobile native.
- Un système complexe d'intelligence artificielle.
- Un moteur de recherche sémantique coûteux.
- Un système de gamification avancé.

Ces fonctionnalités pourront être envisagées après validation du produit.

---

# 27. INTÉGRATION SYSTALINK ET EXIGENCES DE LA CADEV

Le projet est développé dans le cadre du Systalink Challenge / Coupe d'Afrique des Développeurs 2026.

Avant le développement final :

1. Examiner les consignes officielles de la compétition.
2. Identifier précisément les fonctionnalités attendues de Systalink.
3. Examiner la documentation et les possibilités d'intégration du produit Systalink.
4. Identifier les livrables obligatoires.
5. Respecter les règles de soumission.
6. Prévoir un dépôt Git et une démonstration hébergée en ligne.

Le dashboard de compétition indique notamment une étape obligatoire intitulée « Produit Systalink actif ».

Tu dois vérifier les conditions exactes de cette étape.

Ne pas inventer une API ou une intégration Systalink.

Ne pas simuler une activation si elle n'existe pas.

Si une intégration officielle est requise, utiliser uniquement les mécanismes documentés.

Si une information manque, signaler précisément ce qui doit être fourni.

---

# 28. PLAN DE DÉVELOPPEMENT PRIORITAIRE

La date limite de la compétition est le 15 novembre 2026.

La priorité absolue est de livrer un produit utilisable, cohérent et démontrable.

Organiser le développement par phases.

## PHASE 1 — Fondation

- Examiner le projet existant.
- Vérifier les dépendances.
- Mettre en place l'architecture.
- Configurer Supabase.
- Créer les tables.
- Configurer les permissions.
- Mettre en place l'authentification.
- Créer les profils.

## PHASE 2 — Fonctionnalités centrales

- Créer les propositions d'échange.
- Créer les filtres.
- Développer le moteur de matching.
- Afficher les correspondances.
- Envoyer et recevoir des propositions.
- Accepter ou refuser une proposition.

## PHASE 3 — Collaboration

- Créer les espaces de collaboration.
- Ajouter les tâches.
- Ajouter les livrables.
- Mettre en place les validations.
- Ajouter la messagerie.
- Ajouter les notifications essentielles.

## PHASE 4 — Finition

- Créer le dashboard.
- Finaliser les profils.
- Ajouter les statistiques réelles.
- Améliorer le responsive.
- Ajouter les états de chargement.
- Corriger les erreurs.
- Tester tous les parcours.

## PHASE 5 — Livraison

- Vérifier la configuration de production.
- Déployer.
- Tester le site hébergé.
- Préparer les données de démonstration.
- Préparer le dépôt Git.
- Préparer une présentation du produit.

Si le temps manque, prioriser dans cet ordre :

1. Inscription et profils.
2. Publication d'offres et demandes.
3. Matching réciproque.
4. Propositions et acceptation.
5. Collaboration et suivi des tâches.
6. Présentation et démonstration.

La messagerie complète, les évaluations et les fonctionnalités administratives avancées peuvent être simplifiées si nécessaire.

Ne jamais sacrifier la fiabilité du parcours principal pour ajouter des fonctionnalités secondaires.

---

# 29. PARCOURS DE DÉMONSTRATION POUR LE JURY

La plateforme doit permettre une démonstration claire en moins de trois minutes.

Préparer deux comptes de démonstration :

### Compte A : Kodjo

Pays : Togo.

Compétences proposées :
- Flutter.
- Dart.

Compétences recherchées :
- Python.
- Intelligence artificielle.

### Compte B : Amina

Pays : Sénégal.

Compétences proposées :
- Python.
- Machine Learning.

Compétences recherchées :
- Flutter.
- Dart.

### Démonstration

Étape 1 :

Kodjo se connecte et complète son profil.

Étape 2 :

Il publie une proposition d'échange.

Étape 3 :

Amina se connecte et découvre une correspondance.

Étape 4 :

Elle consulte les raisons du matching.

Étape 5 :

Elle envoie une proposition.

Étape 6 :

Kodjo reçoit la proposition et l'accepte.

Étape 7 :

Une collaboration est créée.

Étape 8 :

Les deux utilisateurs ajoutent des tâches.

Étape 9 :

Ils soumettent et valident leurs livrables.

Étape 10 :

La collaboration est terminée et leurs profils enregistrent les réalisations.

Le jury doit comprendre en quelques instants ce que DevBridge apporte de différent.

---

# 30. EXIGENCES DE QUALITÉ

Le résultat final doit respecter les exigences suivantes :

- Aucune page vide.
- Aucun bouton sans action.
- Aucun faux formulaire.
- Aucune donnée importante uniquement codée en dur.
- Aucune erreur TypeScript bloquante.
- Aucune clé secrète exposée.
- Aucune route privée accessible sans autorisation.
- Aucun composant visuellement incohérent.
- Aucune interface qui déborde sur mobile.
- Aucun formulaire qui perd silencieusement ses données.
- Aucun matching présenté sans explication.
- Aucune collaboration créée sans consentement.
- Aucun échange terminé sans validation des livrables prévus.

Tester les principaux parcours avec deux utilisateurs différents.

Vérifier les permissions de chaque utilisateur.

Tester les états vides, les erreurs réseau et les chargements.

Vérifier le fonctionnement sur le site déployé et pas seulement en local.

---

# 31. MÉTHODE DE TRAVAIL ATTENDUE DE L'AGENT IA

Ne commence pas par générer tous les fichiers immédiatement.

Procède intelligemment.

### Étape A — Audit

Examine le projet existant :

- Arborescence.
- Dépendances.
- Configuration.
- Routes.
- Composants.
- Base de données.
- Variables d'environnement.

Si un projet existe déjà, conserve les éléments fonctionnels et évite les réécritures inutiles.

### Étape B — Architecture

Présente une architecture claire.

Définis les entités, les relations et les principaux parcours.

### Étape C — Développement

Développe fonctionnalité par fonctionnalité.

Après chaque grande fonctionnalité :

- Vérifie le code.
- Vérifie les types.
- Vérifie les permissions.
- Teste le parcours utilisateur.
- Corrige les problèmes.

### Étape D — Design

Ne te contente pas d'un dashboard générique.

Crée une identité visuelle cohérente et reconnaissable.

Travaille chaque écran avec attention.

### Étape E — Livraison

À la fin, fournis :

- L'architecture finale.
- Les fonctionnalités terminées.
- Les fonctionnalités non terminées.
- Les instructions d'installation.
- Le fichier `.env.example`.
- Les migrations SQL.
- Les instructions Supabase.
- Les instructions de déploiement.
- Le lien du site déployé.
- Les identifiants des comptes de démonstration.
- Une liste des tests effectués.

Ne prétends jamais qu'une fonctionnalité est terminée si elle n'a pas été testée.

Si une configuration nécessite une intervention humaine, indique exactement laquelle.

---

# 32. CRITÈRE FINAL DE RÉUSSITE

DevBridge doit donner l'impression d'un véritable produit technologique, et non d'un projet scolaire assemblé à la dernière minute.

Un utilisateur doit pouvoir :

1. Créer un compte.
2. Présenter ses compétences.
3. Expliquer ce qu'il recherche.
4. Découvrir des développeurs complémentaires.
5. Recevoir une proposition de correspondance.
6. Accepter un échange.
7. Collaborer sur des tâches.
8. Soumettre des livrables.
9. Valider le travail réalisé.
10. Construire progressivement un historique de collaborations.

Le produit doit incarner le thème de la CADEV 2026 :

**« Construire la plateforme d'échange africaine, pour les devs, par les devs. »**

Ne cherche pas à créer le plus grand nombre de fonctionnalités possible.

Cherche à créer une expérience cohérente, utile, fiable et mémorable.

La question à laquelle chaque fonctionnalité doit répondre est :

**Comment cette fonctionnalité facilite-t-elle un échange concret entre développeurs africains ?**

Si elle ne répond pas à cette question, elle n'est probablement pas prioritaire.

Commence maintenant par l'audit du projet et la proposition de l'architecture. Ensuite, développe le MVP complet sans attendre une validation après chaque petit fichier, tout en signalant les décisions importantes et les blocages réels.