import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_POKEMON, type PokemonTemplate } from "../lib/pokemon-data";
import { POKEMON_FORMS, type FormEntry, type FormCategory } from "../lib/pokemon-forms";
import { getMove } from "../lib/move-data";
import { BackBtn } from "./BackBtn";

// ---------- Constants ----------
const TYPE_COLORS: Record<string, string> = {
  Normal: "#A8A77A", Fire: "#EE8130", Water: "#6390F0", Electric: "#F7D02C",
  Grass: "#7AC74C", Ice: "#96D9D6", Fighting: "#C22E28", Poison: "#A33EA1",
  Ground: "#E2BF65", Flying: "#A98FF3", Psychic: "#F95587", Bug: "#A6B91A",
  Rock: "#B6A136", Ghost: "#735797", Dragon: "#6F35FC", Dark: "#705746",
  Steel: "#B7B7CE", Fairy: "#D685AD",
};
const STAT_BAR_COLORS: Record<string, string> = {
  hp: "#ef4444", atk: "#f97316", def: "#eab308",
  spa: "#3b82f6", spd: "#22c55e", spe: "#ec4899",
};
const NATURES = [
  "Hardy", "Lonely", "Brave", "Adamant", "Naughty",
  "Bold", "Docile", "Relaxed", "Impish", "Lax",
  "Timid", "Hasty", "Serious", "Jolly", "Naive",
  "Modest", "Mild", "Quiet", "Bashful", "Rash",
  "Calm", "Gentle", "Sassy", "Careful", "Quirky",
];
const NATURE_MOD: Record<string, { plus?: string; minus?: string }> = {
  Hardy: {}, Lonely: { plus: "atk", minus: "def" }, Brave: { plus: "atk", minus: "spe" },
  Adamant: { plus: "atk", minus: "spa" }, Naughty: { plus: "atk", minus: "spd" },
  Bold: { plus: "def", minus: "atk" }, Docile: {}, Relaxed: { plus: "def", minus: "spe" },
  Impish: { plus: "def", minus: "spa" }, Lax: { plus: "def", minus: "spd" },
  Timid: { plus: "spe", minus: "atk" }, Hasty: { plus: "spe", minus: "def" },
  Serious: {}, Jolly: { plus: "spe", minus: "spa" }, Naive: { plus: "spe", minus: "spd" },
  Modest: { plus: "spa", minus: "atk" }, Mild: { plus: "spa", minus: "def" },
  Quiet: { plus: "spa", minus: "spe" }, Bashful: {}, Rash: { plus: "spa", minus: "spd" },
  Calm: { plus: "spd", minus: "atk" }, Gentle: { plus: "spd", minus: "def" },
  Sassy: { plus: "spd", minus: "spe" }, Careful: { plus: "spd", minus: "spa" }, Quirky: {},
};

