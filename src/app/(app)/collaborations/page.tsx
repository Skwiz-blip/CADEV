import { Compass, Handshake } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CollaborationRow } from "@/components/collaborations/collab-row";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, LinkTabs, PageHeader } from "@/components/ui/primitives";
import { rpc } from "@/lib/api";
import type { CollaborationItem, CollaborationStatus } from "@/lib/types";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Collaborations" };

const TABS: { key: CollaborationStatus; label: string; param?: string }[] = [
  { key: "active", label: "En cours" },
  { key: "completed", label: "Terminées", param: "terminees" },
  { key: "cancelled", label: "Interrompues", param: "interrompues" },
];

export default async function CollaborationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const requested = firstParam(raw.etat);
  const tab = TABS.find((item) => item.param === requested) ?? TABS[0]!;
  const all = await rpc<CollaborationItem[]>("list_my_collaborations");
  const items = all.filter((item) => item.status === tab.key);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collaborations"
        description="Tes espaces de travail : un par échange accepté, avec ses tâches, ses livrables et sa discussion."
      />
      <LinkTabs
        label="État des collaborations"
        items={TABS.map((item) => ({
          href: item.param ? `/collaborations?etat=${item.param}` : "/collaborations",
          label: item.label,
          count: all.filter((entry) => entry.status === item.key).length,
          active: item.key === tab.key,
        }))}
      />
      {items.length === 0 ? (
        <Card className="p-0 sm:p-0">
          <EmptyState
            icon={Handshake}
            title={
              tab.key === "active"
                ? "Aucune collaboration en cours"
                : tab.key === "completed"
                  ? "Aucune collaboration terminée"
                  : "Aucune collaboration interrompue"
            }
            description={
              tab.key === "active"
                ? "Une collaboration s'ouvre dès qu'une proposition d'échange est acceptée par les deux personnes."
                : "Elles apparaîtront ici."
            }
            action={
              tab.key === "active" ? (
                <Button asChild>
                  <Link href="/pour-toi">
                    <Compass aria-hidden /> Voir mes correspondances
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <CollaborationRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
