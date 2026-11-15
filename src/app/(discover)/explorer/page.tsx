import { Compass, Plus, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OfferCard } from "@/components/shared/cards";
import { FilterBar, type FilterField } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/primitives";
import { getSkills, getViewer, rpc } from "@/lib/api";
import { COUNTRIES, LANGUAGES } from "@/lib/data/countries";
import { AVAILABILITY, EXCHANGE_TYPES, LEVELS } from "@/lib/labels";
import type { OfferCard as Offer, Paginated } from "@/lib/types";
import { cn, firstParam, isUuid, plural, withParams } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Explorer les échanges",
  description: "Offres, demandes et mentorats proposés par des développeurs africains.",
};

const PAGE_SIZE = 12;
const DATES = [
  { value: "1", label: "Depuis 24 heures" },
  { value: "7", label: "Depuis 7 jours" },
  { value: "30", label: "Depuis 30 jours" },
];

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const values = {
    q: firstParam(raw.q),
    competence: firstParam(raw.competence),
    techno: firstParam(raw.techno),
    pays: firstParam(raw.pays),
    langue: firstParam(raw.langue),
    type: firstParam(raw.type),
    niveau: firstParam(raw.niveau),
    dispo: firstParam(raw.dispo),
    date: firstParam(raw.date),
    express: firstParam(raw.express),
  };
  const page = Math.max(1, Number(firstParam(raw.page)) || 1);
  const sinceDays = Number(values.date);

  const [viewer, skills, result] = await Promise.all([
    getViewer(),
    getSkills(),
    rpc<Paginated<Offer>>("search_offers", {
      p_query: values.q ?? null,
      p_skill_id: isUuid(values.competence) ? values.competence : null,
      p_technology_id: isUuid(values.techno) ? values.techno : null,
      p_country: values.pays ?? null,
      p_language: values.langue ?? null,
      p_exchange_type: values.type ?? null,
      p_level: values.niveau ?? null,
      p_availability: values.dispo ?? null,
      p_since_days: Number.isFinite(sinceDays) && sinceDays > 0 ? sinceDays : null,
      p_urgent: values.express === "1",
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const fields: FilterField[] = [
    {
      name: "type",
      label: "Type d'échange",
      options: Object.entries(EXCHANGE_TYPES).map(([value, item]) => ({ value, label: item.label })),
    },
    {
      name: "competence",
      label: "Compétence",
      options: skills.filter((skill) => skill.kind === "competence").map((skill) => ({ value: skill.id, label: skill.name })),
    },
    {
      name: "techno",
      label: "Technologie",
      options: skills.filter((skill) => skill.kind === "technology").map((skill) => ({ value: skill.id, label: skill.name })),
    },
    { name: "pays", label: "Pays", options: COUNTRIES.map((country) => ({ value: country.code, label: country.name })) },
    { name: "langue", label: "Langue", options: LANGUAGES.map((language) => ({ value: language.code, label: language.name })) },
    { name: "niveau", label: "Niveau", options: Object.entries(LEVELS).map(([value, label]) => ({ value, label })) },
    {
      name: "dispo",
      label: "Disponibilité",
      options: Object.entries(AVAILABILITY).map(([value, item]) => ({ value, label: item.label })),
    },
    { name: "date", label: "Date de publication", options: DATES },
  ];

  const express = values.express === "1";
  const filtered = Object.values(values).some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explorer les échanges"
        description="Des offres, des demandes et des mentorats. Chaque annonce dit ce que la personne apporte et ce qu'elle recherche."
        actions={
          <Button asChild>
            <Link href="/annonces/nouvelle">
              <Plus aria-hidden /> Publier une annonce
            </Link>
          </Button>
        }
      />

      <FilterBar
        key={JSON.stringify(values)}
        basePath="/explorer"
        values={values}
        fields={fields}
        placeholder="Rechercher un échange, une compétence…"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {plural(result.total, "annonce")} {filtered ? "pour ces critères" : "en ligne"}
        </p>
        <Link
          href={withParams("/explorer", values, { express: express ? undefined : "1", page: undefined })}
          aria-current={express ? "true" : undefined}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
            express ? "bg-warm text-ink" : "bg-surface text-muted hover:text-ink",
          )}
        >
          <Zap className="size-4" aria-hidden /> Coups de main express
        </Link>
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-2xl bg-surface shadow-card">
          <EmptyState
            icon={Compass}
            title={filtered ? "Aucune annonce ne correspond" : "Aucune annonce pour le moment"}
            description={
              filtered
                ? "Élargis ta recherche en retirant un filtre, ou publie ta propre annonce : quelqu'un cherche peut-être exactement ce que tu proposes."
                : "Sois la première personne à proposer un échange."
            }
            action={
              <>
                {filtered ? (
                  <Button asChild variant="subtle">
                    <Link href="/explorer">Effacer les filtres</Link>
                  </Button>
                ) : null}
                <Button asChild>
                  <Link href="/annonces/nouvelle">Publier une annonce</Link>
                </Button>
              </>
            }
          />
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {result.items.map((offer) => (
              <li key={offer.id}>
                <OfferCard offer={offer} viewerId={viewer?.profile.id} />
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={result.total}
            hrefFor={(target) => withParams("/explorer", values, { page: target > 1 ? target : undefined })}
          />
        </>
      )}
    </div>
  );
}
