"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import type { ConversationItem } from "@/lib/types";
import { cn, fullName, timeAgo } from "@/lib/utils";
import { Avatar, DemoBadge } from "../ui/primitives";

/**
 * Deux volets sur ordinateur (liste + fil). Sur téléphone, un seul à la fois :
 * la liste, puis le fil quand une conversation est ouverte.
 */
export function MessagesFrame({
  conversations,
  viewerId,
  children,
}: {
  conversations: ConversationItem[];
  viewerId: string;
  children: ReactNode;
}) {
  const selected = useSelectedLayoutSegment();

  return (
    <div className="grid grid-cols-1 h-[calc(100dvh-13.5rem)] min-h-[26rem] gap-4 lg:h-[calc(100dvh-9.5rem)] lg:grid-cols-[21rem_minmax(0,1fr)]">
      <section
        aria-label="Conversations"
        className={cn("min-h-0 flex-col overflow-hidden rounded-2xl bg-surface shadow-card", selected ? "hidden lg:flex" : "flex")}
      >
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {conversations.map((conversation) => {
            const active = selected === conversation.id;
            const last = conversation.last_message;
            return (
              <li key={conversation.id}>
                <Link
                  href={`/messages/${conversation.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl p-3 transition-colors",
                    active ? "bg-brand-soft" : "hover:bg-canvas",
                  )}
                >
                  <Avatar person={conversation.other} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("truncate text-[15px] text-ink", conversation.unread ? "font-semibold" : "font-medium")}>
                        {fullName(conversation.other)}
                      </span>
                      {conversation.other?.is_demo ? <DemoBadge /> : null}
                      <span className="ml-auto shrink-0 text-[11px] text-faint">{timeAgo(conversation.last_message_at)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={cn("truncate text-sm", conversation.unread ? "font-medium text-ink" : "text-muted")}>
                        {last ? `${last.sender_id === viewerId ? "Toi : " : ""}${last.content}` : "Aucun message pour l'instant"}
                      </span>
                      {conversation.unread ? (
                        <span className="ml-auto min-w-5 shrink-0 rounded-full bg-brand px-1.5 text-center text-xs font-semibold leading-5 text-white">
                          {conversation.unread}
                          <span className="sr-only"> non lus</span>
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <section
        aria-label="Discussion"
        className={cn("min-h-0 flex-col overflow-hidden rounded-2xl bg-surface shadow-card", selected ? "flex" : "hidden lg:flex")}
      >
        {children}
      </section>
    </div>
  );
}
