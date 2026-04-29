// Real-asset audio playback layer (PokeRogue assets under /audio/).
// Plays HTMLAudioElement instances on demand; respects a global mute flag
// shared with the existing sfx module. Cries are looked up by national dex id.

let muted = false;
let masterVol = 0.7;
let sfxVol = 0.9;
let musicVol = 0.35;

export function _setMuted(m: boolean) {
  muted = m;
  if (musicEl) musicEl.muted = m;
}
export function _isMuted() {
  return muted;
}

export function setSfxVolume(v: number) {
  sfxVol = Math.max(0, Math.min(1, v));
}
export function setMusicVolume(v: number) {
  musicVol = Math.max(0, Math.min(1, v));
  if (musicEl) musicEl.volume = masterVol * musicVol;
}
export function setMasterVolume(v: number) {
  masterVol = Math.max(0, Math.min(1, v));
  if (musicEl) musicEl.volume = masterVol * musicVol;
}

const cache = new Map<string, HTMLAudioElement>();
function get(src: string): HTMLAudioElement {
  let a = cache.get(src);
  if (!a) {
    a = new Audio(src);
    a.preload = "auto";
    cache.set(src, a);
  }
  return a;
}

export function playFile(src: string, volMult = 1): boolean {
  if (muted) return true;
  try {
    const a = get(src);
    a.currentTime = 0;
    a.volume = Math.max(0, Math.min(1, masterVol * sfxVol * volMult));
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    return true;
  } catch {
    return false;
  }
}

// Pick a random one and play.
export function playFileRandom(srcs: string[], volMult = 1): boolean {
  if (!srcs.length) return false;
  return playFile(srcs[Math.floor(Math.random() * srcs.length)], volMult);
}

// Pokémon cry by national dex id (1..1200).
export function playCry(dexId: number, volMult = 1): boolean {
  if (!dexId || dexId < 1) return false;
  return playFile(`/audio/cry/${dexId}.m4a`, volMult);
}

// --- Background music (singleton) ---
let musicEl: HTMLAudioElement | null = null;
let currentTrack: string | null = null;

