/**
 * Vidéo de démonstration de DevBridge (moins de 2 minutes, 1920×1080, sous-titrée).
 *
 *   npm run video
 *
 * La vraie application est filmée automatiquement, sur une copie locale
 * alimentée par les données de démonstration : la base en ligne n'est jamais
 * touchée. Chaque scène est capturée image par image depuis Chrome, puis le
 * montage (écrans titres, fondus, composition téléphone) est fait avec ffmpeg.
 *
 * Résultat : video/devbridge-demo.mp4, video/miniature.png, video/youtube.txt
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type BrowserContext, type CDPSession, type Locator, type Page } from "playwright-core";
import { lit } from "../../tests/db/harness";
import { MiniSupabase, PUBLIC_KEY, SERVICE_KEY } from "../../tests/e2e/mini-supabase";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "video");
const WORK = path.join(OUT, ".work");
const APP_PORT = 3230;
const DB_PORT = 54330;
const APP = `http://127.0.0.1:${APP_PORT}`;
const PASSWORD = "DemoBridge-2026";
const DOMAIN = "demo.devbridge.test";
const LIVE_URL = "kodora-nine.vercel.app";
const REPO_URL = "github.com/Skwiz-blip/CADEV";
const OFFER_TITLE = "Flutter contre Python : une appli qui prédit les récoltes";
const FADE = 0.45;
const MAX_SECONDS = 118;

const DESKTOP = { width: 1440, height: 810, scale: 4 / 3 }; // capturé en 1920×1080
const PHONE = { width: 390, height: 844, scale: 2 };

const ENV = {
  ...process.env,
  NEXT_PUBLIC_SITE_URL: `https://${LIVE_URL}`,
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${DB_PORT}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: PUBLIC_KEY,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  NEXT_PUBLIC_DEMO_MODE: "true",
  DEMO_PASSWORD: PASSWORD,
  DEMO_EMAIL_DOMAIN: DOMAIN,
  NEXT_TELEMETRY_DISABLED: "1",
};
const NEXT_BIN = path.join(ROOT, "node_modules/next/dist/bin/next");
const FONT_DIR = path.join(ROOT, "node_modules/geist/dist/fonts/geist-sans");

// ── Outils ───────────────────────────────────────────────────────────────
function log(line: string) {
  console.log(`  ${line}`);
}

function ffmpeg(args: string[]) {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`ffmpeg : ${result.stderr || result.stdout}`);
}

function probeDuration(file: string): number {
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
    { encoding: "utf8" },
  );
  const value = Number(result.stdout.trim());
  if (!Number.isFinite(value)) throw new Error(`Durée illisible : ${file}`);
  return value;
}

function chromePath(): string {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter((item): item is string => Boolean(item));
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("Aucun navigateur trouvé. Renseigne CHROME_PATH.");
  return found;
}

// ── Habillage injecté dans les pages filmées ─────────────────────────────
// Curseur visible, sous-titres aux couleurs du site, messages éphémères masqués
// (les sous-titres racontent déjà l'action), barres de défilement masquées.
const OVERLAY = String.raw`(() => {
  const phone = window.matchMedia("(max-width: 500px)").matches;
  const css = document.createElement("style");
  css.textContent = [
    "[data-sonner-toaster],[data-demo-banner]{display:none!important}",
    "html{scrollbar-width:none}::-webkit-scrollbar{display:none}",
    "#__cursor{position:fixed;z-index:2147483647;left:0;top:0;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;background:rgba(16,27,54,.9);box-shadow:0 0 0 3px #fff,0 8px 20px rgba(16,27,54,.35);pointer-events:none;opacity:0;transition:transform .12s ease,opacity .25s ease}",
    "#__cursor.on{opacity:1}#__cursor.down{transform:scale(.72)}",
    ".__ripple{position:fixed;z-index:2147483646;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;box-shadow:0 0 0 3px #28B8D5;pointer-events:none;animation:__ripple .55s ease-out forwards}",
    "@keyframes __ripple{from{transform:scale(.3);opacity:1}to{transform:scale(1.5);opacity:0}}",
    "#__caption{position:fixed;left:50%;bottom:26px;z-index:2147483645;display:flex;align-items:flex-start;gap:14px;max-width:min(1000px,calc(100vw - 64px));padding:16px 26px 17px;border-radius:18px;background:#101B36;color:#fff;font:600 21px/1.45 var(--font-geist-sans),system-ui,sans-serif;letter-spacing:-.01em;box-shadow:0 22px 60px -22px rgba(16,27,54,.7);opacity:0;transform:translate(-50%,10px);transition:opacity .35s ease,transform .35s ease;pointer-events:none}",
    "#__caption.on{opacity:1;transform:translate(-50%,0)}",
    "#__caption i{flex:none;width:10px;height:10px;margin-top:10px;border-radius:50%;background:#28B8D5}",
  ].join("");
  const ensure = () => {
    if (!document.body) return;
    if (!css.isConnected) document.head.appendChild(css);
    if (!document.getElementById("__cursor")) {
      const cursor = document.createElement("div");
      cursor.id = "__cursor";
      const saved = sessionStorage.getItem("__cursor");
      if (saved && !phone) {
        const [x, y] = saved.split(",");
        cursor.style.left = x + "px";
        cursor.style.top = y + "px";
        cursor.classList.add("on");
      }
      document.body.appendChild(cursor);
    }
    if (!phone && !document.getElementById("__caption")) {
      const caption = document.createElement("div");
      caption.id = "__caption";
      caption.innerHTML = "<i></i><span></span>";
      document.body.appendChild(caption);
      const text = sessionStorage.getItem("__caption");
      if (text) {
        caption.querySelector("span").textContent = text;
        caption.classList.add("on");
      }
    }
  };
  window.__caption = (text) => {
    ensure();
    const caption = document.getElementById("__caption");
    if (!caption) return;
    if (!text) {
      sessionStorage.removeItem("__caption");
      caption.classList.remove("on");
      return;
    }
    sessionStorage.setItem("__caption", text);
    const span = caption.querySelector("span");
    if (caption.classList.contains("on") && span.textContent !== text) {
      caption.classList.remove("on");
      setTimeout(() => { span.textContent = text; caption.classList.add("on"); }, 260);
    } else {
      span.textContent = text;
      caption.classList.add("on");
    }
  };
  addEventListener("mousemove", (event) => {
    ensure();
    const cursor = document.getElementById("__cursor");
    if (!cursor || phone) return;
    cursor.style.left = event.clientX + "px";
    cursor.style.top = event.clientY + "px";
    cursor.classList.add("on");
    sessionStorage.setItem("__cursor", event.clientX + "," + event.clientY);
  }, true);
  addEventListener("mousedown", (event) => {
    const cursor = document.getElementById("__cursor");
    if (cursor) cursor.classList.add("down");
    const ripple = document.createElement("div");
    ripple.className = "__ripple";
    ripple.style.left = event.clientX + "px";
    ripple.style.top = event.clientY + "px";
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, true);
  addEventListener("mouseup", () => {
    const cursor = document.getElementById("__cursor");
    if (cursor) cursor.classList.remove("down");
  }, true);
  document.addEventListener("DOMContentLoaded", ensure);
  setInterval(ensure, 400);
})();`;

// ── Capture image par image ──────────────────────────────────────────────
type Frame = { t: number; file: string };
type Clip = { name: string; frames: Frame[]; end: number; width: number; height: number };

class Recorder {
  private frames: Frame[] = [];
  private index = 0;
  private constructor(
    private readonly cdp: CDPSession,
    private readonly dir: string,
    private readonly name: string,
    private readonly width: number,
    private readonly height: number,
  ) {}

  static async start(page: Page, name: string, width: number, height: number): Promise<Recorder> {
    const dir = path.join(WORK, name);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const cdp = await page.context().newCDPSession(page);
    const recorder = new Recorder(cdp, dir, name, width, height);
    cdp.on("Page.screencastFrame", (event: { data: string; sessionId: number }) => {
      recorder.index += 1;
      const file = path.join(dir, `f${String(recorder.index).padStart(5, "0")}.jpg`);
      writeFileSync(file, Buffer.from(event.data, "base64"));
      recorder.frames.push({ t: Date.now() / 1000, file });
      void cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => undefined);
    });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: width, maxHeight: height, everyNthFrame: 1 });
    await page.waitForTimeout(250);
    return recorder;
  }

  async stop(): Promise<Clip> {
    const end = Date.now() / 1000;
    await this.cdp.send("Page.stopScreencast").catch(() => undefined);
    await this.cdp.detach().catch(() => undefined);
    if (this.frames.length === 0) throw new Error(`Aucune image capturée pour « ${this.name} ».`);
    return { name: this.name, frames: this.frames, end, width: this.width, height: this.height };
  }
}

function encodeClip(clip: Clip, speed: number): string {
  const out = path.join(WORK, `${clip.name}.mp4`);
  const list = path.join(WORK, `${clip.name}.txt`);
  const lines: string[] = [];
  clip.frames.forEach((frame, index) => {
    const next = clip.frames[index + 1]?.t ?? clip.end;
    const duration = Math.max(0.001, (next - frame.t) / speed);
    lines.push(`file '${frame.file.replace(/\\/g, "/")}'`, `duration ${duration.toFixed(4)}`);
  });
  lines.push(`file '${clip.frames[clip.frames.length - 1]!.file.replace(/\\/g, "/")}'`);
  writeFileSync(list, lines.join("\n"));
  ffmpeg([
    "-f", "concat", "-safe", "0", "-i", list,
    "-vf", `scale=${clip.width}:${clip.height}:flags=lanczos,fps=30,format=yuv420p`,
    "-fps_mode", "cfr", "-c:v", "libx264", "-preset", "medium", "-crf", "17", out,
  ]);
  return out;
}

// ── Gestes visibles à l'écran ────────────────────────────────────────────
/** `fx` : position horizontale visée (0 = bord gauche, 1 = bord droit), pour ne pas masquer un texte. */
async function point(page: Page, target: Locator, fx = 0.5) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error("Élément introuvable à l'écran.");
  await page.mouse.move(box.x + box.width * fx, box.y + box.height / 2, { steps: 22 });
  await page.waitForTimeout(160);
}

