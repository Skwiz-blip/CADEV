"use client";

import { Check, Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { LEVELS, SKILL_CATEGORIES } from "@/lib/labels";
import type { Skill, SkillKind, SkillLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Select } from "../ui/field";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

type PickerProps = {
  skills: Skill[];
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  kind?: SkillKind;
  /** Compétences à ne pas proposer (déjà choisies dans l'autre liste, par exemple). */
  exclude?: string[];
  /** Compétences mises en avant en tête de liste. */
  suggested?: string[];
  tone?: "offer" | "want" | "neutral";
  label: string;
  invalid?: boolean;
  compact?: boolean;
};

const SELECTED_TONES = {
  offer: "bg-brand text-white",
  want: "bg-flow-strong text-white",
  neutral: "bg-ink text-white",
} as const;

/**
 * Sélecteur de compétences issu du catalogue : recherche tolérante aux accents,
 * regroupement par famille, limite de sélection. Pas de saisie libre.
 */
export function SkillPicker({
  skills,
  value,
  onChange,
  max = 30,
  kind,
  exclude = [],
  suggested = [],
  tone = "neutral",
  label,
  invalid,
  compact = false,
}: PickerProps) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const byId = useMemo(() => new Map(skills.map((skill) => [skill.id, skill])), [skills]);

  const available = useMemo(() => {
    const hidden = new Set(exclude);
    const needle = normalize(query.trim());
    return skills.filter(
      (skill) =>
        (!kind || skill.kind === kind) &&
        !hidden.has(skill.id) &&
        (!needle || normalize(skill.name).includes(needle)),
    );
  }, [skills, kind, exclude, query]);

  const groups = useMemo(() => {
    const map = new Map<string, Skill[]>();
    const highlighted = available.filter((skill) => suggested.includes(skill.id));
    if (highlighted.length && !query.trim()) map.set("__suggested", highlighted);
    for (const skill of available) {
      const list = map.get(skill.category) ?? [];
      list.push(skill);
      map.set(skill.category, list);
    }
    return [...map.entries()];
  }, [available, suggested, query]);

  const full = value.length >= max;

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((item) => item !== id));
    else if (!full) onChange([...value, id]);
  };

  return (
    <div className={cn("rounded-2xl bg-canvas p-3 sm:p-4", invalid && "outline-2 outline-danger")}>
      {value.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-1.5" aria-label={`${label} : sélection`}>
          {value.map((id) => {
            const skill = byId.get(id);
            if (!skill) return null;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg py-1 pl-2.5 pr-1.5 text-[13px] font-medium transition-opacity hover:opacity-85",
                    SELECTED_TONES[tone],
                  )}
                >
                  {skill.name}
                  <X className="size-3.5" aria-hidden />
                  <span className="sr-only">Retirer</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Rechercher : {label}
        </label>
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          placeholder="Rechercher une compétence…"
          autoComplete="off"
          className="field bg-surface pl-10 hover:bg-surface"
        />
      </div>

      <div
        className={cn("mt-3 space-y-3 overflow-y-auto pr-1", compact ? "max-h-40" : "max-h-60")}
        role="group"
        aria-label={label}
      >
        {groups.length === 0 ? (
          <p className="px-1 py-3 text-sm text-muted">Aucune compétence ne correspond à « {query} ».</p>
        ) : (
          groups.map(([category, items]) => (
            <div key={category}>
              <p className="mb-1.5 px-0.5 text-[11px] font-medium text-faint">
                {category === "__suggested" ? "Suggestions" : (SKILL_CATEGORIES[category] ?? category)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((skill) => {
                  const selected = value.includes(skill.id);
                  return (
                    <button
                      key={`${category}-${skill.id}`}
                      type="button"
                      aria-pressed={selected}
                      disabled={!selected && full}
                      onClick={() => toggle(skill.id)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-40",
                        selected ? SELECTED_TONES[tone] : "bg-surface text-ink hover:bg-field-strong",
                      )}
                    >
                      {selected ? <Check className="size-3.5" aria-hidden /> : null}
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      <p className="mt-3 px-0.5 text-xs text-muted" aria-live="polite">
        {value.length} sélectionnée{value.length > 1 ? "s" : ""} sur {max} au maximum
      </p>
    </div>
  );
}

export type LeveledSkill = { skill_id: string; level: SkillLevel | null };

/** Sélecteur + niveau déclaré pour chaque compétence choisie. */
export function LeveledSkillPicker({
  skills,
  value,
  onChange,
  withLevels,
  ...props
}: Omit<PickerProps, "value" | "onChange"> & {
  value: LeveledSkill[];
  onChange: (next: LeveledSkill[]) => void;
  withLevels: boolean;
}) {
  const byId = useMemo(() => new Map(skills.map((skill) => [skill.id, skill])), [skills]);
  const ids = value.map((item) => item.skill_id);

  const setIds = (next: string[]) => {
    const current = new Map(value.map((item) => [item.skill_id, item.level]));
    onChange(
      next.map((id) => ({
        skill_id: id,
        level: current.get(id) ?? (withLevels ? "intermediate" : null),
      })),
    );
  };

  return (
    <div className="space-y-3">
      <SkillPicker skills={skills} value={ids} onChange={setIds} {...props} />
      {withLevels && value.length > 0 ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {value.map((item) => {
            const skill = byId.get(item.skill_id);
            if (!skill) return null;
            return (
              <li key={item.skill_id} className="flex items-center justify-between gap-3 rounded-xl bg-canvas py-1.5 pl-3.5 pr-1.5">
                <span className="truncate text-sm font-medium text-ink">{skill.name}</span>
                <span className="w-40 shrink-0">
                  <Select
                    aria-label={`Niveau déclaré en ${skill.name}`}
                    value={item.level ?? "intermediate"}
                    onChange={(event) =>
                      onChange(
                        value.map((entry) =>
                          entry.skill_id === item.skill_id
                            ? { ...entry, level: event.target.value as SkillLevel }
                            : entry,
                        ),
                      )
                    }
                    className="min-h-9 bg-surface py-1.5 text-sm hover:bg-surface"
                  >
                    {Object.entries(LEVELS).map(([key, text]) => (
                      <option key={key} value={key}>
                        {text}
                      </option>
                    ))}
                  </Select>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
