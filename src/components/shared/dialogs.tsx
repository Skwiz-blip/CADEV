"use client";

import { Flag, ListChecks, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { createReportAction, sendProposalAction } from "@/lib/actions/exchange";
import { EXCHANGE_TYPES, REPORT_REASONS } from "@/lib/labels";
import type { ExchangeType, ProfileCard, Skill } from "@/lib/types";
import { fullName } from "@/lib/utils";
import { Button } from "../ui/button";
import { ChoiceChips, toast, useAction, useDraft } from "../ui/client";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Field, Fieldset, Select, Textarea } from "../ui/field";
import { Notice } from "../ui/primitives";

function unique(skills: Pick<Skill, "id" | "name">[]): Pick<Skill, "id" | "name">[] {
  const seen = new Set<string>();
  return skills.filter((skill) => (seen.has(skill.id) ? false : (seen.add(skill.id), true)));
}

type ProposalContext = {
  /** Annonce à laquelle on répond (absente pour une prise de contact directe). */
  offer?: { id: string; title: string; exchange_type: ExchangeType; proposed: Skill[]; requested: Skill[] } | null;
  /** Proposition existante à modifier. */
  existing?: { id: string; message: string; offered: Skill[]; requested: Skill[] } | null;
};

/**
 * Formulaire de proposition d'échange : ce que j'apporte, ce que j'attends,
 * et un mot de présentation. Le brouillon est gardé sur l'appareil.
 */
