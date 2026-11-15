"use server";

import { z } from "zod";
import { rpc } from "@/lib/api";
import type { ActionResult, Message, NotificationList } from "@/lib/types";
import { messageSchema } from "@/lib/validation";
import { invalid, refreshAll, run } from "./helpers";

const id = z.uuid();

export async function sendMessageAction(input: unknown): Promise<ActionResult<Message>> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () =>
    rpc<Message>("send_message", {
      p_conversation_id: parsed.data.conversationId,
      p_content: parsed.data.content,
    }),
  );
}

/** Messages plus récents que `after` (rattrapage quand le temps réel est indisponible). */
export async function fetchMessagesAction(
  conversationId: string,
  after: string | null,
): Promise<ActionResult<Message[]>> {
  const parsed = id.safeParse(conversationId);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () =>
    rpc<Message[]>("get_messages", { p_conversation_id: conversationId, p_after: after }),
  );
}

export async function fetchOlderMessagesAction(
  conversationId: string,
  before: string,
): Promise<ActionResult<Message[]>> {
  const parsed = id.safeParse(conversationId);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () =>
    rpc<Message[]>("get_messages", { p_conversation_id: conversationId, p_before: before, p_limit: 40 }),
  );
}

export async function markConversationReadAction(conversationId: string): Promise<ActionResult<number>> {
  const parsed = id.safeParse(conversationId);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    const count = await rpc<number>("mark_conversation_read", { p_conversation_id: conversationId });
    if (count > 0) refreshAll();
    return count;
  });
}

/** ids = null : tout marquer comme lu. */
export async function markNotificationsReadAction(ids: string[] | null): Promise<ActionResult<number>> {
  const parsed = z.array(id).max(200).nullable().safeParse(ids);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    const count = await rpc<number>("mark_notifications_read", { p_ids: ids });
    refreshAll();
    return count;
  });
}

export async function fetchNotificationsAction(): Promise<ActionResult<NotificationList>> {
  return run(async () => rpc<NotificationList>("list_notifications", { p_limit: 8 }));
}
