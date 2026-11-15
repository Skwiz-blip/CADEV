/**
 * Donne (ou retire) le rôle administrateur à un compte existant.
 *
 *   npm run admin:grant -- personne@exemple.com
 *   npm run admin:grant -- personne@exemple.com --revoke
 *
 * Le rôle ne peut être accordé que d'ici, avec la clé secrète : jamais depuis
 * l'application ni depuis le navigateur.
 */
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

async function main() {
  const email = process.argv.slice(2).find((arg) => arg.includes("@"));
  const revoke = process.argv.includes("--revoke");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!email) {
    console.error("\n  Usage : npm run admin:grant -- personne@exemple.com [--revoke]\n");
    process.exit(1);
  }
  if (!url || !key) {
    console.error("\n  NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être renseignées dans .env.local.\n");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase.rpc("server_set_admin", { p_email: email, p_is_admin: !revoke });
  if (error) {
    const message =
      error.message === "user_not_found"
        ? `Aucun compte avec l'adresse ${email}. La personne doit d'abord s'inscrire sur le site.`
        : error.message;
    console.error(`\n  Échec : ${message}\n`);
    process.exit(1);
  }
  console.log(
    data === "granted"
      ? `\n  ${email} est maintenant administrateur. L'espace /admin lui est ouvert.\n`
      : `\n  ${email} n'est plus administrateur.\n`,
  );
}

main();
