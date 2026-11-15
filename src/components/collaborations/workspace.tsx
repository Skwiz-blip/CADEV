"use client";

import { BadgeCheck, Check, Flag, Hourglass, Pencil, PartyPopper, Star, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  cancelCollaborationAction,
  confirmCompletionAction,
  submitReviewAction,
  updateCollaborationAction,
} from "@/lib/actions/collaboration";
import type { CollaborationDetail } from "@/lib/types";
import { cn, fullName } from "@/lib/utils";
import { ReportDialog } from "../shared/dialogs";
import { Button } from "../ui/button";
import { ConfirmDialog, toast, useAction } from "../ui/client";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Field, Fieldset, Input, Textarea } from "../ui/field";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../ui/menu";

// ── Modifier, signaler, interrompre ──────────────────────────────────────
export function CollaborationMenu({ detail }: { detail: CollaborationDetail }) {
  const active = detail.status === "active";
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(detail.title);
  const [description, setDescription] = useState(detail.description ?? "");
  const [objectives, setObjectives] = useState(detail.objectives ?? "");
  const [error, setError] = useState<string>();
  const { pending, run } = useAction();

  const save = () => {
    if (title.trim().length < 3) {
      setError("3 caractères minimum.");
      return;
    }
    setError(undefined);
    run(() => updateCollaborationAction({ id: detail.id, title, description, objectives }), {
      refresh: true,
      success: "Collaboration mise à jour.",
      onSuccess: () => setEditing(false),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {active ? (
        <Dialog open={editing} onOpenChange={(open) => !pending && setEditing(open)}>
          <DialogTrigger asChild>
            <Button variant="subtle" size="sm">
              <Pencil aria-hidden /> Modifier
            </Button>
          </DialogTrigger>
          <DialogContent title="Cadrer la collaboration" description="Un titre clair et des objectifs partagés évitent les malentendus.">
            <div className="space-y-5">
              <Field label="Titre" htmlFor="collab-title" error={error}>
                <Input id="collab-title" value={title} maxLength={140} onChange={(event) => setTitle(event.target.value)} aria-invalid={Boolean(error)} />
              </Field>
              <Field label="Objectifs" htmlFor="collab-objectives" optional hint="Ce que chacun veut avoir obtenu à la fin.">
                <Textarea id="collab-objectives" rows={4} value={objectives} maxLength={2000} onChange={(event) => setObjectives(event.target.value)} />
              </Field>
              <Field label="Description" htmlFor="collab-description" optional>
                <Textarea id="collab-description" rows={4} value={description} maxLength={4000} onChange={(event) => setDescription(event.target.value)} />
              </Field>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="subtle" onClick={() => setEditing(false)} disabled={pending}>
                  Annuler
                </Button>
                <Button onClick={save} loading={pending}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <ReportDialog
        target={{ collaborationId: detail.id }}
        title="Signaler un problème dans cet échange"
        defaultReason="dispute"
        trigger={
          <Button variant="subtle" size="sm">
            <Flag aria-hidden /> Signaler un problème
          </Button>
        }
      />

      {active ? (
        <Menu>
          <MenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted">
              Plus
            </Button>
          </MenuTrigger>
          <MenuContent>
            <ConfirmDialog
              trigger={
                <MenuItem tone="danger" onSelect={(event) => event.preventDefault()}>
                  <X aria-hidden /> Mettre fin à l&apos;échange
                </MenuItem>
              }
              title="Mettre fin à cet échange ?"
              description="L'échange sera interrompu pour vous deux et ne comptera pas comme terminé. Ton partenaire verra ton explication."
              confirmLabel="Mettre fin à l'échange"
              tone="danger"
              note={{ label: "Pourquoi ?", placeholder: "Manque de disponibilité, changement de projet…", required: true, minLength: 10 }}
              action={(note) => cancelCollaborationAction(detail.id, note)}
              success="Échange interrompu."
            />
          </MenuContent>
        </Menu>
      ) : null}
    </div>
  );
}

// ── Clôture à deux ───────────────────────────────────────────────────────
export function CompletionPanel({ detail }: { detail: CollaborationDetail }) {
  const { pending, run } = useAction();
  const viewerId = detail.viewer.id;
  const me = detail.members.find((member) => member.user.id === viewerId);
  const partner = detail.members.find((member) => member.user.id !== viewerId);
  const total = detail.tasks.length;
  const done = detail.tasks.filter((task) => task.status === "done").length;
  const ready = total > 0 && done === total;

  if (detail.status !== "active" || !detail.viewer.is_member || !ready) return null;

  if (me?.completion_confirmed_at) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-warm-soft p-5">
        <Hourglass className="mt-0.5 size-5 shrink-0 text-warm-strong" aria-hidden />
        <div>
          <p className="font-semibold text-ink">Tu as confirmé la fin de l&apos;échange</p>
          <p className="mt-0.5 text-sm text-ink/75">
            Il sera terminé dès que {partner ? fullName(partner.user) : "ton partenaire"} l&apos;aura confirmé à son tour.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-ok-soft p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-ok-strong">
        <BadgeCheck className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">
          {partner?.completion_confirmed_at
            ? `${fullName(partner.user)} propose de clôturer l'échange`
            : "Tous les livrables sont validés"}
        </p>
        <p className="mt-0.5 text-sm text-ink/75">
          L&apos;échange se termine quand vous l&apos;avez confirmé tous les deux. Tu pourras ensuite évaluer la collaboration.
        </p>
      </div>
      <Button
        loading={pending}
        onClick={() =>
          run(() => confirmCompletionAction(detail.id), {
            refresh: true,
            success: (data) =>
              data.status === "completed" ? "Échange terminé. Bravo à vous deux !" : "C'est noté. Ton partenaire est prévenu.",
          })
        }
      >
        <Check aria-hidden /> Confirmer la fin de l&apos;échange
      </Button>
    </div>
  );
}

// ── Évaluation ───────────────────────────────────────────────────────────
const CRITERIA = [
  { key: "communication", label: "Communication", hint: "Clarté, réactivité, écoute." },
  { key: "reliability", label: "Respect des engagements", hint: "Délais tenus, présence aux rendez-vous." },
  { key: "quality", label: "Qualité du travail", hint: "Soin et utilité de ce qui a été livré ou transmis." },
  { key: "collaboration", label: "Collaboration générale", hint: "Travaillerais-tu de nouveau avec cette personne ?" },
] as const;

type CriterionKey = (typeof CRITERIA)[number]["key"];

function StarInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} sur 5`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          className="flex size-9 items-center justify-center rounded-lg transition-transform hover:scale-110"
        >
          <Star
            aria-hidden
            className={cn(
              "size-7 transition-colors",
              star <= (hover || value) ? "fill-warm text-warm" : "fill-field-strong text-field-strong",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({ detail }: { detail: CollaborationDetail }) {
  const partner = detail.members.find((member) => member.user.id !== detail.viewer.id);
  const [ratings, setRatings] = useState<Record<CriterionKey, number>>({
    communication: 0, reliability: 0, quality: 0, collaboration: 0,
  });
  const [comment, setComment] = useState("");
  const { pending, run } = useAction();
  const name = partner ? partner.user.first_name || fullName(partner.user) : "ton partenaire";

  const submit = () => {
    if (Object.values(ratings).some((value) => value < 1)) {
      toast.error("Donne une note pour chacun des quatre critères.");
      return;
    }
    run(() => submitReviewAction({ collaborationId: detail.id, ...ratings, comment }), {
      refresh: true,
      success: "Merci ! Ton évaluation est enregistrée.",
    });
  };

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-card sm:p-7">
      <div className="flex items-start gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <PartyPopper className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">Comment s&apos;est passé l&apos;échange avec {name} ?</h2>
          <p className="mt-0.5 text-sm text-muted">
            Ton évaluation apparaîtra sur son profil. Elle n&apos;est possible qu&apos;une fois, après un échange terminé ensemble.
          </p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CRITERIA.map((criterion) => (
          <Fieldset key={criterion.key} legend={criterion.label} hint={criterion.hint} className="rounded-2xl bg-canvas p-4">
            <StarInput
              label={criterion.label}
              value={ratings[criterion.key]}
              onChange={(value) => setRatings((current) => ({ ...current, [criterion.key]: value }))}
            />
          </Fieldset>
        ))}
      </div>
      <Field label="Un commentaire" htmlFor="review-comment" optional className="mt-5">
        <Textarea
          id="review-comment"
          rows={3}
          value={comment}
          maxLength={1000}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Ce que tu as apprécié, ce que tu as appris."
        />
      </Field>
      <div className="mt-5 flex justify-end">
        <Button onClick={submit} loading={pending}>
          Envoyer mon évaluation
        </Button>
      </div>
    </div>
  );
}

export function CertificateLink({ id }: { id: string }) {
  return (
    <Button asChild variant="white">
      <Link href={`/attestations/${id}`}>
        <BadgeCheck aria-hidden /> Voir l&apos;attestation
      </Link>
    </Button>
  );
}
