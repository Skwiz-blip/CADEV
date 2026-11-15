/**
 * Test de bout en bout : le parcours de démonstration du cahier des charges,
 * joué dans un vrai navigateur, par deux personnes, contre la vraie base.
 *
 *   npm run test:e2e
 *
 * Prérequis : Google Chrome (ou Edge) installé. Chemin personnalisable avec la
 * variable CHROME_PATH. Les captures d'écran sont écrites dans tests/e2e/.captures.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { lit } from "../db/harness";
import { MiniSupabase, PUBLIC_KEY, SERVICE_KEY } from "./mini-supabase";

const ROOT = path.resolve(__dirname, "../..");
const APP_PORT = 3220;
const DB_PORT = 54329;
const APP = `http://127.0.0.1:${APP_PORT}`;
const SHOTS = process.env.E2E_SHOTS ?? path.join(ROOT, "tests/e2e/.captures");
const PASSWORD = "DemoBridge-2026";
const DOMAIN = "demo.devbridge.test";
const OFFER_TITLE = "Flutter contre Python : une appli qui prédit les récoltes";

const ENV = {
  ...process.env,
  NEXT_PUBLIC_SITE_URL: APP,
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${DB_PORT}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: PUBLIC_KEY,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  NEXT_PUBLIC_DEMO_MODE: "true",
  DEMO_PASSWORD: PASSWORD,
  DEMO_EMAIL_DOMAIN: DOMAIN,
  NEXT_TELEMETRY_DISABLED: "1",
};

const NEXT_BIN = path.join(ROOT, "node_modules/next/dist/bin/next");
const problems: string[] = [];
let stepCount = 0;

function chromePath(): string {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter((item): item is string => Boolean(item));
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("Aucun navigateur trouvé. Renseigne CHROME_PATH.");
  return found;
}

async function step<T>(name: string, run: () => Promise<T>): Promise<T> {
  stepCount += 1;
  const label = `${String(stepCount).padStart(2, "0")}. ${name}`;
  const started = Date.now();
  try {
    const result = await run();
    console.log(`  ✓ ${label} (${Date.now() - started} ms)`);
    return result;
  } catch (error) {
    console.log(`  ✗ ${label}`);
    throw error;
  }
}

function watch(page: Page, who: string): void {
  page.on("pageerror", (error) => problems.push(`[${who}] erreur de page : ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // Le mini-serveur n'offre pas le temps réel : ces échecs de connexion sont attendus.
    if (/websocket|realtime|ERR_CONNECTION|Failed to load resource/i.test(text)) return;
    problems.push(`[${who}] console : ${text}`);
  });
}

async function shot(page: Page, name: string, fullPage = true): Promise<void> {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
}

async function expectText(page: Page, text: string | RegExp): Promise<void> {
  await page.getByText(text).first().waitFor({ state: "visible", timeout: 15_000 });
}

async function open(browser: Browser, who: string, viewport = { width: 1440, height: 900 }): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport, locale: "fr-FR", deviceScaleFactor: viewport.width < 500 ? 2 : 1 });
  context.setDefaultTimeout(20_000);
  const page = await context.newPage();
  watch(page, who);
  return { context, page };
}

async function demoLogin(page: Page, name: "Kodjo" | "Amina"): Promise<void> {
  await page.goto(`${APP}/connexion`);
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.waitForURL("**/tableau-de-bord");
  await expectText(page, `Bonjour, ${name}`);
}

async function closeDialog(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
}

/** Soumet un livrable pour chacune de mes tâches ouvertes. */
async function submitMine(page: Page, collaboration: string): Promise<number> {
  await page.goto(collaboration);
  let count = 0;
  for (;;) {
    const card = page
      .locator('section[aria-label="À faire"], section[aria-label="En cours"]')
      .getByRole("button")
      .filter({ hasText: "Toi" })
      .first();
    if ((await card.count()) === 0) break;
    await card.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Résultat obtenu").fill("Travail réalisé, expliqué et partagé dans le dépôt du projet.");
    await dialog.getByRole("button", { name: "Soumettre pour validation" }).click();
    await dialog.getByText("En attente de validation par ton partenaire").waitFor();
    await closeDialog(page);
    count += 1;
  }
  return count;
}

