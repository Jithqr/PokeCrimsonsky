import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_POKEMON, PokemonTemplate, TOTAL_POKEMON } from "../lib/pokemon-data";

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
  irontreads: "sprites/custom/irontreads.gif",
  ironbundle: "sprites/custom/ironbundle.gif",
  ironhands: "sprites/custom/ironhands.gif",
  ironjugulis: "sprites/custom/ironjugulis.gif",
  ironmoth: "sprites/custom/ironmoth.gif",
  ironthorns: "sprites/custom/ironthorns.gif",
  wochien: "sprites/custom/wochien.gif",
  chienpao: "sprites/custom/chienpao.gif",
  tinglu: "sprites/custom/tinglu.gif",
  chiyu: "sprites/custom/chiyu.gif",
  ironvaliant: "sprites/custom/ironvaliant.gif",
  miraidon: "sprites/custom/miraidon.gif",
  ironleaves: "sprites/custom/ironleaves.gif",
  okidogi: "sprites/custom/okidogi.gif",
  munkidori: "sprites/custom/munkidori.gif",
  fezandipiti: "sprites/custom/fezandipiti.gif",
  ogerpon: "sprites/custom/ogerpon.gif",
  ironboulder: "sprites/custom/ironboulder.gif",
  ironcrown: "sprites/custom/ironcrown.gif",
  terapagos: "sprites/custom/terapagos.gif",
  pecharunt: "sprites/custom/pecharunt.gif",
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

