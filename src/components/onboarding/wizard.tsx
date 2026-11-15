"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { saveSkillsAction, updateProfileAction } from "@/lib/actions/profile";
import type { ActionResult, ProfileCard, Skill, SkillKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AvailabilityFields,
  AvatarField,
  IdentityFields,
  LinkFields,
  LocationFields,
  PresentationFields,
  toPatch,
  useProfileDraft,
  type ProfileDraft,
} from "../profile/profile-form";
import { LeveledSkillPicker, type LeveledSkill } from "../shared/skill-picker";
import { Button } from "../ui/button";
import { toast, useAction } from "../ui/client";
import { Progress } from "../ui/primitives";

const STEPS = [
  { title: "Informations personnelles", text: "Comment les autres développeurs te verront.", optional: false },
  { title: "Pays et localisation", text: "Pour trouver des personnes proches de toi, ou à la bonne heure.", optional: false },
  { title: "Présentation", text: "Quelques lignes sur ce que tu construis.", optional: true },
  { title: "Tes savoir-faire", text: "Les domaines dans lesquels tu peux aider quelqu'un.", optional: true },
  { title: "Technologies maîtrisées", text: "Les langages et outils que tu pratiques.", optional: true },
  { title: "Ce que tu recherches", text: "Ce que tu veux apprendre, ou ce sur quoi tu as besoin d'aide.", optional: true },
  { title: "Disponibilités", text: "Quand et comment tu préfères collaborer.", optional: true },
  { title: "Liens professionnels", text: "Pour que les autres découvrent ton travail.", optional: true },
] as const;

function initialSkills(profile: ProfileCard, kind: SkillKind): LeveledSkill[] {
  return profile.offered
    .filter((skill) => skill.kind === kind)
    .map((skill) => ({ skill_id: skill.id, level: skill.level }));
}

/**
 * Accueil en huit étapes. Chaque étape est enregistrée en la quittant : on peut
 * s'arrêter à tout moment et reprendre plus tard, là où l'on s'était arrêté.
 */
