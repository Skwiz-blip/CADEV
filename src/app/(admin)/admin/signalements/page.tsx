import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ReportActions } from "@/components/admin/admin-client";
import { Badge, Card, EmptyState, LinkTabs, Pagination, type BadgeTone } from "@/components/ui/primitives";
import { requireAdmin, rpc } from "@/lib/api";
import { REPORT_REASONS, REPORT_STATUS } from "@/lib/labels";
import type { AdminReport, Paginated, ReportStatus } from "@/lib/types";
import { firstParam, formatDate, fullName, timeAgo, withParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Signalements" };

const PAGE_SIZE = 20;
const TONES: Record<ReportStatus, BadgeTone> = {
  open: "danger", in_review: "warm", resolved: "ok", dismissed: "neutral",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const raw = await searchParams;
  const all = firstParam(raw.vue) === "tous";
  const page = Math.max(1, Number(firstParam(raw.page)) || 1);
  const result = await rpc<Paginated<AdminReport>>("admin_list_reports", {
    p_status: all ? null : "pending",
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <div className="space-y-5">
      <LinkTabs
        label="Filtrer les signalements"
        items={[
          { href: "/admin/signalements", label: "À traiter", active: !all, count: all ? undefined : result.total },
          { href: "/admin/signalements?vue=tous", label: "Tous", active: all, count: all ? result.total : undefined },
        ]}
      />

      {result.items.length === 0 ? (
        <Card className="p-0 sm:p-0">
          <EmptyState
            icon={ShieldCheck}
            title={all ? "Aucun signalement" : "Aucun signalement à traiter"}
            description="Les signalements envoyés par les membres arrivent ici, avec le contenu ou la personne concernés."
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {result.items.map((report) => (
            <li key={report.id} className="rounded-2xl bg-surface p-5 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={TONES[report.status]}>{REPORT_STATUS[report.status]}</Badge>
                <Badge>{REPORT_REASONS[report.reason] ?? report.reason}</Badge>
                <span className="ml-auto text-xs text-faint">{timeAgo(report.created_at)}</span>
              </div>
              <p className="prose-user mt-3 text-ink/90">{report.description}</p>

              <dl className="mt-4 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-canvas px-4 py-3">
                  <dt className="text-xs text-muted">Signalé par</dt>
                  <dd className="font-medium text-ink">
                    {report.reporter ? (
                      <Link href={`/developpeurs/${report.reporter.username}`} className="hover:text-brand">
                        {fullName(report.reporter)}
                      </Link>
                    ) : (
                      "Compte supprimé"
                    )}
                  </dd>
                </div>
                <div className="rounded-xl bg-canvas px-4 py-3">
                  <dt className="text-xs text-muted">Personne concernée</dt>
                  <dd className="font-medium text-ink">
                    {report.reported_user ? (
                      <Link href={`/developpeurs/${report.reported_user.username}`} className="hover:text-brand">
                        {fullName(report.reported_user)}
                        {report.reported_user.status === "suspended" ? " · suspendu" : ""}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                {report.offer ? (
                  <div className="rounded-xl bg-canvas px-4 py-3">
                    <dt className="text-xs text-muted">Annonce</dt>
                    <dd className="truncate font-medium text-ink">
                      <Link href={`/annonces/${report.offer.id}`} className="hover:text-brand">
                        {report.offer.title}
                      </Link>
                    </dd>
                  </div>
                ) : null}
                {report.collaboration ? (
                  <div className="rounded-xl bg-canvas px-4 py-3">
                    <dt className="text-xs text-muted">Collaboration</dt>
                    <dd className="truncate font-medium text-ink">
                      <Link href={`/collaborations/${report.collaboration.id}`} className="hover:text-brand">
                        {report.collaboration.title}
                      </Link>
                    </dd>
                  </div>
                ) : null}
              </dl>

              {report.resolution_note ? (
                <p className="mt-4 rounded-xl bg-ok-soft px-4 py-3 text-sm text-ink">
                  <strong className="font-semibold text-ok-strong">
                    {report.status === "dismissed" ? "Classé" : "Décision"}
                    {report.handled_by ? ` par ${fullName(report.handled_by)}` : ""}
                    {report.handled_at ? ` le ${formatDate(report.handled_at)}` : ""} :{" "}
                  </strong>
                  {report.resolution_note}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {report.offer ? (
                    <Link href={`/admin/annonces?q=${encodeURIComponent(report.offer.title)}`} className="link">
                      Modérer l&apos;annonce
                    </Link>
                  ) : null}
                  {report.reported_user ? (
                    <Link href={`/admin/utilisateurs?q=${encodeURIComponent(report.reported_user.username)}`} className="link">
                      Gérer le compte
                    </Link>
                  ) : null}
                </div>
                <ReportActions reportId={report.id} status={report.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={result.total}
        hrefFor={(target) =>
          withParams("/admin/signalements", { vue: all ? "tous" : undefined }, { page: target > 1 ? target : undefined })
        }
      />
    </div>
  );
}
