"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn, withParams } from "@/lib/utils";
import { Button } from "../ui/button";
import { Select } from "../ui/field";

export type FilterField = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
};

/**
 * Barre de recherche et de filtres. Les filtres vivent dans l'adresse de la
 * page : un résultat se partage par simple lien, et « retour » fonctionne.
 */
export function FilterBar({
  basePath,
  values,
  fields,
  placeholder,
  queryName = "q",
}: {
  basePath: string;
  values: Record<string, string | undefined>;
  fields: FilterField[];
  placeholder: string;
  queryName?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(values[queryName] ?? "");
  const [expanded, setExpanded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const navigate = (patch: Record<string, string | undefined>) => {
    startTransition(() => {
      // Tout changement de filtre ramène à la première page.
      router.replace(withParams(basePath, values, { ...patch, page: undefined }), { scroll: false });
    });
  };

  const onQuery = (next: string) => {
    setQuery(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate({ [queryName]: next.trim() || undefined }), 350);
  };

  const active = fields.filter((field) => values[field.name]).length;
  const hasAny = active > 0 || Boolean(values[queryName]);

  return (
    <div className="rounded-2xl bg-surface p-3 shadow-card sm:p-4" aria-busy={pending}>
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (timer.current) clearTimeout(timer.current);
          navigate({ [queryName]: query.trim() || undefined });
        }}
      >
        <div className="relative flex-1">
          <label htmlFor="filter-query" className="sr-only">
            {placeholder}
          </label>
          <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            id="filter-query"
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            maxLength={80}
            className="field pl-10"
          />
        </div>
        <Button
          variant={expanded || active ? "soft" : "subtle"}
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls="filter-panel"
          className="lg:hidden"
        >
          <SlidersHorizontal aria-hidden />
          <span className="hidden sm:inline">Filtres</span>
          {active ? <span className="rounded-full bg-brand px-1.5 text-xs text-white">{active}</span> : null}
        </Button>
      </form>

      <div
        id="filter-panel"
        className={cn(
          "mt-3 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid lg:grid-cols-4 xl:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]",
          expanded ? "grid" : "hidden",
        )}
      >
        {fields.map((field) => (
          <div key={field.name}>
            <label htmlFor={`filter-${field.name}`} className="sr-only">
              {field.label}
            </label>
            <Select
              id={`filter-${field.name}`}
              value={values[field.name] ?? ""}
              onChange={(event) => navigate({ [field.name]: event.target.value || undefined })}
              className={cn("min-h-10 py-2 text-sm", values[field.name] && "bg-brand-soft text-brand-strong hover:bg-brand-soft")}
            >
              <option value="">{field.label}</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        ))}
        {hasAny ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 justify-self-start text-muted"
            onClick={() => {
              setQuery("");
              startTransition(() => router.replace(basePath, { scroll: false }));
            }}
          >
            <X aria-hidden /> Effacer
          </Button>
        ) : null}
      </div>
    </div>
  );
}
