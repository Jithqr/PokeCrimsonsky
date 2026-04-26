import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const TARGETS = [
  { sprite: "ironhands", en: "Iron_Hands" },
  { sprite: "ironjugulis", en: "Iron_Jugulis" },
  { sprite: "ironmoth", en: "Iron_Moth" },
  { sprite: "ironthorns", en: "Iron_Thorns" },
  { sprite: "wochien", en: "Wo-Chien" },
  { sprite: "chienpao", en: "Chien-Pao" },
  { sprite: "tinglu", en: "Ting-Lu" },
  { sprite: "chiyu", en: "Chi-Yu" },
  { sprite: "ironvaliant", en: "Iron_Valiant" },
  { sprite: "miraidon", en: "Miraidon" },
  { sprite: "ironleaves", en: "Iron_Leaves" },
  { sprite: "okidogi", en: "Okidogi" },
  { sprite: "munkidori", en: "Munkidori" },
  { sprite: "fezandipiti", en: "Fezandipiti" },
  { sprite: "ogerpon", en: "Ogerpon" },
  { sprite: "ironboulder", en: "Iron_Boulder" },
  { sprite: "ironcrown", en: "Iron_Crown" },
  { sprite: "terapagos", en: "Terapagos" },
  { sprite: "pecharunt", en: "Pecharunt" },
];

const OUT_DIR = "public/sprites/custom";
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync("/tmp/wikidex", { recursive: true });

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36";

async function fetchText(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return await r.text();
}

async function downloadBinary(url, path) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(path, buf);
}

// Find first .webm URL inside the "Capturas del modelo 3D" section.
// We pick the first <video> with EP or _EP_variocolor — first is normal sprite.
function extractWebmUrls(html) {
  // Find the actual <h2> heading (not the TOC entry) by searching for the headline span.
  const headingMatch = html.match(/id="Capturas_del_modelo_3D"[\s\S]*$/);
  const section = headingMatch ? headingMatch[0].slice(0, 60000) : "";
  if (!section) return { normal: null, shiny: null };
  const all = [...section.matchAll(/https:\/\/images\.wikidexcdn\.net\/[^"'\s]+\.webm/g)].map(m => m[0]);
  // Skip transcoded URLs (contain "/transcoded/")
  const originals = all.filter(u => !u.includes("/transcoded/"));
  // Skip poster jpgs
  let normal = null, shiny = null;
  for (const u of originals) {
    const lower = u.toLowerCase();
    if (lower.includes("variocolor") || lower.includes("shiny")) {
      if (!shiny) shiny = u;
    } else {
      if (!normal) normal = u;
    }
  }
  return { normal, shiny };
}

async function processOne(t) {
  const url = `https://www.wikidex.net/wiki/${t.en}`;
  console.log(`\n[${t.sprite}] Fetching ${url}`);
  let html;
  try { html = await fetchText(url); } catch (e) { console.log(`  page fetch failed: ${e.message}`); return { ...t, status: "page-fail" }; }
  const { normal, shiny } = extractWebmUrls(html);
  console.log(`  normal: ${normal || "(none)"}`);
  console.log(`  shiny:  ${shiny || "(none)"}`);
  const result = { ...t, normal, shiny, status: "ok" };

  for (const [variant, webmUrl] of [["normal", normal], ["shiny", shiny]]) {
    if (!webmUrl) continue;
    const webmPath = `/tmp/wikidex/${t.sprite}_${variant}.webm`;
    const gifName = variant === "shiny" ? `${t.sprite}-shiny.gif` : `${t.sprite}.gif`;
    const gifPath = `${OUT_DIR}/${gifName}`;
    if (existsSync(gifPath)) { console.log(`  ${variant}: skip (gif exists)`); continue; }
    try {
      await downloadBinary(webmUrl, webmPath);
    } catch (e) { console.log(`  ${variant}: download failed: ${e.message}`); continue; }
    try {
      // Convert webm -> transparent gif: chroma-key the white background out, then
      // generate a palette that reserves a slot for transparency.
      execSync(
        `ffmpeg -y -i "${webmPath}" -vf "fps=15,scale=-1:96:flags=lanczos,colorkey=0xffffff:0.10:0.05,format=rgba,split [a][b];[a] palettegen=reserve_transparent=1 [p];[b][p] paletteuse=alpha_threshold=128" -loop 0 "${gifPath}"`,
        { stdio: "pipe" }
      );
      console.log(`  ${variant}: wrote ${gifPath}`);
    } catch (e) {
      console.log(`  ${variant}: ffmpeg failed: ${e.message?.slice(0, 200)}`);
    }
  }
  return result;
}

const results = [];
for (const t of TARGETS) {
  results.push(await processOne(t));
}

console.log("\n=== Summary ===");
for (const r of results) {
  console.log(`${r.sprite}: normal=${r.normal ? "Y" : "-"} shiny=${r.shiny ? "Y" : "-"}`);
}
