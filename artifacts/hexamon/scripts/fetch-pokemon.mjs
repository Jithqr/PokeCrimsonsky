// Fetch ALL 1025 Pokémon, every move they can learn, every ability,
// and every evolution chain from PokeAPI, then write three accurate data
// files used by the game and the Dex viewer:
//
//   src/lib/pokemon-data.ts  – compact per-species data + level-up learnset
//   src/lib/move-data.ts     – every move name → {type, category, power, acc, pp, priority}
//   src/lib/dex-data.json    – Dex extras: abilities (name+desc+hidden), height,
//                              weight, base_exp, dex flavor, ability flavor,
//                              evolution chain, sprite, cry url, full move list
//                              grouped by learn method (level-up/machine/egg/tutor)
//
// Run with:  node artifacts/hexamon/scripts/fetch-pokemon.mjs
//
// Designed for the latest version-group ("scarlet-violet"); falls back to the
// most recent group present for older Pokémon if SV has no entries.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const TOTAL = 1025;
const CONCURRENCY = 40;

const TYPE_MAP = {
  normal: "Normal", fire: "Fire", water: "Water", electric: "Electric",
  grass: "Grass", ice: "Ice", fighting: "Fighting", poison: "Poison",
  ground: "Ground", flying: "Flying", psychic: "Psychic", bug: "Bug",
  rock: "Rock", ghost: "Ghost", dragon: "Dragon", dark: "Dark",
  steel: "Steel", fairy: "Fairy",
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const titleMove = (s) => s.split("-").map(cap).join(" ");
const cleanFlavor = (s) => (s || "").replace(/[\f\n\r]+/g, " ").replace(/\s+/g, " ").trim();

async function fetchJSON(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
}

async function pool(items, fn, concurrency) {
  const results = new Array(items.length);
  let idx = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (idx < items.length) {
        const i = idx++;
        try {
          results[i] = await fn(items[i]);
        } catch (e) {
          console.error(`  ! ${items[i]}: ${e.message}`);
          results[i] = null;
        }
        done++;
        if (done % 100 === 0) console.log(`  ${done}/${items.length}`);
      }
    }),
  );
  return results;
}

// Pick the best version-group entry for a move on a Pokémon.
// Prefer "scarlet-violet"; fall back to the alphabetically last group present.
function pickLearnEntry(versionGroupDetails, methodWanted) {
  const matches = versionGroupDetails.filter((v) => v.move_learn_method.name === methodWanted);
  if (matches.length === 0) return null;
  const sv = matches.find((v) => v.version_group.name === "scarlet-violet");
  if (sv) return sv;
  // Take the entry with the highest level_learned_at (most relevant for level-up);
  // for tutor/egg/machine, just take the first.
  if (methodWanted === "level-up") {
    return matches.reduce((best, v) =>
      (v.level_learned_at || 0) > (best.level_learned_at || 0) ? v : best,
    );
  }
  return matches[matches.length - 1];
}