async function click(page: Page, target: Locator) {
  await point(page, target);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(220);
}

async function type(page: Page, target: Locator, text: string, delay = 24) {
  await click(page, target);
  await page.keyboard.type(text, { delay });
}

async function caption(page: Page, text: string | null) {
  await page.waitForFunction(() => typeof (window as unknown as { __caption?: unknown }).__caption === "function");
  await page.evaluate((value) => (window as unknown as { __caption: (t: string | null) => void }).__caption(value), text);
}

async function scrollTo(page: Page, target: Locator | number, settle = 900) {
  if (typeof target === "number") {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), target);
  } else {
    await target.evaluate((element) => element.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
  await page.waitForTimeout(settle);
}

async function ready(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await caption(page, null);
  await page.waitForTimeout(500);
}

// ── Écrans titres ────────────────────────────────────────────────────────
const LOGO = (size: number, onDark: boolean) => `
<svg viewBox="0 0 32 32" width="${size}" height="${size}">
  <rect width="32" height="32" rx="9" fill="${onDark ? "#FFFFFF" : "#101B36"}"/>
  <path d="M8.5 20.5c2.6-7.6 12.4-7.6 15 0" fill="none" stroke="#28B8D5" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="8.5" cy="20.5" r="3.1" fill="${onDark ? "#101B36" : "#FFFFFF"}"/>
  <circle cx="23.5" cy="20.5" r="3.1" fill="${onDark ? "#101B36" : "#FFFFFF"}"/>
</svg>`;

function page(body: string, background: string): string {
  const font = (file: string, weight: number) =>
    `@font-face{font-family:Geist;font-weight:${weight};src:url("${pathToFileURL(path.join(FONT_DIR, file)).href}")}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${font("Geist-Regular.ttf", 400)}${font("Geist-Medium.ttf", 500)}${font("Geist-SemiBold.ttf", 600)}${font("Geist-Bold.ttf", 700)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px;overflow:hidden}
body{background:${background};font-family:Geist,system-ui,sans-serif;-webkit-font-smoothing:antialiased;letter-spacing:-.02em}
.dot{display:inline-block;width:14px;height:14px;border-radius:50%;background:#28B8D5;margin-right:14px;vertical-align:middle}
</style></head><body>${body}</body></html>`;
}

const CARDS: Record<string, { html: string; transparent?: boolean }> = {
  intro: {
    html: page(
      `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff">
        ${LOGO(132, true)}
        <h1 style="margin-top:40px;font-size:112px;font-weight:600">DevBridge</h1>
        <p style="margin-top:22px;font-size:46px;font-weight:500;color:rgba(255,255,255,.82)">Les bonnes compétences méritent de se rencontrer.</p>
        <p style="position:absolute;bottom:80px;font-size:26px;font-weight:500;color:rgba(255,255,255,.55)"><span class="dot"></span>Coupe d'Afrique des Développeurs 2026</p>
      </div>`,
      "#101B36",
    ),
  },
  probleme: {
    html: page(
      `<div style="height:100%;display:flex;flex-direction:column;justify-content:center;padding:0 200px">
        <p style="font-size:30px;font-weight:600;color:#2457E8">Le constat</p>
        <h2 style="margin-top:22px;max-width:1300px;font-size:84px;line-height:1.08;font-weight:600;color:#101B36">En Afrique, beaucoup de développeurs avancent seuls.</h2>
        <p style="margin-top:40px;max-width:1250px;font-size:44px;line-height:1.3;font-weight:500;color:#5B6B82">Un spécialiste coûte cher. Le savoir-faire, lui, peut s'échanger.</p>
      </div>`,
      "#F4F6FA",
    ),
  },
  telephone: {
    html: page(
      `<div style="height:100%;display:flex;flex-direction:column;justify-content:center;padding:0 0 0 150px;width:860px">
        <p style="font-size:28px;font-weight:600;color:#2457E8">Partout sur le continent</p>
        <h2 style="margin-top:20px;font-size:68px;line-height:1.1;font-weight:600;color:#101B36">Pensé pour le téléphone et les connexions lentes.</h2>
        <ul style="margin-top:44px;list-style:none;font-size:32px;line-height:1.9;font-weight:500;color:#101B36">
          <li><span class="dot"></span>Pages légères, navigation au pouce</li>
          <li><span class="dot"></span>Brouillons gardés hors connexion</li>
          <li><span class="dot"></span>Créneaux affichés à l'heure de chacun</li>
        </ul>
      </div>`,
      "#F4F6FA",
    ),
  },
  bezel: {
    transparent: true,
    html: page(
      `${[980, 1460]
        .map(
          (left) =>
            `<div style="position:absolute;left:${left}px;top:90px;width:416px;height:900px;border-radius:46px;box-shadow:0 0 0 14px #0B1226,0 40px 90px -30px rgba(16,27,54,.55)"></div>`,
        )
        .join("")}`,
      "transparent",
    ),
  },
  fin: {
    html: page(
      `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff">
        ${LOGO(104, true)}
        <h2 style="margin-top:34px;font-size:96px;font-weight:600">DevBridge</h2>
        <p style="margin-top:22px;font-size:46px;font-weight:500;color:rgba(255,255,255,.88)">« Le savoir est un baobab : personne ne peut l'embrasser seul. »</p>
        <p style="margin-top:14px;font-size:26px;font-weight:500;color:rgba(255,255,255,.5)">Proverbe éwé</p>
        <div style="margin-top:70px;display:flex;gap:28px">
          <p style="padding:22px 34px;border-radius:22px;background:#1A2848;font-size:34px;font-weight:600;color:#28B8D5">${LIVE_URL}</p>
          <p style="padding:22px 34px;border-radius:22px;background:#1A2848;font-size:34px;font-weight:500;color:rgba(255,255,255,.85)">${REPO_URL}</p>
        </div>
        <p style="position:absolute;bottom:80px;font-size:26px;font-weight:500;color:rgba(255,255,255,.55)"><span class="dot"></span>Coupe d'Afrique des Développeurs 2026</p>
      </div>`,
      "#101B36",
    ),
  },
};

async function renderCards(browser: Browser): Promise<Record<string, string>> {
  const dir = path.join(WORK, "cards");
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const tab = await context.newPage();
  const files: Record<string, string> = {};
  for (const [name, card] of Object.entries(CARDS)) {
    const html = path.join(dir, `${name}.html`);
    const png = path.join(dir, `${name}.png`);
    writeFileSync(html, card.html);
    await tab.goto(pathToFileURL(html).href);
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: png, omitBackground: Boolean(card.transparent) });
    files[name] = png;
  }
  await context.close();
  return files;
}