export function ProposalDialog({
  trigger,
  me,
  receiver,
  offer = null,
  existing = null,
  defaultOpen = false,
}: {
  trigger: ReactNode;
  me: Pick<ProfileCard, "id" | "offered" | "wanted">;
  receiver: Pick<ProfileCard, "id" | "first_name" | "last_name" | "username" | "offered" | "wanted">;
  defaultOpen?: boolean;
} & ProposalContext) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const { pending, run } = useAction();
  const reciprocal = offer?.exchange_type === "reciprocal";

  // Ce que je peux apporter : mes compétences, et ce que l'annonce demande.
  const giveOptions = useMemo(
    () => unique([...(offer?.requested ?? []), ...me.offered, ...(existing?.offered ?? [])]),
    [offer, me.offered, existing],
  );
  // Ce que je peux recevoir : ce que l'annonce propose, et ce que la personne sait faire.
  const getOptions = useMemo(
    () => unique([...(offer?.proposed ?? []), ...receiver.offered, ...(existing?.requested ?? [])]),
    [offer, receiver.offered, existing],
  );

  const initialGive = useMemo(() => {
    if (existing) return existing.offered.map((skill) => skill.id);
    const mine = new Set(me.offered.map((skill) => skill.id));
    const wanted = offer ? offer.requested : receiver.wanted;
    return wanted.filter((skill) => mine.has(skill.id)).map((skill) => skill.id);
  }, [existing, me.offered, offer, receiver.wanted]);

  const initialGet = useMemo(() => {
    if (existing) return existing.requested.map((skill) => skill.id);
    const wanted = new Set(me.wanted.map((skill) => skill.id));
    const source = offer ? offer.proposed : receiver.offered;
    const matching = source.filter((skill) => wanted.has(skill.id)).map((skill) => skill.id);
    if (matching.length) return matching;
    return offer && offer.proposed.length === 1 ? [offer.proposed[0]!.id] : [];
  }, [existing, me.wanted, offer, receiver.offered]);

  const [give, setGive] = useState<string[]>(initialGive);
  const [get, setGet] = useState<string[]>(initialGet);
  const [message, setMessage, clearDraft] = useDraft(
    `proposition:${existing?.id ?? `${receiver.id}:${offer?.id ?? "direct"}`}`,
    existing?.message ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const next: Record<string, string> = {};
    if (give.length + get.length === 0) next.offered = "Choisis au moins une compétence à apporter ou à recevoir.";
    if (reciprocal && give.length === 0) next.offered = "Cet échange est réciproque : choisis ce que tu apportes.";
    if (reciprocal && get.length === 0) next.requested = "Cet échange est réciproque : choisis ce que tu attends.";
    if (message.trim().length < 20) next.message = "Présente-toi en 20 caractères au moins.";
    setErrors(next);
    if (Object.keys(next).length) return;

    run(
      () =>
        sendProposalAction({
          id: existing?.id ?? null,
          receiverId: receiver.id,
          offerId: offer?.id ?? null,
          message,
          offered: give,
          requested: get,
        }),
      {
        onError: (result) => {
          setErrors(result.fields ?? {});
          toast.error(result.error);
        },
        onSuccess: (data) => {
          clearDraft();
          setOpen(false);
          toast.success(existing ? "Proposition mise à jour." : "Proposition envoyée.");
          router.push(`/propositions/${data.id}`);
          router.refresh();
        },
      },
    );
  };

  const name = fullName(receiver);

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        size="lg"
        title={existing ? "Modifier ma proposition" : `Proposer un échange à ${receiver.first_name || name}`}
        description={
          offer
            ? `En réponse à « ${offer.title} » · ${EXCHANGE_TYPES[offer.exchange_type].label}`
            : "Prise de contact directe : dis clairement ce que tu apportes et ce que tu attends."
        }
      >
        <div className="space-y-6">
          {me.offered.length === 0 ? (
            <Notice
              tone="warm"
              icon={ListChecks}
              title="Ton profil n'indique pas encore ce que tu sais faire"
              action={
                <Button asChild size="sm" variant="white">
                  <Link href="/competences">Ajouter mes compétences</Link>
                </Button>
              }
            >
              Ajoute tes compétences pour proposer un échange équilibré.
            </Notice>
          ) : null}

          <Fieldset
            legend="Ce que tu apportes"
            hint={giveOptions.length ? undefined : "Aucune compétence à proposer pour le moment."}
            error={errors.offered}
            optional={!reciprocal}
          >
            {giveOptions.length ? (
              <ChoiceChips
                label="Ce que tu apportes"
                size="sm"
                options={giveOptions.map((skill) => ({ value: skill.id, label: skill.name }))}
                value={give}
                onChange={setGive}
                invalid={Boolean(errors.offered)}
              />
            ) : null}
          </Fieldset>

          <Fieldset
            legend="Ce que tu attends en retour"
            hint={getOptions.length ? undefined : `${name} n'a pas encore indiqué ses compétences.`}
            error={errors.requested}
            optional={!reciprocal}
          >
            {getOptions.length ? (
              <ChoiceChips
                label="Ce que tu attends en retour"
                size="sm"
                options={getOptions.map((skill) => ({ value: skill.id, label: skill.name }))}
                value={get}
                onChange={setGet}
                invalid={Boolean(errors.requested)}
              />
            ) : null}
          </Fieldset>

          <Field
            label="Ton message"
            htmlFor="proposal-message"
            error={errors.message}
            hint="Présente-toi, ton projet, et ce que tu imagines faire ensemble."
          >
            <Textarea
              id="proposal-message"
              rows={5}
              maxLength={2000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-invalid={Boolean(errors.message)}
              placeholder={`Bonjour ${receiver.first_name || ""}, …`}
            />
          </Field>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="subtle" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={submit} loading={pending}>
              <Send aria-hidden /> {existing ? "Renvoyer la proposition" : "Envoyer la proposition"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Signalement d'un profil, d'une annonce ou d'une collaboration. */
export function ReportDialog({
  trigger,
  target,
  title = "Signaler un problème",
  defaultReason = "inappropriate",
}: {
  trigger?: ReactNode;
  target: { reportedUserId?: string | null; offerId?: string | null; collaborationId?: string | null };
  title?: string;
  defaultReason?: keyof typeof REPORT_REASONS;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(defaultReason);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string>();
  const { pending, run } = useAction();

  const submit = () => {
    if (description.trim().length < 10) {
      setError("Décris le problème en 10 caractères au moins.");
      return;
    }
    setError(undefined);
    run(
      () =>
        createReportAction({
          reportedUserId: target.reportedUserId ?? null,
          offerId: target.offerId ?? null,
          collaborationId: target.collaborationId ?? null,
          reason,
          description,
        }),
      {
        success: "Signalement envoyé à l'équipe de modération.",
        onSuccess: () => {
          setOpen(false);
          setDescription("");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="text-muted">
            <Flag aria-hidden /> Signaler
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        title={title}
        description="Ton signalement est confidentiel : la personne concernée n'en est pas informée."
      >
        <div className="space-y-5">
          <Field label="Motif" htmlFor="report-reason">
            <Select id="report-reason" value={reason} onChange={(event) => setReason(event.target.value)}>
              {Object.entries(REPORT_REASONS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Que s'est-il passé ?" htmlFor="report-description" error={error}>
            <Textarea
              id="report-description"
              rows={5}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-invalid={Boolean(error)}
              placeholder="Décris les faits, simplement."
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="subtle" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button variant="danger" onClick={submit} loading={pending}>
              Envoyer le signalement
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