async function main() {
  const ids = Array.from({ length: TOTAL }, (_, i) => i + 1);

  console.log(`[1/5] Fetching ${TOTAL} Pokémon...`);
  const monsRaw = await pool(
    ids,
    (id) => fetchJSON(`https://pokeapi.co/api/v2/pokemon/${id}`),
    CONCURRENCY,
  );
  const monsOk = monsRaw.filter(Boolean);
  console.log(`  → got ${monsOk.length}`);

  console.log(`[2/5] Fetching ${TOTAL} species...`);
  const speciesRaw = await pool(
    ids,
    (id) => fetchJSON(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
    CONCURRENCY,
  );
  console.log(`  → got ${speciesRaw.filter(Boolean).length}`);

  // Collect unique sub-resource URLs.
  const moveUrls = new Set();
  const abilityUrls = new Set();
  const evoUrls = new Set();
  for (const p of monsOk) {
    for (const mv of p.moves) moveUrls.add(mv.move.url);
    for (const a of p.abilities) abilityUrls.add(a.ability.url);
  }
  for (const s of speciesRaw) {
    if (s?.evolution_chain?.url) evoUrls.add(s.evolution_chain.url);
  }

  console.log(`[3/5] Fetching ${moveUrls.size} unique moves...`);
  const moveList = await pool([...moveUrls], (u) => fetchJSON(u), CONCURRENCY);
  const moveByUrl = new Map();
  for (let i = 0; i < moveList.length; i++) {
    if (moveList[i]) moveByUrl.set([...moveUrls][i], moveList[i]);
  }
  console.log(`  → got ${moveByUrl.size}`);

  console.log(`[4/5] Fetching ${abilityUrls.size} unique abilities...`);
  const abilityList = await pool([...abilityUrls], (u) => fetchJSON(u), CONCURRENCY);
  const abilityByUrl = new Map();
  for (let i = 0; i < abilityList.length; i++) {
    if (abilityList[i]) abilityByUrl.set([...abilityUrls][i], abilityList[i]);
  }
  console.log(`  → got ${abilityByUrl.size}`);

  console.log(`[5/5] Fetching ${evoUrls.size} evolution chains...`);
  const evoList = await pool([...evoUrls], (u) => fetchJSON(u), CONCURRENCY);
  const evoByUrl = new Map();
  for (let i = 0; i < evoList.length; i++) {
    if (evoList[i]) evoByUrl.set([...evoUrls][i], evoList[i]);
  }

  // ---- Build evolution map (id → {to, at}) ----
  const evoMap = {};
  const chainMap = {}; // id → array of {id, name, condition} representing full chain
  for (const chain of evoList) {
    if (!chain) continue;
    const flatChain = [];
    const walk = (node, depth) => {
      const fromId = Number(node.species.url.match(/\/(\d+)\/?$/)[1]);
      flatChain.push({ id: fromId, name: node.species.name, depth });
      for (const ev of node.evolves_to) {
        const toId = Number(ev.species.url.match(/\/(\d+)\/?$/)[1]);
        const detail = ev.evolution_details?.[0];
        const lvl = detail?.min_level || (detail?.trigger?.name === "level-up" ? 25 : 30);
        if (!evoMap[fromId]) evoMap[fromId] = { to: toId, at: lvl };
        walk(ev, depth + 1);
      }
    };
    walk(chain.chain, 0);
    for (const link of flatChain) chainMap[link.id] = flatChain;
  }

  // ---- Generation map ----
  const GEN_RANGES = [
    [1, 151], [152, 251], [252, 386], [387, 493], [494, 649],
    [650, 721], [722, 809], [810, 905], [906, 1025],
  ];
  const genOf = (id) => GEN_RANGES.findIndex(([a, b]) => id >= a && id <= b) + 1;

  // ---- Build per-Pokémon records ----
  const compactMons = [];   // for pokemon-data.ts
  const dexExtras = {};     // for dex-data.json (keyed by id)

  for (let i = 0; i < monsOk.length; i++) {
    const p = monsOk[i];
    const s = speciesRaw[i] || {};
    const stats = Object.fromEntries(p.stats.map((x) => [x.stat.name, x.base_stat]));
    const types = p.types.sort((a, b) => a.slot - b.slot).map((t) => TYPE_MAP[t.type.name] || cap(t.type.name));

    // Build full learnset grouped by method.
    const learnsetLevel = []; // [{name, level}]
    const learnsetTm = [];
    const learnsetEgg = [];
    const learnsetTutor = [];
    for (const mv of p.moves) {
      const moveName = titleMove(mv.move.name);
      const lvl = pickLearnEntry(mv.version_group_details, "level-up");
      if (lvl) learnsetLevel.push({ n: moveName, l: lvl.level_learned_at || 1 });
      const tm = pickLearnEntry(mv.version_group_details, "machine");
      if (tm) learnsetTm.push({ n: moveName });
      const egg = pickLearnEntry(mv.version_group_details, "egg");
      if (egg) learnsetEgg.push({ n: moveName });
      const tut = pickLearnEntry(mv.version_group_details, "tutor");
      if (tut) learnsetTutor.push({ n: moveName });
    }
    learnsetLevel.sort((a, b) => a.l - b.l);
    learnsetTm.sort((a, b) => a.n.localeCompare(b.n));
    learnsetEgg.sort((a, b) => a.n.localeCompare(b.n));
    learnsetTutor.sort((a, b) => a.n.localeCompare(b.n));

    // Top-4 highest level-up moves – kept only as a sensible default for *fully evolved*
    // mons. The game now picks moves dynamically based on actual level via makeMon().
    const top4 = [...learnsetLevel].sort((a, b) => b.l - a.l).slice(0, 4).map((x) => x.n);
    while (top4.length < 1) top4.push("Tackle");

    const niceName = p.name.split("-").map(cap).join("-");
    const sprite = p.name.replace(/[^a-z0-9]/g, "");

    const compact = {
      id: p.id,
      name: niceName,
      sprite,
      type1: types[0],
      type2: types[1] || null,
      hp: stats.hp,
      atk: stats.attack,
      def: stats.defense,
      spa: stats["special-attack"],
      spd: stats["special-defense"],
      spe: stats.speed,
      moves: top4,
      learn: learnsetLevel,
      ...(evoMap[p.id] ? { canEvolve: evoMap[p.id].to, evolveAt: evoMap[p.id].at } : {}),
      gen: genOf(p.id),
    };
    compactMons.push(compact);

    // Dex extras
    const abilities = p.abilities.map((a) => {
      const ad = abilityByUrl.get(a.ability.url);
      const en = ad?.effect_entries?.find((e) => e.language.name === "en");
      const flav = ad?.flavor_text_entries?.find((e) => e.language.name === "en");
      return {
        name: titleMove(a.ability.name),
        hidden: a.is_hidden,
        short: cleanFlavor(en?.short_effect || flav?.flavor_text || ""),
        full: cleanFlavor(en?.effect || flav?.flavor_text || ""),
      };
    });
    const dexFlavor = cleanFlavor(
      s.flavor_text_entries?.find((e) => e.language?.name === "en")?.flavor_text || "",
    );
    const genus = s.genera?.find((g) => g.language?.name === "en")?.genus || "";
    const cry =
      p.cries?.latest ||
      `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${p.id}.ogg`;

    dexExtras[p.id] = {
      id: p.id,
      name: niceName,
      genus,
      flavor: dexFlavor,
      height: p.height,            // decimetres
      weight: p.weight,            // hectograms
      baseExp: p.base_experience,
      cry,
      abilities,
      tm: learnsetTm.map((x) => x.n),
      egg: learnsetEgg.map((x) => x.n),
      tutor: learnsetTutor.map((x) => x.n),
    };
  }

  // Evolution chains: attach to dexExtras
  for (const id of Object.keys(dexExtras)) {
    const chain = chainMap[Number(id)];
    if (chain) {
      dexExtras[id].chain = chain.map((c) => ({ id: c.id, name: c.name }));
    }
  }

  compactMons.sort((a, b) => a.id - b.id);

  // ---- Write pokemon-data.ts ----
  const lines = [
    "// AUTO-GENERATED by scripts/fetch-pokemon.mjs — do not edit by hand",
    "// Includes the full level-up learnset per species so makeMon() can pick",
    "// moves appropriate to the Pokémon's CURRENT level (no more Bulbasaur-knows-Solar-Beam).",
    "",
    "export type LearnEntry = { n: string; l: number };",
    "",
    "export type PokemonTemplate = {",
    "  id: number; name: string; sprite: string;",
    "  type1: string; type2: string | null;",
    "  hp: number; atk: number; def: number; spa: number; spd: number; spe: number;",
    "  moves: string[];          // legacy fallback (top 4 by level)",
    "  learn: LearnEntry[];      // full level-up learnset, sorted by level",
    "  canEvolve?: number; evolveAt?: number;",
    "  gen: number;",
    "};",
    "",
    "export const ALL_POKEMON: PokemonTemplate[] = [",
  ];
  for (const m of compactMons) lines.push(`  ${JSON.stringify(m)},`);
  lines.push("];", "");
  lines.push("export const TOTAL_POKEMON = ALL_POKEMON.length;");
  lines.push(
    "export const GEN_NAMES: Record<number,string> = { 1:'Kanto',2:'Johto',3:'Hoenn',4:'Sinnoh',5:'Unova',6:'Kalos',7:'Alola',8:'Galar',9:'Paldea' };",
  );
  lines.push("");
  lines.push("// Pick up to 4 moves available at the given level, preferring the highest-level ones.");
  lines.push("// Falls back to the lowest-level moves so a level-1 mon still has at least one attack.");
  lines.push("export function movesForLevel(t: PokemonTemplate, level: number): string[] {");
  lines.push("  const eligible = t.learn.filter((x) => x.l <= level);");
  lines.push("  const picked = eligible.length");
  lines.push("    ? [...eligible].sort((a, b) => b.l - a.l).slice(0, 4).map((x) => x.n)");
  lines.push("    : [...t.learn].slice(0, 4).map((x) => x.n);");
  lines.push("  return picked.length ? Array.from(new Set(picked)) : ['Tackle'];");
  lines.push("}");

  const outPokemon = "src/lib/pokemon-data.ts";
  mkdirSync(dirname(outPokemon), { recursive: true });
  writeFileSync(outPokemon, lines.join("\n"));
  console.log(`✓ Wrote ${compactMons.length} Pokémon → ${outPokemon}`);

  // ---- Write move-data.ts ----
  // Build a comprehensive move database from PokeAPI.
  const moveLines = [
    "// AUTO-GENERATED by scripts/fetch-pokemon.mjs — do not edit by hand",
    "// Every move present in the game's learnsets, with PokeAPI-accurate",
    "// type / category / power / accuracy / pp / priority.",
    "",
    'import type { PType } from "./type-chart";',
    "",
    'export type MoveCategory = "Physical" | "Special" | "Status";',
    'export type StatusName = "Burn" | "Poison" | "Paralyze" | "Sleep" | "Freeze";',
    "",
    "export type MoveDef = {",
    "  name: string;",
    "  type: PType;",
    "  category: MoveCategory;",
    "  power: number;     // 0 for status moves",
    "  accuracy: number;  // 0..100 (100 = always hits)",
    "  priority: number;",
    "  pp: number;",
    "  effect?: { chance: number; status?: StatusName };",
    "};",
    "",
    "const M: MoveDef[] = [",
  ];

  const STATUS_FROM_AILMENT = {
    burn: "Burn", poison: "Poison", paralysis: "Paralyze", sleep: "Sleep", freeze: "Freeze",
    "bad-poison": "Poison",
  };
  const CATEGORY_MAP = { physical: "Physical", special: "Special", status: "Status" };

  for (const md of moveByUrl.values()) {
    const name = titleMove(md.name);
    const type = TYPE_MAP[md.type?.name] || "Normal";
    const category = CATEGORY_MAP[md.damage_class?.name] || "Status";
    const power = md.power ?? 0;
    const accuracy = md.accuracy ?? 100;
    const priority = md.priority ?? 0;
    const pp = md.pp ?? 10;
    const ailment = md.meta?.ailment?.name;
    const ailmentChance = md.meta?.ailment_chance ?? 0;
    let effectStr = "";
    if (ailment && ailment !== "none" && STATUS_FROM_AILMENT[ailment]) {
      const chance = ailmentChance > 0 ? ailmentChance / 100 : 1;
      effectStr = `, effect: { chance: ${chance}, status: "${STATUS_FROM_AILMENT[ailment]}" }`;
    }
    moveLines.push(
      `  { name: ${JSON.stringify(name)}, type: "${type}", category: "${category}", power: ${power}, accuracy: ${accuracy}, priority: ${priority}, pp: ${pp}${effectStr} },`,
    );
  }
  moveLines.push("];", "");
  moveLines.push("const MOVE_BY_NAME: Record<string, MoveDef> = Object.fromEntries(M.map((m) => [m.name, m]));");
  moveLines.push("");
  moveLines.push('const FALLBACK: MoveDef = { name: "Struggle", type: "Normal", category: "Physical", power: 50, accuracy: 100, priority: 0, pp: 1 };');
  moveLines.push("");
  moveLines.push("export function getMove(name: string): MoveDef {");
  moveLines.push("  return MOVE_BY_NAME[name] || { ...FALLBACK, name };");
  moveLines.push("}");
  moveLines.push("");
  moveLines.push("export const ALL_MOVES = M;");

  const outMoves = "src/lib/move-data.ts";
  writeFileSync(outMoves, moveLines.join("\n"));
  console.log(`✓ Wrote ${moveByUrl.size} moves → ${outMoves}`);

  // ---- Write dex-data.json ----
  const outDex = "src/lib/dex-data.json";
  writeFileSync(outDex, JSON.stringify(dexExtras));
  console.log(`✓ Wrote dex extras for ${Object.keys(dexExtras).length} Pokémon → ${outDex}`);

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
