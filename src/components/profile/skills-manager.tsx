"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { saveSkillsAction } from "@/lib/actions/profile";
import type { Skill, UserSkill } from "@/lib/types";
import { LeveledSkillPicker, type LeveledSkill } from "../shared/skill-picker";
import { Button } from "../ui/button";
import { useAction } from "../ui/client";
import { Card, Notice, SectionTitle } from "../ui/primitives";

function toLeveled(skills: UserSkill[]): LeveledSkill[] {
  return skills.map((skill) => ({ skill_id: skill.id, level: skill.level }));
}

function same(a: LeveledSkill[], b: LeveledSkill[]): boolean {
  if (a.length !== b.length) return false;
  const map = new Map(a.map((item) => [item.skill_id, item.level]));
  return b.every((item) => map.has(item.skill_id) && map.get(item.skill_id) === item.level);
}

/** Les deux listes qui font tout DevBridge : ce que je propose, ce que je recherche. */
export function SkillsManager({
  skills,
  offered,
  wanted,
}: {
  skills: Skill[];
  offered: UserSkill[];
  wanted: UserSkill[];
}) {
  const [savedOffered, setSavedOffered] = useState(() => toLeveled(offered));
  const [savedWanted, setSavedWanted] = useState(() => toLeveled(wanted));
  const [give, setGive] = useState(savedOffered);
  const [get, setGet] = useState(savedWanted);
  const giving = useAction();
  const getting = useAction();

  const giveDirty = !same(give, savedOffered);
  const getDirty = !same(get, savedWanted);

  return (
    <div className="space-y-6">
      <Notice tone="brand" icon={Info}>
        Tes correspondances sont recalculées à chaque enregistrement. Une correspondance réciproque demande les deux
        listes.
      </Notice>

      <Card className="space-y-5">
        <SectionTitle
          title="Ce que je propose"
          description="Les compétences que tu peux mettre au service de quelqu'un. Le niveau est déclaré par toi : il n'est ni vérifié ni présenté comme une certification."
        />
        <LeveledSkillPicker
          label="Compétences proposées"
          skills={skills}
          value={give}
          onChange={setGive}
          withLevels
          tone="offer"
          exclude={get.map((item) => item.skill_id)}
        />
        <div className="flex items-center justify-end gap-3">
          {giveDirty ? <span className="text-sm text-warm-strong">Modifications non enregistrées</span> : null}
          <Button
            disabled={!giveDirty}
            loading={giving.pending}
            onClick={() =>
              giving.run(() => saveSkillsAction({ type: "offered", items: give }), {
                refresh: true,
                success: "Compétences proposées enregistrées.",
                onSuccess: () => setSavedOffered(give),
              })
            }
          >
            Enregistrer
          </Button>
        </div>
      </Card>

      <Card className="space-y-5">
        <SectionTitle
          title="Ce que je recherche"
          description="Ce que tu veux apprendre, ou ce sur quoi tu as besoin d'aide pour faire avancer ton projet."
        />
        <LeveledSkillPicker
          label="Compétences recherchées"
          skills={skills}
          value={get}
          onChange={setGet}
          withLevels={false}
          tone="want"
          exclude={give.map((item) => item.skill_id)}
        />
        <div className="flex items-center justify-end gap-3">
          {getDirty ? <span className="text-sm text-warm-strong">Modifications non enregistrées</span> : null}
          <Button
            disabled={!getDirty}
            loading={getting.pending}
            onClick={() =>
              getting.run(() => saveSkillsAction({ type: "wanted", items: get }), {
                refresh: true,
                success: "Compétences recherchées enregistrées.",
                onSuccess: () => setSavedWanted(get),
              })
            }
          >
            Enregistrer
          </Button>
        </div>
      </Card>
    </div>
  );
}