const CUSTOM_SPRITES: Record<string, string> = {
  irontreads: "sprites/custom/irontreads.gif", ironbundle: "sprites/custom/ironbundle.gif",
  ironhands: "sprites/custom/ironhands.gif", ironjugulis: "sprites/custom/ironjugulis.gif",
  ironmoth: "sprites/custom/ironmoth.gif", ironthorns: "sprites/custom/ironthorns.gif",
  wochien: "sprites/custom/wochien.gif", chienpao: "sprites/custom/chienpao.gif",
  tinglu: "sprites/custom/tinglu.gif", chiyu: "sprites/custom/chiyu.gif",
  ironvaliant: "sprites/custom/ironvaliant.gif", miraidon: "sprites/custom/miraidon.gif",
  ironleaves: "sprites/custom/ironleaves.gif", okidogi: "sprites/custom/okidogi.gif",
  munkidori: "sprites/custom/munkidori.gif", fezandipiti: "sprites/custom/fezandipiti.gif",
  ogerpon: "sprites/custom/ogerpon.gif", ironboulder: "sprites/custom/ironboulder.gif",
  ironcrown: "sprites/custom/ironcrown.gif", terapagos: "sprites/custom/terapagos.gif",
  pecharunt: "sprites/custom/pecharunt.gif",
  "melmetal-gmax": "sprites/custom/melmetal-gmax.gif",
  "venusaur-gmax": "sprites/custom/venusaur-gmax.gif",
  "venusaur-gmax-shiny": "sprites/custom/venusaur-gmax-shiny.gif",
  "blastoise-gmax": "sprites/custom/blastoise-gmax.gif",
  "blastoise-gmax-shiny": "sprites/custom/blastoise-gmax-shiny.gif",
  // Gen 9 shiny sprites
  "wochien-shiny": "sprites/custom/wochien-shiny.gif",
  "chienpao-shiny": "sprites/custom/chienpao-shiny.gif",
  "tinglu-shiny": "sprites/custom/tinglu-shiny.gif",
  "chiyu-shiny": "sprites/custom/chiyu-shiny.gif",
  "ironvaliant-shiny": "sprites/custom/ironvaliant-shiny.gif",
  "miraidon-shiny": "sprites/custom/miraidon-shiny.gif",
  "ironleaves-shiny": "sprites/custom/ironleaves-shiny.gif",
  "okidogi-shiny": "sprites/custom/okidogi-shiny.gif",
  "munkidori-shiny": "sprites/custom/munkidori-shiny.gif",
  "fezandipiti-shiny": "sprites/custom/fezandipiti-shiny.gif",
  "ogerpon-shiny": "sprites/custom/ogerpon-shiny.gif",
  "ironboulder-shiny": "sprites/custom/ironboulder-shiny.gif",
  "ironcrown-shiny": "sprites/custom/ironcrown-shiny.gif",
  "terapagos-shiny": "sprites/custom/terapagos-shiny.gif",
  "pecharunt-shiny": "sprites/custom/pecharunt-shiny.gif",
  "ironhands-shiny": "sprites/custom/ironhands-shiny.gif",
  "ironjugulis-shiny": "sprites/custom/ironjugulis-shiny.gif",
  "ironmoth-shiny": "sprites/custom/ironmoth-shiny.gif",
  "ironthorns-shiny": "sprites/custom/ironthorns-shiny.gif",
  "urshifu-gmax": "sprites/custom/urshifu-gmax.gif",
  "urshifu-rapid-strike-gmax": "sprites/custom/urshifu-rapid-strike-gmax.gif",
  "cinderace-gmax": "sprites/custom/cinderace-gmax.gif",
  "rillaboom-gmax": "sprites/custom/rillaboom-gmax.gif",
  "chesnaught-mega": "sprites/custom/mega/chesnaught-mega.gif",
  "delphox-mega": "sprites/custom/mega/delphox-mega.gif",
  "emboar-mega": "sprites/custom/mega/emboar-mega.gif",
  "feraligatr-mega": "sprites/custom/mega/feraligatr-mega.gif",
  "greninja-mega": "sprites/custom/mega/greninja-mega.gif",
  "meganium-mega": "sprites/custom/mega/meganium-mega.gif",
  "barbaracle-mega": "sprites/custom/mega/barbaracle-mega.gif",
  "chandelure-mega": "sprites/custom/mega/chandelure-mega.gif",
  "dragalge-mega": "sprites/custom/mega/dragalge-mega.gif",
  "dragonite-mega": "sprites/custom/mega/dragonite-mega.gif",
  "drampa-mega": "sprites/custom/mega/drampa-mega.gif",
  "eelektross-mega": "sprites/custom/mega/eelektross-mega.gif",
  "excadrill-mega": "sprites/custom/mega/excadrill-mega.gif",
  "froslass-mega": "sprites/custom/mega/froslass-mega.gif",
  "hawlucha-mega": "sprites/custom/mega/hawlucha-mega.gif",
  "malamar-mega": "sprites/custom/mega/malamar-mega.gif",
  "pyroar-mega": "sprites/custom/mega/pyroar-mega.gif",
  "scolipede-mega": "sprites/custom/mega/scolipede-mega.gif",
  "scrafty-mega": "sprites/custom/mega/scrafty-mega.gif",
  "skarmory-mega": "sprites/custom/mega/skarmory-mega.gif",
  "victreebel-mega": "sprites/custom/mega/victreebel-mega.gif",
  "tatsugiri-droopy-mega": "sprites/custom/mega/tatsugiri-droopy-mega.gif",
  "tatsugiri-stretchy-mega": "sprites/custom/mega/tatsugiri-stretchy-mega.gif",
  "raichu-megax": "sprites/custom/mega/raichu-megax.gif",
  "raichu-megay": "sprites/custom/mega/raichu-megay.gif",
  "absol-megaz": "sprites/custom/mega/absol-megaz.gif",
  "garchomp-megaz": "sprites/custom/mega/garchomp-megaz.gif",
  "lucario-megaz": "sprites/custom/mega/lucario-megaz.gif",
  "chimecho-mega": "sprites/custom/mega/chimecho-mega.gif",
  "staraptor-mega": "sprites/custom/mega/staraptor-mega.gif",
  "golurk-mega": "sprites/custom/mega/golurk-mega.gif",
  "meowstic-mega": "sprites/custom/mega/meowstic-mega.gif",
  "crabominable-mega": "sprites/custom/mega/crabominable-mega.gif",
  "golisopod-mega": "sprites/custom/mega/golisopod-mega.gif",
  "scovillain-mega": "sprites/custom/mega/scovillain-mega.gif",
  "glimmora-mega": "sprites/custom/mega/glimmora-mega.gif",
  "tatsugiri-mega": "sprites/custom/mega/tatsugiri-mega.gif",
  "baxcalibur-mega": "sprites/custom/mega/baxcalibur-mega.gif",
  "heatran-mega": "sprites/custom/mega/heatran-mega.gif",
  "darkrai-mega": "sprites/custom/mega/darkrai-mega.gif",
  "magearna-mega": "sprites/custom/mega/magearna-mega.gif",
  "zeraora-mega": "sprites/custom/mega/zeraora-mega.gif",
  // Alolan forms
  "sandshrew-alola": "sprites/custom/sandshrew-alola.gif",
  "sandslash-alola": "sprites/custom/sandslash-alola.gif",
  "vulpix-alola": "sprites/custom/vulpix-alola.gif",
  "ninetales-alola": "sprites/custom/ninetales-alola.gif",
  "dugtrio-alola": "sprites/custom/dugtrio-alola.gif",
  "persian-alola": "sprites/custom/persian-alola.gif",
  "geodude-alola": "sprites/custom/geodude-alola.gif",
  "graveler-alola": "sprites/custom/graveler-alola.gif",
  "golem-alola": "sprites/custom/golem-alola.gif",
  "exeggutor-alola": "sprites/custom/exeggutor-alola.gif",
  // Galarian forms
  "meowth-galar": "sprites/custom/meowth-galar.gif",
  "slowbro-galar": "sprites/custom/slowbro-galar.gif",
  "slowking-galar": "sprites/custom/slowking-galar.gif",
  "zapdos-galar": "sprites/custom/zapdos-galar.gif",
  "weezing-galar": "sprites/custom/weezing-galar.gif",
  "moltres-galar": "sprites/custom/moltres-galar.gif",
  // Hisuian forms
  "voltorb-hisui": "sprites/custom/voltorb-hisui.gif",
  "growlithe-hisui": "sprites/custom/growlithe-hisui.gif",
  "arcanine-hisui": "sprites/custom/arcanine-hisui.gif",
  "electrode-hisui": "sprites/custom/electrode-hisui.gif",
  "typhlosion-hisui": "sprites/custom/typhlosion-hisui.gif",
  "qwilfish-hisui": "sprites/custom/qwilfish-hisui.gif",
  "sneasel-hisui": "sprites/custom/sneasel-hisui.gif",
  "samurott-hisui": "sprites/custom/samurott-hisui.gif",
  "lilligant-hisui": "sprites/custom/lilligant-hisui.gif",
  "zorua-hisui": "sprites/custom/zorua-hisui.gif",
  "zoroark-hisui": "sprites/custom/zoroark-hisui.gif",
  "braviary-hisui": "sprites/custom/braviary-hisui.gif",
  "goodra-hisui": "sprites/custom/goodra-hisui.gif",
  "avalugg-hisui": "sprites/custom/avalugg-hisui.gif",
  "decidueye-hisui": "sprites/custom/decidueye-hisui.gif",
  // Paldean forms
  "wooper-paldea": "sprites/custom/wooper-paldea.gif",
  "tauros-paldeacombat": "sprites/custom/tauros-paldeacombat.gif",
};
function spriteUrl(name: string) {
  const clean = name.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (CUSTOM_SPRITES[clean]) return `${import.meta.env.BASE_URL}${CUSTOM_SPRITES[clean]}`;
  return `https://play.pokemonshowdown.com/sprites/gen5/${clean}.png`;
}
function spriteAniUrl(name: string) {
  const clean = name.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (CUSTOM_SPRITES[clean]) return `${import.meta.env.BASE_URL}${CUSTOM_SPRITES[clean]}`;
  return `https://play.pokemonshowdown.com/sprites/ani/${clean}.gif`;
}

function calcStat(base: number, ev: number, iv: number, level: number, isHP: boolean, natureMul = 1) {
  if (isHP) return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  const v = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(v * natureMul);
}

// ---------- Lazy dex-extras loader ----------
type DexExtra = {
  id: number; name: string; genus: string; flavor: string;
  height: number; weight: number; baseExp: number; cry: string;
  abilities: { name: string; hidden: boolean; short: string; full: string }[];
  tm: string[]; egg: string[]; tutor: string[];
  chain?: { id: number; name: string }[];
};
let dexCache: Record<string, DexExtra> | null = null;
let dexLoading: Promise<Record<string, DexExtra>> | null = null;
async function loadDex(): Promise<Record<string, DexExtra>> {
  if (dexCache) return dexCache;
  if (dexLoading) return dexLoading;
  dexLoading = import("../lib/dex-data.json").then((m) => {
    dexCache = (m as any).default || (m as any);
    return dexCache!;
  });
  return dexLoading;
}

