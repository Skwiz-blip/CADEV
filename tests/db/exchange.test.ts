import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestDb, createKodjoAndAmina, failure, lit, texts, uuids } from "./harness";

/**
 * Le parcours de démonstration du cahier des charges, de bout en bout :
 * annonce → proposition → acceptation → tâches → livrables → validation →
 * clôture → évaluation. Chaque étape vérifie aussi ce qui doit être refusé.
 */

let db: TestDb;
let kodjo: string;
let amina: string;
let intrus: string;
let skills: Awaited<ReturnType<typeof createKodjoAndAmina>>["skills"];

let offerId: string;
let proposalId: string;
let collabId: string;
let taskKodjo: string;
let taskAmina: string;

const offerArgs = () => ({
  p_id: null,
  p_title: "Flutter contre Python : construisons ensemble",
  p_description:
    "Je développe une application mobile en Flutter et j'ai besoin d'aide pour intégrer un modèle Python. En échange, je t'accompagne sur Flutter.",
  p_exchange_type: "reciprocal",
  p_collaboration_type: "remote",
  p_estimated_duration: "few_days",
  p_desired_level: "any",
  p_availability: texts(["weekday_evening", "weekend"]),
  p_language: "fr",
  p_country: "TG",
  p_links: texts(["https://github.com/exemple/app"]),
  p_conditions: null,
  p_proposed: uuids([skills.flutter, skills.dart]),
  p_requested: uuids([skills.python]),
  p_related: uuids([]),
});

beforeAll(async () => {
  db = await TestDb.create();
  ({ kodjo, amina, skills } = await createKodjoAndAmina(db));
  intrus = await db.createUser({ first: "Intrus", last: "Curieux", country: "CI" });
});

afterAll(async () => {
  await db.close();
});

