import { FlaskConical, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Viewer } from "@/lib/types";
import { Button } from "../ui/button";
import { Progress } from "../ui/primitives";
import { Logo } from "./logo";
import { NotificationBell, SideLink, TabLink, UserMenu } from "./nav-client";

function GroupLabel({ children }: { children: ReactNode }) {
  return <p className="px-3 pb-1.5 pt-5 text-xs font-medium text-faint">{children}</p>;
}

/**
 * Coquille de l'espace connecté : barre latérale sur ordinateur, barre basse
 * sur téléphone. Les compteurs viennent tous de la base.
 */
export function AppShell({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  const { profile } = viewer;
  const suspended = profile.status === "suspended";

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Barre latérale (ordinateur) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-surface px-3 py-5 lg:flex">
        <div className="px-3">
          <Logo href="/tableau-de-bord" />
        </div>
        <nav aria-label="Navigation de l'espace" className="mt-6 flex-1 overflow-y-auto">
          <SideLink href="/tableau-de-bord" label="Tableau de bord" icon="dashboard" />
          <SideLink href="/pour-toi" label="Pour toi" icon="matches" />
          <SideLink href="/explorer" label="Explorer les échanges" icon="explore" also={["/annonces"]} />
          <SideLink href="/developpeurs" label="Trouver des développeurs" icon="developers" />
          <GroupLabel>Mon activité</GroupLabel>
          <SideLink
            href="/mes-echanges"
            label="Mes échanges"
            icon="exchanges"
            count={viewer.pending_proposals}
            also={["/propositions"]}
          />
          <SideLink href="/collaborations" label="Collaborations" icon="collaborations" />
          <SideLink href="/mes-annonces" label="Mes annonces" icon="offers" />
          <SideLink href="/messages" label="Messagerie" icon="messages" count={viewer.unread_messages} />
          <GroupLabel>Mon compte</GroupLabel>
          <SideLink href="/profil" label="Mon profil" icon="profile" />
          <SideLink href="/competences" label="Mes compétences" icon="skills" />
          <SideLink href="/notifications" label="Notifications" icon="notifications" count={viewer.unread_notifications} />
          <SideLink href="/parametres" label="Paramètres" icon="settings" />
          {viewer.is_admin ? (
            <>
              <GroupLabel>Administration</GroupLabel>
              <SideLink href="/admin" label="Administration" icon="admin" />
            </>
          ) : null}
        </nav>
        {profile.profile_completion < 100 ? (
          <Link
            href="/profil/modifier"
            className="mt-4 block rounded-2xl bg-canvas p-4 transition-colors hover:bg-field"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink">Profil complété</span>
              <span className="font-semibold tabular-nums text-ink">{profile.profile_completion} %</span>
            </div>
            <Progress value={profile.profile_completion} tone="flow" label="Complétion du profil" className="mt-2.5" />
            <p className="mt-2.5 text-xs text-muted">Un profil complet reçoit de meilleures correspondances.</p>
          </Link>
        ) : null}
      </aside>

      <div className="lg:pl-64">
        {/* Barre du haut */}
        <header className="no-print sticky top-0 z-20 bg-canvas/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6 lg:px-8">
            <div className="lg:hidden">
              <Logo href="/tableau-de-bord" />
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/annonces/nouvelle">
                  <Plus aria-hidden /> Publier une annonce
                </Link>
              </Button>
              <Button asChild size="icon" className="sm:hidden" aria-label="Publier une annonce">
                <Link href="/annonces/nouvelle">
                  <Plus aria-hidden />
                </Link>
              </Button>
              <NotificationBell userId={profile.id} unread={viewer.unread_notifications} />
              <UserMenu person={profile} isAdmin={viewer.is_admin} />
            </div>
          </div>
        </header>

        {profile.is_demo ? (
          <div data-demo-banner className="no-print mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="flex items-center gap-2.5 rounded-2xl bg-warm-soft px-4 py-3 text-sm text-warm-strong">
              <FlaskConical className="size-4 shrink-0" aria-hidden />
              <span>
                <strong className="font-semibold">Compte de démonstration.</strong>{" "}
                <span className="text-ink">Les profils marqués « Démo » sont fictifs.</span>
              </span>
            </p>
          </div>
        ) : null}

        {suspended ? (
          <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6 lg:px-8">
            <p className="flex items-start gap-2.5 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-strong">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <strong className="font-semibold">Ton compte est suspendu.</strong>{" "}
                <span className="text-ink">
                  Tu peux consulter ton espace, mais plus publier, proposer ni écrire. Le motif figure dans tes notifications.
                </span>
              </span>
            </p>
          </div>
        ) : null}

        <main id="contenu" className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-16">
          {children}
        </main>
      </div>

      {/* Barre basse (téléphone) */}
      <nav
        aria-label="Navigation principale"
        className="no-print fixed inset-x-0 bottom-0 z-30 flex bg-surface px-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_-20px_rgb(16_27_54/0.35)] lg:hidden"
      >
        <TabLink href="/tableau-de-bord" label="Accueil" icon="dashboard" />
        <TabLink href="/explorer" label="Explorer" icon="explore" also={["/annonces", "/developpeurs"]} />
        <TabLink href="/pour-toi" label="Pour toi" icon="matches" />
        <TabLink
          href="/mes-echanges"
          label="Échanges"
          icon="exchanges"
          count={viewer.pending_proposals}
          also={["/propositions", "/collaborations"]}
        />
        <TabLink href="/messages" label="Messages" icon="messages" count={viewer.unread_messages} />
      </nav>
    </div>
  );
}
