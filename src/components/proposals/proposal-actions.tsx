"use client";

import { Check, MessageSquareText, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cancelProposalAction, respondToProposalAction } from "@/lib/actions/exchange";
import type { ProfileCard, ProposalDetail } from "@/lib/types";
import { fullName } from "@/lib/utils";
import { ProposalDialog } from "../shared/dialogs";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/client";

/** Réponse du destinataire : accepter, demander une modification, ou refuser. */
export function ReceiverActions({ proposal }: { proposal: ProposalDetail }) {
  const router = useRouter();
  const name = fullName(proposal.sender);

  return (
    <div className="flex flex-col gap-2">
      <ConfirmDialog
        trigger={
          <Button size="lg" block>
            <Check aria-hidden /> Accepter l&apos;échange
          </Button>
        }
        title={`Démarrer un échange avec ${name} ?`}
        description="Un espace de collaboration sera créé pour vous deux : tâches, livrables et discussion. Tu t'engages à t'y investir."
        confirmLabel="Accepter et démarrer"
        note={{ label: "Un mot pour commencer", placeholder: "Avec plaisir ! On commence quand ?" }}
        action={async (note) => {
          const result = await respondToProposalAction({ id: proposal.id, action: "accept", note });
          if (result.ok && result.data.collaboration_id) {
            router.push(`/collaborations/${result.data.collaboration_id}`);
          }
          return result;
        }}
        success="Échange démarré. Bonne collaboration !"
      />
      <ConfirmDialog
        trigger={
          <Button variant="soft" block>
            <MessageSquareText aria-hidden /> Demander une modification
          </Button>
        }
        title="Demander une modification"
        description={`${name} pourra ajuster sa proposition et te la renvoyer. Rien n'est engagé tant que tu n'as pas accepté.`}
        confirmLabel="Envoyer la demande"
        note={{
          label: "Ce que tu aimerais changer",
          placeholder: "Peux-tu ajouter… / Je préférerais plutôt…",
          required: true,
          minLength: 10,
        }}
        action={(note) => respondToProposalAction({ id: proposal.id, action: "request_changes", note })}
        success="Demande de modification envoyée."
      />
      <ConfirmDialog
        trigger={
          <Button variant="subtle" block>
            <X aria-hidden /> Refuser
          </Button>
        }
        title="Refuser cette proposition ?"
        description="Un mot d'explication est toujours apprécié, même court."
        confirmLabel="Refuser la proposition"
        tone="danger"
        note={{ label: "Motif", placeholder: "Je n'ai pas la disponibilité en ce moment…" }}
        action={(note) => respondToProposalAction({ id: proposal.id, action: "decline", note })}
        success="Proposition refusée."
      />
    </div>
  );
}

/** Actions de l'expéditeur tant que la proposition n'est pas tranchée. */
export function SenderActions({ proposal, me }: { proposal: ProposalDetail; me: ProfileCard }) {
  return (
    <div className="flex flex-col gap-2">
      <ProposalDialog
        me={me}
        receiver={proposal.receiver_card}
        existing={proposal}
        trigger={
          <Button block variant={proposal.status === "changes_requested" ? "primary" : "soft"}>
            <Pencil aria-hidden /> {proposal.status === "changes_requested" ? "Modifier et renvoyer" : "Modifier ma proposition"}
          </Button>
        }
      />
      <ConfirmDialog
        trigger={
          <Button variant="subtle" block>
            <X aria-hidden /> Annuler ma proposition
          </Button>
        }
        title="Annuler cette proposition ?"
        description="Elle sera retirée. Tu pourras en envoyer une nouvelle plus tard."
        confirmLabel="Annuler la proposition"
        tone="danger"
        action={() => cancelProposalAction(proposal.id)}
        success="Proposition annulée."
      />
    </div>
  );
}
