"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { updateProfileAction } from "@/lib/actions/profile";
import { COUNTRIES, LANGUAGES, TIMEZONES, countryTimezone } from "@/lib/data/countries";
import { AVAILABILITY, COLLABORATION_MODES, DOMAINS, EXPERIENCE_LEVELS } from "@/lib/labels";
import type { AvailabilitySlot, CollaborationMode, ProfileCard } from "@/lib/types";
import { uploadAvatar } from "@/lib/upload";
import type { ProfileInput } from "@/lib/validation";
import { Button } from "../ui/button";
import { ChoiceChips, toast, useAction } from "../ui/client";
import { Field, Fieldset, Input, Select, Textarea } from "../ui/field";
import { Avatar, Card, SectionTitle } from "../ui/primitives";

export type ProfileDraft = {
  first_name: string;
  last_name: string;
  username: string;
  avatar_url: string | null;
  country: string;
  city: string;
  timezone: string;
  headline: string;
  bio: string;
  experience_level: string;
  main_domain: string;
  languages: string[];
  availability: AvailabilitySlot[];
  collaboration_modes: CollaborationMode[];
  github_url: string;
  portfolio_url: string;
  linkedin_url: string;
  website_url: string;
};

export function toDraft(profile: ProfileCard): ProfileDraft {
  return {
    first_name: profile.first_name,
    last_name: profile.last_name,
    username: profile.username,
    avatar_url: profile.avatar_url,
    country: profile.country ?? "",
    city: profile.city ?? "",
    timezone: profile.timezone,
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    experience_level: profile.experience_level ?? "",
    main_domain: profile.main_domain ?? "",
    languages: profile.languages,
    availability: profile.availability,
    collaboration_modes: profile.collaboration_modes,
    github_url: profile.github_url ?? "",
    portfolio_url: profile.portfolio_url ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    website_url: profile.website_url ?? "",
  };
}

type SetField = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => void;
type SectionProps = { draft: ProfileDraft; set: SetField; errors: Record<string, string> };

