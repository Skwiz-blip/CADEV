import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { PROPOSAL_STATUS } from "@/lib/labels";
import type { ProposalItem, ProposalStatus } from "@/lib/types";
import { fullName, timeAgo } from "@/lib/utils";
import { Avatar, Badge, DemoBadge, SkillList, type BadgeTone } from "../ui/primitives";

export const PROPOSAL_TONES: Record<ProposalStatus, BadgeTone> = {
  pending: "warm",
  accepted: "ok",
  declined: "danger",
  changes_requested: "brand",
  cancelled: "neutral",
};

export function ProposalRow({ item }: { item: ProposalItem }) {
  const sent = item.direction === "sent";
  const other = sent ? item.receiver : item.sender;
  const needsMe = (!sent && item.status === "pending") || (sent && item.status === "changes_requested");

  return (
    <Link
      href={`/propositions/${item.id}`}
      className="block rounded-2xl bg-surface p-5 shadow-card transition-shadow hover:shadow-lift sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={PROPOSAL_TONES[item.status]}>{PROPOSAL_STATUS[item.status]}</Badge>
        <Badge>
          {sent ? <ArrowUpRight aria-hidden /> : <ArrowDownLeft aria-hidden />}
          {sent ? "Envoyée" : "Reçue"}
        </Badge>
        {needsMe ? <Badge tone="dark">À toi de répondre</Badge> : null}
        <span className="ml-auto text-xs text-faint">{timeAgo(item.updated_at)}</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Avatar person={other} />
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <span className="truncate">{fullName(other)}</span>
            {other?.is_demo ? <DemoBadge /> : null}
          </p>
          <p className="truncate text-sm text-muted">
            {item.offer ? `En réponse à « ${item.offer.title} »` : "Prise de contact directe"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-faint">{sent ? "Tu apportes" : `${other?.first_name ?? "Elle"} apporte`}</p>
          <SkillList skills={item.offered} tone="offer" max={4} empty="Rien de précisé" />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-faint">{sent ? "Tu attends" : "Attend de toi"}</p>
          <SkillList skills={item.requested} tone="want" max={4} empty="Rien de précisé" />
        </div>
      </div>
    </Link>
  );
}
