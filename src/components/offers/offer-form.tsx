"use client";

import { ArrowLeft, ArrowRight, Eye, GraduationCap, LifeBuoy, Plus, Repeat, Send, Trash2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveOfferAction } from "@/lib/actions/exchange";
import { COUNTRIES, LANGUAGES } from "@/lib/data/countries";
import { AVAILABILITY, COLLABORATION_MODES, DESIRED_LEVELS, DURATIONS, EXCHANGE_TYPES } from "@/lib/labels";
import type { ExchangeType, OfferCard as Offer, ProfileCard, Skill } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fieldErrors, offerSchema, type OfferInput } from "@/lib/validation";
import { OfferCard, OfferMeta } from "../shared/cards";
import { SkillPicker } from "../shared/skill-picker";
import { Button } from "../ui/button";
import { ChoiceChips, toast, useAction, useStoredValue, writeStoredValue } from "../ui/client";
import { Field, Fieldset, Input, Select, Textarea } from "../ui/field";
import { Card, Notice, SkillList } from "../ui/primitives";

const DRAFT_KEY = "devbridge:brouillon:annonce";

const TYPE_ICONS = { reciprocal: Repeat, one_off: LifeBuoy, mentoring: GraduationCap } as const;

type FormState = Omit<OfferInput, "id">;

function emptyState(profile: ProfileCard): FormState {
  return {
    title: "",
    description: "",
    exchange_type: "reciprocal",
    collaboration_type: profile.collaboration_modes[0] ?? "remote",
    estimated_duration: "few_days",
    desired_level: "any",
    availability: profile.availability,
    language: profile.languages[0] ?? "fr",
    country: profile.country ?? "",
    links: [],
    conditions: "",
    proposed: [],
    requested: [],
    related: [],
    urgent: false,
  };
}

function fromOffer(offer: Offer): FormState {
  return {
    title: offer.title,
    description: offer.description,
    exchange_type: offer.exchange_type,
    collaboration_type: offer.collaboration_type,
    estimated_duration: offer.estimated_duration,
    desired_level: offer.desired_level,
    availability: offer.availability,
    language: offer.language,
    country: offer.country ?? "",
    links: offer.links,
    conditions: offer.conditions ?? "",
    proposed: offer.proposed.map((skill) => skill.id),
    requested: offer.requested.map((skill) => skill.id),
    related: offer.related.map((skill) => skill.id),
    urgent: offer.is_urgent,
  };
}

/**
 * Formulaire d'annonce en deux temps : rédaction, puis prévisualisation avant
 * publication. Le brouillon d'une nouvelle annonce est gardé sur l'appareil.
 */
