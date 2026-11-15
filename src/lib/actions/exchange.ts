"use server";

import { z } from "zod";
import { rpc } from "@/lib/api";
import type { ActionResult } from "@/lib/types";
import { offerSchema, proposalSchema, reportSchema, respondSchema } from "@/lib/validation";
import { invalid, refreshAll, run } from "./helpers";

const id = z.uuid();

// ── Annonces ─────────────────────────────────────────────────────────────
export async function saveOfferAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = offerSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;
  return run(async () => {
    const offerId = await rpc<string>("save_offer", {
      p_id: data.id ?? null,
      p_title: data.title,
      p_description: data.description,
      p_exchange_type: data.exchange_type,
      p_collaboration_type: data.collaboration_type,
      p_estimated_duration: data.estimated_duration,
      p_desired_level: data.desired_level,
      p_availability: data.availability,
      p_language: data.language,
      p_country: data.country || null,
      p_links: data.links,
      p_conditions: data.conditions || null,
      p_proposed: data.proposed,
      p_requested: data.requested,
      p_related: data.related,
      p_urgent: data.urgent,
    });
    refreshAll();
    return { id: offerId };
  });
}

export async function setOfferStatusAction(
  offerId: string,
  status: "open" | "paused" | "closed" | "deleted",
): Promise<ActionResult<null>> {
  const parsed = z.object({ offerId: id, status: z.enum(["open", "paused", "closed", "deleted"]) }).safeParse({ offerId, status });
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    await rpc("set_offer_status", { p_id: offerId, p_status: status });
    refreshAll();
    return null;
  });
}

// ── Propositions ─────────────────────────────────────────────────────────
export async function sendProposalAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;
  return run(async () => {
    if (data.id) {
      await rpc("update_proposal", {
        p_id: data.id,
        p_message: data.message,
        p_offered: data.offered,
        p_requested: data.requested,
      });
      refreshAll();
      return { id: data.id };
    }
    const proposalId = await rpc<string>("send_proposal", {
      p_receiver_id: data.receiverId,
      p_offer_id: data.offerId,
      p_message: data.message,
      p_offered: data.offered,
      p_requested: data.requested,
    });
    refreshAll();
    return { id: proposalId };
  });
}

export async function cancelProposalAction(proposalId: string): Promise<ActionResult<null>> {
  const parsed = id.safeParse(proposalId);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    await rpc("cancel_proposal", { p_id: proposalId });
    refreshAll();
    return null;
  });
}

export async function respondToProposalAction(
  input: unknown,
): Promise<ActionResult<{ status: string; collaboration_id: string | null }>> {
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    const result = await rpc<{ status: string; collaboration_id: string | null }>("respond_to_proposal", {
      p_id: parsed.data.id,
      p_action: parsed.data.action,
      p_note: parsed.data.note || null,
    });
    refreshAll();
    return result;
  });
}

// ── Boucles d'échange à trois ────────────────────────────────────────────
export async function proposeLoopAction(b: string, c: string): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({ b: id, c: id }).safeParse({ b, c });
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    const loopId = await rpc<string>("propose_loop", { p_b: b, p_c: c });
    refreshAll();
    return { id: loopId };
  });
}

export async function respondToLoopAction(
  loopId: string,
  accept: boolean,
): Promise<ActionResult<{ status: string }>> {
  const parsed = id.safeParse(loopId);
  if (!parsed.success) return invalid(parsed.error);
  return run(async () => {
    const result = await rpc<{ status: string }>("respond_to_loop", { p_id: loopId, p_accept: accept });
    refreshAll();
    return result;
  });
}

// ── Signalements ─────────────────────────────────────────────────────────
export async function createReportAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;
  return run(async () => {
    await rpc("create_report", {
      p_reported_user_id: data.reportedUserId,
      p_offer_id: data.offerId,
      p_collaboration_id: data.collaborationId,
      p_reason: data.reason,
      p_description: data.description,
    });
    return null;
  });
}
