"use client";

import { CircleAlert, MessagesSquare, RotateCw, SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  fetchMessagesAction,
  fetchOlderMessagesAction,
  markConversationReadAction,
  sendMessageAction,
} from "@/lib/actions/messaging";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Message, ProfileMini } from "@/lib/types";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { Button } from "../ui/button";
import { useDraft, useOnline } from "../ui/client";

type LocalMessage = Message & { state?: "sending" | "failed" };

const PAGE = 60;

function dayKey(value: string): string {
  return new Date(value).toDateString();
}

function dayLabel(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return formatDate(date);
}

function merge(current: LocalMessage[], incoming: Message[]): LocalMessage[] {
  if (incoming.length === 0) return current;
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, { ...byId.get(message.id), ...message, state: undefined });
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * Fil de discussion. Les messages arrivent en temps réel ; si le temps réel
 * n'est pas disponible, un rattrapage discret prend le relais. Un message qui
 * n'a pas pu partir reste affiché, avec un bouton pour le renvoyer.
 */
export function MessageThread({
  conversationId,
  viewerId,
  other,
  initialMessages,
  initialDraft,
  className,
}: {
  conversationId: string;
  viewerId: string;
  other: ProfileMini | null;
  initialMessages: Message[];
  initialDraft?: string;
  className?: string;
}) {
  const [messages, setMessages] = useState<LocalMessage[]>(initialMessages);
  const [draft, setDraft, clearDraft] = useDraft(`message:${conversationId}`, initialDraft ?? "");
  const [hasOlder, setHasOlder] = useState(initialMessages.length >= PAGE);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const online = useOnline();
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const latest = useRef<string | null>(initialMessages.at(-1)?.created_at ?? null);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const confirmed = messages.filter((message) => !message.state);
    latest.current = confirmed.at(-1)?.created_at ?? latest.current;
  }, [messages]);

  const markRead = useCallback(() => {
    if (readTimer.current) clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      if (document.visibilityState === "visible") void markConversationReadAction(conversationId);
    }, 600);
  }, [conversationId]);

  // À l'ouverture : tout ce qui était non lu devient lu.
  useEffect(() => {
    if (initialMessages.some((message) => message.sender_id !== viewerId && !message.read_at)) markRead();
    return () => {
      if (readTimer.current) clearTimeout(readTimer.current);
    };
  }, [initialMessages, viewerId, markRead]);

  // Temps réel.
  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const row = payload.new as Message;
          setMessages((current) => {
            // Mon propre message revient par le temps réel : il remplace sa version « en cours d'envoi ».
            const withoutTwin =
              row.sender_id === viewerId
                ? current.filter((message) => !(message.state === "sending" && message.content === row.content))
                : current;
            return merge(withoutTwin, [row]);
          });
          if (payload.eventType === "INSERT" && row.sender_id !== viewerId) markRead();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, viewerId, markRead]);

  // Rattrapage : au retour sur l'onglet, au retour du réseau, puis toutes les 20 secondes.
  useEffect(() => {
    let cancelled = false;
    const catchUp = async () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      const result = await fetchMessagesAction(conversationId, latest.current);
      if (cancelled || !result.ok || result.data.length === 0) return;
      setMessages((current) => merge(current, result.data));
      if (result.data.some((message) => message.sender_id !== viewerId)) markRead();
    };
    const interval = setInterval(catchUp, 20_000);
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("online", catchUp);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("online", catchUp);
    };
  }, [conversationId, viewerId, markRead]);

  // Défilement : on reste en bas tant que la personne n'est pas remontée lire.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && stickToBottom.current) element.scrollTop = element.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const element = scroller.current;
    if (!element) return;
    stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
  };

  const deliver = async (local: LocalMessage) => {
    const result = await sendMessageAction({ conversationId, content: local.content });
    setMessages((current) => {
      const rest = current.filter((message) => message.id !== local.id);
      if (!result.ok) return [...rest, { ...local, state: "failed" as const }];
      return merge(rest, [result.data]);
    });
  };

  const send = () => {
    const content = draft.trim();
    if (!content) return;
    const local: LocalMessage = {
      id: `local-${crypto.randomUUID()}`,
      sender_id: viewerId,
      content,
      read_at: null,
      created_at: new Date().toISOString(),
      state: "sending",
    };
    stickToBottom.current = true;
    setMessages((current) => [...current, local]);
    clearDraft();
    if (textarea.current) textarea.current.style.height = "auto";
    void deliver(local);
  };

  const retry = (message: LocalMessage) => {
    const next = { ...message, state: "sending" as const };
    setMessages((current) => current.map((item) => (item.id === message.id ? next : item)));
    void deliver(next);
  };

  const loadOlder = async () => {
    const first = messages[0];
    const element = scroller.current;
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    const previousHeight = element?.scrollHeight ?? 0;
    const result = await fetchOlderMessagesAction(conversationId, first.created_at);
    setLoadingOlder(false);
    if (!result.ok) return;
    if (result.data.length < 40) setHasOlder(false);
    stickToBottom.current = false;
    setMessages((current) => merge(current, result.data));
    requestAnimationFrame(() => {
      if (element) element.scrollTop = element.scrollHeight - previousHeight;
    });
  };

  const lastOwn = [...messages].reverse().find((message) => message.sender_id === viewerId);
  const name = other?.first_name || "ton correspondant";

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-5 sm:px-6"
        role="log"
        aria-live="polite"
        aria-label={`Conversation avec ${name}`}
      >
        {hasOlder ? (
          <div className="flex justify-center pb-3">
            <Button variant="subtle" size="sm" onClick={loadOlder} loading={loadingOlder}>
              Messages précédents
            </Button>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <MessagesSquare className="size-6" aria-hidden />
            </span>
            <p className="mt-4 font-semibold text-ink">La conversation commence ici</p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              Mettez-vous d&apos;accord sur un premier créneau, un outil, un objectif.
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const mine = message.sender_id === viewerId;
            const previous = messages[index - 1];
            const newDay = !previous || dayKey(previous.created_at) !== dayKey(message.created_at);
            const grouped = !newDay && previous?.sender_id === message.sender_id;
            const isLastOwn = lastOwn?.id === message.id;
            return (
              <div key={message.id}>
                {newDay ? (
                  <p className="py-4 text-center text-xs font-medium text-faint">{dayLabel(message.created_at)}</p>
                ) : null}
                <div className={cn("flex", mine ? "justify-end" : "justify-start", grouped ? "mt-1" : "mt-3")}>
                  <div className={cn("max-w-[85%] sm:max-w-[70%]", mine && "text-right")}>
                    <p
                      className={cn(
                        "prose-user inline-block rounded-2xl px-4 py-2.5 text-left text-[15px] leading-relaxed",
                        mine ? "bg-brand text-white" : "bg-canvas text-ink",
                        message.state === "sending" && "opacity-60",
                        message.state === "failed" && "bg-danger-soft text-danger-strong",
                      )}
                    >
                      {message.content}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 px-1 text-[11px] text-faint" style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
                      {message.state === "failed" ? (
                        <>
                          <CircleAlert className="size-3 text-danger" aria-hidden />
                          <span className="text-danger-strong">Non envoyé</span>
                          <button
                            type="button"
                            onClick={() => retry(message)}
                            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                          >
                            <RotateCw className="size-3" aria-hidden /> Réessayer
                          </button>
                        </>
                      ) : message.state === "sending" ? (
                        "Envoi…"
                      ) : (
                        <>
                          {formatTime(message.created_at)}
                          {mine && isLastOwn ? <span>· {message.read_at ? "Lu" : "Envoyé"}</span> : null}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        className="flex items-end gap-2 px-3 pb-3 pt-2 sm:px-5 sm:pb-5"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label htmlFor={`composer-${conversationId}`} className="sr-only">
          Écrire un message à {name}
        </label>
        <textarea
          ref={textarea}
          id={`composer-${conversationId}`}
          rows={1}
          value={draft}
          maxLength={4000}
          placeholder={online ? `Écrire à ${name}…` : "Hors connexion : ton message est gardé ici"}
          onChange={(event) => {
            setDraft(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
              event.preventDefault();
              send();
            }
          }}
          className="field max-h-40 min-h-11 flex-1 resize-none"
        />
        <Button type="submit" size="icon" className="size-11" disabled={!draft.trim()} aria-label="Envoyer le message">
          <SendHorizontal aria-hidden />
        </Button>
      </form>
    </div>
  );
}