function fmtName(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function calcStat(base: number, ev: number, iv: number, level: number, isHP: boolean, natureMul = 1) {
  if (isHP) {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  }
  const v = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(v * natureMul);
}

const detailCache = new Map<number, any>();
const evoCache = new Map<string, any>();

async function fetchDetail(id: number) {
  if (detailCache.has(id)) return detailCache.get(id);
  const [p, s] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then((r) => r.json()),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`).then((r) => r.json()),
  ]);
  let chain: any = null;
  if (s.evolution_chain?.url) {
    if (evoCache.has(s.evolution_chain.url)) {
      chain = evoCache.get(s.evolution_chain.url);
    } else {
      chain = await fetch(s.evolution_chain.url).then((r) => r.json());
      evoCache.set(s.evolution_chain.url, chain);
    }
  }
  const abilityDetails = await Promise.all(
    p.abilities.map(async (a: any) => {
      try {
        const ad = await fetch(a.ability.url).then((r) => r.json());
        const en = ad.effect_entries?.find((e: any) => e.language.name === "en");
        const flav = ad.flavor_text_entries?.find((e: any) => e.language.name === "en");
        return {
          name: fmtName(a.ability.name),
          is_hidden: a.is_hidden,
          short: en?.short_effect || flav?.flavor_text || "",
          full: en?.effect || flav?.flavor_text || "",
        };
      } catch {
        return { name: fmtName(a.ability.name), is_hidden: a.is_hidden, short: "", full: "" };
      }
    })
  );
  const data = {
    pokemon: p,
    species: s,
    chain,
    abilityDetails,
    height: p.height / 10,
    weight: p.weight / 10,
    baseExp: p.base_experience ?? 0,
  };
  detailCache.set(id, data);
  return data;
}

function flattenChain(chain: any): { name: string; id: number; minLevel: number | null; trigger: string }[] {
  const out: { name: string; id: number; minLevel: number | null; trigger: string }[] = [];
  function walk(node: any, parentTrigger = "") {
    const url: string = node.species.url;
    const m = url.match(/\/pokemon-species\/(\d+)\/?$/);
    const id = m ? parseInt(m[1], 10) : 0;
    out.push({
      name: fmtName(node.species.name),
      id,
      minLevel: parentTrigger || node.evolution_details?.[0]?.min_level || null,
      trigger: parentTrigger,
    });
    for (const ev of node.evolves_to ?? []) {
      const det = ev.evolution_details?.[0];
      const trig = det?.min_level
        ? `Level ${det.min_level}`
        : det?.item
        ? `Use ${fmtName(det.item.name)}`
        : det?.trigger?.name === "trade"
        ? "Trade"
        : det?.min_happiness
        ? "High Friendship"
        : det?.trigger?.name
        ? fmtName(det.trigger.name)
        : "";
      walk(ev, trig);
    }
  }
  if (chain?.chain) walk(chain.chain);
  return out;
}

type Tab = "level-up" | "machine" | "egg" | "tutor";

export function PokeTalesDex({ onBack, onHome }: { onBack: () => void; onHome: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PokemonTemplate | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_POKEMON;
    return ALL_POKEMON.filter(
      (p) => p.name.toLowerCase().includes(q) || String(p.id).padStart(3, "0").includes(q)
    );
  }, [query]);

  if (selected) {
    return (
      <DexDetail
        mon={selected}
        onBack={() => setSelected(null)}
        onHome={onHome}
        onJump={(id) => {
          const m = ALL_POKEMON.find((x) => x.id === id);
          if (m) setSelected(m);
        }}
      />
    );
  }

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      <div style={S.topBar}>
        <button style={S.iconBtn} onClick={onHome} aria-label="Home">
          <i className="fa-solid fa-house" />
        </button>
        <div style={S.topTitle}>Crimson Sky Dex</div>
      </div>

      <div style={S.scroll}>
        <div style={S.heroTitle}>Crimson Sky Dex</div>

        <div style={S.searchWrap}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: "#6b7280", fontSize: 12, marginRight: 8 }} />
          <input
            style={S.searchInput}
            placeholder="Search Pokémon..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div style={S.grid}>
          {filtered.map((p) => (
            <button key={p.id} style={S.card} onClick={() => setSelected(p)}>
              <div style={S.cardId}>#{String(p.id).padStart(3, "0")}</div>
              <div style={S.cardSpriteBox}>
                <img
                  src={spriteUrl(p.sprite)}
                  alt={p.name}
                  style={{ width: 96, height: 96, imageRendering: "pixelated", objectFit: "contain" }}
                />
              </div>
              <div style={S.cardName}>{p.name}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#6b7280", padding: 40 }}>
              No Pokémon found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DexDetail({
  mon,
  onBack,
  onHome,
  onJump,
}: {
  mon: PokemonTemplate;
  onBack: () => void;
  onHome: () => void;
  onJump: (id: number) => void;
}) {
  const [data, setData] = useState<any | null>(detailCache.get(mon.id) ?? null);
  const [loading, setLoading] = useState(!detailCache.has(mon.id));
  const [error, setError] = useState<string | null>(null);
  const [evoOpen, setEvoOpen] = useState(false);
  const [openAbility, setOpenAbility] = useState<number | null>(null);
  const [moveTab, setMoveTab] = useState<Tab>("level-up");
  const [moveQuery, setMoveQuery] = useState("");
  const [level, setLevel] = useState(100);
  const [nature, setNature] = useState("Hardy");
  const [evs, setEvs] = useState<Record<string, number>>({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  const [ivs, setIvs] = useState<Record<string, number>>({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (detailCache.has(mon.id)) {
      setData(detailCache.get(mon.id));
      setLoading(false);
    } else {
      setLoading(true);
      fetchDetail(mon.id)
        .then((d) => {
          if (!cancelled) {
            setData(d);
            setLoading(false);
          }
        })
        .catch((e) => {
          if (!cancelled) {
            setError(String(e?.message || e));
            setLoading(false);
          }
        });
    }
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setEvoOpen(false);
    setOpenAbility(null);
    return () => {
      cancelled = true;
    };
  }, [mon.id]);

  const stats: Record<string, { base: number; label: string }> = {
    hp: { base: mon.hp, label: "HP" },
    atk: { base: mon.atk, label: "Attack" },
    def: { base: mon.def, label: "Defense" },
    spa: { base: mon.spa, label: "Sp. Atk" },
    spd: { base: mon.spd, label: "Sp. Def" },
    spe: { base: mon.spe, label: "Speed" },
  };
  const total = mon.hp + mon.atk + mon.def + mon.spa + mon.spd + mon.spe;
  const evLeft = 510 - Object.values(evs).reduce((a, b) => a + b, 0);
  const natMod = NATURE_MOD[nature] ?? {};

  const chainList = data?.chain ? flattenChain(data.chain) : [];
  const myStageIdx = chainList.findIndex((c) => c.id === mon.id);
  const stageLabel = chainList.length > 0
    ? `Stage ${Math.max(1, myStageIdx + 1)}/${chainList.length}`
    : "Stage 1/1";

  const types = [mon.type1, mon.type2].filter(Boolean) as string[];

  const moves: any[] = data?.pokemon?.moves ?? [];
  const movesByMethod = useMemo(() => {
    const buckets: Record<Tab, any[]> = { "level-up": [], machine: [], egg: [], tutor: [] };
    for (const m of moves) {
      const latest = m.version_group_details?.[m.version_group_details.length - 1];
      const method = latest?.move_learn_method?.name;
      if (method === "level-up") buckets["level-up"].push({ ...m, level: latest.level_learned_at });
      else if (method === "machine") buckets.machine.push(m);
      else if (method === "egg") buckets.egg.push(m);
      else if (method === "tutor") buckets.tutor.push(m);
    }
    buckets["level-up"].sort((a, b) => (a.level || 0) - (b.level || 0));
    return buckets;
  }, [moves]);

  const filteredMoves = useMemo(() => {
    const q = moveQuery.trim().toLowerCase();
    const list = movesByMethod[moveTab] ?? [];
    if (!q) return list;
    return list.filter((m) => m.move.name.toLowerCase().includes(q));
  }, [moveQuery, moveTab, movesByMethod]);

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      <div style={S.topBar}>
        <button style={S.iconBtn} onClick={onBack} aria-label="Back">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <div style={S.topTitle}>Crimson Sky Dex</div>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={S.iconBtn}>
            <i className="fa-solid fa-chevron-down" />
          </button>
          <button style={S.iconBtn}>
            <i className="fa-solid fa-ellipsis-vertical" />
          </button>
        </div>
      </div>

      <div style={S.scroll} ref={scrollRef}>
        <div style={{ height: 2, background: "linear-gradient(90deg, transparent, #ef4444, transparent)" }} />

        <div style={S.detailTopRow}>
          <button style={S.linkBack} onClick={onBack}>
            <i className="fa-solid fa-chevron-left" /> Back to Dex
          </button>
          <button style={S.homeBtn} onClick={onHome}>
            <i className="fa-solid fa-house" /> Home
          </button>
        </div>

        <div style={S.spriteCard}>
          <img
            src={spriteAniUrl(mon.sprite)}
            alt={mon.name}
            style={{ width: 200, height: 200, imageRendering: "pixelated", objectFit: "contain" }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = spriteUrl(mon.sprite);
            }}
          />
        </div>

        <div style={S.metaGrid}>
          <div style={S.metaItem}>
            <span style={S.metaLab}>Height:</span>
            <span style={S.metaVal}>{loading ? "…" : `${data?.height ?? "?"} m`}</span>
          </div>
          <div style={S.metaItem}>
            <span style={S.metaLab}>Weight:</span>
            <span style={S.metaVal}>{loading ? "…" : `${data?.weight ?? "?"} kg`}</span>
          </div>
          <div style={S.metaItem}>
            <span style={S.metaLab}>Base Experience:</span>
            <span style={S.metaVal}>{loading ? "…" : data?.baseExp ?? "?"}</span>
          </div>
          <div style={S.metaItem}>
            <span style={S.metaLab}>ID:</span>
            <span style={S.metaVal}>#{String(mon.id).padStart(3, "0")}</span>
          </div>
        </div>

        <div style={S.bigName}>{mon.name}</div>

        {chainList.length > 0 && (
          <div style={{ marginBottom: 14 }}>
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
                  <div key={c.id}>
                    <button
                      style={{
                        ...S.evoRow,
                        ...(c.id === mon.id ? S.evoRowActive : {}),
                      }}
                      onClick={() => onJump(c.id)}
                    >
                      <span style={{ color: c.id === mon.id ? "#fff" : "#9ca3af", fontSize: 12 }}>
                        #{String(c.id).padStart(3, "0")}
                      </span>
                      <span style={{ color: c.id === mon.id ? "#fff" : "#e5e7eb", fontSize: 14, fontWeight: 600, flex: 1 }}>
                        {c.name}
                      </span>
                      {c.id === mon.id && <i className="fa-solid fa-check" style={{ color: "#fff" }} />}
                    </button>
                    {i < chainList.length - 1 && (
                      <div style={{ textAlign: "center", color: "#6b7280", fontSize: 14, padding: "4px 0" }}>
                        ↓
                        {chainList[i + 1].trigger && (
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{chainList[i + 1].trigger}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {types.map((t) => (
            <span key={t} style={{ ...S.typePill, background: TYPE_COLORS[t] || "#666" }}>
              {t}
            </span>
          ))}
        </div>

        <div style={S.sectionHeader}>
          <i className="fa-solid fa-bullseye" style={{ color: "#ef4444" }} />
          <span style={{ fontSize: 18, fontWeight: 700 }}>Abilities</span>
          {data && (
            <span style={{ color: "#9ca3af", fontSize: 13 }}>({data.abilityDetails.length} abilities)</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {loading && <div style={S.loadingBox}>Loading abilities…</div>}
          {data?.abilityDetails.map((a: any, i: number) => (
            <div key={i} style={S.abilityCard}>
              <button style={S.abilityHead} onClick={() => setOpenAbility(openAbility === i ? null : i)}>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{a.name}</span>
                {a.is_hidden && <span style={S.hiddenPill}>Hidden</span>}
                <span style={{ flex: 1 }} />
                <i className={`fa-solid fa-chevron-${openAbility === i ? "up" : "down"}`} style={{ color: "#9ca3af" }} />
              </button>
              <div style={S.abilityDesc}>{a.short || a.full || "—"}</div>
            </div>
          ))}
        </div>
        <div style={S.tipBox}>
          <i className="fa-solid fa-lightbulb" style={{ color: "#fbbf24", marginRight: 6 }} />
          Tip: Click on an ability to see its full battle effects and description. Hidden abilities are marked with a red badge and are harder to obtain.
        </div>

        <div style={{ ...S.sectionHeader, marginTop: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Base Stats</span>
        </div>
        <div style={S.statsCard}>
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} style={S.statRow}>
              <div style={{ width: 90, color: "#9ca3af", fontSize: 13 }}>{v.label}</div>
              <div style={{ width: 36, color: "#fff", fontSize: 14, fontWeight: 600 }}>{v.base}</div>
              <div style={S.statBarBg}>
                <div
                  style={{
                    ...S.statBarFill,
                    width: `${Math.min(100, (v.base / 255) * 100)}%`,
                    background: STAT_BAR_COLORS[k],
                  }}
                />
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

        <div style={S.calcCard}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Stat Calculator</div>
          <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
            <label style={S.calcLab}>
              Lv:
              <select value={level} onChange={(e) => setLevel(Number(e.target.value))} style={S.calcInput}>
                {[1, 5, 25, 50, 75, 100].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
            <label style={S.calcLab}>
              Nature:
              <select value={nature} onChange={(e) => setNature(e.target.value)} style={S.calcInput}>
                {NATURES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>EVs: {510 - evLeft}/510</span>
            <span>Left: {evLeft}</span>
          </div>
          {Object.entries(stats).map(([k, v]) => {
            const isHP = k === "hp";
            const mult = isHP ? 1 : natMod.plus === k ? 1.1 : natMod.minus === k ? 0.9 : 1;
            const finalVal = calcStat(v.base, evs[k], ivs[k], level, isHP, mult);
            return (
              <div key={k} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: "#9ca3af", fontSize: 13 }}>
                    {v.label} <span style={{ fontSize: 11, color: "#6b7280" }}>({v.base})</span>
                    {natMod.plus === k && <span style={{ color: "#22c55e", marginLeft: 4 }}>+</span>}
                    {natMod.minus === k && <span style={{ color: "#ef4444", marginLeft: 4 }}>−</span>}
                  </span>
                  <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{finalVal}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ color: "#9ca3af", fontSize: 11 }}>EV</span>
                      <input
                        type="number"
                        min={0}
                        max={252}
                        value={evs[k]}
                        onChange={(e) => {
                          const n = Math.max(0, Math.min(252, Number(e.target.value) || 0));
                          setEvs({ ...evs, [k]: n });
                        }}
                        style={S.numInput}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={252}
                      value={evs[k]}
                      onChange={(e) => setEvs({ ...evs, [k]: Number(e.target.value) })}
                      className="range-red"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ color: "#9ca3af", fontSize: 11 }}>IV</span>
                      <input
                        type="number"
                        min={0}
                        max={31}
                        value={ivs[k]}
                        onChange={(e) => {
                          const n = Math.max(0, Math.min(31, Number(e.target.value) || 0));
                          setIvs({ ...ivs, [k]: n });
                        }}
                        style={S.numInput}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={31}
                      value={ivs[k]}
                      onChange={(e) => setIvs({ ...ivs, [k]: Number(e.target.value) })}
                      className="range-blue"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={S.smallBtn} onClick={() => setEvs({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 })}>
              Reset EVs
            </button>
            <button style={S.smallBtn} onClick={() => setIvs({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 })}>
              Max IVs
            </button>
            <button style={S.smallBtn} onClick={() => setIvs({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 })}>
              Min IVs
            </button>
          </div>
        </div>

        <div style={S.movesCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>⚔️</span>
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
          <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
            {(["level-up", "machine", "egg", "tutor"] as Tab[]).map((t) => {
              const lab = t === "level-up" ? "Level Up" : t === "machine" ? "TM/HM" : t === "egg" ? "Egg" : "Tutor";
              const count = movesByMethod[t]?.length ?? 0;
              const active = moveTab === t;
              return (
                <button
                  key={t}
                  style={{ ...S.tab, ...(active ? S.tabActive : {}) }}
                  onClick={() => setMoveTab(t)}
                >
                  {lab} <span style={{ color: active ? "#fff" : "#6b7280", marginLeft: 4 }}>({count})</span>
                </button>
              );
            })}
          </div>
          {loading && <div style={S.loadingBox}>Loading moves…</div>}
          {error && <div style={{ ...S.loadingBox, color: "#ef4444" }}>Failed to load: {error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredMoves.map((m: any, i: number) => (
              <div key={i} style={S.moveCard}>
                <div style={S.moveTopRow}>
                  {moveTab === "level-up" ? (
                    <span style={S.lvPill}>Lv {m.level}</span>
                  ) : (
                    <span style={{ ...S.lvPill, background: "#374151" }}>—</span>
                  )}
                  <span style={{ flex: 1, color: "#fff", fontSize: 15, fontWeight: 600 }}>
                    {fmtName(m.move.name)}
                  </span>
                  <span style={{ ...S.tagPill, background: "#374151", color: "#9ca3af", fontSize: 11 }}>
                    {moveTab === "machine" ? "Machine" : moveTab === "egg" ? "Egg" : moveTab === "tutor" ? "Tutor" : ""}
                  </span>
                </div>
              </div>
            ))}
            {!loading && filteredMoves.length === 0 && (
              <div style={{ color: "#6b7280", textAlign: "center", padding: 24, fontSize: 13 }}>
                No moves in this category.
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 30 }} />
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: {
    position: "absolute",
    inset: 0,
    background: "#0a0a0a",
    color: "#e5e7eb",
    fontFamily: "Inter, system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 14px",
    background: "#0a0a0a",
    borderBottom: "1px solid #1f1f1f",
    flexShrink: 0,
  },
  topTitle: { flex: 1, fontSize: 16, fontWeight: 600, color: "#fff" },
  iconBtn: {
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
    padding: 8,
    borderRadius: 6,
  },
  scroll: { flex: 1, overflowY: "auto", padding: "10px 14px 20px" },
  heroTitle: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 18,
    color: "#ef4444",
    textAlign: "center",
    margin: "16px 0 18px",
    letterSpacing: 1,
    textShadow: "2px 2px 0 #1a1a1a",
    lineHeight: 1.4,
  },
  searchWrap: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#fff",
    fontSize: 14,
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  card: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 12,
    padding: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    cursor: "pointer",
    color: "#fff",
    textAlign: "left",
  },
  cardId: { color: "#6b7280", fontSize: 12, marginBottom: 4 },
  cardSpriteBox: {
    background: "#0f0f0f",
    borderRadius: 8,
    height: 130,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  cardName: { color: "#e5e7eb", fontSize: 15, fontWeight: 500, textAlign: "center", paddingBottom: 4 },
  detailTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0 14px" },
  linkBack: {
    background: "transparent",
    border: "none",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: 0,
  },
  homeBtn: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  spriteCard: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 12,
    height: 230,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  metaGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 },
  metaItem: { display: "flex", gap: 6, alignItems: "baseline" },
  metaLab: { color: "#9ca3af", fontSize: 13 },
  metaVal: { color: "#fff", fontSize: 14, fontWeight: 500 },
  bigName: { fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 14 },
  evoBtn: {
    background: "transparent",
    border: "1px solid #ef4444",
    color: "#fff",
    padding: "6px 14px",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  evoPanel: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 12,
    padding: 14,
  },
  evoTitle: { color: "#9ca3af", fontSize: 12, marginBottom: 10 },
  evoRow: {
    width: "100%",
    background: "transparent",
    border: "none",
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#e5e7eb",
    textAlign: "left",
  },
  evoRowActive: { background: "#ef4444" },
  typePill: {
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    padding: "5px 14px",
    borderRadius: 16,
  },
  sectionHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "#fff" },
  abilityCard: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 12,
    padding: 14,
  },
  abilityHead: {
    width: "100%",
    background: "transparent",
    border: "none",
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    padding: 0,
    marginBottom: 6,
  },
  abilityDesc: { color: "#9ca3af", fontSize: 13, lineHeight: 1.5 },
  hiddenPill: {
    background: "#ef4444",
    color: "#fff",
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 10,
  },
  tipBox: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: 12,
    color: "#9ca3af",
    fontSize: 12,
    lineHeight: 1.5,
    marginBottom: 16,
  },
  statsCard: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  statRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  statBarBg: { flex: 1, height: 6, background: "#2a2a2a", borderRadius: 4, overflow: "hidden" },
  statBarFill: { height: "100%", borderRadius: 4 },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTop: "1px solid #2a2a2a",
    marginTop: 4,
  },
  calcCard: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  calcLab: { display: "flex", alignItems: "center", gap: 8, color: "#9ca3af", fontSize: 13 },
  calcInput: {
    background: "#0f0f0f",
    border: "1px solid #2a2a2a",
    color: "#fff",
    padding: "5px 8px",
    borderRadius: 6,
    fontSize: 13,
  },
  numInput: {
    background: "#0f0f0f",
    border: "1px solid #2a2a2a",
    color: "#fff",
    padding: "3px 6px",
    borderRadius: 4,
    fontSize: 12,
    width: 50,
    textAlign: "center",
  },
  smallBtn: {
    background: "#0f0f0f",
    border: "1px solid #2a2a2a",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
  },
  movesCard: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  tab: {
    background: "transparent",
    border: "none",
    color: "#9ca3af",
    padding: "8px 14px",
    borderRadius: 18,
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 600,
  },
  tabActive: { background: "#ef4444", color: "#fff" },
  moveCard: {
    background: "#0f0f0f",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: 12,
  },
  moveTopRow: { display: "flex", alignItems: "center", gap: 10 },
  lvPill: {
    background: "#ef4444",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 10,
  },
  tagPill: { padding: "3px 10px", borderRadius: 10, fontWeight: 500 },
  loadingBox: { color: "#9ca3af", textAlign: "center", padding: 16, fontSize: 13 },
};

const CSS = `
  .range-red { -webkit-appearance: none; appearance: none; height: 4px; background: #2a2a2a; border-radius: 2px; outline: none; }
  .range-red::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #ef4444; cursor: pointer; border: 2px solid #fff; }
  .range-red::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #ef4444; cursor: pointer; border: 2px solid #fff; }
  .range-blue { -webkit-appearance: none; appearance: none; height: 4px; background: #2a2a2a; border-radius: 2px; outline: none; }
  .range-blue::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #3b82f6; cursor: pointer; border: 2px solid #fff; }
  .range-blue::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #3b82f6; cursor: pointer; border: 2px solid #fff; }
`;