function stillSegment(png: string, seconds: number, name: string): string {
  const out = path.join(WORK, `${name}.mp4`);
  const frames = Math.round(seconds * 30);
  // Léger travelling avant sur l'image (rendu deux fois plus grand pour rester fluide).
  ffmpeg([
    "-i", png,
    "-vf", `scale=3840:2160,zoompan=z='1+0.035*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30,format=yuv420p`,
    "-frames:v", String(frames), "-c:v", "libx264", "-preset", "medium", "-crf", "17", out,
  ]);
  return out;
}

function phoneSegment(background: string, bezel: string, left: string, right: string): string {
  const out = path.join(WORK, "telephone.mp4");
  const seconds = Math.max(probeDuration(left), probeDuration(right));
  ffmpeg([
    "-loop", "1", "-t", seconds.toFixed(2), "-i", background,
    "-i", left, "-i", right,
    "-loop", "1", "-t", seconds.toFixed(2), "-i", bezel,
    "-filter_complex",
    [
      `[1:v]scale=416:900:flags=lanczos,tpad=stop_mode=clone:stop_duration=${seconds.toFixed(2)},setsar=1[a]`,
      `[2:v]scale=416:900:flags=lanczos,tpad=stop_mode=clone:stop_duration=${seconds.toFixed(2)},setsar=1[b]`,
      `[0:v][a]overlay=980:90[t1]`,
      `[t1][b]overlay=1460:90[t2]`,
      `[t2][3:v]overlay=0:0,fps=30,format=yuv420p[v]`,
    ].join(";"),
    "-map", "[v]", "-t", seconds.toFixed(2), "-c:v", "libx264", "-preset", "medium", "-crf", "17", out,
  ]);
  return out;
}

