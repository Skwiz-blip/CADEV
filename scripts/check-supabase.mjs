/**
 * Vérifie, en lecture seule, que le projet Supabase est prêt pour DevBridge.
 *
 *   npm run db:check
 *
 * Utilise uniquement la clé publique de « .env.local » : ce contrôle voit
 * exactement ce qu'un visiteur du site peut voir, ni plus ni moins.
 */
import { existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

if (!url || !key) {
  console.error("\n  NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être renseignées dans .env.local.\n");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
let failures = 0;

async function call(path, init = {}) {
  const response = await fetch(`${url}${path}`, { ...init, headers, signal: AbortSignal.timeout(20_000) });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

const rpc = (name, args = {}) => call(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });

function report(ok, label, detail = "") {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

const denied = (result) => result.status === 401 || result.status === 403 || result.body?.code === "42501";

async function main() {
  console.log(`\nContrôle du projet Supabase\n  ${url}\n`);

  let skills;
  try {
    skills = await rpc("list_skills");
  } catch (error) {
    console.error(`  ✗ Le projet ne répond pas : ${error.message}\n`);
    process.exit(1);
  }

  if (skills.status === 401) {
    report(false, "Clé publique", "refusée par le projet : vérifie NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }
  report(true, "Le projet répond et la clé publique est acceptée");

  const installed = skills.status === 200 && Array.isArray(skills.body);
  report(
    installed,
    "Script de la base appliqué",
    installed
      ? `${skills.body.length} compétences au catalogue`
      : "pas encore : colle supabase/devbridge.sql dans SQL Editor, puis Run",
  );
  if (!installed) {
    console.log("\n  La suite du contrôle demande que le script soit appliqué.\n");
    process.exit(1);
  }

  const offers = await rpc("search_offers");
  report(offers.status === 200 && typeof offers.body?.total === "number", "Recherche d'annonces ouverte aux visiteurs", `${offers.body?.total ?? "?"} annonce(s) en ligne`);

  const developers = await rpc("search_developers");
  report(developers.status === 200 && typeof developers.body?.total === "number", "Recherche de développeurs ouverte aux visiteurs", `${developers.body?.total ?? "?"} profil(s)`);

  const viewer = await rpc("viewer_context");
  report(viewer.status === 200 && viewer.body === null, "Un visiteur n'a pas de session");

  // Ce qui doit rester fermé à un visiteur.
  for (const table of ["messages", "notifications", "exchange_proposals", "collaborations", "tasks", "reports"]) {
    const result = await call(`/rest/v1/${table}?select=id&limit=1`);
    report(denied(result), `Table privée « ${table} » fermée aux visiteurs`, denied(result) ? "" : `réponse ${result.status}`);
  }
  for (const name of ["dashboard_summary", "admin_overview", "demo_age", "server_set_admin"]) {
    const result = await rpc(name, name === "demo_age" ? { p_days: 1 } : name === "server_set_admin" ? { p_email: "x@x.x" } : {});
    report(denied(result), `Fonction réservée « ${name} » fermée aux visiteurs`, denied(result) ? "" : `réponse ${result.status}`);
  }
  const write = await call("/rest/v1/profiles", { method: "POST", body: JSON.stringify({ username: "intrus" }) });
  report(denied(write), "Écriture directe dans les profils refusée", denied(write) ? "" : `réponse ${write.status}`);

  const settings = await call("/auth/v1/settings");
  if (settings.status === 200) {
    report(settings.body?.external?.email === true, "Inscription par e-mail activée");
    console.log(
      settings.body?.mailer_autoconfirm
        ? "  · Confirmation par e-mail désactivée : les comptes sont actifs dès l'inscription."
        : "  · Confirmation par e-mail activée : pense à un SMTP pour la production (l'envoi intégré est limité à quelques e-mails par heure).",
    );
  }

  console.log(failures ? `\n  ${failures} point(s) à corriger.\n` : "\n  Tout est prêt côté Supabase.\n");
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(`\n  Échec du contrôle : ${error.message}\n`);
  process.exit(1);
});
