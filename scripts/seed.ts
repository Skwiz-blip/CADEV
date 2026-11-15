/**
 * Données de démonstration, en ligne de commande.
 *
 *   npm run seed          crée (ou recrée) les profils et échanges de démonstration
 *   npm run seed:reset    identique : repart d'un état propre
 *   npm run seed:purge    supprime toutes les données de démonstration
 *
 * Lit les variables de « .env.local ». Nécessite la clé secrète Supabase.
 */
import { existsSync } from "node:fs";
import { purgeDemo, seedDemo, seedErrorMessage, type SeedConfig } from "../src/lib/demo/seed";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

function required(names: string[], label: string): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  console.error(`\n  Variable manquante : ${label} (${names.join(" ou ")}).\n  Renseigne-la dans .env.local.\n`);
  process.exit(1);
}

async function main() {
  const config: SeedConfig = {
    url: required(["NEXT_PUBLIC_SUPABASE_URL"], "adresse du projet Supabase"),
    publicKey: required(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"], "clé publique"),
    serviceKey: required(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"], "clé secrète"),
    password: required(["DEMO_PASSWORD"], "mot de passe des comptes de démonstration"),
    emailDomain: process.env.DEMO_EMAIL_DOMAIN || "demo.devbridge.test",
    log: (line) => console.log(`  ${line}`),
  };

  if (process.argv.includes("--purge")) {
    console.log("\nSuppression des données de démonstration\n");
    await purgeDemo(config);
    console.log("\nTerminé.\n");
    return;
  }

  console.log("\nCréation des données de démonstration\n");
  const { accounts } = await seedDemo(config);
  console.log("\nComptes de démonstration (mot de passe : valeur de DEMO_PASSWORD)\n");
  for (const account of accounts) {
    console.log(`  ${account.name.padEnd(20)} ${account.email}`);
  }
  console.log("\nPour la démonstration : kodjo@… et amina@… (voir README).\n");
}

main().catch((error) => {
  console.error(`\n  Échec : ${seedErrorMessage(error)}\n`);
  process.exit(1);
});