export function OfferForm({
  skills,
  profile,
  offer,
  express = false,
}: {
  skills: Skill[];
  profile: ProfileCard;
  offer?: Offer;
  express?: boolean;
}) {
  const router = useRouter();
  const editing = Boolean(offer);
  const [state, setState] = useState<FormState>(() => {
    if (offer) return fromOffer(offer);
    const base = emptyState(profile);
    return express ? { ...base, exchange_type: "one_off", estimated_duration: "under_hour", urgent: true } : base;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"edit" | "preview">("edit");
  // Brouillon local (nouvelle annonce uniquement) : proposé à la reprise, jamais imposé.
  const storedDraft = useStoredValue(DRAFT_KEY);
  const [edited, setEdited] = useState(false);
  const [draftDecided, setDraftDecided] = useState(false);
  const { pending, run } = useAction();
  const topRef = useRef<HTMLDivElement>(null);

  const savedDraft = useMemo(() => {
    if (editing || !storedDraft) return null;
    try {
      const draft = JSON.parse(storedDraft) as Partial<FormState>;
      return draft.title || draft.description ? draft : null;
    } catch {
      return null;
    }
  }, [editing, storedDraft]);
  const draftAvailable = Boolean(savedDraft) && !edited && !draftDecided;

  // Enregistrement discret de la saisie en cours.
  useEffect(() => {
    if (editing || !edited) return;
    const timer = setTimeout(() => writeStoredValue(DRAFT_KEY, JSON.stringify(state)), 500);
    return () => clearTimeout(timer);
  }, [state, editing, edited]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setEdited(true);
    setState((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const setType = (type: ExchangeType) => {
    setEdited(true);
    setState((current) => ({ ...current, exchange_type: type, urgent: type === "one_off" ? current.urgent : false }));
  };

  const byId = useMemo(() => new Map(skills.map((skill) => [skill.id, skill])), [skills]);
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((skill): skill is Skill => Boolean(skill));

  const cleaned = (): FormState => ({ ...state, links: state.links.map((link) => link.trim()).filter(Boolean) });

  const validate = (): boolean => {
    const parsed = offerSchema.safeParse(cleaned());
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const found = fieldErrors(parsed.error);
    // Les erreurs de liens sont rattachées au groupe « liens ».
    const normalized: Record<string, string> = {};
    for (const [key, message] of Object.entries(found)) {
      normalized[key.startsWith("links") ? "links" : key] ??= message;
    }
    setErrors(normalized);
    toast.error("Quelques champs sont à corriger.");
    return false;
  };

  const goPreview = () => {
    if (!validate()) return;
    setStep("preview");
    topRef.current?.scrollIntoView({ block: "start" });
  };

  const publish = () => {
    run(() => saveOfferAction({ ...cleaned(), id: offer?.id ?? null }), {
      onError: (result) => {
        setErrors(result.fields ?? {});
        setStep("edit");
        toast.error(result.error);
      },
      onSuccess: (data) => {
        if (!editing) writeStoredValue(DRAFT_KEY, null);
        toast.success(editing ? "Annonce mise à jour." : "Annonce publiée.");
        router.push(`/annonces/${data.id}`);
        router.refresh();
      },
    });
  };

  const resumeDraft = () => {
    if (savedDraft) setState((current) => ({ ...current, ...savedDraft }));
    setDraftDecided(true);
    setEdited(true);
  };

  const discardDraft = () => {
    writeStoredValue(DRAFT_KEY, null);
    setDraftDecided(true);
  };

  // ── Prévisualisation ────────────────────────────────────────────────
  if (step === "preview") {
    const now = new Date().toISOString();
    const preview: Offer = {
      id: offer?.id ?? "apercu",
      ...cleaned(),
      country: state.country || null,
      conditions: state.conditions || null,
      status: "open",
      is_demo: profile.is_demo,
      is_urgent: state.urgent,
      created_at: offer?.created_at ?? now,
      updated_at: now,
      author: profile,
      proposed: pick(state.proposed),
      requested: pick(state.requested),
      related: pick(state.related),
    };
    return (
      <div ref={topRef} className="scroll-mt-24 space-y-6">
        <Notice tone="brand" icon={Eye} title="Prévisualisation">
          Voici ton annonce telle que les autres la verront. Rien n&apos;est encore publié.
        </Notice>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <div>
            <p className="mb-3 text-sm font-medium text-muted">Dans la liste des annonces</p>
            <div className="pointer-events-none" aria-hidden>
              <OfferCard offer={preview} viewerId={null} />
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-muted">Sur la page de l&apos;annonce</p>
            <Card>
              <h2 className="text-2xl font-semibold text-ink">{preview.title}</h2>
              <p className="prose-user mt-4 text-ink/85">{preview.description}</p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-brand-soft p-4">
                  <p className="mb-2 text-sm font-semibold text-brand-strong">Ce que je propose</p>
                  <SkillList skills={preview.proposed} tone="offer" max={12} empty="Demande d'aide" />
                </div>
                <div className="rounded-2xl bg-flow-soft p-4">
                  <p className="mb-2 text-sm font-semibold text-flow-strong">Ce que je recherche</p>
                  <SkillList skills={preview.requested} tone="want" max={12} empty="Rien en retour" />
                </div>
              </div>
              <div className="mt-6">
                <OfferMeta offer={preview} />
              </div>
              {preview.conditions ? <p className="prose-user mt-5 text-sm text-ink/85">{preview.conditions}</p> : null}
            </Card>
          </div>
        </div>
        <div className="sticky bottom-20 z-10 flex flex-col-reverse gap-2 rounded-2xl bg-surface p-3 shadow-lift sm:flex-row sm:justify-end lg:bottom-4">
          <Button variant="subtle" onClick={() => setStep("edit")} disabled={pending}>
            <ArrowLeft aria-hidden /> Modifier
          </Button>
          <Button onClick={publish} loading={pending}>
            <Send aria-hidden /> {editing ? "Enregistrer les modifications" : "Publier l'annonce"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Rédaction ───────────────────────────────────────────────────────
  const reciprocal = state.exchange_type === "reciprocal";

  return (
    <div ref={topRef} className="scroll-mt-24 space-y-6">
      {draftAvailable ? (
        <Notice
          tone="flow"
          icon={Eye}
          title="Tu avais commencé une annonce"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="white" onClick={discardDraft}>
                Ignorer
              </Button>
              <Button size="sm" variant="dark" onClick={resumeDraft}>
                Reprendre
              </Button>
            </div>
          }
        >
          {savedDraft?.title ? `« ${savedDraft.title} » — ` : ""}ton brouillon a été gardé sur cet appareil.
        </Notice>
      ) : null}

      <Card className="space-y-6">
        <Fieldset legend="Type d'échange">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Type d'échange">
            {(Object.keys(EXCHANGE_TYPES) as ExchangeType[]).map((type) => {
              const Icon = TYPE_ICONS[type];
              const selected = state.exchange_type === type;
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setType(type)}
                  className={cn(
                    "rounded-2xl p-4 text-left transition-colors",
                    selected ? "bg-ink text-white" : "bg-canvas text-ink hover:bg-field",
                  )}
                >
                  <Icon className={cn("size-5", selected ? "text-flow" : "text-brand")} aria-hidden />
                  <span className="mt-3 block font-semibold">{EXCHANGE_TYPES[type].label}</span>
                  <span className={cn("mt-1 block text-sm", selected ? "text-white/70" : "text-muted")}>
                    {EXCHANGE_TYPES[type].hint}
                  </span>
                </button>
              );
            })}
          </div>
        </Fieldset>

        {state.exchange_type === "one_off" && !editing ? (
          <button
            type="button"
            role="switch"
            aria-checked={state.urgent}
            onClick={() => set("urgent", !state.urgent)}
            className={cn(
              "flex w-full items-start gap-3.5 rounded-2xl p-4 text-left transition-colors",
              state.urgent ? "bg-warm-soft" : "bg-canvas hover:bg-field",
            )}
          >
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", state.urgent ? "bg-warm text-ink" : "bg-surface text-muted")}>
              <Zap className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">Coup de main express</span>
              <span className="block text-sm text-muted">
                Tu es bloqué ? Les personnes qui proposent la compétence demandée sont prévenues tout de suite, et ta
                demande est mise en avant pendant 72 heures.
              </span>
            </span>
            <span
              aria-hidden
              className={cn("mt-1 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors", state.urgent ? "bg-ink" : "bg-field-strong")}
            >
              <span className={cn("size-5 rounded-full bg-white transition-transform", state.urgent && "translate-x-5")} />
            </span>
          </button>
        ) : null}

        <Field label="Titre" htmlFor="offer-title" error={errors.title} hint="Va droit au but : « Flutter contre Python », « Je configure ton pipeline CI/CD ».">
          <Input
            id="offer-title"
            value={state.title}
            maxLength={120}
            onChange={(event) => set("title", event.target.value)}
            aria-invalid={Boolean(errors.title)}
          />
        </Field>

        <Field
          label="Description"
          htmlFor="offer-description"
          error={errors.description}
          hint={`${state.description.trim().length} / 4000 · Le contexte, ce que tu attends, ce que vous pourriez réaliser.`}
        >
          <Textarea
            id="offer-description"
            rows={6}
            value={state.description}
            maxLength={4000}
            onChange={(event) => set("description", event.target.value)}
            aria-invalid={Boolean(errors.description)}
          />
        </Field>
      </Card>

      <Card className="space-y-6">
        <Fieldset
          legend="Compétences proposées"
          hint="Ce que tu apportes. Jusqu'à 6."
          error={errors.proposed}
          optional={!reciprocal}
        >
          <SkillPicker
            label="Compétences proposées"
            skills={skills}
            value={state.proposed}
            onChange={(next) => set("proposed", next)}
            max={6}
            tone="offer"
            exclude={state.requested}
            suggested={profile.offered.map((skill) => skill.id)}
            invalid={Boolean(errors.proposed)}
          />
        </Fieldset>
        <Fieldset
          legend="Compétences recherchées"
          hint={state.urgent ? "La compétence dont tu as besoin, maintenant." : "Ce que tu attends en retour. Jusqu'à 6."}
          error={errors.requested}
          optional={!reciprocal && !state.urgent}
        >
          <SkillPicker
            label="Compétences recherchées"
            skills={skills}
            value={state.requested}
            onChange={(next) => set("requested", next)}
            max={6}
            tone="want"
            exclude={state.proposed}
            suggested={profile.wanted.map((skill) => skill.id)}
            invalid={Boolean(errors.requested)}
          />
        </Fieldset>
        <Fieldset legend="Technologies concernées" hint="Les outils du projet, pour aider à te trouver. Jusqu'à 8." optional>
          <SkillPicker
            label="Technologies concernées"
            skills={skills}
            value={state.related}
            onChange={(next) => set("related", next)}
            max={8}
            kind="technology"
            exclude={[...state.proposed, ...state.requested]}
            compact
          />
        </Fieldset>
      </Card>

      <Card className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Fieldset legend="Type de collaboration">
            <ChoiceChips
              label="Type de collaboration"
              multiple={false}
              options={Object.entries(COLLABORATION_MODES).map(([value, label]) => ({ value, label }))}
              value={[state.collaboration_type]}
              onChange={(next) => set("collaboration_type", next[0] as FormState["collaboration_type"])}
            />
          </Fieldset>
          <Fieldset legend="Durée estimée">
            <ChoiceChips
              label="Durée estimée"
              multiple={false}
              options={Object.entries(DURATIONS).map(([value, label]) => ({ value, label }))}
              value={[state.estimated_duration]}
              onChange={(next) => set("estimated_duration", next[0] as FormState["estimated_duration"])}
            />
          </Fieldset>
        </div>

        <Fieldset legend="Disponibilités" hint="Exprimées dans ton fuseau horaire." optional>
          <ChoiceChips
            label="Disponibilités"
            options={Object.entries(AVAILABILITY).map(([value, item]) => ({ value, label: item.label, hint: item.hours }))}
            value={state.availability}
            onChange={(next) => set("availability", next as FormState["availability"])}
          />
        </Fieldset>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Niveau souhaité" htmlFor="offer-level">
            <Select
              id="offer-level"
              value={state.desired_level}
              onChange={(event) => set("desired_level", event.target.value as FormState["desired_level"])}
            >
              {Object.entries(DESIRED_LEVELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Langue" htmlFor="offer-language" error={errors.language}>
            <Select id="offer-language" value={state.language} onChange={(event) => set("language", event.target.value)}>
              {LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pays" htmlFor="offer-country" error={errors.country}>
            <Select id="offer-country" value={state.country} onChange={(event) => set("country", event.target.value)}>
              <option value="">Non précisé</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Fieldset legend="Liens" hint="Dépôt, maquette, documentation… Jusqu'à 5." error={errors.links} optional>
          <div className="space-y-2">
            {state.links.map((link, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="url"
                  inputMode="url"
                  value={link}
                  placeholder="https://…"
                  aria-label={`Lien ${index + 1}`}
                  onChange={(event) => set("links", state.links.map((item, position) => (position === index ? event.target.value : item)))}
                />
                <Button
                  variant="subtle"
                  size="icon"
                  aria-label={`Retirer le lien ${index + 1}`}
                  onClick={() => set("links", state.links.filter((_, position) => position !== index))}
                  className="size-11"
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
            {state.links.length < 5 ? (
              <Button variant="subtle" size="sm" onClick={() => set("links", [...state.links, ""])}>
                <Plus aria-hidden /> Ajouter un lien
              </Button>
            ) : null}
          </div>
        </Fieldset>

        <Field label="Conditions particulières" htmlFor="offer-conditions" error={errors.conditions} optional>
          <Textarea
            id="offer-conditions"
            rows={3}
            value={state.conditions}
            maxLength={1000}
            placeholder="Outils imposés, contraintes de calendrier, confidentialité…"
            onChange={(event) => set("conditions", event.target.value)}
          />
        </Field>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-end rounded-2xl bg-surface p-3 shadow-lift lg:bottom-4">
        <Button onClick={goPreview} size="lg">
          Prévisualiser <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
