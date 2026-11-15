import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DeveloperCard } from "@/components/shared/cards";
import { FilterBar, type FilterField } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/primitives";
import { getSkills, rpc } from "@/lib/api";
import { COUNTRIES, LANGUAGES } from "@/lib/data/countries";
import { AVAILABILITY, DOMAINS, EXPERIENCE_LEVELS } from "@/lib/labels";
import type { Paginated, ProfileCard } from "@/lib/types";
import { firstParam, isUuid, plural, withParams } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Découvrir les développeurs",
  description: "Des développeurs de tout le continent, ce qu'ils proposent et ce qu'ils recherchent.",
};

const PAGE_SIZE = 12;

export default async function DevelopersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const values = {
    q: firstParam(raw.q),
    competence: firstParam(raw.competence),
    pays: firstParam(raw.pays),
    domaine: firstParam(raw.domaine),
    experience: firstParam(raw.experience),
    langue: firstParam(raw.langue),
    dispo: firstParam(raw.dispo),
  };
  const page = Math.max(1, Number(firstParam(raw.page)) || 1);

  const [skills, result] = await Promise.all([
    getSkills(),
    rpc<Paginated<ProfileCard>>("search_developers", {
      p_query: values.q ?? null,
      p_skill_id: isUuid(values.competence) ? values.competence : null,
      p_country: values.pays ?? null,
      p_domain: values.domaine ?? null,
      p_experience: values.experience ?? null,
      p_language: values.langue ?? null,
      p_availability: values.dispo ?? null,
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const fields: FilterField[] = [
    { name: "competence", label: "Technologie ou compétence", options: skills.map((skill) => ({ value: skill.id, label: skill.name })) },
    { name: "pays", label: "Pays", options: COUNTRIES.map((country) => ({ value: country.code, label: country.name })) },
    { name: "domaine", label: "Domaine", options: Object.entries(DOMAINS).map(([value, label]) => ({ value, label })) },
    { name: "experience", label: "Expérience", options: Object.entries(EXPERIENCE_LEVELS).map(([value, label]) => ({ value, label })) },
    { name: "langue", label: "Langue", options: LANGUAGES.map((language) => ({ value: language.code, label: language.name })) },
    { name: "dispo", label: "Disponibilité", options: Object.entries(AVAILABILITY).map(([value, item]) => ({ value, label: item.label })) },
  ];
  const filtered = Object.values(values).some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trouver des développeurs"
        description="Cherche par compétence, par pays ou par disponibilité. Chaque profil montre ce que la personne apporte et ce qu'elle attend."
      />
      <FilterBar
        key={JSON.stringify(values)}
        basePath="/developpeurs"
        values={values}
        fields={fields}
        placeholder="Rechercher un nom, une ville, une compétence…"
      />
      <p className="text-sm text-muted" aria-live="polite">
        {plural(result.total, "développeur")} {filtered ? "pour ces critères" : "sur la plateforme"}
      </p>

      {result.items.length === 0 ? (
        <div className="rounded-2xl bg-surface shadow-card">
          <EmptyState
            icon={Users}
            title={filtered ? "Aucun profil ne correspond" : "Aucun profil pour le moment"}
            description={
              filtered
                ? "Essaie avec moins de filtres, ou une compétence voisine."
                : "Les premiers profils apparaîtront ici dès leur inscription."
            }
            action={
              filtered ? (
                <Button asChild variant="subtle">
                  <Link href="/developpeurs">Effacer les filtres</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/inscription">Créer mon profil</Link>
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {result.items.map((profile) => (
              <li key={profile.id}>
                <DeveloperCard profile={profile} />
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={result.total}
            hrefFor={(target) => withParams("/developpeurs", values, { page: target > 1 ? target : undefined })}
          />
        </>
      )}
    </div>
  );
}
