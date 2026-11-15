"use client";

import { ArrowRight, Check, CircleCheck, Hourglass, RefreshCw, Repeat2, X } from "lucide-react";
import Link from "next/link";
import { proposeLoopAction, respondToLoopAction } from "@/lib/actions/exchange";
import { refreshMatchesAction } from "@/lib/actions/profile";
import { languageName } from "@/lib/data/countries";
import type { LoopCandidate, LoopItem, ProfileMini, Skill } from "@/lib/types";
import { cn, fullName } from "@/lib/utils";
import { Button } from "../ui/button";
import { ConfirmDialog, useAction } from "../ui/client";
import { Avatar, Badge, DemoBadge, SkillChip } from "../ui/primitives";

function Leg({
  from,
  to,
  skills,
  me,
  accepted,
}: {
  from: ProfileMini | null;
  to: ProfileMini | null;
  skills: Skill[];
  me: string;
  accepted?: boolean;
}) {
  const giver = from?.id === me ? "Tu" : (from?.first_name ?? "?");
  const receiver = to?.id === me ? "toi" : (to?.first_name ?? "?");
  const mine = from?.id === me || to?.id === me;
  return (
    <li className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3.5 py-3", mine ? "bg-flow-soft" : "bg-canvas")}>
      <span className="flex items-center gap-2 text-sm font-medium text-ink">
        <Avatar person={from} size="xs" />
        {giver}
        {from?.is_demo ? <DemoBadge /> : null}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-muted">
        {from?.id === me ? "aides" : "aide"} <ArrowRight className="size-3.5 text-flow-strong" aria-hidden />
      </span>
      <span className="flex items-center gap-2 text-sm font-medium text-ink">
        <Avatar person={to} size="xs" />
        {receiver}
      </span>
      <span className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <SkillChip key={skill.id} tone="want">{skill.name}</SkillChip>
        ))}
      </span>
      {accepted !== undefined ? (
        <span className="ml-auto flex items-center gap-1 text-xs text-muted">
          {accepted ? (
            <>
              <Check className="size-3.5 text-ok" aria-hidden /> {from?.id === me ? "Tu as accepté" : "A accepté"}
            </>
          ) : (
            <>
              <Hourglass className="size-3.5" aria-hidden /> En attente
            </>
          )}
        </span>
      ) : null}
    </li>
  );
}

/** Une boucle possible : j'aide B, B aide C, C m'aide. */
export function LoopCandidateCard({ loop, me }: { loop: LoopCandidate; me: ProfileMini }) {
  return (
    <article className="rounded-2xl bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="flow">
          <Repeat2 aria-hidden /> Boucle possible
        </Badge>
        {loop.common_languages.length ? (
          <span className="text-xs text-muted">
            Langue commune aux trois : {loop.common_languages.map((code) => languageName(code).toLowerCase()).join(", ")}
          </span>
        ) : (
          <span className="text-xs text-muted">Pas de langue commune aux trois</span>
        )}
      </div>
      <ul className="mt-4 space-y-2">
        <Leg from={me} to={loop.b} skills={loop.skills_ab} me={me.id} />
        <Leg from={loop.b} to={loop.c} skills={loop.skills_bc} me={me.id} />
        <Leg from={loop.c} to={me} skills={loop.skills_ca} me={me.id} />
      </ul>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <Link href={`/developpeurs/${loop.b.username}`} className="link">
            {fullName(loop.b)}
          </Link>{" "}
          et{" "}
          <Link href={`/developpeurs/${loop.c.username}`} className="link">
            {fullName(loop.c)}
          </Link>{" "}
          recevront une invitation.
        </p>
        <ConfirmDialog
          trigger={
            <Button size="sm">
              Proposer cette boucle <ArrowRight aria-hidden />
            </Button>
          }
          title="Proposer cette boucle à trois ?"
          description={`${fullName(loop.b)} et ${fullName(loop.c)} seront invités à la rejoindre. Rien ne démarre tant que les trois n'ont pas accepté.`}
          confirmLabel="Envoyer les invitations"
          action={() => proposeLoopAction(loop.b.id, loop.c.id)}
          success="Invitations envoyées."
        />
      </div>
    </article>
  );
}

/** Une boucle déjà proposée : chacun peut l'accepter ou la décliner. */
export function LoopCard({ loop, me }: { loop: LoopItem; me: string }) {
  const { pending, run } = useAction();
  const waiting = loop.legs.filter((leg) => !leg.accepted).length;

  return (
    <article className="rounded-2xl bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        {loop.status === "active" ? (
          <Badge tone="ok">
            <CircleCheck aria-hidden /> Boucle démarrée
          </Badge>
        ) : loop.status === "declined" ? (
          <Badge>Boucle annulée</Badge>
        ) : (
          <Badge tone="warm">
            <Hourglass aria-hidden /> {waiting === 1 ? "Encore une acceptation attendue" : `${waiting} acceptations attendues`}
          </Badge>
        )}
        {loop.is_demo ? <DemoBadge /> : null}
      </div>
      <ul className="mt-4 space-y-2">
        {loop.legs.map((leg, index) => (
          <Leg
            key={index}
            from={leg.from}
            to={leg.to}
            skills={leg.skills}
            me={me}
            accepted={loop.status === "proposed" ? leg.accepted : undefined}
          />
        ))}
      </ul>
      {loop.status === "proposed" ? (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          {loop.my_acceptance ? (
            <p className="mr-auto text-sm text-muted">Tu as accepté. La boucle démarre dès que les autres auront répondu.</p>
          ) : (
            <p className="mr-auto text-sm text-ink">Tu donnes une fois, tu reçois une fois. Partant ?</p>
          )}
          <ConfirmDialog
            trigger={
              <Button variant="subtle" size="sm" disabled={pending}>
                <X aria-hidden /> {loop.my_acceptance ? "Me retirer" : "Décliner"}
              </Button>
            }
            title="Décliner cette boucle ?"
            description="La boucle sera annulée pour les trois personnes. D'autres combinaisons pourront être proposées."
            confirmLabel="Décliner"
            tone="danger"
            action={() => respondToLoopAction(loop.id, false)}
            success="Boucle déclinée."
          />
          {loop.my_acceptance ? null : (
            <Button
              size="sm"
              loading={pending}
              onClick={() =>
                run(() => respondToLoopAction(loop.id, true), {
                  refresh: true,
                  success: (data) =>
                    data.status === "active"
                      ? "La boucle démarre : tes espaces de collaboration sont ouverts."
                      : "C'est noté. On attend les autres réponses.",
                })
              }
            >
              <Check aria-hidden /> Accepter
            </Button>
          )}
        </div>
      ) : loop.status === "active" ? (
        <div className="mt-5 flex justify-end">
          <Button asChild variant="soft" size="sm">
            <Link href="/collaborations">Ouvrir mes collaborations</Link>
          </Button>
        </div>
      ) : null}
    </article>
  );
}

export function RefreshMatchesButton() {
  const { pending, run } = useAction();
  return (
    <Button
      variant="subtle"
      loading={pending}
      onClick={() =>
        run(() => refreshMatchesAction(), {
          refresh: true,
          success: (total) =>
            total > 0 ? `Correspondances à jour (${total}).` : "Aucune correspondance pour le moment.",
        })
      }
    >
      {pending ? null : <RefreshCw aria-hidden />} Actualiser
    </Button>
  );
}