type Tab = "level-up" | "machine" | "egg" | "tutor";
type DexMode = "base" | "shiny" | "all" | FormCategory;

const FORM_TABS: { key: DexMode; label: string; color: string }[] = [
  { key: "all",      label: "ALL",       color: "#94a3b8" },
  { key: "base",     label: "BASE",      color: "#6b7280" },
  { key: "shiny",    label: "✨ SHINY",  color: "#fbbf24" },
  { key: "mega",     label: "MEGA",      color: "#db2777" },
  { key: "gmax",     label: "G-MAX",     color: "#f97316" },
  { key: "alolan",   label: "ALOLAN",    color: "#f59e0b" },
  { key: "galarian", label: "GALARIAN",  color: "#3b82f6" },
  { key: "hisuian",  label: "HISUIAN",   color: "#10b981" },
  { key: "paldean",  label: "PALDEAN",   color: "#ef4444" },
  { key: "other",    label: "ALT FORM",  color: "#a78bfa" },
];

function formSpriteUrl(sprite: string, shiny = false) {
  const clean = sprite.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!shiny && CUSTOM_SPRITES[clean]) return `${import.meta.env.BASE_URL}${CUSTOM_SPRITES[clean]}`;
  if (shiny) return `https://play.pokemonshowdown.com/sprites/ani-shiny/${clean}.gif`;
  return `https://play.pokemonshowdown.com/sprites/ani/${clean}.gif`;
}
function formSpriteBaseFallback(sprite: string) {
  const clean = sprite.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const base = clean
    .replace(/-megax$/, "").replace(/-megay$/, "").replace(/-megaz$/, "")
    .replace(/-mega$/, "").replace(/-gmax$/, "")
    .replace(/-alola$/, "").replace(/-galar$/, "")
    .replace(/-hisui$/, "").replace(/-paldea$/, "")
    .replace(/-paldeacombat$/, "").replace(/-paldeafire$/, "").replace(/-paldeawater$/, "");
  return `https://play.pokemonshowdown.com/sprites/ani/${base}.gif`;
}
function formSpriteFallback(sprite: string, shiny = false) {
  const clean = sprite.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (shiny) return `https://play.pokemonshowdown.com/sprites/shiny/${clean}.png`;
  return `https://play.pokemonshowdown.com/sprites/gen5/${clean}.png`;
}