// ── Photo ────────────────────────────────────────────────────────────────
export function AvatarField({
  userId,
  draft,
  set,
}: {
  userId: string;
  draft: ProfileDraft;
  set: SetField;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { pending, run } = useAction();
  const router = useRouter();

  const save = (url: string | null, message: string) =>
    run(() => updateProfileAction({ avatar_url: url ?? "" }), {
      success: message,
      onSuccess: () => {
        set("avatar_url", url);
        router.refresh();
      },
    });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const result = await uploadAvatar(file, userId);
    setUploading(false);
    if (input.current) input.current.value = "";
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    save(result.url, "Photo mise à jour.");
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar
        person={{ id: userId, first_name: draft.first_name, last_name: draft.last_name, avatar_url: draft.avatar_url }}
        size="xl"
      />
      <div className="space-y-2">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => onFile(event.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="subtle" size="sm" loading={uploading || pending} onClick={() => input.current?.click()}>
            {uploading || pending ? null : <Camera aria-hidden />} {draft.avatar_url ? "Changer de photo" : "Ajouter une photo"}
          </Button>
          {draft.avatar_url ? (
            <Button variant="ghost" size="sm" disabled={uploading || pending} onClick={() => save(null, "Photo retirée.")}>
              <Trash2 aria-hidden /> Retirer
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted">PNG, JPEG ou WebP · 2 Mo au maximum.</p>
      </div>
    </div>
  );
}

// ── Sections réutilisées par le formulaire et par l'accueil par étapes ───
export function IdentityFields({ draft, set, errors }: SectionProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="first_name" error={errors.first_name}>
          <Input id="first_name" value={draft.first_name} maxLength={60} autoComplete="given-name" onChange={(event) => set("first_name", event.target.value)} aria-invalid={Boolean(errors.first_name)} />
        </Field>
        <Field label="Nom" htmlFor="last_name" error={errors.last_name}>
          <Input id="last_name" value={draft.last_name} maxLength={60} autoComplete="family-name" onChange={(event) => set("last_name", event.target.value)} aria-invalid={Boolean(errors.last_name)} />
        </Field>
      </div>
      <Field
        label="Nom d'utilisateur"
        htmlFor="username"
        error={errors.username}
        hint={`Ton profil sera visible à l'adresse /developpeurs/${draft.username || "…"}`}
      >
        <Input
          id="username"
          value={draft.username}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => set("username", event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
          aria-invalid={Boolean(errors.username)}
        />
      </Field>
    </div>
  );
}

export function LocationFields({ draft, set, errors }: SectionProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Pays" htmlFor="country" error={errors.country}>
          <Select
            id="country"
            value={draft.country}
            aria-invalid={Boolean(errors.country)}
            onChange={(event) => {
              const previous = countryTimezone(draft.country);
              set("country", event.target.value);
              // Le fuseau suit le pays tant qu'il n'a pas été réglé à la main.
              if (draft.timezone === "UTC" || draft.timezone === previous) {
                set("timezone", countryTimezone(event.target.value));
              }
            }}
          >
            <option value="">Choisir un pays</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ville" htmlFor="city" error={errors.city} optional>
          <Input id="city" value={draft.city} maxLength={80} autoComplete="address-level2" onChange={(event) => set("city", event.target.value)} />
        </Field>
      </div>
      <Field
        label="Fuseau horaire"
        htmlFor="timezone"
        error={errors.timezone}
        hint="Tes disponibilités sont exprimées dans ce fuseau, puis converties pour les autres."
      >
        <Select id="timezone" value={draft.timezone} onChange={(event) => set("timezone", event.target.value)}>
          {TIMEZONES.map((timezone) => (
            <option key={timezone} value={timezone}>
              {timezone.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </Field>
      <Fieldset legend="Langues de travail" error={errors.languages} hint="Celles dans lesquelles tu peux collaborer.">
        <ChoiceChips
          label="Langues de travail"
          size="sm"
          options={LANGUAGES.map((language) => ({ value: language.code, label: language.name }))}
          value={draft.languages}
          onChange={(next) => set("languages", next)}
        />
      </Fieldset>
    </div>
  );
}

export function PresentationFields({ draft, set, errors }: SectionProps) {
  return (
    <div className="space-y-5">
      <Field label="Accroche" htmlFor="headline" error={errors.headline} optional hint="Une ligne : ton métier, ta spécialité.">
        <Input id="headline" value={draft.headline} maxLength={120} placeholder="Développeur mobile Flutter" onChange={(event) => set("headline", event.target.value)} />
      </Field>
      <Field
        label="Présentation"
        htmlFor="bio"
        error={errors.bio}
        hint={`${draft.bio.trim().length} / 1200 · Ce que tu construis, ce que tu aimerais apprendre. 30 caractères au moins pour compter dans ton profil.`}
      >
        <Textarea id="bio" rows={5} value={draft.bio} maxLength={1200} onChange={(event) => set("bio", event.target.value)} />
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Niveau d'expérience" htmlFor="experience_level" error={errors.experience_level}>
          <Select id="experience_level" value={draft.experience_level} onChange={(event) => set("experience_level", event.target.value)}>
            <option value="">Non précisé</option>
            {Object.entries(EXPERIENCE_LEVELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Domaine principal" htmlFor="main_domain" error={errors.main_domain}>
          <Select id="main_domain" value={draft.main_domain} onChange={(event) => set("main_domain", event.target.value)}>
            <option value="">Non précisé</option>
            {Object.entries(DOMAINS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  );
}

export function AvailabilityFields({ draft, set, errors }: SectionProps) {
  return (
    <div className="space-y-6">
      <Fieldset legend="Quand es-tu disponible ?" hint={`Heures locales (${draft.timezone.replace(/_/g, " ")}).`} error={errors.availability}>
        <ChoiceChips
          label="Disponibilités"
          options={(Object.keys(AVAILABILITY) as AvailabilitySlot[]).map((value) => ({
            value,
            label: AVAILABILITY[value].label,
            hint: AVAILABILITY[value].hours,
          }))}
          value={draft.availability}
          onChange={(next) => set("availability", next)}
        />
      </Fieldset>
      <Fieldset legend="Comment préfères-tu collaborer ?" error={errors.collaboration_modes}>
        <ChoiceChips
          label="Modes de collaboration"
          options={(Object.keys(COLLABORATION_MODES) as CollaborationMode[]).map((value) => ({
            value,
            label: COLLABORATION_MODES[value],
          }))}
          value={draft.collaboration_modes}
          onChange={(next) => set("collaboration_modes", next)}
          invalid={Boolean(errors.collaboration_modes)}
        />
      </Fieldset>
    </div>
  );
}

const LINKS = [
  { key: "github_url", label: "GitHub", placeholder: "https://github.com/…" },
  { key: "portfolio_url", label: "Portfolio", placeholder: "https://…" },
  { key: "linkedin_url", label: "LinkedIn", placeholder: "https://www.linkedin.com/in/…" },
  { key: "website_url", label: "Site personnel", placeholder: "https://…" },
] as const;

export function LinkFields({ draft, set, errors }: SectionProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {LINKS.map((link) => (
        <Field key={link.key} label={link.label} htmlFor={link.key} error={errors[link.key]} optional>
          <Input
            id={link.key}
            type="url"
            inputMode="url"
            value={draft[link.key]}
            placeholder={link.placeholder}
            onChange={(event) => set(link.key, event.target.value)}
            aria-invalid={Boolean(errors[link.key])}
          />
        </Field>
      ))}
    </div>
  );
}

/** Ce qui est envoyé au serveur : les textes nettoyés de leurs espaces. */
export function toPatch(draft: ProfileDraft, keys: (keyof ProfileDraft)[]): ProfileInput {
  const patch: Record<string, unknown> = {};
  for (const key of keys) {
    const value = draft[key];
    patch[key] = typeof value === "string" ? value.trim() : value;
  }
  return patch as ProfileInput;
}

export function useProfileDraft(profile: ProfileCard) {
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(profile));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set: SetField = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
  return { draft, set, errors, setErrors };
}

// ── Formulaire complet ───────────────────────────────────────────────────
export function ProfileForm({ profile }: { profile: ProfileCard }) {
  const router = useRouter();
  const { draft, set, errors, setErrors } = useProfileDraft(profile);
  const { pending, run } = useAction();

  const submit = () => {
    const keys = (Object.keys(draft) as (keyof ProfileDraft)[]).filter((key) => key !== "avatar_url");
    run(() => updateProfileAction(toPatch(draft, keys)), {
      onError: (result) => {
        setErrors(result.fields ?? {});
        toast.error(result.error);
      },
      onSuccess: (data) => {
        toast.success(`Profil enregistré · complété à ${data.score} %.`);
        router.push(`/developpeurs/${draft.username}`);
        router.refresh();
      },
    });
  };

  const section = { draft, set, errors };

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Card className="space-y-6">
        <SectionTitle title="Identité" />
        <AvatarField userId={profile.id} draft={draft} set={set} />
        <IdentityFields {...section} />
      </Card>
      <Card className="space-y-6">
        <SectionTitle title="Localisation et langues" />
        <LocationFields {...section} />
      </Card>
      <Card id="presentation" className="scroll-mt-24 space-y-6">
        <SectionTitle title="Présentation" />
        <PresentationFields {...section} />
      </Card>
      <Card id="disponibilites" className="scroll-mt-24 space-y-6">
        <SectionTitle title="Disponibilités" description="Elles comptent pour 20 points dans tes correspondances." />
        <AvailabilityFields {...section} />
      </Card>
      <Card className="space-y-6">
        <SectionTitle title="Liens professionnels" description="Affichés tels quels sur ton profil. DevBridge ne les vérifie pas." />
        <LinkFields {...section} />
      </Card>
      <div className="sticky bottom-20 z-10 flex justify-end gap-2 rounded-2xl bg-surface p-3 shadow-lift lg:bottom-4">
        <Button variant="subtle" onClick={() => router.back()} disabled={pending}>
          Annuler
        </Button>
        <Button type="submit" loading={pending}>
          Enregistrer mon profil
        </Button>
      </div>
    </form>
  );
}
