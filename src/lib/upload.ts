"use client";

import { getBrowserClient } from "./supabase/client";

/**
 * Envoi de fichiers vers Supabase Storage, directement depuis le navigateur.
 * Les mêmes limites (taille, types) sont imposées par le stockage lui-même,
 * et les règles d'accès vérifient que la personne a le droit d'écrire là.
 */

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_TYPES = [
  "image/png", "image/jpeg", "image/webp", "application/pdf", "text/plain", "text/markdown",
  "application/zip", "application/x-zip-compressed", "application/json",
];
export const ATTACHMENT_ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf,.txt,.md,.zip,.json";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

type UploadResult<T> = ({ ok: true } & T) | { ok: false; error: string };

function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const extension = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  return `${base || "fichier"}${extension ? `.${extension}` : ""}`;
}

function megabytes(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} Mo`;
}

/** Type déduit de l'extension quand le navigateur n'en fournit pas (fichiers .md, par exemple). */
function contentType(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "md") return "text/markdown";
  if (extension === "txt") return "text/plain";
  if (extension === "json") return "application/json";
  if (extension === "zip") return "application/zip";
  return "application/octet-stream";
}

export async function uploadAttachment(
  file: File,
  collaborationId: string,
  userId: string,
): Promise<UploadResult<{ path: string }>> {
  const type = contentType(file);
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return { ok: false, error: `Fichier trop lourd : ${megabytes(ATTACHMENT_MAX_BYTES)} au maximum.` };
  }
  if (!ATTACHMENT_TYPES.includes(type)) {
    return { ok: false, error: "Type de fichier non accepté. Formats : image, PDF, texte, Markdown, JSON ou ZIP." };
  }
  const path = `${collaborationId}/${userId}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error } = await getBrowserClient()
    .storage.from("attachments")
    .upload(path, file, { contentType: type, upsert: false });
  if (error) {
    return { ok: false, error: "L'envoi du fichier a échoué. Vérifie ta connexion et réessaie." };
  }
  return { ok: true, path };
}

export async function uploadAvatar(file: File, userId: string): Promise<UploadResult<{ url: string }>> {
  if (!AVATAR_TYPES.includes(file.type)) {
    return { ok: false, error: "Choisis une image PNG, JPEG ou WebP." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: `Image trop lourde : ${megabytes(AVATAR_MAX_BYTES)} au maximum.` };
  }
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storage = getBrowserClient().storage.from("avatars");
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (error) {
    return { ok: false, error: "L'envoi de la photo a échoué. Vérifie ta connexion et réessaie." };
  }
  // On ne garde qu'une photo par personne.
  const { data: files } = await storage.list(userId);
  const stale = (files ?? []).map((item) => `${userId}/${item.name}`).filter((item) => item !== path);
  if (stale.length) await storage.remove(stale);
  return { ok: true, url: storage.getPublicUrl(path).data.publicUrl };
}

/** Nom lisible d'une pièce jointe à partir de son chemin de stockage. */
export function attachmentName(path: string): string {
  const file = path.split("/").pop() ?? path;
  return file.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
}
