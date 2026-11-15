import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { UserStatusButton } from "@/components/admin/admin-client";
import { FilterBar } from "@/components/shared/filter-bar";
import { Avatar, Badge, Card, DemoBadge, EmptyState, Pagination } from "@/components/ui/primitives";
import { requireAdmin, rpc } from "@/lib/api";
import { countryName } from "@/lib/data/countries";
import type { AdminUser, Paginated } from "@/lib/types";
import { firstParam, formatDate, fullName, plural, withParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Utilisateurs" };

const PAGE_SIZE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const raw = await searchParams;
  const values = { q: firstParam(raw.q), statut: firstParam(raw.statut) };
  const page = Math.max(1, Number(firstParam(raw.page)) || 1);
  const result = await rpc<Paginated<AdminUser>>("admin_list_users", {
    p_query: values.q ?? null,
    p_status: values.statut ?? null,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <div className="space-y-5">
      <FilterBar
        key={JSON.stringify(values)}
        basePath="/admin/utilisateurs"
        values={values}
        placeholder="Rechercher un nom, un identifiant, une adresse e-mail…"
        fields={[
          {
            name: "statut",
            label: "Statut",
            options: [
              { value: "active", label: "Actifs" },
              { value: "suspended", label: "Suspendus" },
            ],
          },
        ]}
      />
      <p className="text-sm text-muted">{plural(result.total, "compte")}</p>

      {result.items.length === 0 ? (
        <Card className="p-0 sm:p-0">
          <EmptyState icon={Users} title="Aucun compte ne correspond" description="Modifie la recherche ou retire le filtre." />
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {result.items.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl bg-surface p-4 shadow-card sm:px-5"
            >
              <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
                <Avatar person={user} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link href={`/developpeurs/${user.username}`} className="truncate font-semibold text-ink hover:text-brand">
                      {fullName(user)}
                    </Link>
                    {user.is_demo ? <DemoBadge /> : null}
                    {user.is_admin ? <Badge tone="dark">Admin</Badge> : null}
                    {user.status === "suspended" ? <Badge tone="danger">Suspendu</Badge> : null}
                  </p>
                  <p className="truncate text-sm text-muted">{user.email}</p>
                </div>
              </div>
              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <div>
                  <dt className="text-xs text-faint">Pays</dt>
                  <dd className="text-ink">{countryName(user.country) ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Inscription</dt>
                  <dd className="text-ink">{formatDate(user.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Profil</dt>
                  <dd className="tabular-nums text-ink">{user.profile_completion} %</dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Échanges</dt>
                  <dd className="tabular-nums text-ink">{user.collaborations_count}</dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Signalements</dt>
                  <dd className={user.reports_count ? "font-semibold tabular-nums text-danger-strong" : "tabular-nums text-ink"}>
                    {user.reports_count}
                  </dd>
                </div>
              </dl>
              <div className="ml-auto">
                <UserStatusButton userId={user.id} name={fullName(user)} status={user.status} locked={user.is_admin} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={result.total}
        hrefFor={(target) => withParams("/admin/utilisateurs", values, { page: target > 1 ? target : undefined })}
      />
    </div>
  );
}