describe("annonces", () => {
  it("publie une annonce valide et refuse les annonces incomplètes", async () => {
    await db.as(kodjo, async (s) => {
      expect(await failure(s.rpc("save_offer", { ...offerArgs(), p_requested: uuids([]) }))).toMatch(/offer_needs_both_skills/);
      expect(await failure(s.rpc("save_offer", { ...offerArgs(), p_proposed: uuids([]), p_requested: uuids([]) }))).toMatch(/offer_needs_skills/);
      expect(await failure(s.rpc("save_offer", { ...offerArgs(), p_links: texts(["javascript:alert(1)"]) }))).toMatch(/invalid_link/);
      expect(await failure(s.rpc("save_offer", { ...offerArgs(), p_title: "Court" }))).toMatch(/check constraint/);
      offerId = await s.rpc<string>("save_offer", offerArgs());
    });
    expect(offerId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rend l'annonce visible à tous, filtrable, sans exposer d'adresse e-mail", async () => {
    await db.as(null, async (s) => {
      const all = await s.rpc<{ total: number; items: { id: string; author: Record<string, unknown>; proposed: { name: string }[] }[] }>("search_offers");
      expect(all.total).toBe(1);
      expect(all.items[0]!.proposed.map((skill) => skill.name)).toEqual(["Dart", "Flutter"]);
      expect(JSON.stringify(all.items[0])).not.toContain("@");

      expect((await s.rpc<{ total: number }>("search_offers", { p_query: "flutter" })).total).toBe(1);
      expect((await s.rpc<{ total: number }>("search_offers", { p_query: "100%_introuvable" })).total).toBe(0);
      expect((await s.rpc<{ total: number }>("search_offers", { p_skill_id: skills.python })).total).toBe(1);
      expect((await s.rpc<{ total: number }>("search_offers", { p_skill_id: skills.ml })).total).toBe(0);
      expect((await s.rpc<{ total: number }>("search_offers", { p_country: "tg", p_exchange_type: "reciprocal" })).total).toBe(1);
      expect((await s.rpc<{ total: number }>("search_offers", { p_country: "SN" })).total).toBe(0);

      const detail = await s.rpc<{ viewer: { is_owner: boolean; active_proposal_id: string | null } }>("get_offer", { p_id: offerId });
      expect(detail.viewer).toMatchObject({ is_owner: false, active_proposal_id: null });
    });
  });

  it("empêche de modifier l'annonce d'autrui", async () => {
    await db.as(amina, async (s) => {
      expect(await failure(s.rpc("save_offer", { ...offerArgs(), p_id: offerId }))).toMatch(/offer_not_found/);
      expect(await failure(s.rpc("set_offer_status", { p_id: offerId, p_status: "deleted" }))).toMatch(/offer_not_found/);
    });
  });

  it("recommande l'annonce à la personne dont les compétences correspondent", async () => {
    const items = await db.as(amina, (s) =>
      s.rpc<{ id: string; match_proposed: { name: string }[]; match_requested: { name: string }[] }[]>("recommended_offers"),
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.match_proposed.map((skill) => skill.name)).toEqual(["Dart", "Flutter"]);
    expect(items[0]!.match_requested.map((skill) => skill.name)).toEqual(["Python"]);
    // L'auteur ne se voit pas recommander sa propre annonce.
    expect(await db.as(kodjo, (s) => s.rpc<unknown[]>("recommended_offers"))).toEqual([]);
  });
});

describe("propositions", () => {
  const message = "Bonjour Kodjo, je peux t'aider sur l'intégration Python et j'aimerais apprendre Flutter avec toi.";

  it("refuse les propositions invalides", async () => {
    await db.as(kodjo, async (s) => {
      expect(
        await failure(s.rpc("send_proposal", { p_receiver_id: kodjo, p_offer_id: offerId, p_message: message, p_offered: uuids([skills.python]), p_requested: uuids([skills.flutter]) })),
      ).toMatch(/cannot_propose_to_self/);
    });
    await db.as(amina, async (s) => {
      // Un échange réciproque exige un apport dans les deux sens.
      expect(
        await failure(s.rpc("send_proposal", { p_receiver_id: kodjo, p_offer_id: offerId, p_message: message, p_offered: uuids([]), p_requested: uuids([skills.flutter]) })),
      ).toMatch(/proposal_needs_both_skills/);
      // Le destinataire doit être l'auteur de l'annonce.
      expect(
        await failure(s.rpc("send_proposal", { p_receiver_id: intrus, p_offer_id: offerId, p_message: message, p_offered: uuids([skills.python]), p_requested: uuids([skills.flutter]) })),
      ).toMatch(/invalid_input/);
    });
  });

  it("envoie la proposition : notification, conversation et premier message", async () => {
    proposalId = await db.as(amina, (s) =>
      s.rpc<string>("send_proposal", { p_receiver_id: kodjo, p_offer_id: offerId, p_message: message, p_offered: uuids([skills.python]), p_requested: uuids([skills.flutter]) }),
    );
    const notifications = await db.sql<{ user_id: string; type: string; link: string }>(
      `select user_id, type, link from public.notifications where type in ('proposal_received', 'new_message')`,
    );
    // Une seule notification : le premier message ne double pas l'annonce de la proposition.
    expect(notifications).toEqual([{ user_id: kodjo, type: "proposal_received", link: `/propositions/${proposalId}` }]);

    const conversations = await db.as(kodjo, (s) =>
      s.rpc<{ id: string; unread: number; other: { id: string }; last_message: { content: string } }[]>("list_my_conversations"),
    );
    expect(conversations).toHaveLength(1);
    expect(conversations[0]).toMatchObject({ unread: 1, other: { id: amina }, last_message: { content: message } });

    // Aucune collaboration n'existe tant que le destinataire n'a pas accepté.
    const [collabs] = await db.sql<{ total: number }>(`select count(*)::int as total from public.collaborations`);
    expect(collabs!.total).toBe(0);
    const [match] = await db.sql<{ status: string }>(`select status from public.matches limit 1`);
    expect(match!.status).toBe("contacted");
  });

  it("bloque les doublons et les réponses de personnes non concernées", async () => {
    await db.as(amina, async (s) => {
      expect(
        await failure(s.rpc("send_proposal", { p_receiver_id: kodjo, p_offer_id: offerId, p_message: message, p_offered: uuids([skills.python]), p_requested: uuids([skills.flutter]) })),
      ).toMatch(/proposal_already_exists/);
      // L'expéditrice ne peut pas accepter sa propre proposition.
      expect(await failure(s.rpc("respond_to_proposal", { p_id: proposalId, p_action: "accept" }))).toMatch(/proposal_not_found/);
    });
    await db.as(intrus, async (s) => {
      expect(await failure(s.rpc("respond_to_proposal", { p_id: proposalId, p_action: "accept" }))).toMatch(/proposal_not_found/);
      expect(await s.rpc("get_proposal", { p_id: proposalId })).toBeNull();
      expect(await s.sql(`select * from public.exchange_proposals`)).toEqual([]);
      expect(await s.sql(`select * from public.proposal_skills`)).toEqual([]);
      expect(await s.sql(`select * from public.messages`)).toEqual([]);
      expect(await s.sql(`select * from public.conversations`)).toEqual([]);
    });
  });

  it("gère la demande de modification puis l'acceptation", async () => {
    await db.as(kodjo, async (s) => {
      expect(await failure(s.rpc("respond_to_proposal", { p_id: proposalId, p_action: "request_changes", p_note: "court" }))).toMatch(/note_required/);
      const result = await s.rpc<{ status: string; collaboration_id: string | null }>("respond_to_proposal", {
        p_id: proposalId, p_action: "request_changes", p_note: "Peux-tu aussi m'aider sur Dart avancé ?",
      });
      expect(result).toEqual({ status: "changes_requested", collaboration_id: null });
      // Tant que la proposition n'est pas revenue « en attente », on ne peut pas l'accepter.
      expect(await failure(s.rpc("respond_to_proposal", { p_id: proposalId, p_action: "accept" }))).toMatch(/proposal_not_pending/);
    });

    await db.as(amina, (s) =>
      s.rpc("update_proposal", { p_id: proposalId, p_message: message + " D'accord pour Dart aussi.", p_offered: uuids([skills.python]), p_requested: uuids([skills.flutter, skills.dart]) }),
    );

    const result = await db.as(kodjo, (s) =>
      s.rpc<{ status: string; collaboration_id: string }>("respond_to_proposal", { p_id: proposalId, p_action: "accept" }),
    );
    expect(result.status).toBe("accepted");
    collabId = result.collaboration_id;

    const members = await db.sql<{ user_id: string; role: string }>(
      `select user_id, role from public.collaboration_members where collaboration_id = ${lit(collabId)} order by role`,
    );
    expect(members).toEqual([{ user_id: amina, role: "initiator" }, { user_id: kodjo, role: "partner" }]);

    await db.as(kodjo, async (s) => {
      // Une proposition déjà acceptée ne peut plus changer d'état.
      expect(await failure(s.rpc("respond_to_proposal", { p_id: proposalId, p_action: "decline" }))).toMatch(/proposal_not_pending/);
    });
    await db.as(amina, async (s) => {
      expect(await failure(s.rpc("cancel_proposal", { p_id: proposalId }))).toMatch(/proposal_not_editable/);
    });
  });
});

describe("collaboration, tâches et livrables", () => {
  type Detail = {
    title: string;
    status: string;
    members: { user: { id: string }; gives: { name: string }[]; completion_confirmed_at: string | null }[];
    tasks: { id: string; status: string; deliverables: { validation_status: string; review_note: string | null }[] }[];
    viewer: { is_member: boolean };
  };

  it("ouvre l'espace de collaboration aux seuls participants", async () => {
    const detail = await db.as(amina, (s) => s.rpc<Detail>("get_collaboration", { p_id: collabId }));
    expect(detail.title).toBe("Flutter contre Python : construisons ensemble");
    expect(detail.status).toBe("active");
    const aminaMember = detail.members.find((member) => member.user.id === amina)!;
    const kodjoMember = detail.members.find((member) => member.user.id === kodjo)!;
    expect(aminaMember.gives.map((skill) => skill.name)).toEqual(["Python"]);
    expect(kodjoMember.gives.map((skill) => skill.name)).toEqual(["Dart", "Flutter"]);

    await db.as(intrus, async (s) => {
      expect(await s.rpc("get_collaboration", { p_id: collabId })).toBeNull();
      expect(await s.sql(`select * from public.collaborations`)).toEqual([]);
      expect(await s.sql(`select * from public.collaboration_members`)).toEqual([]);
      expect(
        await failure(s.rpc("create_task", { p_collaboration_id: collabId, p_title: "Tâche pirate", p_description: null, p_assigned_to: intrus, p_priority: "low", p_due_date: null, p_links: texts([]), p_attachment_path: null })),
      ).toMatch(/collaboration_not_found/);
    });
  });

  it("crée des tâches et notifie la personne à qui elles sont confiées", async () => {
    await db.as(kodjo, async (s) => {
      expect(await failure(s.rpc("confirm_completion", { p_collaboration_id: collabId }))).toMatch(/no_tasks/);
      expect(
        await failure(s.rpc("create_task", { p_collaboration_id: collabId, p_title: "Tâche hors équipe", p_description: null, p_assigned_to: intrus, p_priority: "low", p_due_date: null, p_links: texts([]), p_attachment_path: null })),
      ).toMatch(/assignee_not_member/);
      expect(
        await failure(s.rpc("create_task", { p_collaboration_id: collabId, p_title: "Fichier d'un autre", p_description: null, p_assigned_to: kodjo, p_priority: "low", p_due_date: null, p_links: texts([]), p_attachment_path: `${collabId}/${amina}/vol.pdf` })),
      ).toMatch(/invalid_attachment/);

      taskKodjo = await s.rpc<string>("create_task", {
        p_collaboration_id: collabId, p_title: "Écran de connexion Flutter", p_description: "Construire l'écran avec validation.",
        p_assigned_to: kodjo, p_priority: "high", p_due_date: "2026-12-01", p_links: texts([]), p_attachment_path: null,
      });
      taskAmina = await s.rpc<string>("create_task", {
        p_collaboration_id: collabId, p_title: "API de prédiction Python", p_description: null,
        p_assigned_to: amina, p_priority: "medium", p_due_date: null, p_links: texts([]), p_attachment_path: null,
      });
    });
    const assigned = await db.sql<{ user_id: string }>(`select user_id from public.notifications where type = 'task_assigned'`);
    expect(assigned).toEqual([{ user_id: amina }]);
  });

  it("réserve la soumission au responsable et la validation à l'autre participant", async () => {
    await db.as(amina, async (s) => {
      // Amina n'est pas responsable de la tâche de Kodjo.
      expect(
        await failure(s.rpc("submit_deliverable", { p_task_id: taskKodjo, p_description: "Je soumets à sa place.", p_external_url: null, p_attachment_path: null })),
      ).toMatch(/not_task_assignee/);
      // On ne peut pas passer une tâche « terminée » à la main.
      expect(await failure(s.rpc("set_task_status", { p_id: taskAmina, p_status: "done" }))).toMatch(/invalid_input/);
      expect(await failure(s.sql(`update public.tasks set status = 'done' where id = ${lit(taskAmina)}`))).toMatch(/permission denied/);
      await s.rpc("set_task_status", { p_id: taskAmina, p_status: "in_progress" });
    });

    const deliverableId = await db.as(kodjo, async (s) => {
      const id = await s.rpc<string>("submit_deliverable", {
        p_task_id: taskKodjo, p_description: "Écran terminé, validation des champs incluse.",
        p_external_url: "https://github.com/exemple/app/pull/1", p_attachment_path: null,
      });
      // Personne ne valide son propre travail.
      expect(await failure(s.rpc("review_deliverable", { p_id: id, p_decision: "approve" }))).toMatch(/cannot_review_own_deliverable/);
      // Une tâche en révision est verrouillée.
      expect(await failure(s.rpc("delete_task", { p_id: taskKodjo }))).toMatch(/task_locked/);
      return id;
    });

    await db.as(intrus, async (s) => {
      expect(await failure(s.rpc("review_deliverable", { p_id: deliverableId, p_decision: "approve" }))).toMatch(/collaboration_not_found/);
      expect(await s.sql(`select * from public.tasks`)).toEqual([]);
      expect(await s.sql(`select * from public.deliverables`)).toEqual([]);
    });

    await db.as(amina, async (s) => {
      expect(await failure(s.rpc("review_deliverable", { p_id: deliverableId, p_decision: "request_changes" }))).toMatch(/note_required/);
      await s.rpc("review_deliverable", { p_id: deliverableId, p_decision: "request_changes", p_note: "Il manque le message d'erreur réseau." });
      expect(await failure(s.rpc("review_deliverable", { p_id: deliverableId, p_decision: "approve" }))).toMatch(/deliverable_already_reviewed/);
    });

    // Correction puis validation : l'historique garde les deux soumissions.
    const second = await db.as(kodjo, (s) =>
      s.rpc<string>("submit_deliverable", { p_task_id: taskKodjo, p_description: "Message d'erreur réseau ajouté.", p_external_url: null, p_attachment_path: null }),
    );
    await db.as(amina, (s) => s.rpc("review_deliverable", { p_id: second, p_decision: "approve" }));

    const detail = await db.as(kodjo, (s) => s.rpc<Detail>("get_collaboration", { p_id: collabId }));
    const task = detail.tasks.find((item) => item.id === taskKodjo)!;
    expect(task.status).toBe("done");
    expect(task.deliverables.map((item) => item.validation_status)).toEqual(["approved", "changes_requested"]);
    expect(task.deliverables[1]!.review_note).toBe("Il manque le message d'erreur réseau.");
  });

  it("refuse la clôture tant qu'un livrable prévu n'est pas validé", async () => {
    await db.as(kodjo, async (s) => {
      expect(await failure(s.rpc("confirm_completion", { p_collaboration_id: collabId }))).toMatch(/deliverables_not_validated/);
      expect(
        await failure(s.rpc("submit_review", { p_collaboration_id: collabId, p_communication: 5, p_reliability: 5, p_quality: 5, p_collaboration: 5, p_comment: null })),
      ).toMatch(/collaboration_not_completed/);
    });

    const deliverable = await db.as(amina, (s) =>
      s.rpc<string>("submit_deliverable", { p_task_id: taskAmina, p_description: "API déployée, documentation jointe.", p_external_url: null, p_attachment_path: `${collabId}/${amina}/doc.pdf` }),
    );
    await db.as(kodjo, (s) => s.rpc("review_deliverable", { p_id: deliverable, p_decision: "approve", p_note: "Parfait." }));
  });

  it("clôture l'échange seulement quand les deux participants confirment", async () => {
    const first = await db.as(kodjo, (s) => s.rpc<{ status: string; waiting_for_partner: boolean }>("confirm_completion", { p_collaboration_id: collabId }));
    expect(first).toEqual({ status: "active", waiting_for_partner: true });
    const [pending] = await db.sql<{ status: string }>(`select status from public.collaborations where id = ${lit(collabId)}`);
    expect(pending!.status).toBe("active");

    const second = await db.as(amina, (s) => s.rpc<{ status: string; waiting_for_partner: boolean }>("confirm_completion", { p_collaboration_id: collabId }));
    expect(second).toEqual({ status: "completed", waiting_for_partner: false });

    await db.as(kodjo, async (s) => {
      // Une collaboration terminée est figée.
      expect(
        await failure(s.rpc("create_task", { p_collaboration_id: collabId, p_title: "Tâche tardive", p_description: null, p_assigned_to: kodjo, p_priority: "low", p_due_date: null, p_links: texts([]), p_attachment_path: null })),
      ).toMatch(/collaboration_not_active/);
    });
  });
});

describe("réputation", () => {
  it("n'accepte qu'une évaluation par participant, après la clôture", async () => {
    await db.as(intrus, async (s) => {
      expect(
        await failure(s.rpc("submit_review", { p_collaboration_id: collabId, p_communication: 1, p_reliability: 1, p_quality: 1, p_collaboration: 1, p_comment: "Faux avis" })),
      ).toMatch(/collaboration_not_found/);
    });
    await db.as(amina, async (s) => {
      expect(
        await failure(s.rpc("submit_review", { p_collaboration_id: collabId, p_communication: 6, p_reliability: 5, p_quality: 5, p_collaboration: 5, p_comment: null })),
      ).toMatch(/check constraint/);
      await s.rpc("submit_review", { p_collaboration_id: collabId, p_communication: 5, p_reliability: 4, p_quality: 5, p_collaboration: 5, p_comment: "Kodjo explique très bien Flutter." });
      expect(
        await failure(s.rpc("submit_review", { p_collaboration_id: collabId, p_communication: 5, p_reliability: 5, p_quality: 5, p_collaboration: 5, p_comment: null })),
      ).toMatch(/review_already_exists/);
    });
  });

  it("inscrit les réalisations au profil public", async () => {
    type Profile = {
      stats: Record<string, number | null>;
      calendar: { day: string; count: number }[];
      collaborations: { title: string; partner: { id: string }; skills: { name: string }[] }[];
      reviews: { comment: string; reviewer: { id: string } }[];
      viewer: { is_self: boolean };
    };
    const username = (await db.sql<{ username: string }>(`select username from public.profiles where id = ${lit(kodjo)}`))[0]!.username;
    const profile = await db.as(null, (s) => s.rpc<Profile>("get_profile", { p_username: username }));
    expect(profile.stats).toMatchObject({
      exchanges_completed: 1, active_collaborations: 0, tasks_validated: 1,
      people_helped: 1, skills_shared: 2, reviews_count: 1, avg_reliability: 4,
    });
    expect(profile.collaborations[0]).toMatchObject({ partner: { id: amina } });
    expect(profile.collaborations[0]!.skills.map((skill) => skill.name)).toEqual(["Dart", "Flutter"]);
    expect(profile.reviews[0]).toMatchObject({ comment: "Kodjo explique très bien Flutter.", reviewer: { id: amina } });
    expect(profile.calendar.reduce((sum, day) => sum + day.count, 0)).toBeGreaterThanOrEqual(5);
    expect(profile.viewer.is_self).toBe(false);
    expect(JSON.stringify(profile)).not.toContain("@devbridge.test");
  });

  it("alimente le tableau de bord avec des chiffres réels", async () => {
    type Summary = {
      stats: Record<string, number>;
      recent_activity: { event_type: string }[];
      profile: { score: number; missing: string[] };
      active_collaborations: unknown[];
    };
    const summary = await db.as(kodjo, (s) => s.rpc<Summary>("dashboard_summary"));
    expect(summary.stats).toEqual({ active_exchanges: 0, proposals_received: 0, completed_exchanges: 1, matches_available: 1 });
    expect(summary.recent_activity.map((item) => item.event_type)).toContain("collaboration_completed");
    expect(summary.profile.missing).toEqual(["bio", "avatar", "experience"]);
    expect(summary.profile.score).toBe(65);
  });
});

describe("messagerie", () => {
  it("échange des messages entre les deux membres uniquement", async () => {
    const conversationId = (await db.sql<{ id: string }>(`select id from public.conversations limit 1`))[0]!.id;

    await db.as(intrus, async (s) => {
      expect(await failure(s.rpc("send_message", { p_conversation_id: conversationId, p_content: "Bonjour" }))).toMatch(/conversation_not_found/);
      expect(await s.rpc("get_conversation", { p_id: conversationId })).toBeNull();
    });

    await db.as(kodjo, async (s) => {
      expect(await s.rpc<number>("mark_conversation_read", { p_conversation_id: conversationId })).toBe(1);
      expect(await failure(s.rpc("send_message", { p_conversation_id: conversationId, p_content: "   " }))).toMatch(/invalid_input/);
      await s.rpc("send_message", { p_conversation_id: conversationId, p_content: "Merci Amina !" });
      await s.rpc("send_message", { p_conversation_id: conversationId, p_content: "On remet ça bientôt ?" });
    });

    // Deux messages non lus, mais une seule notification regroupée.
    const notifications = await db.sql<{ content: string }>(
      `select content from public.notifications where user_id = ${lit(amina)} and type = 'new_message' and not is_read`,
    );
    expect(notifications).toEqual([{ content: "On remet ça bientôt ?" }]);

    await db.as(amina, async (s) => {
      const context = await s.rpc<{ unread_messages: number; is_admin: boolean }>("viewer_context");
      expect(context).toMatchObject({ unread_messages: 2, is_admin: false });
      const messages = await s.sql<{ content: string }>(`select content from public.messages where conversation_id = ${lit(conversationId)} order by created_at`);
      expect(messages).toHaveLength(3);
      expect(await s.rpc<number>("mark_conversation_read", { p_conversation_id: conversationId })).toBe(2);
      expect((await s.rpc<{ unread_messages: number }>("viewer_context")).unread_messages).toBe(0);
      const conversation = await s.rpc<{ collaborations: { id: string }[] }>("get_conversation", { p_id: conversationId });
      expect(conversation.collaborations.map((item) => item.id)).toEqual([collabId]);
    });
  });

  it("limite le nombre de messages par minute", async () => {
    const conversationId = (await db.sql<{ id: string }>(`select id from public.conversations limit 1`))[0]!.id;
    const error = await db.as(kodjo, async (s) => {
      for (let index = 0; index < 40; index += 1) {
        try {
          await s.rpc("send_message", { p_conversation_id: conversationId, p_content: `Message ${index}` });
        } catch (caught) {
          return (caught as Error).message;
        }
      }
      return null;
    });
    expect(error).toMatch(/rate_limited/);
  });
});

describe("prise de contact directe et suppression de compte", () => {
  it("permet une proposition sans annonce, puis son annulation", async () => {
    const [react] = await db.skillIds("react");
    const id = await db.as(intrus, (s) =>
      s.rpc<string>("send_proposal", { p_receiver_id: amina, p_offer_id: null, p_message: "Bonjour Amina, je cherche de l'aide en Python pour un projet.", p_offered: uuids([react!]), p_requested: uuids([skills.python]) }),
    );
    await db.as(intrus, async (s) => {
      expect(
        await failure(s.rpc("send_proposal", { p_receiver_id: amina, p_offer_id: null, p_message: "Bonjour Amina, je retente ma chance aujourd'hui.", p_offered: uuids([]), p_requested: uuids([skills.python]) })),
      ).toMatch(/proposal_already_exists/);
      await s.rpc("cancel_proposal", { p_id: id });
    });
    const proposals = await db.as(amina, (s) => s.rpc<{ id: string; status: string; direction: string }[]>("list_my_proposals"));
    expect(proposals.find((item) => item.id === id)).toMatchObject({ status: "cancelled", direction: "received" });
  });

  it("supprime le compte et tout ce qui lui est rattaché", async () => {
    await db.as(intrus, (s) => s.rpc("delete_my_account"));
    const [row] = await db.sql<{ profiles: number; proposals: number }>(
      `select (select count(*)::int from public.profiles where id = ${lit(intrus)}) as profiles,
              (select count(*)::int from public.exchange_proposals where sender_id = ${lit(intrus)}) as proposals`,
    );
    expect(row).toEqual({ profiles: 0, proposals: 0 });
  });
});
