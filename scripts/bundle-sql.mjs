/**
 * Assemble les migrations en un seul fichier : supabase/devbridge.sql
 * C'est ce fichier que l'on colle dans l'éditeur SQL de Supabase.
 *
 *   npm run db:bundle
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "supabase", "migrations");
const files = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();

const header = `-- ═════════════════════════════════════════════════════════════════════════
-- DevBridge — script complet de la base de données
--
-- FICHIER GÉNÉRÉ : ne pas le modifier à la main.
-- Source : supabase/migrations/ · Régénérer avec : npm run db:bundle
--
-- Utilisation : Supabase → SQL Editor → New query → coller ce fichier → Run.
-- À exécuter UNE fois, sur un projet Supabase neuf et réservé à DevBridge.
-- Tout s'exécute dans une transaction : en cas d'erreur, rien n'est appliqué.
-- ═════════════════════════════════════════════════════════════════════════

begin;
`;

const parts = files.map((file) => {
  const sql = readFileSync(path.join(dir, file), "utf8").trimEnd();
  return `\n-- ▼▼▼ ${file} ▼▼▼\n\n${sql}\n`;
});

const output = `${header}${parts.join("")}\ncommit;\n`;
const target = path.join(root, "supabase", "devbridge.sql");
writeFileSync(target, output, "utf8");

console.log(`supabase/devbridge.sql généré (${files.length} migrations, ${output.split("\n").length} lignes).`);
