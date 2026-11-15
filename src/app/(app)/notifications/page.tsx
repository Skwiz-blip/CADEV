import { BellOff } from "lucide-react";
import type { Metadata } from "next";
import { MarkAllReadButton, NotificationList } from "@/components/notifications/notification-list";
import { Card, EmptyState, LinkTabs, PageHeader, Pagination } from "@/components/ui/primitives";
import { rpc } from "@/lib/api";
import type { NotificationList as Notifications } from "@/lib/types";
import { firstParam, plural, withParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

const PAGE_SIZE = 30;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const unreadOnly = firstParam(raw.filtre) === "non-lues";
  const page = Math.max(1, Number(firstParam(raw.page)) || 1);
  const data = await rpc<Notifications>("list_notifications", {
    p_limit: unreadOnly ? 100 : PAGE_SIZE,
    p_offset: unreadOnly ? 0 : (page - 1) * PAGE_SIZE,
  });
  const items = unreadOnly ? data.items.filter((item) => !item.is_read) : data.items;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description={
          data.unread
            ? `${plural(data.unread, "notification non lue", "notifications non lues")}.`
            : "Tu es à jour."
        }
        actions={<MarkAllReadButton disabled={data.unread === 0} />}
      />
      <LinkTabs
        label="Filtrer les notifications"
        items={[
          { href: "/notifications", label: "Toutes", count: data.total, active: !unreadOnly },
          { href: "/notifications?filtre=non-lues", label: "Non lues", count: data.unread, active: unreadOnly },
        ]}
      />
      {items.length === 0 ? (
        <Card className="p-0 sm:p-0">
          <EmptyState
            icon={BellOff}
            title={unreadOnly ? "Aucune notification non lue" : "Aucune notification"}
            description="Tu seras prévenu ici d'une proposition, d'un message, d'un livrable à valider ou d'une nouvelle correspondance."
          />
        </Card>
      ) : (
        <>
          <NotificationList items={items} />
          {unreadOnly ? null : (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data.total}
              hrefFor={(target) => withParams("/notifications", {}, { page: target > 1 ? target : undefined })}
            />
          )}
        </>
      )}
    </div>
  );
}