// ============================================================
// Crimson Sky Dex – grid view
// ============================================================
export function PokeTalesDex({ onBack, onHome }: { onBack: () => void; onHome: () => void }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<DexMode>("base");
  const [selected, setSelected] = useState<PokemonTemplate | null>(null);
  const [selectedForm, setSelectedForm] = useState<FormEntry | null>(null);

  const isShiny = mode === "shiny";
  const isAll = mode === "all";
  const showingForms = mode !== "base" && mode !== "shiny" && mode !== "all";

  const filteredBase = useMemo(() => {
    if (showingForms) return [];
    const q = query.trim().toLowerCase();
    if (!q) return ALL_POKEMON;
    return ALL_POKEMON.filter(
      (p) => p.name.toLowerCase().includes(q) || String(p.id).padStart(4, "0").includes(q),
    );
  }, [query, showingForms]);

  const filteredForms = useMemo(() => {
    if (!showingForms && !isAll) return [];
    const pool = isAll ? POKEMON_FORMS : POKEMON_FORMS.filter((f) => f.category === (mode as FormCategory));
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((f) => f.name.toLowerCase().includes(q) || String(f.id).includes(q));
  }, [query, mode, showingForms, isAll]);

  if (selected) {
    return (
      <DexDetail
        mon={selected}
        isShiny={isShiny}
        onBack={() => setSelected(null)}
        onHome={onHome}
        onJump={(id) => {
          const m = ALL_POKEMON.find((x) => x.id === id);
          if (m) setSelected(m);
        }}
      />
    );
  }

  if (selectedForm) {
    return <FormDetail form={selectedForm} onBack={() => setSelectedForm(null)} onHome={onHome} />;
  }

  const activeColor = FORM_TABS.find((t) => t.key === mode)?.color ?? "#6b7280";
  const visibleList = showingForms ? filteredForms : filteredBase;
  const totalCount = isAll ? filteredBase.length + filteredForms.length : visibleList.length;

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      <div style={S.topBar}>
        <BackBtn onClick={onBack} />
        <div className="page-header-title">Crimson Sky Dex</div>
        <div style={{ width: 80 }} />
      </div>

      {/* ── Category tab strip ── */}
      <div style={{ display: "flex", overflowX: "auto", gap: 6, padding: "8px 12px", borderBottom: "1px solid #1a1a1a", flexShrink: 0, scrollbarWidth: "none" } as React.CSSProperties}>
        {FORM_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setMode(t.key); setQuery(""); }}
            style={{
              flexShrink: 0, padding: "5px 12px", borderRadius: 20,
              border: `1px solid ${mode === t.key ? t.color : "#333"}`,
              background: mode === t.key ? `${t.color}22` : "transparent",
              color: mode === t.key ? t.color : "#666",
              fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5,
            }}
          >{t.label}</button>
        ))}
      </div>

      <div style={S.scroll}>
        <div style={{ ...S.searchWrap, marginTop: 12 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: "#6b7280", fontSize: 12, marginRight: 8 }} />
          <input
            style={S.searchInput}
            placeholder={showingForms ? "Search forms…" : "Search Pokémon…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isShiny && <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700, marginLeft: 8, flexShrink: 0 }}>✨ Shiny</span>}
        </div>

        {/* ── count label ── */}
        <div style={{ fontSize: 11, color: "#555", marginBottom: 10, marginLeft: 2 }}>
          {totalCount} {isAll ? "total entries" : showingForms ? `form${totalCount !== 1 ? "s" : ""}` : `Pokémon`}
          {isShiny ? " · shiny" : ""}
        </div>

        <div style={S.grid}>
          {/* Base / Shiny (also shows in ALL mode) */}
          {!showingForms && filteredBase.map((p) => (
            <button key={p.id} style={S.card} onClick={() => setSelected(p)}>
              <div style={S.cardId}>#{String(p.id).padStart(4, "0")}</div>
              <div style={S.cardSpriteBox}>
                <img
                  src={formSpriteUrl(p.sprite, isShiny)}
                  alt={p.name}
                  style={{ width: 96, height: 96, imageRendering: "pixelated", objectFit: "contain" }}
                  onError={(e) => { (e.target as HTMLImageElement).src = formSpriteFallback(p.sprite, isShiny); }}
                />
              </div>
              <div style={S.cardName}>{p.name}{isShiny ? " ✨" : ""}</div>
            </button>
          ))}

          {/* Forms (shows in form tabs and ALL mode) */}
          {(showingForms || isAll) && filteredForms.map((f) => {
            const fColor = isAll ? (FORM_TABS.find((t) => t.key === f.category)?.color ?? activeColor) : activeColor;
            return (
              <button key={f.id} style={{ ...S.card, borderColor: `${fColor}44` }} onClick={() => setSelectedForm(f)}>
                <div style={{ ...S.cardId, color: fColor }}>#{String(f.id)}</div>
                <div style={S.cardSpriteBox}>
                  <img
                    src={formSpriteUrl(f.sprite)}
                    alt={f.name}
                    style={{ width: 96, height: 96, imageRendering: "pixelated", objectFit: "contain" }}
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      const clean = f.sprite.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      if (el.src.includes("sprites/ani/") && !el.dataset.baseTried) {
                        el.dataset.baseTried = "1";
                        el.src = formSpriteBaseFallback(f.sprite);
                      } else if (el.src.includes("sprites/ani/") || el.src.includes("baseTried")) {
                        el.src = `https://play.pokemonshowdown.com/sprites/gen5/${clean}.png`;
                      } else if (el.src.includes("gen5")) {
                        el.src = `https://play.pokemonshowdown.com/sprites/home/${clean}.png`;
                      }
                    }}
                  />
                </div>
                <div style={S.cardName}>{f.name}</div>
                <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "center" }}>
                  <span style={{ background: TYPE_COLORS[f.type1] || "#666", borderRadius: 8, fontSize: 9, padding: "2px 6px", color: "#fff", fontWeight: 700 }}>{f.type1}</span>
                  {f.type2 && <span style={{ background: TYPE_COLORS[f.type2] || "#666", borderRadius: 8, fontSize: 9, padding: "2px 6px", color: "#fff", fontWeight: 700 }}>{f.type2}</span>}
                </div>
              </button>
            );
          })}

          {totalCount === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#6b7280", padding: 40 }}>No Pokémon found</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Form Detail – shown when tapping a form card
// ============================================================
const FORM_CAT_LABEL: Record<string, string> = {
  mega: "Mega Evolution", gmax: "Gigantamax Form", alolan: "Alolan Form",
  galarian: "Galarian Form", hisuian: "Hisuian Form", paldean: "Paldean Form", other: "Alternate Form",
};

function FormDetail({ form, onBack, onHome }: { form: FormEntry; onBack: () => void; onHome: () => void }) {
  const [shinyView, setShinyView] = useState(false);
  const stats: { key: string; label: string; base: number }[] = [
    { key: "hp",  label: "HP",          base: form.hp  },
    { key: "atk", label: "Attack",      base: form.atk },
    { key: "def", label: "Defense",     base: form.def },
    { key: "spa", label: "Sp. Attack",  base: form.spa },
    { key: "spd", label: "Sp. Defense", base: form.spd },
    { key: "spe", label: "Speed",       base: form.spe },
  ];
  const total = form.hp + form.atk + form.def + form.spa + form.spd + form.spe;
  const types = [form.type1, form.type2].filter(Boolean) as string[];
  const clean = form.sprite.toLowerCase().replace(/[^a-z0-9-]/g, "");

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      <div style={S.topBar}>
        <BackBtn onClick={onBack} />
        <div className="page-header-title">Crimson Sky Dex</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            style={{ ...S.iconBtn, color: shinyView ? "#fbbf24" : "#6b7280", borderColor: shinyView ? "#fbbf24" : "#2a2a2d" }}
            onClick={() => setShinyView((v) => !v)}
            aria-label="Toggle shiny"
            title="Toggle shiny sprite"
          >✨</button>
          <button style={S.iconBtn} onClick={onHome} aria-label="Home">
            <i className="fa-solid fa-house" />
          </button>
        </div>
      </div>

      <div style={S.scroll}>
        <div style={S.redGlow} />

        {/* Hero sprite */}
        <div style={S.spriteCard}>
          <img
            src={formSpriteUrl(form.sprite, shinyView)}
            alt={form.name}
            style={{ width: 200, height: 200, imageRendering: "pixelated", objectFit: "contain" }}
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              const src = el.src;
              if (src.includes("ani-shiny/")) el.src = `https://play.pokemonshowdown.com/sprites/shiny/${clean}.png`;
              else if (src.includes("sprites/ani/")) el.src = `https://play.pokemonshowdown.com/sprites/gen5/${clean}.png`;
              else if (src.includes("gen5") || src.includes("shiny/")) el.src = `https://play.pokemonshowdown.com/sprites/home/${clean}.png`;
            }}
          />
          {shinyView && <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 4, fontWeight: 700 }}>✨ Shiny</div>}
        </div>

        <div style={S.bigName}>{form.name}</div>
        <div style={{ color: "#9ca3af", fontSize: 13, fontStyle: "italic", marginBottom: 12 }}>
          {FORM_CAT_LABEL[form.category] ?? "Alternate Form"} · Gen {form.gen}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {types.map((t) => (
            <span key={t} style={{ ...S.typePill, background: TYPE_COLORS[t] || "#666" }}>{t}</span>
          ))}
        </div>

        {/* Base Stats */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "#aaa", marginBottom: 10, letterSpacing: 1 }}>BASE STATS</div>
        <div style={S.statsCard}>
          {stats.map(({ key: k, label, base }) => (
            <div key={k} style={S.statRow}>
              <div style={{ width: 90, color: "#9ca3af", fontSize: 13 }}>{label}</div>
              <div style={{ width: 36, color: "#fff", fontSize: 14, fontWeight: 600 }}>{base}</div>
              <div style={S.statBarBg}>
                <div style={{ ...S.statBarFill, width: `${Math.min(100, (base / 255) * 100)}%`, background: STAT_BAR_COLORS[k] }} />
              </div>
              <div style={{ width: 40, textAlign: "right", color: "#9ca3af", fontSize: 12 }}>
                {Math.round((base / 255) * 100)}%
              </div>
            </div>
          ))}
          <div style={S.totalRow}>
            <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Total</span>
            <span style={{ color: "#ef4444", fontSize: 18, fontWeight: 700 }}>{total}</span>
          </div>
        </div>

        {/* Moves */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "#aaa", margin: "18px 0 10px", letterSpacing: 1 }}>SIGNATURE MOVES</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.moves.map((mv) => {
            const def = getMove(mv);
            return (
              <div key={mv} style={S.moveCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>{mv}</span>
                  <span style={{ ...S.typePill, background: TYPE_COLORS[def.type] || "#666", padding: "3px 10px", fontSize: 11 }}>{def.type}</span>
                </div>
                <div style={S.moveStatsGrid}>
                  <div style={S.moveStatBox}><div style={S.moveStatLab}>Power</div><div style={S.moveStatVal}>{def.power || "—"}</div></div>
                  <div style={S.moveStatBox}><div style={S.moveStatLab}>Accuracy</div><div style={S.moveStatVal}>{def.accuracy ? `${def.accuracy}%` : "—"}</div></div>
                  <div style={S.moveStatBox}><div style={S.moveStatLab}>Category</div><div style={S.moveStatVal}>{def.category}</div></div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ height: 30 }} />
      </div>
    </div>
  );
}

