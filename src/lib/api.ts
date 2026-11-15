import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { isSupabaseConfigured } from "./env";
import { AppError, toAppError } from "./errors";
import { createClient } from "./supabase/server";
import type { AdminOverview, Skill, Viewer } from "./types";

/**
 * Appelle une fonction de la base au nom de la personne connectée.
 * C'est l'unique porte d'entrée des données : aucune table n'est lue ou écrite directement.
 */
export async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!isSupabaseConfigured) {
    throw new AppError("not_configured", "Le service de données n'est pas encore configuré.");
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw toAppError(error);
  return data as T;
}

const loadViewer = cache(async (): Promise<Viewer | null> => rpc<Viewer | null>("viewer_context"));

/** Personne connectée, ou null. Sur les pages publiques, une panne ne bloque pas l'affichage. */
export async function getViewer(): Promise<Viewer | null> {
  if (!isSupabaseConfigured) return null;
  try {
    return await loadViewer();
  } catch {
    return null;
  }
}

/** Exige une session. Redirige vers la connexion sinon. */
export async function requireViewer(next?: string): Promise<Viewer> {
  const viewer = await loadViewer();
  if (!viewer) {
    redirect(next ? `/connexion?next=${encodeURIComponent(next)}` : "/connexion");
  }
  return viewer;
}

/** Exige une session ET un accueil terminé (sinon, direction l'accueil par étapes). */
export async function requireMember(next?: string): Promise<Viewer> {
  const viewer = await requireViewer(next);
  if (!viewer.profile.onboarding_completed_at) redirect("/bienvenue");
  return viewer;
}

/** Exige le rôle administrateur. La page « n'existe pas » pour les autres. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (!viewer.is_admin) notFound();
  return viewer;
}

export const getSkills = cache(async (): Promise<Skill[]> => rpc<Skill[]>("list_skills"));

/** Vue d'ensemble de l'administration (une seule lecture par page, partagée avec la mise en page). */
export const getAdminOverview = cache(async (): Promise<AdminOverview> => rpc<AdminOverview>("admin_overview"));
