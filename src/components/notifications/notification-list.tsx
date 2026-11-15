"use client";

import {
  ArrowLeftRight,
  BadgeCheck,
  Bell,
  CheckCheck,
  ClipboardCheck,
  ListChecks,
  MessageSquare,
  Repeat2,
  Shield,
  Sparkles,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markNotificationsReadAction } from "@/lib/actions/messaging";
import type { NotificationItem } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "../ui/button";
import { useAction } from "../ui/client";

const ICONS: Record<string, { icon: LucideIcon; className: string }> = {
  proposal_received: { icon: ArrowLeftRight, className: "bg-warm-soft text-warm-strong" },
  proposal_accepted: { icon: BadgeCheck, className: "bg-ok-soft text-ok-strong" },
  proposal_declined: { icon: ArrowLeftRight, className: "bg-field text-muted" },
  proposal_changes_requested: { icon: ArrowLeftRight, className: "bg-brand-soft text-brand" },
  proposal_updated: { icon: ArrowLeftRight, className: "bg-brand-soft text-brand" },
  proposal_cancelled: { icon: ArrowLeftRight, className: "bg-field text-muted" },
  new_message: { icon: MessageSquare, className: "bg-brand-soft text-brand" },
  new_match: { icon: Sparkles, className: "bg-flow-soft text-flow-strong" },
  task_assigned: { icon: ListChecks, className: "bg-brand-soft text-brand" },
  task_completed: { icon: BadgeCheck, className: "bg-ok-soft text-ok-strong" },
  deliverable_to_review: { icon: ClipboardCheck, className: "bg-warm-soft text-warm-strong" },
  deliverable_changes_requested: { icon: ClipboardCheck, className: "bg-brand-soft text-brand" },
  completion_requested: { icon: BadgeCheck, className: "bg-warm-soft text-warm-strong" },
  collaboration_completed: { icon: BadgeCheck, className: "bg-ok-soft text-ok-strong" },
  collaboration_cancelled: { icon: ArrowLeftRight, className: "bg-field text-muted" },
  review_received: { icon: Star, className: "bg-warm-soft text-warm-strong" },
  moderation: { icon: Shield, className: "bg-danger-soft text-danger-strong" },
  help_request: { icon: Zap, className: "bg-warm-soft text-warm-strong" },
  loop_invitation: { icon: Repeat2, className: "bg-flow-soft text-flow-strong" },
  loop_started: { icon: Repeat2, className: "bg-ok-soft text-ok-strong" },
  loop_declined: { icon: Repeat2, className: "bg-field text-muted" },
};

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const { pending, run } = useAction();
  return (
    <Button
      variant="subtle"
      disabled={disabled}
      loading={pending}
      onClick={() => run(() => markNotificationsReadAction(null), { refresh: true, success: "Tout est marqué comme lu." })}
    >
      {pending ? null : <CheckCheck aria-hidden />} Tout marquer comme lu
    </Button>
  );
}

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const { run } = useAction();

  const markRead = (item: NotificationItem) => {
    if (!item.is_read) run(() => markNotificationsReadAction([item.id]), { refresh: !item.link });
  };

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const style = ICONS[item.type] ?? { icon: Bell, className: "bg-field text-muted" };
        const body = (
          <>
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", style.className)}>
              <style.icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block text-[15px] text-ink", item.is_read ? "font-normal" : "font-semibold")}>{item.title}</span>
              {item.content ? <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{item.content}</span> : null}
              <span className="mt-1 block text-xs text-faint">{timeAgo(item.created_at)}</span>
            </span>
            {item.is_read ? null : (
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand" aria-label="Non lue" role="img" />
            )}
          </>
        );
        const className = cn(
          "flex w-full items-start gap-3.5 rounded-2xl p-4 text-left transition-colors",
          item.is_read ? "bg-surface hover:bg-field" : "bg-surface shadow-card hover:shadow-lift",
        );
        return (
          <li key={item.id}>
            {item.link ? (
              <Link
                href={item.link}
                className={className}
                onClick={() => markRead(item)}
                onAuxClick={() => markRead(item)}
              >
                {body}
              </Link>
            ) : (
              <button
                type="button"
                className={className}
                onClick={() => {
                  markRead(item);
                  router.refresh();
                }}
              >
                {body}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