// ── Voix off ─────────────────────────────────────────────────────────────
/**
 * Un texte par repère, placé au début de la scène indiquée. Chaque texte doit
 * tenir dans la fenêtre qui le sépare du repère suivant : le minutage exact est
 * écrit dans video/elevenlabs.txt à chaque fabrication.
 */
const VOICE: { at: string; text: string }[] = [
  {
    at: "carte-intro",
    text: "DevBridge. En Afrique, beaucoup de développeurs avancent seuls. Un expert coûte cher. Le savoir-faire, lui, s'échange.",
  },
  { at: "accueil", text: "DevBridge met en relation les développeurs dont les compétences se complètent." },
  {
    at: "annonce",
    text: "Kodjo, à Lomé, maîtrise Flutter et cherche de l'aide en Python. Il publie une annonce, vérifie l'aperçu… et la met en ligne.",
  },
  {
    at: "correspondance",
    text: "À Dakar, Amina découvre la correspondance : quatre-vingt-quinze sur cent. Et surtout, elle voit pourquoi, avec leurs créneaux communs affichés à son heure.",
  },
  { at: "proposition", text: "Elle lui propose un échange : ce qu'elle apporte, et ce qu'elle attend en retour." },
  {
    at: "acceptation",
    text: "Kodjo accepte. Rien ne démarre sans l'accord des deux. Leur espace de travail s'ouvre, avec un plan de départ en un clic. Chaque tâche se termine par un livrable.",
  },
  {
    at: "validation",
    text: "Amina valide le travail de Kodjo : personne ne valide le sien. Quand tout est validé, ils confirment la fin de l'échange, et une attestation publique rejoint leurs profils.",
  },
  {
    at: "boucle",
    text: "Personne ne veut ce que tu proposes ? DevBridge trouve une boucle à trois. Et si tu bloques sur un bug, le coup de main express prévient aussitôt les bonnes personnes.",
  },
  {
    at: "telephone",
    text: "Le tout, pensé pour le téléphone et les connexions lentes. DevBridge. Le savoir est un baobab : personne ne peut l'embrasser seul.",
  },
];

const VOICE_DESCRIPTION =
  "Voix féminine francophone, la trentaine, chaleureuse et assurée, avec une légère pointe d'accent d'Afrique de l'Ouest. " +
  "Diction claire et naturelle, rythme posé, ton enthousiaste mais professionnel, comme une présentatrice qui lance un produit technologique. " +
  "Enregistrement de qualité studio, sans écho ni bruit de fond.";

// Débit naturel d'une voix off française, en mots par seconde.
const WORDS_PER_SECOND = 2.6;

type Timeline = {
  total: number;
  segments: { name: string; start: number; end: number }[];
  cues: { n: number; at: string; start: number; max: number; text: string }[];
};

function timeline(segments: string[], durations: number[]): Timeline {
  const names = segments.map((file) => path.basename(file, ".mp4"));
  const starts: number[] = [];
  durations.forEach((_, index) => {
    starts.push(index === 0 ? 0 : starts[index - 1]! + durations[index - 1]! - FADE);
  });
  const total = starts[starts.length - 1]! + durations[durations.length - 1]!;
  const cueStarts = VOICE.map((cue) => {
    const index = names.indexOf(cue.at);
    if (index < 0) throw new Error(`Voix off : scène inconnue « ${cue.at} ».`);
    return starts[index]! + (index === 0 ? 0.5 : FADE + 0.2);
  });
  return {
    total,
    segments: names.map((name, index) => ({ name, start: starts[index]!, end: starts[index]! + durations[index]! })),
    cues: VOICE.map((cue, index) => {
      const next = cueStarts[index + 1] ?? total + 0.3;
      return { n: index + 1, at: cue.at, start: cueStarts[index]!, max: next - cueStarts[index]! - 0.3 - (index === VOICE.length - 1 ? 0.8 : 0), text: cue.text };
    }),
  };
}

const seconds = (value: number) => `${value.toFixed(1).replace(".", ",")} s`;
const wordCount = (text: string) => text.split(/\s+/).filter((word) => /\p{L}|\d/u.test(word)).length;