// ============================================================
// Dex – detail panel (matches the Crimson Sky design spec)
// ============================================================
function DexDetail({
  mon,
  onBack,
  onHome,
  onJump,
  isShiny = false,
}: {
  mon: PokemonTemplate;
  onBack: () => void;
  onHome: () => void;
  onJump: (id: number) => void;
  isShiny?: boolean;
}) {
  const [extra, setExtra] = useState<DexExtra | null>(dexCache?.[String(mon.id)] || null);
  const [evoOpen, setEvoOpen] = useState(false);
  const [openAbility, setOpenAbility] = useState<number | null>(null);
  const [moveTab, setMoveTab] = useState<Tab>("level-up");
  const [moveQuery, setMoveQuery] = useState("");
  const [level, setLevel] = useState(100);
  const [nature, setNature] = useState("Hardy");
  const [evs, setEvs] = useState<Record<string, number>>({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  const [ivs, setIvs] = useState<Record<string, number>>({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lazy-load the bundled extras (abilities, height, weight, full move pools, etc.)
  useEffect(() => {
    let cancelled = false;
    setEvoOpen(false);
    setOpenAbility(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const cached = dexCache?.[String(mon.id)];
    if (cached) {
      setExtra(cached);
    } else {
      setExtra(null);
      loadDex().then((all) => {
        if (!cancelled) setExtra(all[String(mon.id)] || null);
      });
    }
    return () => { cancelled = true; };
  }, [mon.id]);

  // Build a dedicated audio element for the cry.
  useEffect(() => {
    if (!extra?.cry) { audioRef.current = null; return; }
    const a = new Audio(extra.cry);
    a.volume = 0.35;
    audioRef.current = a;
    return () => { a.pause(); audioRef.current = null; };
  }, [extra?.cry]);

  const playCry = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  const stats: Record<string, { base: number; label: string }> = {
    hp:  { base: mon.hp,  label: "HP" },
    atk: { base: mon.atk, label: "Attack" },
    def: { base: mon.def, label: "Defense" },
    spa: { base: mon.spa, label: "Sp. Attack" },
    spd: { base: mon.spd, label: "Sp. Defense" },
    spe: { base: mon.spe, label: "Speed" },
  };
  const total = mon.hp + mon.atk + mon.def + mon.spa + mon.spd + mon.spe;
  const totalEv = Object.values(evs).reduce((a, b) => a + b, 0);
  const evLeft = 510 - totalEv;
  const natMod = NATURE_MOD[nature] ?? {};

  const chainList = extra?.chain ?? [];
  const myStageIdx = chainList.findIndex((c) => c.id === mon.id);
  const stageLabel = chainList.length > 0
    ? `Stage ${Math.max(1, myStageIdx + 1)}/${chainList.length}`
    : "Stage 1/1";

  const types = [mon.type1, mon.type2].filter(Boolean) as string[];

  // Build move buckets from bundled data.
  const moveBuckets = useMemo(() => {
    const lvl = mon.learn.map((m) => ({ name: m.n, level: m.l }));
    const tm  = (extra?.tm    ?? []).map((n) => ({ name: n, level: 0 }));
    const egg = (extra?.egg   ?? []).map((n) => ({ name: n, level: 0 }));
    const tut = (extra?.tutor ?? []).map((n) => ({ name: n, level: 0 }));
    return { "level-up": lvl, machine: tm, egg, tutor: tut } as Record<Tab, { name: string; level: number }[]>;
  }, [mon.learn, extra?.tm, extra?.egg, extra?.tutor]);

  const filteredMoves = useMemo(() => {
    const q = moveQuery.trim().toLowerCase();
    const list = moveBuckets[moveTab] ?? [];
    if (!q) return list;
    return list.filter((m) => m.name.toLowerCase().includes(q));
  }, [moveQuery, moveTab, moveBuckets]);

  const evEv = (k: string, v: number) => {
    const n = Math.max(0, Math.min(252, v));
    const others = totalEv - evs[k];
    const allowedMax = Math.min(252, 510 - others);
    setEvs({ ...evs, [k]: Math.min(n, allowedMax) });
  };
  const setIv = (k: string, v: number) => setIvs({ ...ivs, [k]: Math.max(0, Math.min(31, v)) });

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      <div style={S.topBar}>
        <BackBtn onClick={onBack} />
        <div className="page-header-title">Crimson Sky Dex</div>
        <button style={S.iconBtn} onClick={onHome} aria-label="Home">
          <i className="fa-solid fa-house" />
        </button>
      </div>

      <div style={S.scroll} ref={scrollRef}>
        {/* Red glow accent */}
        <div style={S.redGlow} />

        {/* Hero sprite – tap to play cry */}
        <div style={S.spriteCard} onClick={playCry} title="Tap to play cry">
          <img
            src={formSpriteUrl(mon.sprite, isShiny)}
            alt={mon.name}
            style={{ width: 200, height: 200, imageRendering: "pixelated", objectFit: "contain" }}
            onError={(e) => { (e.target as HTMLImageElement).src = formSpriteFallback(mon.sprite, isShiny); }}
          />
          <div style={S.cryHint}>
            <i className="fa-solid fa-volume-high" /> Tap to play cry
          </div>
        </div>

        {/* Metadata grid */}
        <div style={S.metaGrid}>
          <div style={S.metaItem}>
            <span style={S.metaLab}>Height:</span>
            <span style={S.metaVal}>{extra ? `${(extra.height / 10).toFixed(1)} m` : "…"}</span>
          </div>
          <div style={S.metaItem}>
            <span style={S.metaLab}>Weight:</span>
            <span style={S.metaVal}>{extra ? `${(extra.weight / 10).toFixed(1)} kg` : "…"}</span>
          </div>
          <div style={S.metaItem}>
            <span style={S.metaLab}>Base Exp:</span>
            <span style={S.metaVal}>{extra?.baseExp ?? "…"}</span>
          </div>
          <div style={S.metaItem}>
            <span style={S.metaLab}>ID:</span>
            <span style={S.metaVal}>#{String(mon.id).padStart(4, "0")}</span>
          </div>
        </div>

        {/* Title */}
        <div style={S.bigName}>{mon.name}</div>
        {extra?.genus && <div style={S.subGenus}>{extra.genus}</div>}
        {extra?.flavor && <div style={S.flavor}>{extra.flavor}</div>}

        {/* Evolution + types */}
        {chainList.length > 0 && (
          <div style={{ marginTop: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ color: "#9ca3af", fontSize: 13 }}>Evolution:</span>
              <button style={S.evoBtn} onClick={() => setEvoOpen(!evoOpen)}>
                {stageLabel} <i className={`fa-solid fa-chevron-${evoOpen ? "up" : "down"}`} style={{ marginLeft: 6, fontSize: 10 }} />
              </button>
            </div>
            {evoOpen && (
              <div style={S.evoPanel}>
                <div style={S.evoTitle}>Evolution Chain</div>
                {chainList.map((c, i) => (
                  <div key={`${c.id}-${i}`}>
                    <button
                      style={{ ...S.evoRow, ...(c.id === mon.id ? S.evoRowActive : {}) }}
                      onClick={() => onJump(c.id)}
                    >
                      <span style={{ color: c.id === mon.id ? "#fff" : "#9ca3af", fontSize: 12 }}>
                        #{String(c.id).padStart(4, "0")}
                      </span>
                      <span style={{ color: c.id === mon.id ? "#fff" : "#e5e7eb", fontSize: 14, fontWeight: 600, flex: 1, textTransform: "capitalize" }}>
                        {c.name}
                      </span>
                      {c.id === mon.id && <i className="fa-solid fa-check" style={{ color: "#fff" }} />}
                    </button>
                    {i < chainList.length - 1 && (
                      <div style={{ textAlign: "center", color: "#6b7280", fontSize: 14, padding: "4px 0" }}>↓</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {types.map((t) => (
            <span key={t} style={{ ...S.typePill, background: TYPE_COLORS[t] || "#666" }}>{t}</span>
          ))}
        </div>

        {/* Abilities */}
        <div style={S.sectionHeader}>
          <i className="fa-solid fa-bullseye" style={{ color: "#ef4444" }} />
          <span style={{ fontSize: 18, fontWeight: 700 }}>Abilities</span>
          {extra && <span style={{ color: "#9ca3af", fontSize: 13 }}>({extra.abilities.length} abilities)</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {!extra && <div style={S.loadingBox}>Loading abilities…</div>}
          {extra?.abilities.map((a, i) => (
            <div key={i} style={S.abilityCard}>
              <button style={S.abilityHead} onClick={() => setOpenAbility(openAbility === i ? null : i)}>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{a.name}</span>
                {a.hidden && <span style={S.hiddenPill}>Hidden</span>}
                <span style={{ flex: 1 }} />
                <i className={`fa-solid fa-chevron-${openAbility === i ? "up" : "down"}`} style={{ color: "#9ca3af" }} />
              </button>
              <div style={S.abilityDesc}>{(openAbility === i ? a.full : a.short) || a.full || a.short || "—"}</div>
            </div>
          ))}
        </div>
        <div style={S.tipBox}>
          <i className="fa-solid fa-lightbulb" style={{ color: "#fbbf24", marginRight: 6 }} />
          Tip: Click on an ability to see its full battle effects. Hidden abilities are marked with a red badge and are harder to obtain.
        </div>

        {/* Base Stats */}
        <div style={{ ...S.sectionHeader, marginTop: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Base Stats</span>
        </div>
        <div style={S.statsCard}>
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} style={S.statRow}>
              <div style={{ width: 90, color: "#9ca3af", fontSize: 13 }}>{v.label}</div>
              <div style={{ width: 36, color: "#fff", fontSize: 14, fontWeight: 600 }}>{v.base}</div>
              <div style={S.statBarBg}>
                <div style={{ ...S.statBarFill, width: `${Math.min(100, (v.base / 255) * 100)}%`, background: STAT_BAR_COLORS[k] }} />
              </div>
              <div style={{ width: 40, textAlign: "right", color: "#9ca3af", fontSize: 12 }}>
                {Math.round((v.base / 255) * 100)}%
              </div>
            </div>
          ))}
          <div style={S.totalRow}>
            <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Total</span>
            <span style={{ color: "#ef4444", fontSize: 18, fontWeight: 700 }}>{total}</span>
          </div>
        </div>

        {/* Stat Calculator */}
        <div style={S.calcCard}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Stat Calculator</div>
          <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
            <label style={S.calcLab}>
              Lv:
              <select value={level} onChange={(e) => setLevel(Number(e.target.value))} style={S.calcInput}>
                {Array.from({ length: 100 }, (_, i) => i + 1).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
            <label style={S.calcLab}>
              Nature:
              <select value={nature} onChange={(e) => setNature(e.target.value)} style={S.calcInput}>
                {NATURES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 14, display: "flex", justifyContent: "space-between", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>
            <span>EVs: <span style={{ color: "#e5e7eb" }}>{totalEv}</span>/510</span>
            <span>Left: <span style={{ color: "#e5e7eb" }}>{evLeft}</span></span>
          </div>
          {Object.entries(stats).map(([k, v]) => {
            const isHP = k === "hp";
            const mult = isHP ? 1 : natMod.plus === k ? 1.1 : natMod.minus === k ? 0.9 : 1;
            const finalVal = calcStat(v.base, evs[k], ivs[k], level, isHP, mult);
            return (
              <div key={k} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 600 }}>
                    {v.label} <span style={{ fontSize: 11, color: "#6b7280" }}>({v.base})</span>
                    {natMod.plus === k && <span style={{ color: "#22c55e", marginLeft: 4 }}>+</span>}
                    {natMod.minus === k && <span style={{ color: "#ef4444", marginLeft: 4 }}>−</span>}
                  </span>
                  <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{finalVal}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 15 }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span style={{ color: "#6b7280", fontSize: 11, fontWeight: 600 }}>EV</span>
                      <input type="number" min={0} max={252} value={evs[k]}
                        onChange={(e) => evEv(k, Number(e.target.value) || 0)}
                        style={S.numInput} />
                    </div>
                    <input type="range" min={0} max={252} value={evs[k]}
                      onChange={(e) => evEv(k, Number(e.target.value))}
                      className="range-red" style={{ width: "100%" }} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span style={{ color: "#6b7280", fontSize: 11, fontWeight: 600 }}>IV</span>
                      <input type="number" min={0} max={31} value={ivs[k]}
                        onChange={(e) => setIv(k, Number(e.target.value) || 0)}
                        style={S.numInput} />
                    </div>
                    <input type="range" min={0} max={31} value={ivs[k]}
                      onChange={(e) => setIv(k, Number(e.target.value))}
                      className="range-blue" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button style={S.smallBtn} onClick={() => setEvs({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 })}>Reset EVs</button>
            <button style={S.smallBtn} onClick={() => setIvs({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 })}>Max IVs</button>
            <button style={S.smallBtn} onClick={() => setIvs({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 })}>Min IVs</button>
          </div>
        </div>

        {/* Moves */}
        <div style={S.movesCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <i className="fa-solid fa-khanda" style={{ color: "#9ca3af", fontSize: 18 }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Moves</span>
          </div>
          <div style={S.searchWrap}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: "#6b7280", fontSize: 12, marginRight: 8 }} />
            <input
              style={S.searchInput}
              placeholder="Search moves..."
              value={moveQuery}
              onChange={(e) => setMoveQuery(e.target.value)}
            />
          </div>
          <div style={S.tabRow}>
            {(["level-up", "machine", "egg", "tutor"] as Tab[]).map((t) => {
              const lab = t === "level-up" ? "Level Up" : t === "machine" ? "TM/HM" : t === "egg" ? "Egg" : "Tutor";
              const count = moveBuckets[t]?.length ?? 0;
              const active = moveTab === t;
              return (
                <button key={t} style={{ ...S.tab, ...(active ? S.tabActive : {}) }} onClick={() => setMoveTab(t)}>
                  {lab} <span style={{ color: active ? "#fca5a5" : "#6b7280", marginLeft: 4, fontSize: 11 }}>({count})</span>
                  {active && <div style={S.tabUnderline} />}
                </button>
              );
            })}
          </div>
          {!extra && moveTab !== "level-up" && <div style={S.loadingBox}>Loading {moveTab.replace("-", " ")} moves…</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredMoves.map((m, i) => {
              const def = getMove(m.name);
              const cat = def.category;
              return (
                <div key={`${m.name}-${i}`} style={S.moveCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      {moveTab === "level-up" && (
                        <div style={S.lvLabel}>LEVEL {m.level}</div>
                      )}
                      <div style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>{m.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                        {cat === "Physical" && <span style={{ color: "#fb923c" }} title="Physical">●</span>}
                        {cat === "Special"  && <span style={{ color: "#60a5fa" }} title="Special">◆</span>}
                        {cat === "Status"   && <i className="fa-solid fa-rotate" style={{ color: "#9ca3af", fontSize: 12 }} />}
                        <span style={{ color: "#9ca3af", fontSize: 12 }}>{cat}</span>
                      </div>
                    </div>
                    <span style={{ ...S.typePill, background: TYPE_COLORS[def.type] || "#666", padding: "4px 12px", fontSize: 11 }}>
                      {def.type}
                    </span>
                  </div>
                  <div style={S.moveStatsGrid}>
                    <div style={S.moveStatBox}>
                      <div style={S.moveStatLab}>Power</div>
                      <div style={S.moveStatVal}>{def.power || "—"}</div>
                    </div>
                    <div style={S.moveStatBox}>
                      <div style={S.moveStatLab}>Accuracy</div>
                      <div style={S.moveStatVal}>{def.accuracy ? `${def.accuracy}%` : "—"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {extra && filteredMoves.length === 0 && (
              <div style={{ color: "#6b7280", textAlign: "center", padding: 32, fontSize: 13 }}>
                No {moveTab.replace("-", " ")} moves available
              </div>
            )}
          </div>
        </div>

        {/* Available Forms (Mega / G-Max) */}
        {(() => {
          const myForms = POKEMON_FORMS.filter(f =>
            (f.category === "mega" || f.category === "gmax") && f.baseId === mon.id
          );
          if (myForms.length === 0) return null;
          const typeCol: Record<string,string> = {
            Normal:"#A8A77A",Fire:"#EE8130",Water:"#6390F0",Electric:"#F7D02C",Grass:"#7AC74C",
            Ice:"#96D9D6",Fighting:"#C22E28",Poison:"#A33EA1",Ground:"#E2BF65",Flying:"#A98FF3",
            Psychic:"#F95587",Bug:"#A6B91A",Rock:"#B6A136",Ghost:"#735797",Dragon:"#6F35FC",
            Dark:"#705746",Steel:"#B7B7CE",Fairy:"#D685AD",
          };
          return (
            <div style={{ marginTop: 24, padding: "0 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>✨</span> Available Forms
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {myForms.map(form => (
                  <div key={form.id} style={{ background: "#111", border: "1px solid #27272a", borderRadius: 12, padding: 10, textAlign: "center" }}>
                    <img
                      src={formSpriteUrl(form.sprite)}
                      alt={form.name}
                      style={{ width: 72, height: 72, imageRendering: "pixelated", objectFit: "contain", display: "block", margin: "0 auto 6px" }}
                      onError={(e) => { const el = e.target as HTMLImageElement; if (!el.dataset.b) { el.dataset.b="1"; el.src = formSpriteBaseFallback(form.sprite); } else el.src = `https://play.pokemonshowdown.com/sprites/dex/${form.sprite.toLowerCase().replace(/[^a-z0-9-]/g,"")}.png`; }}
                    />
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", marginBottom: 6, lineHeight: 1.3 }}>{form.name}</div>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 6 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 9, background: typeCol[form.type1] || "#666", color: "#fff" }}>{form.type1}</span>
                      {form.type2 && <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 9, background: typeCol[form.type2] || "#666", color: "#fff" }}>{form.type2}</span>}
                    </div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>BST: {form.hp+form.atk+form.def+form.spa+form.spd+form.spe}</div>
                    <div style={{ display: "grid", gridTemplateColumns:"repeat(3,1fr)", gap:2, marginTop:4 }}>
                      {([["HP",form.hp,"#ef4444"],["Atk",form.atk,"#f97316"],["Def",form.def,"#eab308"],["SpA",form.spa,"#3b82f6"],["SpD",form.spd,"#8b5cf6"],["Spe",form.spe,"#10b981"]] as [string,number,string][]).map(([k,v,c])=>(
                        <div key={k} style={{ fontSize: 8, color: "#6b7280", textAlign:"center" }}>
                          <div style={{ color: c, fontWeight:700, fontSize:9 }}>{v}</div>
                          <div>{k}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div style={{ height: 30 }} />
      </div>
    </div>
  );
}

// ---------- Styles ----------
const S: Record<string, React.CSSProperties> = {
  root: {
    position: "absolute", inset: 0,
    background: "#000",
    color: "#e5e7eb",
    fontFamily: "Inter, system-ui, sans-serif",
    display: "flex", flexDirection: "column",
  },
  topBar: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "12px 14px",
    background: "#000",
    flexShrink: 0,
  },
  topTitle: { flex: 1, fontSize: 16, fontWeight: 600, color: "#fff", textAlign: "center" },
  iconBtn: {
    background: "#1c1c1e", border: "1px solid #2a2a2d",
    color: "#fff", fontSize: 14, cursor: "pointer",
    padding: "8px 10px", borderRadius: 8, minWidth: 38,
  },
  scroll: { flex: 1, overflowY: "auto", padding: "0 14px 20px" },
  redGlow: {
    height: 2, width: "100%",
    background: "linear-gradient(90deg, transparent, #dc2626, transparent)",
    boxShadow: "0 0 8px rgba(220,38,38,0.6)",
    marginBottom: 18,
  },
  heroTitle: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", fontSize: 18, color: "#ef4444",
    textAlign: "center", margin: "16px 0 18px", letterSpacing: 1,
    textShadow: "2px 2px 0 #1a1a1a", lineHeight: 1.4,
  },
  searchWrap: {
    background: "#000", border: "1px solid #27272a", borderRadius: 12,
    padding: "12px 14px", display: "flex", alignItems: "center",
    marginBottom: 18,
  },
  searchInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 14 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  card: {
    background: "#1c1c1e", border: "1px solid #27272a", borderRadius: 14,
    padding: 12, display: "flex", flexDirection: "column",
    cursor: "pointer", color: "#fff", textAlign: "left",
  },
  cardId: { color: "#6b7280", fontSize: 12, marginBottom: 4 },
  cardSpriteBox: {
    background: "#0a0a0a", borderRadius: 10, height: 130,
    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  cardName: { color: "#e5e7eb", fontSize: 15, fontWeight: 500, textAlign: "center", paddingBottom: 4 },

  spriteCard: {
    background: "#1c1c1e", borderRadius: 16, padding: 32,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    height: 240, cursor: "pointer", marginBottom: 18, position: "relative",
  },
  cryHint: { position: "absolute", bottom: 10, color: "#6b7280", fontSize: 11, display: "flex", alignItems: "center", gap: 6 },

  metaGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 },
  metaItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 13 },
  metaLab: { color: "#9ca3af" },
  metaVal: { color: "#f3f4f6", fontWeight: 600 },

  bigName: { fontSize: 36, fontWeight: 700, color: "#fff", letterSpacing: -0.5, marginBottom: 4 },
  subGenus: { color: "#9ca3af", fontSize: 13, fontStyle: "italic", marginBottom: 8 },
  flavor: { color: "#a1a1aa", fontSize: 13, lineHeight: 1.55, marginBottom: 12 },

  evoBtn: {
    background: "transparent", border: "1px solid #ef4444", borderRadius: 8,
    padding: "6px 12px", color: "#fff", fontSize: 13, cursor: "pointer",
    display: "flex", alignItems: "center",
  },
  evoPanel: { background: "#1c1c1e", border: "1px solid #27272a", borderRadius: 12, padding: 12 },
  evoTitle: { color: "#9ca3af", fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  evoRow: {
    width: "100%", display: "flex", alignItems: "center", gap: 10,
    background: "#0a0a0a", border: "1px solid #27272a", borderRadius: 8,
    padding: "10px 12px", cursor: "pointer", color: "#e5e7eb",
  },
  evoRowActive: { background: "#dc2626", borderColor: "#dc2626" },
  typePill: { padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, color: "#fff", textTransform: "capitalize" },

  sectionHeader: { display: "flex", alignItems: "center", gap: 8, color: "#fff", marginBottom: 14 },

  abilityCard: { background: "#121212", border: "1px solid #27272a", borderRadius: 12, overflow: "hidden" },
  abilityHead: {
    width: "100%", display: "flex", alignItems: "center", gap: 8,
    background: "transparent", border: "none", color: "#fff",
    padding: "12px 14px", cursor: "pointer", textAlign: "left",
  },
  hiddenPill: { background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, letterSpacing: 0.5, textTransform: "uppercase" },
  abilityDesc: { color: "#a1a1aa", fontSize: 13, lineHeight: 1.55, padding: "0 14px 12px" },
  tipBox: {
    background: "#121212", border: "1px solid #27272a", borderRadius: 12,
    padding: 12, color: "#a1a1aa", fontSize: 13, lineHeight: 1.5,
  },

  statsCard: { background: "#121212", border: "1px solid #27272a", borderRadius: 16, padding: "20px 18px" },
  statRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: 12 },
  statBarBg: { flex: 1, height: 6, background: "#0a0a0a", borderRadius: 3, overflow: "hidden" },
  statBarFill: { height: "100%", borderRadius: 3, transition: "width .3s" },
  totalRow: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, marginTop: 6, borderTop: "1px solid #27272a" },

  calcCard: { background: "#121212", border: "1px solid #27272a", borderRadius: 16, padding: 20, marginTop: 18 },
  calcLab: { display: "flex", alignItems: "center", gap: 6, color: "#9ca3af", fontSize: 13, fontWeight: 500 },
  calcInput: {
    background: "#000", border: "1px solid #27272a", color: "#fff",
    padding: "5px 8px", borderRadius: 6, fontSize: 13,
  },
  numInput: {
    background: "#000", border: "1px solid #27272a", color: "#fff",
    padding: "4px 6px", borderRadius: 4, fontSize: 12, width: 50, textAlign: "center",
  },
  smallBtn: {
    flex: 1, background: "#000", border: "1px solid #27272a", color: "#d4d4d8",
    padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
  },

  movesCard: { background: "#121212", border: "1px solid #27272a", borderRadius: 16, padding: 20, marginTop: 18 },
  tabRow: { display: "flex", overflowX: "auto", gap: 4, marginBottom: 18, borderBottom: "1px solid #27272a", paddingBottom: 0 },
  tab: {
    background: "transparent", border: "none", color: "#9ca3af",
    padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    position: "relative", whiteSpace: "nowrap",
  },
  tabActive: { color: "#ef4444" },
  tabUnderline: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#ef4444", borderRadius: "2px 2px 0 0" },

  moveCard: { background: "#0f0f0f", border: "1px solid #27272a", borderRadius: 12, padding: 14 },
  lvLabel: { color: "#71717a", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 2 },
  moveStatsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
  moveStatBox: {
    background: "rgba(0,0,0,0.5)", border: "1px solid rgba(39,39,42,0.6)",
    borderRadius: 8, padding: "8px 6px",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  moveStatLab: { color: "#71717a", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" },
  moveStatVal: { color: "#e5e7eb", fontSize: 14, fontWeight: 600 },

  loadingBox: { color: "#9ca3af", textAlign: "center", padding: 16, fontSize: 13 },
};

const CSS = `
  .range-red, .range-blue {
    -webkit-appearance: none; appearance: none;
    height: 4px; background: #27272a; border-radius: 2px; outline: none;
  }
  .range-red::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 16px; height: 16px; border-radius: 50%;
    background: #ef4444; cursor: pointer; border: 2px solid #000;
  }
  .range-red::-moz-range-thumb {
    width: 16px; height: 16px; border-radius: 50%;
    background: #ef4444; cursor: pointer; border: 2px solid #000;
  }
  .range-blue::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 16px; height: 16px; border-radius: 50%;
    background: #3b82f6; cursor: pointer; border: 2px solid #000;
  }
  .range-blue::-moz-range-thumb {
    width: 16px; height: 16px; border-radius: 50%;
    background: #3b82f6; cursor: pointer; border: 2px solid #000;
  }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
`;
