import { ArrowLeftRight, BadgeCheck, Flag, Handshake, Megaphone, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DemoDataCard } from "@/components/admin/admin-client";
import { AdminStat } from "@/components/admin/admin-parts";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { getAdminOverview, requireAdmin } from "@/lib/api";
import { ADMIN_ACTIONS } from "@/lib/labels";
import { fullName, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Vue d'ensemble" };

// La remise à zéro de la démonstration enchaîne beaucoup d'appels : on lui laisse une minute.
export const maxDuration = 60;

export default async function AdminHomePage() {
  await requireAdmin();
  const data = await getAdminOverview();
  const demoAvailable = Boolean(
    (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY) && process.env.DEMO_PASSWORD,
  );

  return (
    <div className="space-y-8">
      <section aria-label="Chiffres de la plateforme" className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <AdminStat
          icon={Users}
          label="Utilisateurs"
          value={data.users_total}
          detail={`${data.users_new_7d} cette semaine · ${data.users_suspended} suspendu${data.users_suspended > 1 ? "s" : ""}`}
        />
        <AdminStat
          icon={Megaphone}
          label="Annonces"
          value={data.offers_total}
          detail={`${data.offers_open} en ligne · ${data.offers_removed} retirée${data.offers_removed > 1 ? "s" : ""}`}
          accent="bg-flow-soft text-flow-strong"
        />
        <AdminStat
          icon={Handshake}
          label="Échanges actifs"
          value={data.collaborations_active}
          detail={`${data.proposals_pending} proposition${data.proposals_pending > 1 ? "s" : ""} en attente`}
          accent="bg-flow-soft text-flow-strong"
        />
        <AdminStat
          icon={BadgeCheck}
          label="Échanges terminés"
          value={data.collaborations_completed}
          detail={`${data.tasks_validated} tâche${data.tasks_validated > 1 ? "s" : ""} validée${data.tasks_validated > 1 ? "s" : ""}`}
          accent="bg-ok-soft text-ok-strong"
        />
        <AdminStat
          icon={Flag}
          label="Signalements à traiter"
          value={data.reports_open}
          detail={`${data.reports_total} au total`}
          accent={data.reports_open ? "bg-danger-soft text-danger-strong" : "bg-field text-muted"}
        />
      </section>

      <DemoDataCard demoProfiles={data.users_demo} available={demoAvailable} />

      <Card>
        <SectionTitle
          title="Historique des actions"
          description="Chaque décision de modération est conservée, avec son auteur et son motif."
          action={
            <Link href="/admin/signalements" className="link text-sm">
              <ArrowLeftRight className="mr-1 inline size-4" aria-hidden />
              Signalements
            </Link>
          }
        />
        {data.recent_actions.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Aucune action de modération pour le moment.</p>
        ) : (
          <ol className="mt-5 space-y-2">
            {data.recent_actions.map((action) => (
              <li key={action.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl bg-canvas px-4 py-3 text-sm">
                <span className="font-semibold text-ink">{ADMIN_ACTIONS[action.action] ?? action.action}</span>
                {action.metadata.title ? <span className="text-ink/80">« {action.metadata.title} »</span> : null}
                {action.reason ? <span className="min-w-0 text-muted">— {action.reason}</span> : null}
                <span className="ml-auto shrink-0 text-xs text-faint">
                  {action.admin ? fullName(action.admin) : "Serveur"} · {timeAgo(action.created_at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