export function playMusic(track: string, opts: { loop?: boolean; volume?: number } = {}) {
  const src = `/audio/bgm/${track}.mp3`;
  if (currentTrack === track && musicEl && !musicEl.paused) return;
  stopMusic();
  const a = new Audio(src);
  a.loop = opts.loop ?? true;
  a.volume = masterVol * musicVol * (opts.volume ?? 1);
  a.muted = muted;
  musicEl = a;
  currentTrack = track;
  const p = a.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

export function stopMusic() {
  if (musicEl) {
    try {
      musicEl.pause();
      musicEl.currentTime = 0;
    } catch {}
  }
  musicEl = null;
  currentTrack = null;
}

export function isMusicPlaying() {
  return !!musicEl && !musicEl.paused;
}

// --- Move SFX, picked by name with type fallback ---
const MOVE_FILES: Record<string, string> = {
  // exact matches (a tiny subset that exist as standalone files)
  Slash: "/audio/battle_anims/Slash.m4a",
  "Mega Punch": "/audio/battle_anims/Mega Punch.m4a",
  "Comet Punch": "/audio/battle_anims/Comet Punch.m4a",
  "Dizzy Punch": "/audio/battle_anims/Dizzy Punch.m4a",
  "Vice Grip": "/audio/battle_anims/Vice Grip.m4a",
  Whirlwind: "/audio/battle_anims/Whirlwind.m4a",
  Gust: "/audio/battle_anims/gust.m4a",
  Earthquake: "/audio/battle_anims/PRSFX- Earthquake.wav",
  Thunderbolt: "/audio/battle_anims/PRSFX- Thunderbolt1.wav",
  "Thunder Shock": "/audio/battle_anims/PRSFX- Thundershock.wav",
  Thunder: "/audio/battle_anims/PRSFX- Thunder.wav",
  "Thunder Wave": "/audio/battle_anims/PRSFX- Thunder Wave.wav",
  "Ice Beam": "/audio/battle_anims/PRSFX- Ice Beam.wav",
  Psybeam: "/audio/battle_anims/PRSFX- Psybeam.wav",
  Confusion: "/audio/battle_anims/PRSFX- Psychic.wav",
  "Razor Leaf": "/audio/battle_anims/PRSFX- Razor Leaf1.wav",
  "Vine Whip": "/audio/battle_anims/PRSFX- Razor Leaf2.wav",
  "Solar Beam": "/audio/battle_anims/PRSFX- Solar Beam2.wav",
  "Sleep Powder": "/audio/battle_anims/PRSFX- Poison Powder.wav",
  Ember: "/audio/battle_anims/Fire1.m4a",
  Flamethrower: "/audio/battle_anims/Fire2.m4a",
  "Fire Blast": "/audio/battle_anims/PRSFX- Fire Blast.wav",
  "Water Gun": "/audio/battle_anims/PRSFX- Water Gun.wav",
  "Bubble Beam": "/audio/battle_anims/PRSFX- Bubblebeam.wav",
  Surf: "/audio/battle_anims/Water1.m4a",
  "Hydro Pump": "/audio/battle_anims/Water3.m4a",
  Withdraw: "/audio/battle_anims/Water5.m4a",
  "Wing Attack": "/audio/battle_anims/PRSFX- Wing Attack1.wav",
  "Air Slash": "/audio/battle_anims/PRSFX- Air Slash1.wav",
  Tailwind: "/audio/battle_anims/PRSFX- Tailwind.wav",
  "Sand Attack": "/audio/battle_anims/PRSFX- Sand Attack.wav",
  "Poison Sting": "/audio/battle_anims/PRSFX- Poison Sting.wav",
  "Poison Powder": "/audio/battle_anims/PRSFX- Poison Powder.wav",
  "Poison Jab": "/audio/battle_anims/PRSFX- Poison Jab1.wav",
  "Pin Missile": "/audio/battle_anims/PRSFX- Bug Bite.wav",
  Twineedle: "/audio/battle_anims/PRSFX- Bug Bite.wav",
  "String Shot": "/audio/battle_anims/PRSFX- Bug Buzz.wav",
  "Dragon Rage": "/audio/battle_anims/PRSFX- Dragon Rage.wav",
  "Quick Attack": "/audio/battle_anims/PRSFX- Quick Attack.wav",
  "Hyper Fang": "/audio/battle_anims/PRSFX- Bite.wav",
  "Super Fang": "/audio/battle_anims/PRSFX- Bite.wav",
  Bite: "/audio/battle_anims/PRSFX- Bite.wav",
  Tackle: "/audio/battle_anims/Damage1.m4a",
  Scratch: "/audio/battle_anims/Damage1.m4a",
  Agility: "/audio/battle_anims/PRSFX- Quick Attack.wav",
  Harden: "/audio/battle_anims/Damage1.m4a",
  Protect: "/audio/battle_anims/Damage1.m4a",
};

const TYPE_FALLBACK: Record<string, string[]> = {
  normal: ["/audio/battle_anims/Damage1.m4a", "/audio/battle_anims/Slash.m4a"],
  fire: ["/audio/battle_anims/Fire1.m4a", "/audio/battle_anims/Fire2.m4a", "/audio/battle_anims/Fire3.m4a", "/audio/battle_anims/Fire4.m4a"],
  water: ["/audio/battle_anims/Water1.m4a", "/audio/battle_anims/Water2.m4a", "/audio/battle_anims/Water3.m4a"],
  grass: ["/audio/battle_anims/PRSFX- Razor Leaf1.wav", "/audio/battle_anims/PRSFX- Razor Leaf2.wav", "/audio/battle_anims/PRSFX- Magical Leaf1.wav"],
  electric: ["/audio/battle_anims/Thunder1.m4a", "/audio/battle_anims/Thunder3.m4a", "/audio/battle_anims/PRSFX- Thundershock.wav"],
  ice: ["/audio/battle_anims/Ice2.m4a", "/audio/battle_anims/Ice5.m4a", "/audio/battle_anims/PRSFX- Powder Snow1.wav"],
  psychic: ["/audio/battle_anims/PRSFX- Psychic.wav", "/audio/battle_anims/PRSFX- Psybeam.wav"],
  flying: ["/audio/battle_anims/Wind1.m4a", "/audio/battle_anims/gust.m4a", "/audio/battle_anims/PRSFX- Wing Attack1.wav"],
  ground: ["/audio/battle_anims/Earth1.m4a", "/audio/battle_anims/Earth3.m4a", "/audio/battle_anims/PRSFX- Earthquake1.wav"],
  poison: ["/audio/battle_anims/Poison.m4a", "/audio/battle_anims/PRSFX- Poison.wav"],
  bug: ["/audio/battle_anims/PRSFX- Bug Buzz.wav", "/audio/battle_anims/PRSFX- Bug Bite.wav"],
  dragon: ["/audio/battle_anims/PRSFX- Dragon Breath.wav", "/audio/battle_anims/PRSFX- Dragon Pulse.wav"],
  rock: ["/audio/battle_anims/PRSFX- Rock Blast.wav", "/audio/battle_anims/Earth1.m4a"],
  dark: ["/audio/battle_anims/PRSFX- Bite.wav", "/audio/battle_anims/PRSFX- Night Slash1.wav"],
  ghost: ["/audio/battle_anims/PRSFX- Ominous Wind.wav"],
  steel: ["/audio/battle_anims/PRSFX- Bullet Punch.wav", "/audio/battle_anims/Damage1.m4a"],
  fighting: ["/audio/battle_anims/PRSFX- Mach Punch.wav", "/audio/battle_anims/PRSFX- Mega Punch1.wav"],
  fairy: ["/audio/battle_anims/PRSFX- Fairy Wind.wav", "/audio/battle_anims/PRSFX- Moonblast1.wav"],
};

export function playMoveByName(move: string, type: string): boolean {
  const exact = MOVE_FILES[move];
  if (exact) return playFile(exact, 0.9);
  const list = TYPE_FALLBACK[type.toLowerCase()];
  if (list && list.length) return playFileRandom(list, 0.9);
  return false;
}
