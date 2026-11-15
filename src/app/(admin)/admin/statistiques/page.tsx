import { MessageSquare, Send, Star, UserRoundX } from "lucide-react";
import type { Metadata } from "next";
import { AdminStat, BarList, ColumnChart } from "@/components/admin/admin-parts";
import { getAdminOverview, requireAdmin } from "@/lib/api";
import { countryName } from "@/lib/data/countries";
import { EXCHANGE_TYPES } from "@/lib/labels";
import type { ExchangeType } from "@/lib/types";
import { formatDateShort } from "@/lib/utils";

export const metadata: Metadata = { title: "Statistiques" };

export default async function AdminStatsPage() {
  await requireAdmin();
  const data = await getAdminOverview();
  const acceptance =
    data.proposals_total > 0
      ? Math.round(((data.collaborations_active + data.collaborations_completed + data.collaborations_cancelled) / data.proposals_total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Tous les chiffres sont lus dans la base au moment de l&apos;affichage. Les profils de démonstration sont
        comptés ({data.users_demo}).
      </p>
      <section aria-label="Activité" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminStat icon={Send} label="Propositions envoyées" value={data.proposals_total} detail={`${acceptance} % ont abouti à un échange`} />
        <AdminStat icon={MessageSquare} label="Messages échangés" value={data.messages_total} accent="bg-flow-soft text-flow-strong" />
        <AdminStat icon={Star} label="Évaluations" value={data.reviews_total} accent="bg-warm-soft text-warm-strong" />
        <AdminStat icon={UserRoundX} label="Échanges interrompus" value={data.collaborations_cancelled} accent="bg-field text-muted" />
      </section>

      <ColumnChart
        title="Inscriptions par semaine"
        rows={data.signups_by_week}
        format={(key) => formatDateShort(key)}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarList title="Membres par pays" rows={data.by_country} format={(key) => countryName(key) ?? "Non renseigné"} />
        <BarList
          title="Annonces par type"
          rows={data.offers_by_type}
          format={(key) => EXCHANGE_TYPES[key as ExchangeType]?.label ?? key}
          tone="bg-flow"
        />
        <BarList title="Compétences les plus proposées" rows={data.top_offered} />
        <BarList
          title="Compétences les plus recherchées"
          rows={data.top_wanted}
          tone="bg-flow"
          empty="Personne n'a encore indiqué ce qu'il recherche."
        />
      </div>
    </div>
  );
}
