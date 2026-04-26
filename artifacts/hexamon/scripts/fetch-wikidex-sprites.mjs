// Fetches transparent animated sprites for Gen 9 Pokémon that Pokémon Showdown
// doesn't ship. Two sources:
//   1) User-supplied .webm files in attached_assets/Gen 9/  (already transparent VP9-alpha)
//   2) WikiDex original (non-thumb) .webm — also VP9-alpha, just needs libvpx-vp9 decode
//
// We always decode with -c:v libvpx-vp9 because the default ffmpeg vp9 decoder
// silently drops the alpha plane.

import { writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, basename } from "node:path";

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

// Map user-supplied filenames (zip contents) to sprite keys.
// Keys are case-insensitive substrings; first match wins.
const USER_FILE_MAP = [
  { match: "chi-yu", sprite: "chiyu" },
  { match: "chien-pao", sprite: "chienpao" },
  { match: "ferrocuello", sprite: "ironjugulis" },
  { match: "ferropaladín", sprite: "ironvaliant" },
  { match: "ferropaladin", sprite: "ironvaliant" },
  { match: "fezandipiti", sprite: "fezandipiti" },
  { match: "miraidon", sprite: "miraidon" },
  { match: "munkidori", sprite: "munkidori" },
  { match: "ogerpon_máscara_turquesa_home", sprite: "ogerpon" },
  { match: "ogerpon_mascara_turquesa_home", sprite: "ogerpon" },
  { match: "okidogi_home", sprite: "okidogi" },
  { match: "pecharunt", sprite: "pecharunt" },
  { match: "terapagos_normal", sprite: "terapagos" },
  { match: "ting-lu", sprite: "tinglu" },
];

const OUT_DIR = "public/sprites/custom";
const CACHE_DIR = "/tmp/wikidex";
const USER_DIR = "/tmp/gen9/Gen 9";
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(CACHE_DIR, { recursive: true });

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36";

async function fetchText(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
}

async function downloadBinary(url, path) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  writeFileSync(path, Buffer.from(await r.arrayBuffer()));
}

// Convert a VP9-alpha .webm to a transparent animated .gif at 96px tall.
// We MUST force libvpx-vp9 — the default vp9 decoder silently drops alpha.
function webmToTransparentGif(webmPath, gifPath) {
  execSync(
    `ffmpeg -y -c:v libvpx-vp9 -i "${webmPath}" ` +
      `-vf "fps=20,scale=-1:96:flags=lanczos,split[a][b];` +
      `[a]palettegen=reserve_transparent=1[p];` +
      `[b][p]paletteuse=alpha_threshold=128" -loop 0 "${gifPath}"`,
    { stdio: "pipe" }
  );
}

// Pick the original (non-thumb, non-transcoded) webm URL from a WikiDex page.
function extractWebmUrls(html) {
  const heading = html.match(/id="Capturas_del_modelo_3D"[\s\S]*$/);
  const section = heading ? heading[0].slice(0, 80000) : "";
  if (!section) return { normal: null, shiny: null };
  const all = [...section.matchAll(/https:\/\/images\.wikidexcdn\.net\/[^"'\s]+\.webm/g)].map(m => m[0]);
  // Prefer originals (no /thumb/, no /transcoded/).
  const originals = all.filter(u => !u.includes("/thumb/") && !u.includes("/transcoded/"));
  let normal = null, shiny = null;
  for (const u of originals) {
    const isShiny = /variocolor|shiny/i.test(u);
    if (isShiny && !shiny) shiny = u;
    else if (!isShiny && !normal) normal = u;
  }
  return { normal, shiny };
}

// Step 1: convert all user-supplied webms (highest priority).
const usedSprites = new Set();
console.log("=== Step 1: user-supplied webms ===");
if (existsSync(USER_DIR)) {
  for (const file of readdirSync(USER_DIR)) {
    if (!file.toLowerCase().endsWith(".webm")) continue;
    const lower = file.toLowerCase();
    const map = USER_FILE_MAP.find(m => lower.includes(m.match));
    if (!map) { console.log(`  skip (no mapping): ${file}`); continue; }
    if (usedSprites.has(map.sprite)) continue; // already done from another user file
    const src = join(USER_DIR, file);
    const out = join(OUT_DIR, `${map.sprite}.gif`);
    try {
      webmToTransparentGif(src, out);
      console.log(`  ${map.sprite}: wrote ${out}  (from ${file})`);
      usedSprites.add(map.sprite);
    } catch (e) {
      console.log(`  ${map.sprite}: FAILED  ${e.message?.slice(0, 120)}`);
    }
  }
} else {
  console.log(`  user dir not found: ${USER_DIR}`);
}

// Step 2: WikiDex for whatever the user didn't cover.
console.log("\n=== Step 2: WikiDex full-size webms ===");
for (const t of TARGETS) {
  const gifPath = join(OUT_DIR, `${t.sprite}.gif`);
  const shinyGifPath = join(OUT_DIR, `${t.sprite}-shiny.gif`);
  const haveNormal = usedSprites.has(t.sprite) || existsSync(gifPath);
  const haveShiny = existsSync(shinyGifPath);
  if (haveNormal && haveShiny) { console.log(`[${t.sprite}] skip (both gifs present)`); continue; }

  console.log(`\n[${t.sprite}] Fetching https://www.wikidex.net/wiki/${t.en}`);
  let html;
  try { html = await fetchText(`https://www.wikidex.net/wiki/${t.en}`); }
  catch (e) { console.log(`  page fetch failed: ${e.message}`); continue; }

  const { normal, shiny } = extractWebmUrls(html);
  for (const [variant, url, outPath, alreadyHave] of [
    ["normal", normal, gifPath, haveNormal],
    ["shiny", shiny, shinyGifPath, haveShiny],
  ]) {
    if (alreadyHave) { console.log(`  ${variant}: skip (have)`); continue; }
    if (!url) { console.log(`  ${variant}: no url`); continue; }
    const webmCache = join(CACHE_DIR, `${t.sprite}_${variant}_full.webm`);
    try {
      if (!existsSync(webmCache)) await downloadBinary(url, webmCache);
      webmToTransparentGif(webmCache, outPath);
      console.log(`  ${variant}: wrote ${outPath}`);
    } catch (e) {
      console.log(`  ${variant}: FAILED  ${e.message?.slice(0, 120)}`);
    }
  }
}

console.log("\n=== Final output ===");
const finalGifs = readdirSync(OUT_DIR).filter(f => f.endsWith(".gif")).sort();
console.log(`${finalGifs.length} gifs in ${OUT_DIR}`);
for (const g of finalGifs) console.log(`  ${g}`);