function writeVoiceGuide(plan: Timeline) {
  const lines = [
    "VOIX OFF DEVBRIDGE — À GÉNÉRER AVEC ELEVENLABS",
    "",
    "1. LA VOIX",
    "Dans ElevenLabs : Voices → Add a new voice → Voice Design, puis coller cette description",
    "(ou choisir dans la bibliothèque une voix proche) :",
    "",
    VOICE_DESCRIPTION,
    "",
    "Texte d'essai pour la création de la voix :",
    "« Bienvenue sur DevBridge, la plateforme où les développeurs africains échangent leurs compétences pour construire ensemble. »",
    "",
    "2. LES RÉGLAGES (Text to Speech)",
    "Modèle : Eleven Multilingual v2 (le plus fiable en français)",
    "Stability : 50 %   Similarity : 75 %   Style : 20 à 30 %   Speaker boost : activé   Speed : 1,0",
    "",
    "3. UN FICHIER PAR TEXTE",
    "Générer chaque texte séparément, puis l'enregistrer sous le numéro indiqué dans le dossier :",
    `  ${path.join(OUT, "voix")}`,
    "  (01.mp3, 02.mp3, … ; les formats .wav et .m4a sont aussi acceptés)",
    "Ensuite, dans le terminal du projet : npm run video:voix",
    "La voix est posée au bon moment sur chaque scène. Si un fichier est un peu trop long, il est légèrement",
    "accéléré ; s'il l'est vraiment trop, la commande le signale.",
    "",
    "4. LES TEXTES",
    "",
  ];
  for (const cue of plan.cues) {
    const capacity = Math.floor(cue.max * WORDS_PER_SECOND);
    lines.push(
      `${String(cue.n).padStart(2, "0")}.mp3 — à ${seconds(cue.start)} — ${seconds(cue.max)} maximum (${wordCount(cue.text)} mots, ${capacity} au plus)`,
      cue.text,
      "",
    );
  }
  writeFileSync(path.join(OUT, "elevenlabs.txt"), lines.join("\n"));
  writeFileSync(path.join(OUT, "minutage.json"), JSON.stringify(plan, null, 2));
  for (const cue of plan.cues) {
    const capacity = Math.floor(cue.max * WORDS_PER_SECOND);
    if (wordCount(cue.text) > capacity) {
      log(`Attention : le texte ${cue.n} (${wordCount(cue.text)} mots) risque de dépasser ${seconds(cue.max)}.`);
    }
  }
}

/** Pose les fichiers de voix sur la vidéo muette. Sans fichier, la vidéo reste muette. */
function mixVoice(plan: Timeline, silent: string, final: string) {
  const dir = path.join(OUT, "voix");
  const found: { cue: Timeline["cues"][number]; file: string }[] = [];
  for (const cue of plan.cues) {
    const base = path.join(dir, String(cue.n).padStart(2, "0"));
    const file = [".mp3", ".wav", ".m4a"].map((extension) => base + extension).find((candidate) => existsSync(candidate));
    if (file) found.push({ cue, file });
  }
  if (found.length === 0) {
    ffmpeg(["-i", silent, "-c", "copy", "-movflags", "+faststart", final]);
    log("Aucun fichier de voix dans video/voix : la vidéo reste muette.");
    return;
  }
  const missing = plan.cues.filter((cue) => !found.some((item) => item.cue.n === cue.n)).map((cue) => cue.n);
  if (missing.length) log(`Fichiers de voix absents : ${missing.join(", ")}. Ces passages resteront muets.`);

  const filters: string[] = [];
  found.forEach(({ cue, file }, index) => {
    const duration = probeDuration(file);
    let tempo = 1;
    if (duration > cue.max) {
      tempo = Math.min(1.12, duration / cue.max);
      if (duration / tempo > cue.max + 0.25) {
        log(`Le texte ${cue.n} est trop long (${seconds(duration)} pour ${seconds(cue.max)}) : raccourcis-le ou demande une voix un peu plus rapide.`);
      } else {
        log(`Texte ${cue.n} accéléré de ${Math.round((tempo - 1) * 100)} % pour tenir dans sa scène.`);
      }
    }
    const delay = Math.round(cue.start * 1000);
    filters.push(
      `[${index + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,atempo=${tempo.toFixed(3)},adelay=${delay}|${delay}[v${index}]`,
    );
  });
  filters.push(
    `${found.map((_, index) => `[v${index}]`).join("")}amix=inputs=${found.length}:normalize=0:dropout_transition=0,` +
      `loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=0:${plan.total.toFixed(2)}[a]`,
  );
  ffmpeg([
    "-i", silent,
    ...found.flatMap(({ file }) => ["-i", file]),
    "-filter_complex", filters.join(";"),
    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart", "-t", plan.total.toFixed(2), final,
  ]);
  log(`Voix posée : ${found.length} passage(s).`);
}

function assemble(segments: string[], out: string): number[] {
  const durations = segments.map(probeDuration);
  const inputs = segments.flatMap((file) => ["-i", file]);
  const filters: string[] = segments.map((_, index) => `[${index}:v]settb=AVTB,fps=30,format=yuv420p,setsar=1[s${index}]`);
  let previous = "s0";
  let elapsed = durations[0]!;
  for (let index = 1; index < segments.length; index += 1) {
    const label = index === segments.length - 1 ? "v" : `x${index}`;
    filters.push(`[${previous}][s${index}]xfade=transition=fade:duration=${FADE}:offset=${(elapsed - FADE).toFixed(3)}[${label}]`);
    elapsed += durations[index]! - FADE;
    previous = label;
  }
  ffmpeg([
    ...inputs,
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-filter_complex", filters.join(";"),
    "-map", "[v]", "-map", `${segments.length}:a`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", "-t", elapsed.toFixed(2), out,
  ]);
  return durations;
}

// ── Préparation : base, données, application ────────────────────────────
async function waitForServer(child: ChildProcess) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Le serveur n'a pas démarré à temps.")), 90_000);
    child.stdout?.on("data", (chunk: Buffer) => {
      if (/Ready in|started server/i.test(chunk.toString())) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Le serveur s'est arrêté (code ${code}).`));
    });
  });
}

async function sessionFor(browser: Browser, who: "Kodjo" | "Amina") {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const tab = await context.newPage();
  await tab.goto(`${APP}/connexion`);
  await tab.getByRole("button", { name: new RegExp(who) }).click();
  await tab.waitForURL("**/tableau-de-bord");
  const state = await context.storageState();
  await context.close();
  return state;
}

async function desktop(browser: Browser, storageState?: Awaited<ReturnType<typeof sessionFor>>): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: { width: DESKTOP.width, height: DESKTOP.height },
    deviceScaleFactor: DESKTOP.scale,
    locale: "fr-FR",
    timezoneId: "Africa/Dakar",
    storageState,
  });
  context.setDefaultTimeout(20_000);
  await context.addInitScript(OVERLAY);
  return { context, page: await context.newPage() };
}