export function OnboardingWizard({
  profile,
  skills,
  startAt,
}: {
  profile: ProfileCard;
  skills: Skill[];
  startAt: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(Math.max(startAt, 0), STEPS.length - 1));
  const { draft, set, errors, setErrors } = useProfileDraft(profile);
  const [competences, setCompetences] = useState(() => initialSkills(profile, "competence"));
  const [technologies, setTechnologies] = useState(() => initialSkills(profile, "technology"));
  const [wanted, setWanted] = useState<LeveledSkill[]>(() =>
    profile.wanted.map((skill) => ({ skill_id: skill.id, level: null })),
  );
  const { pending, run } = useAction();
  const top = useRef<HTMLDivElement>(null);
  const last = step === STEPS.length - 1;
  const current = STEPS[step]!;

  const goTo = (next: number) => {
    setStep(next);
    top.current?.scrollIntoView({ block: "start" });
  };

  const finish = () => {
    toast.success("Bienvenue sur DevBridge !");
    router.push("/pour-toi");
    router.refresh();
  };

  const profilePatch = (keys: (keyof ProfileDraft)[], extra: Record<string, unknown> = {}) =>
    updateProfileAction({ ...toPatch(draft, keys), ...extra });

  /** Enregistre l'étape affichée. */
  const saveStep = (target: number, complete: boolean): Promise<ActionResult<unknown>> => {
    const extra = complete ? { onboarding_step: 8, onboarding_completed: true } : { onboarding_step: target };
    switch (step) {
      case 0:
        return profilePatch(["first_name", "last_name", "username"], extra);
      case 1:
        return profilePatch(["country", "city", "timezone", "languages"], extra);
      case 2:
        return profilePatch(["headline", "bio", "experience_level", "main_domain"], extra);
      case 3:
        return saveSkillsAction({ type: "offered", kind: "competence", items: competences }).then((result) =>
          result.ok ? updateProfileAction(extra) : result,
        );
      case 4:
        return saveSkillsAction({ type: "offered", kind: "technology", items: technologies }).then((result) =>
          result.ok ? updateProfileAction(extra) : result,
        );
      case 5:
        return saveSkillsAction({ type: "wanted", items: wanted }).then((result) =>
          result.ok ? updateProfileAction(extra) : result,
        );
      case 6:
        return profilePatch(["availability", "collaboration_modes"], extra);
      default:
        return profilePatch(["github_url", "portfolio_url", "linkedin_url", "website_url"], extra);
    }
  };

  const next = (complete = false) => {
    run(() => saveStep(step + 1, complete || last), {
      onError: (result) => {
        setErrors(result.fields ?? {});
        toast.error(result.error);
      },
      onSuccess: () => {
        if (complete || last) finish();
        else goTo(step + 1);
      },
    });
  };

  /** Passe une étape facultative sans rien y enregistrer. */
  const skip = () => {
    run(() => updateProfileAction(last ? { onboarding_step: 8, onboarding_completed: true } : { onboarding_step: step + 1 }), {
      onSuccess: () => (last ? finish() : goTo(step + 1)),
    });
  };

  const section = { draft, set, errors };
  const offeredIds = [...competences, ...technologies].map((item) => item.skill_id);

  return (
    <div ref={top} className="scroll-mt-6">
      <div className="mb-8">
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <p className="font-medium text-brand">
            Étape {step + 1} sur {STEPS.length}
          </p>
          {step >= 2 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => next(true)}
              className="font-medium text-muted hover:text-ink disabled:opacity-50"
            >
              Enregistrer et terminer plus tard
            </button>
          ) : null}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} label="Progression de l'accueil" className="mt-3" />
        <ol className="scroll-quiet mt-4 flex gap-1.5 overflow-x-auto" aria-label="Étapes">
          {STEPS.map((item, index) => (
            <li key={item.title}>
              <button
                type="button"
                disabled={index > step || pending}
                onClick={() => goTo(index)}
                aria-current={index === step ? "step" : undefined}
                className={cn(
                  "flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium transition-colors",
                  index === step
                    ? "bg-ink text-white"
                    : index < step
                      ? "bg-ok-soft text-ok-strong hover:bg-[#d2efe1]"
                      : "bg-field text-faint",
                )}
              >
                {index < step ? <Check className="size-3.5" aria-hidden /> : null}
                {item.title}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-3xl bg-surface p-6 shadow-card sm:p-9">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{current.title}</h1>
        <p className="mt-2 text-muted">{current.text}</p>

        <div className="mt-8">
          {step === 0 ? (
            <div className="space-y-7">
              <AvatarField userId={profile.id} draft={draft} set={set} />
              <IdentityFields {...section} />
            </div>
          ) : null}
          {step === 1 ? <LocationFields {...section} /> : null}
          {step === 2 ? <PresentationFields {...section} /> : null}
          {step === 3 ? (
            <LeveledSkillPicker
              label="Savoir-faire proposés"
              skills={skills}
              kind="competence"
              value={competences}
              onChange={setCompetences}
              withLevels
              tone="offer"
              max={15}
            />
          ) : null}
          {step === 4 ? (
            <LeveledSkillPicker
              label="Technologies maîtrisées"
              skills={skills}
              kind="technology"
              value={technologies}
              onChange={setTechnologies}
              withLevels
              tone="offer"
              max={15}
            />
          ) : null}
          {step === 5 ? (
            <LeveledSkillPicker
              label="Compétences recherchées"
              skills={skills}
              value={wanted}
              onChange={setWanted}
              withLevels={false}
              tone="want"
              exclude={offeredIds}
              max={15}
            />
          ) : null}
          {step === 6 ? <AvailabilityFields {...section} /> : null}
          {step === 7 ? <LinkFields {...section} /> : null}
        </div>

        {step === 3 || step === 4 ? (
          <p className="mt-5 text-sm text-muted">
            Le niveau est déclaré par toi. Il aide les autres à se situer : ce n&apos;est pas une certification.
          </p>
        ) : null}
        {step === 5 && offeredIds.length === 0 ? (
          <p className="mt-5 rounded-xl bg-warm-soft px-4 py-3 text-sm text-ink">
            Tu n&apos;as indiqué aucune compétence proposée. Sans elle, DevBridge ne peut pas trouver d&apos;échange
            réciproque : tu pourras en ajouter à tout moment depuis « Mes compétences ».
          </p>
        ) : null}

        <div className="mt-9 flex flex-wrap items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => goTo(step - 1)} disabled={pending}>
              <ArrowLeft aria-hidden /> Retour
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-2">
            {current.optional ? (
              <Button variant="subtle" onClick={skip} disabled={pending}>
                Passer cette étape
              </Button>
            ) : null}
            <Button onClick={() => next()} loading={pending}>
              {last ? "Terminer et voir mes correspondances" : "Continuer"}
              {pending ? null : <ArrowRight aria-hidden />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
