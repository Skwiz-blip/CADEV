import { ArrowLeft, Handshake } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageThread } from "@/components/messages/thread";
import { Avatar, DemoBadge } from "@/components/ui/primitives";
import { requireMember, rpc } from "@/lib/api";
import type { ConversationDetail, Message } from "@/lib/types";
import { fullName, isUuid } from "@/lib/utils";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await requireMember();
  const conversation = await rpc<ConversationDetail | null>("get_conversation", { p_id: id });
  if (!conversation) notFound();
  const messages = await rpc<Message[]>("get_messages", { p_conversation_id: id });

  const other = conversation.other;
  const active = conversation.collaborations.find((item) => item.status === "active") ?? conversation.collaborations[0];
  const pending = conversation.proposals[0];

  return (
    <>
      <header className="flex items-center gap-3 bg-canvas/60 px-3 py-3 sm:px-5">
        <Link
          href="/messages"
          aria-label="Retour aux conversations"
          className="flex size-9 items-center justify-center rounded-xl text-muted hover:bg-field hover:text-ink lg:hidden"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <Avatar person={other} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            {other ? (
              <Link href={`/developpeurs/${other.username}`} className="truncate font-semibold text-ink hover:text-brand">
                {fullName(other)}
              </Link>
            ) : (
              <span className="font-semibold text-ink">Compte supprimé</span>
            )}
            {other?.is_demo ? <DemoBadge /> : null}
          </p>
          {other?.headline ? <p className="truncate text-xs text-muted">{other.headline}</p> : null}
        </div>
        {active ? (
          <Link
            href={`/collaborations/${active.id}`}
            className="hidden items-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-sm font-medium text-ink shadow-card hover:bg-field sm:inline-flex"
          >
            <Handshake className="size-4 text-flow-strong" aria-hidden />
            <span className="max-w-40 truncate">{active.title}</span>
          </Link>
        ) : pending ? (
          <Link
            href={`/propositions/${pending.id}`}
            className="hidden rounded-xl bg-warm-soft px-3 py-2 text-sm font-medium text-warm-strong sm:inline-flex"
          >
            Proposition en attente
          </Link>
        ) : null}
      </header>
      <MessageThread
        key={conversation.id}
        conversationId={conversation.id}
        viewerId={viewer.profile.id}
        other={other}
        initialMessages={messages}
      />
    </>
  );
}
