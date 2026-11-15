"use client";

import { CirclePause, CirclePlay, CircleX, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setOfferStatusAction } from "@/lib/actions/exchange";
import type { OfferStatus } from "@/lib/types";
import { Button } from "../ui/button";
import { ConfirmDialog, useAction } from "../ui/client";

/** Actions de l'auteur sur son annonce : modifier, mettre en pause, clôturer, supprimer. */
export function OfferOwnerActions({
  offerId,
  status,
  size = "md",
}: {
  offerId: string;
  status: OfferStatus;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const locked = status === "removed" || status === "deleted";

  const setStatus = (next: "open" | "paused", message: string) =>
    run(() => setOfferStatusAction(offerId, next), { success: message, refresh: true });

  if (locked) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="subtle" size={size}>
        <Link href={`/annonces/${offerId}/modifier`}>
          <Pencil aria-hidden /> Modifier
        </Link>
      </Button>
      {status === "open" ? (
        <Button variant="subtle" size={size} loading={pending} onClick={() => setStatus("paused", "Annonce mise en pause.")}>
          <CirclePause aria-hidden /> Mettre en pause
        </Button>
      ) : (
        <Button variant="soft" size={size} loading={pending} onClick={() => setStatus("open", "Annonce remise en ligne.")}>
          <CirclePlay aria-hidden /> Remettre en ligne
        </Button>
      )}
      {status !== "closed" ? (
        <ConfirmDialog
          trigger={
            <Button variant="subtle" size={size}>
              <CircleX aria-hidden /> Clôturer
            </Button>
          }
          title="Clôturer cette annonce ?"
          description="Elle ne recevra plus de propositions, et celles encore en attente seront annulées. Tu pourras la remettre en ligne plus tard."
          confirmLabel="Clôturer l'annonce"
          action={() => setOfferStatusAction(offerId, "closed")}
          success="Annonce clôturée."
        />
      ) : null}
      <ConfirmDialog
        trigger={
          <Button variant="danger-soft" size={size}>
            <Trash2 aria-hidden /> Supprimer
          </Button>
        }
        title="Supprimer définitivement cette annonce ?"
        description="Cette action est irréversible. Les propositions en attente seront annulées ; les échanges déjà démarrés ne sont pas touchés."
        confirmLabel="Supprimer l'annonce"
        tone="danger"
        action={() => setOfferStatusAction(offerId, "deleted")}
        success="Annonce supprimée."
        onDone={() => router.push("/mes-annonces")}
      />
    </div>
  );
}
