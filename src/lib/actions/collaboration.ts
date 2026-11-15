"use server";

import { z } from "zod";
import { rpc } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  collaborationSchema,
  deliverableSchema,
  reviewDeliverableSchema,
  reviewSchema,
  taskSchema,
} from "@/lib/validation";
import { invalid, refreshAll, run } from "./helpers";

const id = z.uuid();

export async function updateCollaborationAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = collaborationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    await rpc("update_collaboration", {
      p_id: parsed.data.id,
      p_title: parsed.data.title,
      p_description: parsed.data.description || null,
      p_objectives: parsed.data.objectives || null,
    });
    refreshAll();
    return null;
  });
}

export async function applyStarterPlanAction(collaborationId: string): Promise<ActionResult<number>> {
  const parsed = id.safeParse(collaborationId);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    const total = await rpc<number>("apply_starter_plan", { p_collaboration_id: collaborationId });
    refreshAll();
    return total;
  });
}

export async function saveTaskAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;
  return run(async () => {
    const common = {
      p_title: data.title,
      p_description: data.description || null,
      p_assigned_to: data.assignedTo,
      p_priority: data.priority,
      p_due_date: data.dueDate || null,
      p_links: data.links,
      p_attachment_path: data.attachmentPath,
    };
    if (data.id) {
      await rpc("update_task", { p_id: data.id, ...common });
    } else {
      await rpc("create_task", { p_collaboration_id: data.collaborationId, ...common });
    }
    refreshAll();
    return null;
  });
}

export async function setTaskStatusAction(
  taskId: string,
  status: "todo" | "in_progress",
): Promise<ActionResult<null>> {
  const parsed = z.object({ taskId: id, status: z.enum(["todo", "in_progress"]) }).safeParse({ taskId, status });
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    await rpc("set_task_status", { p_id: taskId, p_status: status });
    refreshAll();
    return null;
  });
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult<null>> {
  const parsed = id.safeParse(taskId);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    await rpc("delete_task", { p_id: taskId });
    refreshAll();
    return null;
  });
}

export async function submitDeliverableAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = deliverableSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    await rpc("submit_deliverable", {
      p_task_id: parsed.data.taskId,
      p_description: parsed.data.description,
      p_external_url: parsed.data.externalUrl || null,
      p_attachment_path: parsed.data.attachmentPath,
    });
    refreshAll();
    return null;
  });
}

export async function reviewDeliverableAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = reviewDeliverableSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    await rpc("review_deliverable", {
      p_id: parsed.data.id,
      p_decision: parsed.data.decision,
      p_note: parsed.data.note || null,
    });
    refreshAll();
    return null;
  });
}

export async function confirmCompletionAction(
  collaborationId: string,
): Promise<ActionResult<{ status: string; waiting_for_partner: boolean }>> {
  const parsed = id.safeParse(collaborationId);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    const result = await rpc<{ status: string; waiting_for_partner: boolean }>("confirm_completion", {
      p_collaboration_id: collaborationId,
    });
    refreshAll();
    return result;
  });
}

export async function cancelCollaborationAction(
  collaborationId: string,
  reason: string,
): Promise<ActionResult<null>> {
  const parsed = z
    .object({ collaborationId: id, reason: z.string().trim().min(10, "Explique en quelques mots (10 caractères minimum).").max(1000) })
    .safeParse({ collaborationId, reason });
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    await rpc("cancel_collaboration", { p_collaboration_id: collaborationId, p_reason: parsed.data.reason });
    refreshAll();
    return null;
  });
}

export async function submitReviewAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;
  return run(async () => {
    await rpc("submit_review", {
      p_collaboration_id: data.collaborationId,
      p_communication: data.communication,
      p_reliability: data.reliability,
      p_quality: data.quality,
      p_collaboration: data.collaboration,
      p_comment: data.comment || null,
    });
    refreshAll();
    return null;
  });
}

/**
 * Lien de téléchargement temporaire (10 minutes) d'une pièce jointe.
 * Les règles d'accès du stockage vérifient que la personne participe à l'échange.
 */
export async function getAttachmentUrlAction(path: string): Promise<ActionResult<{ url: string }>> {
  const parsed = z.string().min(3).max(400).regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[^/]+$/i).safeParse(path);
  if (!parsed.success) return { ok: false, error: "Pièce jointe introuvable." };
  return run(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from("attachments").createSignedUrl(path, 600);
    if (error || !data?.signedUrl) {
      throw new AppError("attachment", "Cette pièce jointe n'est pas accessible.");
    }
    return { url: data.signedUrl };
  });
}