/** `npm run video:voix` : pose seulement la voix sur la dernière vidéo, sans refaire le tournage. */
function voiceOnly() {
  const planFile = path.join(OUT, "minutage.json");
  const silent = path.join(OUT, "devbridge-demo-muette.mp4");
  if (!existsSync(planFile) || !existsSync(silent)) {
    throw new Error("Aucune vidéo muette à habiller : lance d'abord npm run video.");
  }
  const plan = JSON.parse(readFileSync(planFile, "utf8")) as Timeline;
  // Les textes viennent du script : le guide reste à jour si on les retouche.
  plan.cues = plan.cues.map((cue, index) => ({ ...cue, text: VOICE[index]?.text ?? cue.text }));
  console.log("\nPose de la voix off\n");
  writeVoiceGuide(plan);
  const final = path.join(OUT, "devbridge-demo.mp4");
  mixVoice(plan, silent, final);
  const length = probeDuration(final);
  console.log(`\nVidéo prête : ${final} (${Math.floor(length / 60)} min ${Math.round(length % 60)} s)\n`);
}

async function main() {
  if (process.argv.includes("--voix")) return voiceOnly();
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  console.log("\nVidéo de démonstration DevBridge\n");

  log("Base embarquée et données de démonstration…");
  const supabase = await MiniSupabase.start(DB_PORT);
  await supabase.seed({ password: PASSWORD, emailDomain: DOMAIN });
  const idOf = async (first: string) =>
    (await supabase.db.sql<{ id: string }>(`select id from public.profiles where first_name = ${lit(first)}`))[0]!.id;
  const kodjo = await idOf("Kodjo");
  const amina = await idOf("Amina");
  // Kodjo a déjà complété son profil : la correspondance affichée est la vraie, 95 sur 100.
  await supabase.call("user", kodjo, "update_my_profile", {
    p_patch: {
      availability: ["weekday_evening", "weekend"],
      bio: "Je développe des applications mobiles pour des coopératives agricoles au Togo, et je veux y ajouter de la prédiction.",
    },
  });

  log("Compilation de l'application…");
  const build = spawnSync(process.execPath, [NEXT_BIN, "build"], { cwd: ROOT, env: ENV, encoding: "utf8" });
  if (build.status !== 0) throw new Error(`Compilation impossible :\n${build.stdout}\n${build.stderr}`);
  const server = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(APP_PORT), "-H", "127.0.0.1"], {
    cwd: ROOT,
    env: ENV,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let browser: Browser | undefined;
  const clips: Clip[] = [];

  try {
    await waitForServer(server);
    browser = await chromium.launch({ executablePath: chromePath(), headless: true });
    const cards = await renderCards(browser);
    const asKodjo = await sessionFor(browser, "Kodjo");
    const asAmina = await sessionFor(browser, "Amina");
    const record = async (pageToFilm: Page, name: string, act: () => Promise<void>) => {
      log(`Tournage : ${name}`);
      const recorder = await Recorder.start(pageToFilm, name, DESKTOP.width * DESKTOP.scale, DESKTOP.height * DESKTOP.scale);
      await act();
      clips.push(await recorder.stop());
    };

    // 1. Accueil
    const visitor = await desktop(browser);
    await ready(visitor.page, APP);
    await visitor.page.mouse.move(980, 420);
    await record(visitor.page, "accueil", async () => {
      const p = visitor.page;
      await p.waitForTimeout(400);
      await caption(p, "DevBridge met en relation les développeurs africains dont les compétences se complètent.");
      await p.waitForTimeout(3200);
      await scrollTo(p, p.locator("#fonctionnement"), 2600);
    });
    await visitor.context.close();

    // 2. Kodjo publie une annonce
    const k = await desktop(browser, asKodjo);
    await ready(k.page, `${APP}/annonces/nouvelle`);
    await k.page.mouse.move(900, 300);
    await record(k.page, "annonce", async () => {
      const p = k.page;
      await caption(p, "Kodjo, à Lomé, maîtrise Flutter et cherche de l'aide en Python. Il publie une annonce.");
      await type(p, p.getByLabel("Titre"), OFFER_TITLE, 22);
      await p.getByLabel("Description").fill(
        "Mon application Flutter suit les parcelles de coopératives. Je cherche de l'aide pour y brancher un modèle Python de prédiction des récoltes. En retour, je t'accompagne sur Flutter.",
      );
      await p.waitForTimeout(500);
      const proposed = p.locator('[role="group"][aria-label="Compétences proposées"]');
      const requested = p.locator('[role="group"][aria-label="Compétences recherchées"]');
      await scrollTo(p, proposed, 700);
      await click(p, proposed.getByRole("button", { name: "Flutter", exact: true }).first());
      await click(p, proposed.getByRole("button", { name: "Dart", exact: true }).first());
      await scrollTo(p, requested, 600);
      await click(p, requested.getByRole("button", { name: "Python", exact: true }).first());
      await click(p, p.getByRole("button", { name: "Prévisualiser" }));
      await p.getByText("Rien n'est encore publié").waitFor();
      await caption(p, "Il vérifie l'aperçu, puis publie.");
      await p.waitForTimeout(1600);
      await click(p, p.getByRole("button", { name: "Publier l'annonce" }));
      await p.waitForURL(/\/annonces\/[0-9a-f-]{36}$/);
      await p.waitForLoadState("networkidle").catch(() => undefined);
      await p.waitForTimeout(1400);
    });
    await k.context.close();

    // 3. Amina découvre la correspondance
    const a = await desktop(browser, asAmina);
    await ready(a.page, `${APP}/pour-toi`);
    await a.page.mouse.move(700, 300);
    await record(a.page, "correspondance", async () => {
      const p = a.page;
      await caption(p, "À Dakar, Amina découvre la correspondance : 95 sur 100, et surtout pourquoi.");
      await p.waitForTimeout(600);
      await point(p, p.getByRole("img", { name: /Score de correspondance : 95/ }).first());
      await p.waitForTimeout(1800);
      const reasons = p.getByText("Pourquoi cette recommandation").first();
      await scrollTo(p, reasons, 900);
      await point(p, p.getByText(/recherche précisément une compétence que tu proposes/).first(), 0.97);
      await p.waitForTimeout(1500);
      await caption(p, "Les créneaux communs s'affichent à son heure, quel que soit le fuseau horaire.");
      await point(p, p.getByText(/À ton heure/).first(), 0.97);
      await p.waitForTimeout(2600);
    });

    // 4. Amina propose un échange
    await ready(a.page, `${APP}/explorer`);
    await record(a.page, "proposition", async () => {
      const p = a.page;
      await caption(p, "Elle répond à l'annonce : ce qu'elle apporte, ce qu'elle attend, en quelques mots.");
      await click(p, p.getByRole("article").filter({ hasText: OFFER_TITLE }).getByRole("link", { name: "Proposer un échange" }));
      const dialog = p.getByRole("dialog");
      await dialog.waitFor();
      await p.waitForTimeout(900);
      await type(
        p,
        dialog.getByLabel("Ton message"),
        "Bonjour Kodjo, je travaille sur des modèles de rendement agricole. Je t'aide à intégrer le tien, et j'aimerais apprendre Flutter avec toi.",
        9,
      );
      await p.waitForTimeout(500);
      await click(p, dialog.getByRole("button", { name: "Envoyer la proposition" }));
      await p.waitForURL(/\/propositions\/[0-9a-f-]{36}$/);
      await p.waitForLoadState("networkidle").catch(() => undefined);
      await p.waitForTimeout(1500);
    });
    const proposalUrl = a.page.url();
    await a.context.close();

    // 5. Kodjo accepte, la collaboration s'ouvre
    const k2 = await desktop(browser, asKodjo);
    await ready(k2.page, proposalUrl);
    await k2.page.mouse.move(1100, 300);
    await record(k2.page, "acceptation", async () => {
      const p = k2.page;
      await caption(p, "Kodjo reçoit la proposition et l'accepte. Rien ne démarre sans l'accord des deux.");
      await p.waitForTimeout(1500);
      await click(p, p.getByRole("button", { name: "Accepter l'échange" }));
      await p.waitForTimeout(500);
      await click(p, p.getByRole("dialog").getByRole("button", { name: "Accepter et démarrer" }));
      await p.waitForURL(/\/collaborations\/[0-9a-f-]{36}/);
      await p.getByRole("button", { name: "Proposer un plan de départ" }).waitFor();
      await p.waitForTimeout(1000);
    });
    const collaborationUrl = k2.page.url().split("?")[0]!;
    const collaborationId = collaborationUrl.split("/").pop()!;

    await record(k2.page, "collaboration", async () => {
      const p = k2.page;
      await caption(p, "Un espace de collaboration s'ouvre, avec un plan de départ en un clic.");
      await click(p, p.getByRole("button", { name: "Proposer un plan de départ" }));
      await p.getByText("Cadrage : objectif, rythme et outils").waitFor();
      await p.waitForTimeout(1800);
      await caption(p, "Chaque tâche se termine par un livrable, soumis à l'autre participant.");
      await click(p, p.getByRole("button", { name: /Transmettre : Dart, Flutter/ }));
      const dialog = p.getByRole("dialog");
      await type(p, dialog.getByLabel("Résultat obtenu"), "Atelier Flutter réalisé : widgets, navigation et état. Exemples dans le dépôt.", 10);
      await type(p, dialog.getByLabel("Lien", { exact: true }), "https://github.com/kodjo/atelier-flutter", 12);
      await click(p, dialog.getByRole("button", { name: "Soumettre pour validation" }));
      await dialog.getByText("En attente de validation par ton partenaire").waitFor();
      await p.waitForTimeout(1500);
    });
    await k2.context.close();

    // Hors champ : les autres tâches sont menées à terme par les deux.
    const kodjoTask = (
      await supabase.db.sql<{ id: string }>(
        `select id from public.tasks where collaboration_id = ${lit(collaborationId)} and title = 'Transmettre : Dart, Flutter'`,
      )
    )[0]!.id;
    const others = await supabase.db.sql<{ id: string; assigned_to: string }>(
      `select id, assigned_to from public.tasks where collaboration_id = ${lit(collaborationId)} and id <> ${lit(kodjoTask)}`,
    );
    for (const task of others) {
      const reviewer = task.assigned_to === kodjo ? amina : kodjo;
      const deliverable = await supabase.call<string>("user", task.assigned_to, "submit_deliverable", {
        p_task_id: task.id,
        p_description: "Travail réalisé, expliqué et partagé dans le dépôt du projet.",
        p_external_url: null,
        p_attachment_path: null,
      });
      await supabase.call("user", reviewer, "review_deliverable", { p_id: deliverable, p_decision: "approve", p_note: null });
    }

    // 6. Amina valide le livrable de Kodjo
    const a2 = await desktop(browser, asAmina);
    await ready(a2.page, `${collaborationUrl}?tache=${kodjoTask}`);
    await a2.page.mouse.move(900, 400);
    await record(a2.page, "validation", async () => {
      const p = a2.page;
      await caption(p, "Amina examine le livrable et le valide. Personne ne valide son propre travail.");
      await p.waitForTimeout(1800);
      await click(p, p.getByRole("dialog").getByRole("button", { name: "Valider le livrable" }));
      await p.getByRole("dialog").getByText("Cette tâche est terminée").waitFor();
      await p.waitForTimeout(1300);
      await p.keyboard.press("Escape");
      await p.waitForTimeout(900);
    });

    // Hors champ : Kodjo confirme la fin de l'échange.
    await supabase.call("user", kodjo, "confirm_completion", { p_collaboration_id: collaborationId });

    // 7. Clôture et attestation
    await ready(a2.page, collaborationUrl);
    await record(a2.page, "cloture", async () => {
      const p = a2.page;
      await caption(p, "Tous les livrables sont validés : les deux confirment la fin de l'échange.");
      await p.waitForTimeout(1200);
      await click(p, p.getByRole("button", { name: "Confirmer la fin de l'échange" }));
      await p.getByText(/Échange terminé le/).waitFor();
      await p.waitForTimeout(1200);
      await caption(p, "Une attestation publique et vérifiable rejoint leurs deux profils.");
      await click(p, p.getByRole("link", { name: "Voir l'attestation" }));
      await p.waitForURL(/\/attestations\//);
      await p.waitForLoadState("networkidle").catch(() => undefined);
      await p.waitForTimeout(1200);
      await scrollTo(p, 260, 2200);
    });
    await a2.context.close();

    // 8. Boucle à trois et coup de main express
    const k3 = await desktop(browser, asKodjo);
    await ready(k3.page, `${APP}/pour-toi`);
    await k3.page.locator("#boucles").evaluate((element) => element.scrollIntoView({ block: "start" }));
    await k3.page.waitForTimeout(400);
    await k3.page.mouse.move(900, 500);
    await record(k3.page, "boucle", async () => {
      const p = k3.page;
      await caption(p, "Personne ne veut ce que tu proposes ? DevBridge trouve une boucle à trois : A aide B, B aide C, C aide A.");
      await p.waitForTimeout(800);
      await point(p, p.getByRole("button", { name: "Proposer cette boucle" }).first());
      await p.waitForTimeout(3200);
    });
    await ready(k3.page, `${APP}/explorer?express=1`);
    await k3.page.mouse.move(900, 200);
    await record(k3.page, "express", async () => {
      const p = k3.page;
      await caption(p, "Bloqué sur un bug ? Le coup de main express prévient tout de suite les bonnes personnes.");
      await p.waitForTimeout(700);
      await point(p, p.getByRole("article").first());
      await p.waitForTimeout(3000);
    });
    await k3.context.close();

    // 9. Téléphone
    const phoneClips: Clip[] = [];
    for (const [name, url] of [
      ["telephone-a", `${APP}/pour-toi`],
      ["telephone-b", collaborationUrl],
    ] as const) {
      const context = await browser.newContext({
        viewport: { width: PHONE.width, height: PHONE.height },
        deviceScaleFactor: PHONE.scale,
        isMobile: true,
        hasTouch: true,
        locale: "fr-FR",
        storageState: asAmina,
      });
      await context.addInitScript(OVERLAY);
      const p = await context.newPage();
      await p.goto(url);
      await p.waitForLoadState("networkidle").catch(() => undefined);
      await p.waitForTimeout(600);
      log(`Tournage : ${name}`);
      const recorder = await Recorder.start(p, name, PHONE.width * PHONE.scale, PHONE.height * PHONE.scale);
      await p.waitForTimeout(900);
      await scrollTo(p, 420, 1800);
      await scrollTo(p, 900, 1800);
      await scrollTo(p, 1300, 1500);
      phoneClips.push(await recorder.stop());
      await context.close();
    }

    // ── Montage ──────────────────────────────────────────────────────
    log("Montage…");
    const stills = { intro: 3.6, probleme: 4.6, fin: 5.2 };
    const liveSeconds = clips.reduce((sum, clip) => sum + (clip.end - clip.frames[0]!.t), 0);
    const phoneSeconds = Math.max(...phoneClips.map((clip) => clip.end - clip.frames[0]!.t));
    const segmentsCount = clips.length + 4;
    const fixed = stills.intro + stills.probleme + stills.fin - FADE * (segmentsCount - 1);
    const speed = Math.max(1, (liveSeconds + phoneSeconds) / (MAX_SECONDS - fixed));
    if (speed > 1) log(`Accéléré de ${Math.round((speed - 1) * 100)} % pour tenir sous 2 minutes.`);

    const segments = [
      stillSegment(cards.intro!, stills.intro, "carte-intro"),
      stillSegment(cards.probleme!, stills.probleme, "carte-probleme"),
      ...clips.map((clip) => encodeClip(clip, speed)),
      phoneSegment(cards.telephone!, cards.bezel!, encodeClip(phoneClips[0]!, speed), encodeClip(phoneClips[1]!, speed)),
      stillSegment(cards.fin!, stills.fin, "carte-fin"),
    ];
    const silent = path.join(OUT, "devbridge-demo-muette.mp4");
    const final = path.join(OUT, "devbridge-demo.mp4");
    const durations = assemble(segments, silent);
    const plan = timeline(segments, durations);
    writeVoiceGuide(plan);
    mixVoice(plan, silent, final);
    ffmpeg(["-i", cards.intro!, "-vf", "scale=1280:720:flags=lanczos", path.join(OUT, "miniature.png")]);

    const length = probeDuration(final);
    // Les images de tournage (plusieurs centaines de Mo) ne servent plus.
    if (process.env.KEEP_WORK !== "1") rmSync(WORK, { recursive: true, force: true });
    writeFileSync(
      path.join(OUT, "youtube.txt"),
      [
        "TITRE",
        "DevBridge — l'échange de compétences entre développeurs africains (démo)",
        "",
        "DESCRIPTION",
        "DevBridge met en relation les développeurs africains dont les compétences se complètent.",
        "Chacun indique ce qu'il sait faire et ce qu'il recherche : la plateforme trouve les complémentarités, avec un score toujours expliqué, puis accompagne l'échange jusqu'à un résultat validé par les deux.",
        "",
        `Essayer : https://${LIVE_URL}`,
        `Code : https://${REPO_URL}`,
        "",
        "Projet présenté à la Coupe d'Afrique des Développeurs 2026 (Systalink Challenge).",
        "Les profils visibles dans la vidéo sont des profils de démonstration.",
        "",
        "VISIBILITÉ CONSEILLÉE : Non répertoriée (accessible avec le lien).",
      ].join("\n"),
    );
    console.log(`\nVidéo prête : ${final} (${Math.floor(length / 60)} min ${Math.round(length % 60)} s)\n`);
  } finally {
    await browser?.close().catch(() => undefined);
    server.kill();
    await supabase.stop().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`\nÉchec : ${(error as Error).message}\n`);
  process.exit(1);
});
