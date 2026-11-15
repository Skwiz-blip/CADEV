import { ArrowLeftRight, Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CollaborationRow } from "@/components/collaborations/collab-row";
import { ProposalRow } from "@/components/proposals/proposal-row";
import { FilterBar } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, LinkTabs, PageHeader } from "@/components/ui/primitives";
import { rpc } from "@/lib/api";
import { EXCHANGE_TYPES } from "@/lib/labels";
import type { CollaborationItem, ProposalItem } from "@/lib/types";
import { firstParam, fullName, withParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Mes échanges" };

const TABS = [
  { key: "recus", label: "Reçus" },
  { key: "envoyes", label: "Envoyés" },
  { key: "attente", label: "En attente" },
  { key: "cours", label: "En cours" },
  { key: "termines", label: "Terminés" },
  { key: "refuses", label: "Refusés" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const EMPTY: Record<TabKey, { title: string; text: string }> = {
  recus: { title: "Aucune proposition reçue", text: "Publier une annonce est le meilleur moyen d'en recevoir." },
  envoyes: { title: "Aucune proposition envoyée", text: "Repère une annonce ou une correspondance, et propose un échange." },
  attente: { title: "Rien en attente", text: "Les propositions qui attendent une réponse, la tienne ou celle de l'autre, apparaissent ici." },
  cours: { title: "Aucun échange en cours", text: "Un échange démarre dès qu'une proposition est acceptée." },
  termines: { title: "Aucun échange terminé", text: "Tes échanges clôturés et validés s'afficheront ici, avec leur attestation." },
  refuses: { title: "Aucune proposition refusée ou annulée", text: "Tant mieux." },
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default async function MyExchangesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const requested = firstParam(raw.onglet);
  const tab: TabKey = TABS.some((item) => item.key === requested) ? (requested as TabKey) : "recus";
  const values = { onglet: tab === "recus" ? undefined : tab, q: firstParam(raw.q), type: firstParam(raw.type) };

  const [proposals, collaborations] = await Promise.all([
    rpc<ProposalItem[]>("list_my_proposals"),
    rpc<CollaborationItem[]>("list_my_collaborations"),
  ]);

  const needle = values.q ? normalize(values.q) : null;
  const matchProposal = (item: ProposalItem) => {
    if (values.type && item.offer?.exchange_type !== values.type) return false;
    if (!needle) return true;
    const other = item.direction === "sent" ? item.receiver : item.sender;
    const text = [fullName(other), item.offer?.title, item.message, ...item.offered.map((s) => s.name), ...item.requested.map((s) => s.name)]
      .filter(Boolean)
      .join(" ");
    return normalize(text).includes(needle);
  };
  const matchCollaboration = (item: CollaborationItem) => {
    if (values.type && item.exchange_type !== values.type) return false;
    if (!needle) return true;
    return normalize(`${item.title} ${fullName(item.partner)}`).includes(needle);
  };

  const groups: Record<TabKey, { proposals: ProposalItem[]; collaborations: CollaborationItem[] }> = {
    recus: { proposals: proposals.filter((item) => item.direction === "received"), collaborations: [] },
    envoyes: { proposals: proposals.filter((item) => item.direction === "sent"), collaborations: [] },
    attente: {
      proposals: proposals.filter((item) => item.status === "pending" || item.status === "changes_requested"),
      collaborations: [],
    },
    cours: { proposals: [], collaborations: collaborations.filter((item) => item.status === "active") },
    termines: { proposals: [], collaborations: collaborations.filter((item) => item.status === "completed") },
    refuses: {
      proposals: proposals.filter((item) => item.status === "declined" || item.status === "cancelled"),
      collaborations: collaborations.filter((item) => item.status === "cancelled"),
    },
  };

  const current = {
    proposals: groups[tab].proposals.filter(matchProposal),
    collaborations: groups[tab].collaborations.filter(matchCollaboration),
  };
  const empty = current.proposals.length + current.collaborations.length === 0;
  const filtered = Boolean(values.q || values.type);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes échanges"
        description="Toutes tes propositions et tes collaborations, de la première prise de contact à l'échange terminé."
      />

      <LinkTabs
        label="État des échanges"
        items={TABS.map((item) => ({
          href: withParams("/mes-echanges", { q: values.q, type: values.type }, { onglet: item.key === "recus" ? undefined : item.key }),
          label: item.label,
          count: groups[item.key].proposals.length + groups[item.key].collaborations.length,
          active: item.key === tab,
        }))}
      />

      <FilterBar
        key={JSON.stringify(values)}
        basePath="/mes-echanges"
        values={values}
        placeholder="Rechercher une personne, une annonce, une compétence…"
        fields={[
          {
            name: "type",
            label: "Type d'échange",
            options: Object.entries(EXCHANGE_TYPES).map(([value, item]) => ({ value, label: item.label })),
          },
        ]}
      />

      {empty ? (
        <Card className="p-0 sm:p-0">
          <EmptyState
            icon={ArrowLeftRight}
            title={filtered ? "Aucun résultat pour cette recherche" : EMPTY[tab].title}
            description={filtered ? "Essaie d'autres mots, ou retire le filtre." : EMPTY[tab].text}
            action={
              filtered ? (
                <Button asChild variant="subtle">
                  <Link href={withParams("/mes-echanges", {}, { onglet: values.onglet })}>Effacer la recherche</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/explorer">
                    <Compass aria-hidden /> Explorer les échanges
                  </Link>
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <ul className="space-y-4">
          {current.collaborations.map((item) => (
            <li key={item.id}>
              <CollaborationRow item={item} />
            </li>
          ))}
          {current.proposals.map((item) => (
            <li key={item.id}>
              <ProposalRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