/** Valide chaque livrable que mon partenaire m'a soumis. */
async function approvePending(page: Page, collaboration: string): Promise<number> {
  await page.goto(collaboration);
  let count = 0;
  for (;;) {
    const card = page.locator('section[aria-label="En révision"]').getByRole("button").filter({ hasText: "À valider" }).first();
    if ((await card.count()) === 0) break;
    await card.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Valider le livrable" }).click();
    await dialog.getByText("Cette tâche est terminée").waitFor();
    await closeDialog(page);
    count += 1;
  }
  return count;
}

async function waitForServer(child: ChildProcess): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Le serveur Next n'a pas démarré à temps.")), 90_000);
    const onData = (chunk: Buffer) => {
      if (/Ready in|ready started|started server/i.test(chunk.toString())) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      if (/error/i.test(text)) console.error(text.trim());
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Le serveur Next s'est arrêté (code ${code}).`));
    });
  });
}

async function main(): Promise<void> {
  rmSync(SHOTS, { recursive: true, force: true });
  mkdirSync(SHOTS, { recursive: true });

  console.log("\nBase de données embarquée et données de démonstration…");
  const supabase = await MiniSupabase.start(DB_PORT);
  await supabase.seed({ password: PASSWORD, emailDomain: DOMAIN });
  const admin = await supabase.createAccount({
    email: "admin@devbridge.test",
    password: PASSWORD,
    user_metadata: { first_name: "Ada", last_name: "Admin", country: "NG", timezone: "Africa/Lagos" },
  });
  await supabase.db.sql(`select public.server_set_admin('admin@devbridge.test')`);
  await supabase.db.sql(
    `update public.profiles set onboarding_completed_at = now(), onboarding_step = 8 where id = ${lit(admin.id)}`,
  );

  console.log("Compilation de l'application…");
  const build = spawnSync(process.execPath, [NEXT_BIN, "build"], { cwd: ROOT, env: ENV, encoding: "utf8" });
  if (build.status !== 0) {
    console.error(build.stdout, build.stderr);
    throw new Error("La compilation a échoué.");
  }

  console.log("Démarrage du serveur…");
  const server = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(APP_PORT), "-H", "127.0.0.1"], {
    cwd: ROOT,
    env: ENV,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let browser: Browser | undefined;

  try {
    await waitForServer(server);
    browser = await chromium.launch({ executablePath: chromePath(), headless: true });
    console.log("\nParcours\n");

    const kodjo = await open(browser, "Kodjo");
    const amina = await open(browser, "Amina");
    const visitor = await open(browser, "Visiteur");

    await step("Un visiteur ne peut pas ouvrir une page privée", async () => {
      await visitor.page.goto(`${APP}/tableau-de-bord`);
      await visitor.page.waitForURL(/\/connexion\?next=/);
      await visitor.page.goto(`${APP}/admin`);
      await visitor.page.waitForURL(/\/connexion\?next=/);
    });

    await step("Accueil public", async () => {
      await visitor.page.goto(APP);
      await expectText(visitor.page, "Les bonnes compétences méritent de se rencontrer.");
      await shot(visitor.page, "01-accueil");
      await visitor.page.goto(`${APP}/explorer`);
      await expectText(visitor.page, "Explorer les échanges");
      await expectText(visitor.page, "Coups de main express");
      await shot(visitor.page, "02-explorer-visiteur");
      await visitor.page.goto(`${APP}/developpeurs`);
      await expectText(visitor.page, "Amina Diallo");
      await shot(visitor.page, "03-developpeurs-visiteur");
    });

    await step("Kodjo se connecte", async () => {
      await demoLogin(kodjo.page, "Kodjo");
      await shot(kodjo.page, "04-tableau-de-bord-kodjo");
    });

    await step("Kodjo complète son profil", async () => {
      await kodjo.page.goto(`${APP}/profil/modifier`);
      await kodjo.page
        .getByLabel("Présentation", { exact: true })
        .fill("Je développe des applications mobiles pour des coopératives agricoles au Togo, et je veux y ajouter de la prédiction.");
      await kodjo.page.getByRole("button", { name: /Soir en semaine/ }).click();
      await kodjo.page.getByRole("button", { name: /Week-end/ }).click();
      await shot(kodjo.page, "05-modifier-profil");
      await kodjo.page.getByRole("button", { name: "Enregistrer mon profil" }).click();
      await kodjo.page.waitForURL("**/developpeurs/kodjomensah");
      await expectText(kodjo.page, "coopératives agricoles");
    });

    const offerUrl = await step("Kodjo publie une annonce (avec aperçu)", async () => {
      await kodjo.page.goto(`${APP}/annonces/nouvelle`);
      await kodjo.page.getByLabel("Titre").fill(OFFER_TITLE);
      await kodjo.page
        .getByLabel("Description")
        .fill("Mon application Flutter suit les parcelles de coopératives. Je cherche de l'aide pour y brancher un modèle Python de prédiction des récoltes. En retour, je t'accompagne sur Flutter.");
      const proposed = kodjo.page.locator('[role="group"][aria-label="Compétences proposées"]');
      await proposed.getByRole("button", { name: "Flutter", exact: true }).first().click();
      await proposed.getByRole("button", { name: "Dart", exact: true }).first().click();
      const requested = kodjo.page.locator('[role="group"][aria-label="Compétences recherchées"]');
      await requested.getByRole("button", { name: "Python", exact: true }).first().click();
      await shot(kodjo.page, "06-nouvelle-annonce");
      await kodjo.page.getByRole("button", { name: "Prévisualiser" }).click();
      await expectText(kodjo.page, "Rien n'est encore publié");
      await shot(kodjo.page, "07-apercu-annonce");
      await kodjo.page.getByRole("button", { name: "Publier l'annonce" }).click();
      await kodjo.page.waitForURL(/\/annonces\/[0-9a-f-]{36}$/);
      await expectText(kodjo.page, OFFER_TITLE);
      await shot(kodjo.page, "08-annonce-publiee");
      return kodjo.page.url();
    });

    await step("Amina découvre la correspondance et ses raisons", async () => {
      await demoLogin(amina.page, "Amina");
      await amina.page.goto(`${APP}/pour-toi`);
      await expectText(amina.page, "Kodjo Mensah");
      await expectText(amina.page, "Cette personne recherche précisément une compétence que tu proposes : Python.");
      await expectText(amina.page, "Correspondance réciproque forte");
      await shot(amina.page, "09-pour-toi-amina");
    });

    await step("Amina envoie une proposition", async () => {
      await amina.page.goto(`${APP}/explorer`);
      await amina.page
        .getByRole("article")
        .filter({ hasText: OFFER_TITLE })
        .getByRole("link", { name: "Proposer un échange" })
        .click();
      const dialog = amina.page.getByRole("dialog");
      await dialog.waitFor();
      // Les compétences qui se croisent sont déjà cochées.
      await dialog.getByRole("button", { name: "Python", pressed: true }).first().waitFor();
      await dialog.getByRole("button", { name: "Flutter", pressed: true }).first().waitFor();
      await dialog
        .getByLabel("Ton message")
        .fill("Bonjour Kodjo, je travaille sur des modèles de rendement agricole. Je peux t'aider à intégrer le tien, et j'aimerais apprendre Flutter avec toi.");
      await shot(amina.page, "10-proposition", false);
      await dialog.getByRole("button", { name: "Envoyer la proposition" }).click();
      await amina.page.waitForURL(/\/propositions\/[0-9a-f-]{36}$/);
      await expectText(amina.page, "En attente de sa réponse");
    });

    const collaboration = await step("Kodjo reçoit la proposition et l'accepte", async () => {
      await kodjo.page.goto(`${APP}/tableau-de-bord`);
      await expectText(kodjo.page, "Propositions à traiter");
      await kodjo.page.goto(`${APP}/mes-echanges`);
      await kodjo.page.getByRole("link").filter({ hasText: "Amina Diallo" }).first().click();
      await kodjo.page.waitForURL(/\/propositions\//);
      await shot(kodjo.page, "11-proposition-recue");
      await kodjo.page.getByRole("button", { name: "Accepter l'échange" }).click();
      await kodjo.page.getByRole("dialog").getByRole("button", { name: "Accepter et démarrer" }).click();
      await kodjo.page.waitForURL(/\/collaborations\/[0-9a-f-]{36}/);
      await expectText(kodjo.page, "Aucune tâche pour l'instant");
      return kodjo.page.url().split("?")[0]!;
    });

    await step("Un plan de départ est proposé en un clic", async () => {
      await kodjo.page.getByRole("button", { name: "Proposer un plan de départ" }).click();
      await expectText(kodjo.page, "Cadrage : objectif, rythme et outils");
      await shot(kodjo.page, "12-tableau-des-taches");
    });

    await step("Kodjo ajoute une tâche à la main", async () => {
      await kodjo.page.getByRole("button", { name: "Nouvelle tâche" }).click();
      const dialog = kodjo.page.getByRole("dialog");
      await dialog.getByLabel("Titre").fill("Brancher le modèle sur l'écran des parcelles");
      await dialog.getByRole("button", { name: "Amina Diallo" }).click();
      await dialog.getByRole("button", { name: "Créer la tâche" }).click();
      await dialog.waitFor({ state: "hidden" });
      await expectText(kodjo.page, "Brancher le modèle sur l'écran des parcelles");
    });

    await step("Chacun soumet ses livrables, l'autre les valide", async () => {
      const first = await submitMine(kodjo.page, collaboration);
      await shot(kodjo.page, "13-livrables-soumis");
      const second = await approvePending(amina.page, collaboration);
      const third = await submitMine(amina.page, collaboration);
      const fourth = await approvePending(kodjo.page, collaboration);
      if (first + third !== 6 || second !== first || fourth !== third) {
        throw new Error(`Livrables : ${first} + ${third} soumis, ${second} + ${fourth} validés.`);
      }
    });

    await step("L'échange ne se termine que si les deux confirment", async () => {
      await kodjo.page.goto(collaboration);
      await kodjo.page.getByRole("button", { name: "Confirmer la fin de l'échange" }).click();
      await expectText(kodjo.page, "Tu as confirmé la fin de l'échange");
      await amina.page.goto(collaboration);
      await expectText(amina.page, "Kodjo Mensah propose de clôturer l'échange");
      await amina.page.getByRole("button", { name: "Confirmer la fin de l'échange" }).click();
      await expectText(amina.page, /Échange terminé le/);
    });

    await step("Amina évalue la collaboration", async () => {
      const groups = amina.page.getByRole("radiogroup");
      for (let index = 0; index < 4; index += 1) {
        await groups.nth(index).getByRole("radio", { name: "5 sur 5" }).click();
      }
      await amina.page.getByLabel("Un commentaire").fill("Kodjo explique Flutter avec patience et des exemples concrets.");
      await shot(amina.page, "14-echange-termine");
      await amina.page.getByRole("button", { name: "Envoyer mon évaluation" }).click();
      await amina.page.getByRole("button", { name: "Envoyer mon évaluation" }).waitFor({ state: "hidden" });
    });

    await step("L'attestation publique est délivrée", async () => {
      await amina.page.getByRole("link", { name: "Voir l'attestation" }).click();
      await amina.page.waitForURL(/\/attestations\//);
      await expectText(amina.page, "Attestation d'échange de compétences");
      const attestation = amina.page.url();
      await visitor.page.goto(attestation);
      await expectText(visitor.page, "Échange terminé et validé");
      await shot(visitor.page, "15-attestation");
    });

    await step("Le profil public de Kodjo enregistre la réalisation", async () => {
      await visitor.page.goto(`${APP}/developpeurs/kodjomensah`);
      const stat = visitor.page.locator("dl > div").filter({ hasText: "Échanges terminés" }).locator("dd");
      const value = (await stat.first().textContent())?.trim();
      if (value !== "1") throw new Error(`Échanges terminés affichés : ${value}`);
      await expectText(visitor.page, "Kodjo explique Flutter avec patience");
      await shot(visitor.page, "16-profil-public-kodjo");
    });

    await step("Messagerie entre les deux participants", async () => {
      await kodjo.page.goto(`${APP}/messages`);
      await kodjo.page.getByRole("link").filter({ hasText: "Amina Diallo" }).first().click();
      await kodjo.page.waitForURL(/\/messages\/[0-9a-f-]{36}/);
      await kodjo.page.getByLabel(/Écrire un message/).fill("Merci Amina, le modèle tourne sur mon téléphone !");
      await kodjo.page.getByRole("button", { name: "Envoyer le message" }).click();
      await expectText(kodjo.page, "Merci Amina, le modèle tourne sur mon téléphone !");
      await expectText(kodjo.page, /Envoyé/);
      await shot(kodjo.page, "17-messagerie", false);
      await amina.page.goto(kodjo.page.url());
      await expectText(amina.page, "Merci Amina, le modèle tourne sur mon téléphone !");
      await amina.page.goto(`${APP}/notifications`);
      await expectText(amina.page, "Kodjo Mensah a accepté ta proposition");
      await shot(amina.page, "18-notifications");
    });

    await step("Kodjo propose une boucle d'échange à trois", async () => {
      await kodjo.page.goto(`${APP}/pour-toi`);
      await expectText(kodjo.page, "Boucles d'échange à trois");
      await expectText(kodjo.page, "Boucle possible");
      await shot(kodjo.page, "19-pour-toi-kodjo");
      await kodjo.page.getByRole("button", { name: "Proposer cette boucle" }).first().click();
      await kodjo.page.getByRole("dialog").getByRole("button", { name: "Envoyer les invitations" }).click();
      await expectText(kodjo.page, "2 acceptations attendues");
    });

    await step("Pages d'activité de Kodjo", async () => {
      await kodjo.page.goto(`${APP}/mes-echanges?onglet=termines`);
      await expectText(kodjo.page, OFFER_TITLE);
      await shot(kodjo.page, "20-mes-echanges");
      await kodjo.page.goto(`${APP}/mes-annonces`);
      await expectText(kodjo.page, OFFER_TITLE);
      await kodjo.page.goto(`${APP}/competences`);
      await expectText(kodjo.page, "Ce que je propose");
      await shot(kodjo.page, "21-competences");
      await kodjo.page.goto(`${APP}/parametres`);
      await expectText(kodjo.page, `kodjo@${DOMAIN}`);
      await kodjo.page.goto(offerUrl);
      await expectText(kodjo.page, "C'est ton annonce.");
    });

    await step("Un membre ordinaire ne voit pas l'administration", async () => {
      const response = await kodjo.page.goto(`${APP}/admin`);
      if (response?.status() !== 404) throw new Error(`/admin a répondu ${response?.status()} à un membre ordinaire.`);
      await expectText(kodjo.page, "Cette page n'existe pas");
    });

    await step("Inscription et accueil en huit étapes", async () => {
      const fresh = await open(browser!, "Nouveau");
      await fresh.page.goto(`${APP}/inscription`);
      await fresh.page.getByLabel("Prénom").fill("Sènan");
      await fresh.page.getByLabel("Nom", { exact: true }).fill("Hounkpatin");
      await fresh.page.getByLabel("Adresse e-mail").fill("senan@exemple.test");
      await fresh.page.getByLabel("Pays").selectOption("BJ");
      await fresh.page.getByLabel("Mot de passe", { exact: true }).fill("Bridge2026ok");
      await fresh.page.getByLabel("Confirmation").fill("Bridge2026ok");
      await fresh.page.getByRole("checkbox").check();
      await shot(fresh.page, "22-inscription");
      await fresh.page.getByRole("button", { name: "Créer mon compte" }).click();
      await fresh.page.waitForURL("**/bienvenue");
      await expectText(fresh.page, "Étape 1 sur 8");
      await shot(fresh.page, "23-accueil-etape-1");
      await fresh.page.getByRole("button", { name: "Continuer" }).click();
      await expectText(fresh.page, "Étape 2 sur 8");
      await fresh.page.getByRole("button", { name: "Français", exact: true }).click();
      await fresh.page.getByRole("button", { name: "Continuer" }).click();
      await expectText(fresh.page, "Étape 3 sur 8");
      await fresh.page.getByRole("button", { name: "Passer cette étape" }).click();
      await expectText(fresh.page, "Étape 4 sur 8");
      await fresh.page.getByRole("button", { name: "Développement Back-End", exact: true }).first().click();
      await shot(fresh.page, "24-accueil-etape-4");
      await fresh.page.getByRole("button", { name: "Continuer" }).click();
      await expectText(fresh.page, "Étape 5 sur 8");
      await fresh.page.getByRole("button", { name: "PHP", exact: true }).first().click();
      await fresh.page.getByRole("button", { name: "Continuer" }).click();
      await expectText(fresh.page, "Étape 6 sur 8");
      await fresh.page.getByRole("button", { name: "React Native", exact: true }).first().click();
      await fresh.page.getByRole("button", { name: "Continuer" }).click();
      await expectText(fresh.page, "Étape 7 sur 8");
      await fresh.page.getByRole("button", { name: /Week-end/ }).click();
      await fresh.page.getByRole("button", { name: "Continuer" }).click();
      await expectText(fresh.page, "Étape 8 sur 8");
      await fresh.page.getByRole("button", { name: "Terminer et voir mes correspondances" }).click();
      await fresh.page.waitForURL("**/pour-toi");
      // Sènan propose PHP et recherche React Native : Thabo (React Native) apparaît.
      await expectText(fresh.page, "Thabo Nkosi");
      await shot(fresh.page, "25-pour-toi-nouveau-membre");
      await fresh.context.close();
    });

    await step("Administration", async () => {
      const boss = await open(browser!, "Admin");
      await boss.page.goto(`${APP}/connexion`);
      await boss.page.getByLabel("Adresse e-mail").fill("admin@devbridge.test");
      await boss.page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
      await boss.page.getByRole("button", { name: "Se connecter" }).click();
      await boss.page.waitForURL("**/tableau-de-bord");
      await boss.page.goto(`${APP}/admin`);
      await expectText(boss.page, "Données de démonstration");
      await shot(boss.page, "26-admin");
      await boss.page.goto(`${APP}/admin/utilisateurs`);
      await expectText(boss.page, "Kodjo Mensah");
      await shot(boss.page, "27-admin-utilisateurs");
      await boss.page.goto(`${APP}/admin/annonces`);
      await expectText(boss.page, OFFER_TITLE);
      await boss.page.goto(`${APP}/admin/signalements`);
      await expectText(boss.page, "Aucun signalement à traiter");
      await boss.page.goto(`${APP}/admin/statistiques`);
      await expectText(boss.page, "Inscriptions par semaine");
      await shot(boss.page, "28-admin-statistiques");
      await boss.context.close();
    });

    await step("Affichage sur téléphone", async () => {
      const phone = await open(browser!, "Téléphone", { width: 390, height: 844 });
      await phone.page.goto(APP);
      await shot(phone.page, "30-mobile-accueil");
      await demoLogin(phone.page, "Amina");
      await shot(phone.page, "31-mobile-tableau-de-bord");
      await phone.page.goto(`${APP}/pour-toi`);
      await expectText(phone.page, "Kodjo Mensah");
      await shot(phone.page, "32-mobile-pour-toi");
      await phone.page.goto(collaboration);
      await expectText(phone.page, OFFER_TITLE);
      await shot(phone.page, "33-mobile-collaboration");
      await phone.page.goto(`${APP}/explorer`);
      await shot(phone.page, "34-mobile-explorer");
      await phone.page.goto(`${APP}/messages`);
      await phone.page.getByRole("link").filter({ hasText: "Kodjo Mensah" }).first().click();
      await phone.page.waitForURL(/\/messages\/[0-9a-f-]{36}/);
      await shot(phone.page, "35-mobile-messages", false);
      // Aucune page ne doit déborder horizontalement.
      for (const route of ["/", "/explorer", "/pour-toi", "/tableau-de-bord", "/developpeurs", "/mes-echanges"]) {
        await phone.page.goto(`${APP}${route}`);
        await phone.page.waitForLoadState("networkidle").catch(() => undefined);
        const overflow = await phone.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 1) throw new Error(`${route} déborde de ${overflow}px sur téléphone.`);
      }
      await phone.context.close();
    });
  } finally {
    await browser?.close().catch(() => undefined);
    server.kill();
    await supabase.stop().catch(() => undefined);
  }

  if (problems.length) {
    console.log(`\n${problems.length} problème(s) relevé(s) dans le navigateur :`);
    for (const problem of Array.from(new Set(problems)).slice(0, 30)) console.log(`  - ${problem}`);
    process.exitCode = 1;
  } else {
    console.log(`\nParcours complet réussi : ${stepCount} étapes, aucune erreur dans le navigateur.`);
  }
  console.log(`Captures : ${SHOTS}\n`);
}

main().catch((error) => {
  console.error(`\nÉchec : ${(error as Error).message}\n`);
  if (problems.length) {
    for (const problem of Array.from(new Set(problems)).slice(0, 20)) console.log(`  - ${problem}`);
  }
  process.exit(1);
});
