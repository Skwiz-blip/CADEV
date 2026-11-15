"use client";

import {
  CalendarDays,
  Check,
  CircleAlert,
  ClipboardCheck,
  ExternalLink,
  Hourglass,
  ListChecks,
  Paperclip,
  Pencil,
  Play,
  Plus,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import {
  applyStarterPlanAction,
  deleteTaskAction,
  getAttachmentUrlAction,
  reviewDeliverableAction,
  saveTaskAction,
  setTaskStatusAction,
  submitDeliverableAction,
} from "@/lib/actions/collaboration";
import { DELIVERABLE_STATUS, TASK_PRIORITY, TASK_STATUS } from "@/lib/labels";
import type { CollaborationDetail, Deliverable, ProfileMini, Task, TaskPriority, TaskStatus } from "@/lib/types";
import { ATTACHMENT_ACCEPT, attachmentName, uploadAttachment } from "@/lib/upload";
import { cn, formatDate, formatDateShort, fullName, hostname, timeAgo } from "@/lib/utils";
import { Button } from "../ui/button";
import { ChoiceChips, ConfirmDialog, toast, useAction } from "../ui/client";
import { Dialog, DialogContent } from "../ui/dialog";
import { Field, Fieldset, Input, Textarea } from "../ui/field";
import { Avatar, Badge, EmptyState, type BadgeTone } from "../ui/primitives";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "in_review", "done"];

const STATUS_TONES: Record<TaskStatus, BadgeTone> = {
  todo: "neutral",
  in_progress: "brand",
  in_review: "warm",
  done: "ok",
};

const DELIVERABLE_TONES: Record<Deliverable["validation_status"], BadgeTone> = {
  pending: "warm",
  approved: "ok",
  changes_requested: "brand",
};

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === "done") return false;
  return task.due_date < new Date().toISOString().slice(0, 10);
}

// ── Pièce jointe ─────────────────────────────────────────────────────────
function AttachmentLink({ path }: { path: string }) {
  const { pending, run } = useAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        run(() => getAttachmentUrlAction(path), {
          onSuccess: (data) => window.open(data.url, "_blank", "noopener,noreferrer"),
        })
      }
      className="inline-flex max-w-full items-center gap-1.5 rounded-xl bg-canvas px-3.5 py-2 text-sm font-medium text-ink hover:bg-field disabled:opacity-60"
    >
      <Paperclip className="size-4 shrink-0 text-muted" aria-hidden />
      <span className="truncate">{pending ? "Ouverture…" : attachmentName(path)}</span>
    </button>
  );
}

function FilePicker({
  file,
  onChange,
  existing,
  onClearExisting,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  existing?: string | null;
  onClearExisting?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const name = file?.name ?? (existing ? attachmentName(existing) : null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={input}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <Button variant="subtle" size="sm" onClick={() => input.current?.click()}>
        <Upload aria-hidden /> {name ? "Changer de fichier" : "Joindre un fichier"}
      </Button>
      {name ? (
        <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-ink">
          <Paperclip className="size-4 shrink-0 text-muted" aria-hidden />
          <span className="max-w-48 truncate">{name}</span>
          <button
            type="button"
            aria-label="Retirer le fichier"
            onClick={() => {
              onChange(null);
              if (input.current) input.current.value = "";
              onClearExisting?.();
            }}
            className="flex size-6 items-center justify-center rounded-md text-muted hover:bg-field hover:text-ink"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </span>
      ) : (
        <span className="text-xs text-muted">Image, PDF, texte ou ZIP · 10 Mo max</span>
      )}
    </div>
  );
}

// ── Formulaire de tâche ──────────────────────────────────────────────────
function TaskForm({
  collaborationId,
  viewerId,
  members,
  task,
  onDone,
}: {
  collaborationId: string;
  viewerId: string;
  members: ProfileMini[];
  task?: Task;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? viewerId);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [links, setLinks] = useState((task?.links ?? []).join("\n"));
  const [file, setFile] = useState<File | null>(null);
  const [existing, setExisting] = useState(task?.attachment_path ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const { pending, run } = useAction();

  const submit = async () => {
    if (title.trim().length < 3) {
      setErrors({ title: "3 caractères minimum." });
      return;
    }
    let attachmentPath = existing;
    if (file) {
      setUploading(true);
      const upload = await uploadAttachment(file, collaborationId, viewerId);
      setUploading(false);
      if (!upload.ok) {
        toast.error(upload.error);
        return;
      }
      attachmentPath = upload.path;
    }
    run(
      () =>
        saveTaskAction({
          id: task?.id ?? null,
          collaborationId,
          title,
          description,
          assignedTo,
          priority,
          dueDate,
          links: links.split("\n").map((link) => link.trim()).filter(Boolean),
          attachmentPath,
        }),
      {
        refresh: true,
        success: task ? "Tâche mise à jour." : "Tâche créée.",
        onError: (result) => {
          setErrors(result.fields ?? {});
          toast.error(result.error);
        },
        onSuccess: onDone,
      },
    );
  };

  const linkError = Object.entries(errors).find(([key]) => key.startsWith("links"))?.[1];

  return (
    <div className="space-y-5">
      <Field label="Titre" htmlFor="task-title" error={errors.title}>
        <Input
          id="task-title"
          value={title}
          maxLength={140}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={Boolean(errors.title)}
          placeholder="Ex. : Écran de connexion avec validation"
        />
      </Field>
      <Field label="Description" htmlFor="task-description" optional error={errors.description}>
        <Textarea
          id="task-description"
          rows={3}
          value={description}
          maxLength={3000}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ce qui est attendu, et à quoi on reconnaîtra que c'est terminé."
        />
      </Field>
      <Fieldset legend="Responsable">
        <ChoiceChips
          label="Responsable"
          multiple={false}
          options={members.map((member) => ({
            value: member.id,
            label: member.id === viewerId ? "Moi" : fullName(member),
          }))}
          value={[assignedTo]}
          onChange={(next) => setAssignedTo(next[0] ?? viewerId)}
        />
      </Fieldset>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Fieldset legend="Priorité">
          <ChoiceChips
            label="Priorité"
            multiple={false}
            size="sm"
            options={(Object.keys(TASK_PRIORITY) as TaskPriority[]).map((value) => ({ value, label: TASK_PRIORITY[value] }))}
            value={[priority]}
            onChange={(next) => setPriority(next[0] ?? "medium")}
          />
        </Fieldset>
        <Field label="Date limite" htmlFor="task-due" optional error={errors.dueDate}>
          <Input id="task-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </Field>
      </div>
      <Field label="Liens" htmlFor="task-links" optional hint="Un lien par ligne, 5 au maximum." error={linkError}>
        <Textarea
          id="task-links"
          rows={2}
          value={links}
          onChange={(event) => setLinks(event.target.value)}
          placeholder="https://github.com/…"
          aria-invalid={Boolean(linkError)}
          className="min-h-16"
        />
      </Field>
      <Fieldset legend="Pièce jointe" optional>
        <FilePicker file={file} onChange={setFile} existing={existing} onClearExisting={() => setExisting(null)} />
      </Fieldset>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="subtle" onClick={onDone} disabled={pending || uploading}>
          Annuler
        </Button>
        <Button onClick={submit} loading={pending || uploading}>
          {task ? "Enregistrer" : "Créer la tâche"}
        </Button>
      </div>
    </div>
  );
}

// ── Soumission et examen d'un livrable ───────────────────────────────────
function DeliverableForm({
  task,
  collaborationId,
  viewerId,
  correction,
}: {
  task: Task;
  collaborationId: string;
  viewerId: string;
  correction?: string | null;
}) {
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const { pending, run } = useAction();

  const submit = async () => {
    if (description.trim().length < 10) {
      setErrors({ description: "Décris le résultat en 10 caractères au moins." });
      return;
    }
    let attachmentPath: string | null = null;
    if (file) {
      setUploading(true);
      const upload = await uploadAttachment(file, collaborationId, viewerId);
      setUploading(false);
      if (!upload.ok) {
        toast.error(upload.error);
        return;
      }
      attachmentPath = upload.path;
    }
    run(() => submitDeliverableAction({ taskId: task.id, description, externalUrl: url.trim(), attachmentPath }), {
      refresh: true,
      success: "Livrable soumis. Ton partenaire est prévenu.",
      onError: (result) => {
        setErrors(result.fields ?? {});
        toast.error(result.error);
      },
      onSuccess: () => {
        setDescription("");
        setUrl("");
        setFile(null);
      },
    });
  };

  return (
    <div className="space-y-4 rounded-2xl bg-canvas p-4 sm:p-5">
      <div>
        <h3 className="font-semibold text-ink">{correction ? "Soumettre la correction" : "Soumettre le livrable"}</h3>
        <p className="mt-0.5 text-sm text-muted">Ton partenaire le validera ou demandera une correction.</p>
      </div>
      {correction ? (
        <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-ink">
          <strong className="font-semibold text-brand-strong">Correction demandée : </strong>
          {correction}
        </p>
      ) : null}
      <Field label="Résultat obtenu" htmlFor={`deliverable-${task.id}`} error={errors.description}>
        <Textarea
          id={`deliverable-${task.id}`}
          rows={3}
          value={description}
          maxLength={3000}
          onChange={(event) => setDescription(event.target.value)}
          aria-invalid={Boolean(errors.description)}
          placeholder="Ce qui a été fait, et comment le vérifier."
          className="bg-surface hover:bg-surface"
        />
      </Field>
      <Field label="Lien" htmlFor={`deliverable-url-${task.id}`} optional error={errors.externalUrl} hint="Dépôt GitHub, démonstration, document…">
        <Input
          id={`deliverable-url-${task.id}`}
          type="url"
          inputMode="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://github.com/…"
          aria-invalid={Boolean(errors.externalUrl)}
          className="bg-surface hover:bg-surface"
        />
      </Field>
      <FilePicker file={file} onChange={setFile} />
      <div className="flex justify-end">
        <Button onClick={submit} loading={pending || uploading}>
          <ClipboardCheck aria-hidden /> Soumettre pour validation
        </Button>
      </div>
    </div>
  );
}

function ReviewPanel({ deliverable, submitter }: { deliverable: Deliverable; submitter: string }) {
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const { pending, run } = useAction();

  const decide = (decision: "approve" | "request_changes") => {
    if (decision === "request_changes" && note.trim().length < 10) {
      setError("Explique la correction attendue en 10 caractères au moins.");
      return;
    }
    setError(undefined);
    run(() => reviewDeliverableAction({ id: deliverable.id, decision, note: decision === "approve" ? "" : note }), {
      refresh: true,
      success: decision === "approve" ? "Livrable validé." : "Correction demandée.",
    });
  };

  return (
    <div className="space-y-4 rounded-2xl bg-warm-soft p-4 sm:p-5">
      <div>
        <h3 className="font-semibold text-ink">À toi de valider</h3>
        <p className="mt-0.5 text-sm text-ink/75">
          {submitter} attend ton retour sur ce livrable. Une tâche n&apos;est terminée qu&apos;une fois validée par toi.
        </p>
      </div>
      {asking ? (
        <Field label="Correction attendue" htmlFor={`review-${deliverable.id}`} error={error}>
          <Textarea
            id={`review-${deliverable.id}`}
            rows={3}
            value={note}
            maxLength={1000}
            onChange={(event) => setNote(event.target.value)}
            aria-invalid={Boolean(error)}
            autoFocus
            placeholder="Ce qui manque ou doit être repris, précisément."
            className="bg-surface hover:bg-surface"
          />
        </Field>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {asking ? (
          <>
            <Button variant="white" onClick={() => setAsking(false)} disabled={pending}>
              Retour
            </Button>
            <Button variant="dark" onClick={() => decide("request_changes")} loading={pending}>
              Envoyer la demande
            </Button>
          </>
        ) : (
          <>
            <Button variant="white" onClick={() => setAsking(true)} disabled={pending}>
              Demander une correction
            </Button>
            <Button onClick={() => decide("approve")} loading={pending}>
              <Check aria-hidden /> Valider le livrable
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function DeliverableHistory({ task, people }: { task: Task; people: Map<string, ProfileMini> }) {
  if (task.deliverables.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-ink">Historique des livrables</h3>
      <ol className="space-y-3">
        {task.deliverables.map((deliverable) => (
          <li key={deliverable.id} className="rounded-2xl bg-canvas p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={DELIVERABLE_TONES[deliverable.validation_status]}>
                {DELIVERABLE_STATUS[deliverable.validation_status]}
              </Badge>
              <span className="text-xs text-muted">
                Soumis par {people.get(deliverable.submitted_by)?.first_name ?? "un membre"} · {timeAgo(deliverable.created_at)}
              </span>
            </div>
            <p className="prose-user mt-2.5 text-sm text-ink/90">{deliverable.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {deliverable.external_url ? (
                <a
                  href={deliverable.external_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2 text-sm font-medium text-ink hover:bg-field"
                >
                  {hostname(deliverable.external_url)} <ExternalLink className="size-3.5 text-muted" aria-hidden />
                </a>
              ) : null}
              {deliverable.attachment_path ? <AttachmentLink path={deliverable.attachment_path} /> : null}
            </div>
            {deliverable.reviewed_at ? (
              <p className="mt-3 text-sm text-muted">
                <span className="font-medium text-ink">
                  {deliverable.validation_status === "approved" ? "Validé" : "Correction demandée"} par{" "}
                  {people.get(deliverable.reviewed_by ?? "")?.first_name ?? "un membre"}
                </span>{" "}
                le {formatDate(deliverable.reviewed_at)}
                {deliverable.review_note ? ` — « ${deliverable.review_note} »` : ""}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Détail d'une tâche ───────────────────────────────────────────────────
function TaskDetail({
  task,
  detail,
  people,
  onEdit,
  onClose,
}: {
  task: Task;
  detail: CollaborationDetail;
  people: Map<string, ProfileMini>;
  onEdit: () => void;
  onClose: () => void;
}) {
  const viewerId = detail.viewer.id;
  const active = detail.status === "active" && detail.viewer.is_member;
  const assignee = people.get(task.assigned_to) ?? null;
  const mine = task.assigned_to === viewerId;
  const latest = task.deliverables[0];
  const editable = active && (task.status === "todo" || task.status === "in_progress");
  const { pending, run } = useAction();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONES[task.status]} size="md">
          {TASK_STATUS[task.status]}
        </Badge>
        <Badge size="md">Priorité {TASK_PRIORITY[task.priority].toLowerCase()}</Badge>
        {task.due_date ? (
          <Badge tone={isOverdue(task) ? "danger" : "neutral"} size="md">
            <CalendarDays aria-hidden /> {isOverdue(task) ? "En retard · " : ""}
            {formatDate(task.due_date)}
          </Badge>
        ) : null}
      </div>

      <p className="flex items-center gap-2.5 text-sm text-muted">
        <Avatar person={assignee} size="xs" />
        Responsable : <span className="font-medium text-ink">{mine ? "toi" : fullName(assignee)}</span>
      </p>

      {task.description ? <p className="prose-user text-ink/90">{task.description}</p> : null}

      {task.links.length || task.attachment_path ? (
        <div className="flex flex-wrap gap-2">
          {task.links.map((link) => (
            <a
              key={link}
              href={link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 rounded-xl bg-canvas px-3.5 py-2 text-sm font-medium text-ink hover:bg-field"
            >
              {hostname(link)} <ExternalLink className="size-3.5 text-muted" aria-hidden />
            </a>
          ))}
          {task.attachment_path ? <AttachmentLink path={task.attachment_path} /> : null}
        </div>
      ) : null}

      {/* Étape en cours */}
      {task.status === "done" ? (
        <p className="flex items-start gap-3 rounded-2xl bg-ok-soft p-4 text-sm text-ink">
          <Check className="mt-0.5 size-5 shrink-0 text-ok-strong" aria-hidden />
          Livrable validé par {people.get(latest?.reviewed_by ?? "")?.first_name ?? "ton partenaire"}. Cette tâche est terminée.
        </p>
      ) : task.status === "in_review" && latest ? (
        active && latest.submitted_by !== viewerId ? (
          <ReviewPanel deliverable={latest} submitter={people.get(latest.submitted_by)?.first_name ?? "Ton partenaire"} />
        ) : (
          <p className="flex items-start gap-3 rounded-2xl bg-warm-soft p-4 text-sm text-ink">
            <Hourglass className="mt-0.5 size-5 shrink-0 text-warm-strong" aria-hidden />
            Livrable soumis. En attente de validation par ton partenaire.
          </p>
        )
      ) : editable && mine ? (
        <DeliverableForm
          task={task}
          collaborationId={detail.id}
          viewerId={viewerId}
          correction={latest?.validation_status === "changes_requested" ? latest.review_note : null}
        />
      ) : editable ? (
        <p className="rounded-2xl bg-canvas p-4 text-sm text-muted">
          {fullName(assignee)} soumettra le livrable de cette tâche. Tu pourras alors le valider.
        </p>
      ) : null}

      <DeliverableHistory task={task} people={people} />

      {editable ? (
        <div className="flex flex-wrap gap-2">
          {task.status === "todo" ? (
            <Button
              variant="soft"
              size="sm"
              loading={pending}
              onClick={() => run(() => setTaskStatusAction(task.id, "in_progress"), { refresh: true, success: "Tâche démarrée." })}
            >
              <Play aria-hidden /> Commencer
            </Button>
          ) : (
            <Button
              variant="subtle"
              size="sm"
              loading={pending}
              onClick={() => run(() => setTaskStatusAction(task.id, "todo"), { refresh: true })}
            >
              <Undo2 aria-hidden /> Remettre à faire
            </Button>
          )}
          <Button variant="subtle" size="sm" onClick={onEdit}>
            <Pencil aria-hidden /> Modifier
          </Button>
          {task.deliverables.length === 0 ? (
            <ConfirmDialog
              trigger={
                <Button variant="danger-soft" size="sm">
                  <Trash2 aria-hidden /> Supprimer
                </Button>
              }
              title="Supprimer cette tâche ?"
              description="Elle sera retirée du tableau pour vous deux."
              confirmLabel="Supprimer la tâche"
              tone="danger"
              action={() => deleteTaskAction(task.id)}
              success="Tâche supprimée."
              onDone={onClose}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── Tableau ──────────────────────────────────────────────────────────────
function TaskCard({
  task,
  viewerId,
  assignee,
  onOpen,
}: {
  task: Task;
  viewerId: string;
  assignee: ProfileMini | null;
  onOpen: () => void;
}) {
  const latest = task.deliverables[0];
  const toReview = task.status === "in_review" && latest?.submitted_by !== viewerId;
  const toFix = task.status === "in_progress" && latest?.validation_status === "changes_requested";
  const overdue = isOverdue(task);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl bg-surface p-4 text-left shadow-card transition-shadow hover:shadow-lift"
    >
      <span className="block font-medium leading-snug text-ink">{task.title}</span>
      {toReview || toFix || task.priority === "high" || overdue ? (
        <span className="mt-2.5 flex flex-wrap gap-1.5">
          {toReview ? (
            <Badge tone="warm">
              <ClipboardCheck aria-hidden /> À valider
            </Badge>
          ) : null}
          {toFix ? (
            <Badge tone="brand">
              <CircleAlert aria-hidden /> Correction demandée
            </Badge>
          ) : null}
          {task.priority === "high" && task.status !== "done" ? <Badge tone="dark">Priorité haute</Badge> : null}
          {overdue ? <Badge tone="danger">En retard</Badge> : null}
        </span>
      ) : null}
      <span className="mt-3 flex items-center gap-2 text-xs text-muted">
        <Avatar person={assignee} size="xs" />
        <span className="truncate">{task.assigned_to === viewerId ? "Toi" : (assignee?.first_name ?? "—")}</span>
        {task.due_date ? (
          <span className={cn("ml-auto flex shrink-0 items-center gap-1", overdue && "font-medium text-danger-strong")}>
            <CalendarDays className="size-3.5" aria-hidden /> {formatDateShort(task.due_date)}
          </span>
        ) : null}
      </span>
    </button>
  );
}

type Mode = { kind: "closed" } | { kind: "create" } | { kind: "view" | "edit"; taskId: string };

/**
 * Tableau des tâches d'une collaboration. Les états « en révision » et
 * « terminée » ne s'obtiennent que par un livrable soumis puis validé.
 */
export function TaskBoard({ detail, focusTaskId }: { detail: CollaborationDetail; focusTaskId?: string }) {
  const viewerId = detail.viewer.id;
  const active = detail.status === "active" && detail.viewer.is_member;
  const members = detail.members.map((member) => member.user);
  const people = new Map(members.map((member) => [member.id, member]));
  const initial = focusTaskId && detail.tasks.some((task) => task.id === focusTaskId) ? focusTaskId : null;
  const [mode, setMode] = useState<Mode>(initial ? { kind: "view", taskId: initial } : { kind: "closed" });
  const starter = useAction();

  const selected = mode.kind === "view" || mode.kind === "edit" ? detail.tasks.find((task) => task.id === mode.taskId) : undefined;
  const close = () => setMode({ kind: "closed" });

  const dialogTitle =
    mode.kind === "create" ? "Nouvelle tâche" : mode.kind === "edit" ? "Modifier la tâche" : (selected?.title ?? "Tâche");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Une tâche est terminée quand son livrable a été validé par l&apos;autre participant.
        </p>
        {active ? (
          <Button onClick={() => setMode({ kind: "create" })}>
            <Plus aria-hidden /> Nouvelle tâche
          </Button>
        ) : null}
      </div>

      {detail.tasks.length === 0 ? (
        <div className="rounded-2xl bg-surface shadow-card">
          <EmptyState
            icon={ListChecks}
            title="Aucune tâche pour l'instant"
            description={
              active
                ? "Découpez l'échange en petites tâches concrètes. Pour démarrer vite, DevBridge peut proposer un premier plan adapté à ce que vous échangez."
                : "Cette collaboration ne contient aucune tâche."
            }
            action={
              active ? (
                <>
                  <Button
                    loading={starter.pending}
                    onClick={() =>
                      starter.run(() => applyStarterPlanAction(detail.id), {
                        refresh: true,
                        success: (total) => `${total} tâches ajoutées. Ajustez-les à votre projet.`,
                      })
                    }
                  >
                    <ListChecks aria-hidden /> Proposer un plan de départ
                  </Button>
                  <Button variant="subtle" onClick={() => setMode({ kind: "create" })}>
                    Créer une tâche
                  </Button>
                </>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((status) => {
            const tasks = detail.tasks.filter((task) => task.status === status);
            return (
              <section key={status} aria-label={TASK_STATUS[status]} className="rounded-2xl bg-field p-3">
                <h3 className="flex items-center justify-between px-1.5 pb-3 pt-1 text-sm font-semibold text-ink">
                  {TASK_STATUS[status]}
                  <span className="rounded-full bg-surface px-2 text-xs font-medium tabular-nums text-muted">{tasks.length}</span>
                </h3>
                {tasks.length ? (
                  <ul className="space-y-2.5">
                    {tasks.map((task) => (
                      <li key={task.id}>
                        <TaskCard
                          task={task}
                          viewerId={viewerId}
                          assignee={people.get(task.assigned_to) ?? null}
                          onOpen={() => setMode({ kind: "view", taskId: task.id })}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-1.5 pb-3 text-xs text-faint">Rien ici.</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={mode.kind !== "closed"} onOpenChange={(open) => !open && close()}>
        {mode.kind !== "closed" ? (
          <DialogContent size="lg" title={dialogTitle}>
            {mode.kind === "create" ? (
              <TaskForm collaborationId={detail.id} viewerId={viewerId} members={members} onDone={close} />
            ) : mode.kind === "edit" && selected ? (
              <TaskForm
                collaborationId={detail.id}
                viewerId={viewerId}
                members={members}
                task={selected}
                onDone={() => setMode({ kind: "view", taskId: selected.id })}
              />
            ) : selected ? (
              <TaskDetail
                task={selected}
                detail={detail}
                people={people}
                onEdit={() => setMode({ kind: "edit", taskId: selected.id })}
                onClose={close}
              />
            ) : (
              <p className="text-sm text-muted">Cette tâche n&apos;existe plus.</p>
            )}
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
