let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext {
  if (!ctx) {
    const W = window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    ctx = new (W.AudioContext || W.webkitAudioContext!)();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.08, when = 0) {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur);
}

function slide(f1: number, f2: number, dur: number, type: OscillatorType = "square", vol = 0.08) {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur);
}

function noise(dur: number, vol = 0.08, filterFreq = 2000) {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filt = a.createBiquadFilter();
  filt.type = "lowpass"; filt.frequency.value = filterFreq;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(filt); filt.connect(g); g.connect(a.destination);
  src.start(t0);
}

function seq(notes: { f: number; d: number; t?: OscillatorType; v?: number; gap?: number }[]) {
  let delay = 0;
  for (const n of notes) {
    const f = n.f, d = n.d, t = n.t ?? "square", v = n.v ?? 0.08;
    setTimeout(() => tone(f, d, t, v), delay);
    delay += (n.gap ?? d * 1000);
  }
}

export const sfx = {
  setMuted(m: boolean) { muted = m; },
  isMuted() { return muted; },
  click: () => tone(880, 0.04, "square", 0.04),
  menuOpen: () => seq([{ f: 660, d: 0.05 }, { f: 990, d: 0.05 }]),
  menuBack: () => seq([{ f: 660, d: 0.05 }, { f: 440, d: 0.05 }]),
  hit: () => { noise(0.08, 0.06, 1500); slide(220, 110, 0.1, "square", 0.05); },
  hurt: () => slide(330, 130, 0.18, "square", 0.07),
  faint: () => slide(440, 60, 0.7, "sawtooth", 0.09),
  ballThrow: () => slide(220, 660, 0.15, "triangle", 0.06),
  ballWobble: () => tone(440, 0.08, "square", 0.05),
  catchSuccess: () => seq([{ f: 523, d: 0.12 }, { f: 659, d: 0.12 }, { f: 784, d: 0.12 }, { f: 1047, d: 0.2 }]),
  catchFail: () => seq([{ f: 440, d: 0.1 }, { f: 220, d: 0.2, t: "sawtooth" }]),
  levelUp: () => seq([{ f: 523, d: 0.1, t: "triangle", v: 0.1 }, { f: 659, d: 0.1, t: "triangle", v: 0.1 }, { f: 784, d: 0.1, t: "triangle", v: 0.1 }, { f: 1047, d: 0.18, t: "triangle", v: 0.1 }]),
  victory: () => seq([{ f: 523, d: 0.12 }, { f: 659, d: 0.12 }, { f: 784, d: 0.12 }, { f: 1047, d: 0.12 }, { f: 1319, d: 0.25 }]),
  evolve: () => { for (let i = 0; i < 10; i++) setTimeout(() => tone(330 + i * 50, 0.08, "triangle", 0.06), i * 90); },
  // Move-type sounds
  moveNormal: () => { noise(0.05, 0.05, 2500); tone(440, 0.04, "square", 0.05); },
  moveFire: () => { noise(0.25, 0.07, 1200); slide(110, 55, 0.25, "sawtooth", 0.05); },
  moveWater: () => slide(880, 220, 0.3, "sine", 0.07),
  moveGrass: () => { noise(0.15, 0.05, 800); tone(660, 0.1, "triangle", 0.05); },
  moveElectric: () => { for (let i = 0; i < 4; i++) setTimeout(() => tone(1500 + Math.random() * 500, 0.04, "square", 0.06), i * 40); },
  moveIce: () => seq([{ f: 1320, d: 0.06, t: "sine" }, { f: 1760, d: 0.06, t: "sine" }, { f: 2200, d: 0.1, t: "sine" }]),
  movePsychic: () => slide(330, 1320, 0.4, "sine", 0.06),
  moveFlying: () => { noise(0.2, 0.05, 3000); slide(660, 1100, 0.2, "triangle", 0.05); },
  moveGround: () => { noise(0.35, 0.1, 200); slide(110, 40, 0.35, "sawtooth", 0.07); },
  movePoison: () => slide(220, 110, 0.3, "sawtooth", 0.05),
  moveBug: () => { for (let i = 0; i < 5; i++) setTimeout(() => tone(800 + i * 80, 0.03, "square", 0.04), i * 30); },
  moveDragon: () => { noise(0.3, 0.08, 600); slide(220, 660, 0.3, "sawtooth", 0.06); },
};

export const MOVE_TYPE: Record<string, string> = {
  Tackle: "normal", Scratch: "normal", Slash: "normal", "Quick Attack": "normal",
  "Hyper Fang": "normal", "Super Fang": "normal", Bite: "normal",
  "Vine Whip": "grass", "Razor Leaf": "grass", "Sleep Powder": "grass", "Solar Beam": "grass",
  Ember: "fire", Flamethrower: "fire", "Fire Blast": "fire",
  "Water Gun": "water", "Bubble Beam": "water", Surf: "water", "Hydro Pump": "water", Withdraw: "water",
  "Thunder Shock": "electric", Thunderbolt: "electric", Thunder: "electric", "Thunder Wave": "electric",
  Gust: "flying", "Wing Attack": "flying", "Air Slash": "flying", Tailwind: "flying",
  "Sand Attack": "ground", Earthquake: "ground",
  "Poison Sting": "poison", "Poison Powder": "poison", "Poison Jab": "poison",
  "Pin Missile": "bug", Twineedle: "bug", "String Shot": "bug",
  Confusion: "psychic", Psybeam: "psychic",
  "Ice Beam": "ice",
  "Dragon Rage": "dragon",
  Agility: "normal", Harden: "normal", Protect: "normal",
};

export const TYPE_COLOR: Record<string, string> = {
  normal: "#A8A878", grass: "#78C850", fire: "#F08030", water: "#6890F0",
  electric: "#F8D030", flying: "#A890F0", ground: "#E0C068", poison: "#A040A0",
  bug: "#A8B820", psychic: "#F85888", ice: "#98D8D8", dragon: "#7038F8",
};

export function moveTypeOf(move: string): string {
  return MOVE_TYPE[move] ?? "normal";
}

// ===== Background Music (procedural chiptune) =====
type Note = { f: number; d: number; v?: number; t?: OscillatorType };
type Track = { name: string; bpm: number; lead: Note[]; bass: Note[]; leadType?: OscillatorType; bassType?: OscillatorType };

// Note frequencies
const N = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50, D6: 1174.66, E6: 1318.51, R: 0,
};

// d = beats (1 = quarter note)
const TRACKS: Track[] = [
  {
    name: "Route Adventure", bpm: 140, leadType: "square", bassType: "triangle",
    lead: [
      { f: N.E5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.A5, d: 1 }, { f: N.G5, d: 0.5 }, { f: N.E5, d: 0.5 },
      { f: N.D5, d: 1 }, { f: N.C5, d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.E5, d: 1 }, { f: N.A4, d: 1 },
      { f: N.E5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.A5, d: 1 }, { f: N.B5, d: 0.5 }, { f: N.A5, d: 0.5 },
      { f: N.G5, d: 1 }, { f: N.E5, d: 1 }, { f: N.D5, d: 1 }, { f: N.C5, d: 1 },
    ],
    bass: [
      { f: N.A3, d: 1 }, { f: N.E3, d: 1 }, { f: N.A3, d: 1 }, { f: N.E3, d: 1 },
      { f: N.F3, d: 1 }, { f: N.C3, d: 1 }, { f: N.G3, d: 1 }, { f: N.D3, d: 1 },
      { f: N.A3, d: 1 }, { f: N.E3, d: 1 }, { f: N.A3, d: 1 }, { f: N.E3, d: 1 },
      { f: N.F3, d: 1 }, { f: N.C3, d: 1 }, { f: N.G3, d: 1 }, { f: N.E3, d: 1 },
    ],
  },
  {
    name: "Pallet Calm", bpm: 100, leadType: "triangle", bassType: "sine",
    lead: [
      { f: N.G4, d: 1 }, { f: N.A4, d: 0.5 }, { f: N.B4, d: 0.5 }, { f: N.C5, d: 1 }, { f: N.D5, d: 1 },
      { f: N.E5, d: 1 }, { f: N.D5, d: 0.5 }, { f: N.C5, d: 0.5 }, { f: N.B4, d: 1 }, { f: N.G4, d: 1 },
      { f: N.A4, d: 1 }, { f: N.B4, d: 0.5 }, { f: N.C5, d: 0.5 }, { f: N.D5, d: 1 }, { f: N.E5, d: 1 },
      { f: N.G5, d: 2 }, { f: N.E5, d: 1 }, { f: N.D5, d: 1 },
    ],
    bass: [
      { f: N.C3, d: 2 }, { f: N.G3, d: 2 },
      { f: N.A3, d: 2 }, { f: N.E3, d: 2 },
      { f: N.F3, d: 2 }, { f: N.C3, d: 2 },
      { f: N.G3, d: 2 }, { f: N.C3, d: 2 },
    ],
  },
  {
    name: "Battle Rush", bpm: 165, leadType: "square", bassType: "sawtooth",
    lead: [
      { f: N.A4, d: 0.5 }, { f: N.A4, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.A4, d: 0.5 },
      { f: N.B4, d: 0.5 }, { f: N.B4, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.B4, d: 0.5 },
      { f: N.C5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.A5, d: 1 }, { f: N.G5, d: 0.5 }, { f: N.E5, d: 0.5 },
      { f: N.A5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.C5, d: 1 },
      { f: N.A4, d: 0.5 }, { f: N.A4, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.A4, d: 0.5 },
      { f: N.G4, d: 0.5 }, { f: N.G4, d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.G4, d: 0.5 },
    ],
    bass: [
      { f: N.A3, d: 0.5 }, { f: N.A3, d: 0.5 }, { f: N.A3, d: 0.5 }, { f: N.A3, d: 0.5 },
      { f: N.B3, d: 0.5 }, { f: N.B3, d: 0.5 }, { f: N.B3, d: 0.5 }, { f: N.B3, d: 0.5 },
      { f: N.C4, d: 0.5 }, { f: N.C4, d: 0.5 }, { f: N.A3, d: 0.5 }, { f: N.A3, d: 0.5 },
      { f: N.E3, d: 0.5 }, { f: N.E3, d: 0.5 }, { f: N.A3, d: 0.5 }, { f: N.A3, d: 0.5 },
      { f: N.A3, d: 0.5 }, { f: N.A3, d: 0.5 }, { f: N.A3, d: 0.5 }, { f: N.A3, d: 0.5 },
      { f: N.G3, d: 0.5 }, { f: N.G3, d: 0.5 }, { f: N.G3, d: 0.5 }, { f: N.G3, d: 0.5 },
    ],
  },
  {
    name: "Mystic Cave", bpm: 90, leadType: "triangle", bassType: "sine",
    lead: [
      { f: N.A4, d: 1 }, { f: N.C5, d: 1 }, { f: N.E5, d: 1 }, { f: N.D5, d: 1 },
      { f: N.C5, d: 1 }, { f: N.A4, d: 1 }, { f: N.G4, d: 2 },
      { f: N.A4, d: 1 }, { f: N.C5, d: 1 }, { f: N.E5, d: 1 }, { f: N.G5, d: 1 },
      { f: N.F5, d: 1 }, { f: N.E5, d: 1 }, { f: N.C5, d: 2 },
    ],
    bass: [
      { f: N.A3, d: 2 }, { f: N.E3, d: 2 },
      { f: N.F3, d: 2 }, { f: N.C3, d: 2 },
      { f: N.A3, d: 2 }, { f: N.E3, d: 2 },
      { f: N.D3, d: 2 }, { f: N.A3, d: 2 },
    ],
  },
  {
    name: "Champion Theme", bpm: 150, leadType: "square", bassType: "triangle",
    lead: [
      { f: N.C5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.C6, d: 1 }, { f: N.G5, d: 0.5 },
      { f: N.A5, d: 1 }, { f: N.G5, d: 1 }, { f: N.E5, d: 1 }, { f: N.C5, d: 1 },
      { f: N.D5, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.A5, d: 0.5 }, { f: N.D6, d: 1 }, { f: N.A5, d: 0.5 },
      { f: N.B5, d: 1 }, { f: N.A5, d: 1 }, { f: N.G5, d: 2 },
    ],
    bass: [
      { f: N.C3, d: 1 }, { f: N.G3, d: 1 }, { f: N.C3, d: 1 }, { f: N.G3, d: 1 },
      { f: N.A3, d: 1 }, { f: N.E3, d: 1 }, { f: N.F3, d: 1 }, { f: N.C3, d: 1 },
      { f: N.D3, d: 1 }, { f: N.A3, d: 1 }, { f: N.D3, d: 1 }, { f: N.A3, d: 1 },
      { f: N.G3, d: 1 }, { f: N.D3, d: 1 }, { f: N.G3, d: 2 },
    ],
  },
];

let bgmTimer: number | null = null;
let bgmActive = false;
let bgmTrackIdx = -1;
let bgmGain: GainNode | null = null;

function playNoteRaw(freq: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode, when: number) {
  if (freq <= 0) return;
  const a = ac();
  const t0 = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  g.gain.linearRampToValueAtTime(vol * 0.6, t0 + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function playTrackOnce(track: Track) {
  if (muted || !bgmActive) return;
  const a = ac();
  if (!bgmGain) {
    bgmGain = a.createGain();
    bgmGain.gain.value = 0.35;
    bgmGain.connect(a.destination);
  }
  const beatSec = 60 / track.bpm;
  let leadT = 0;
  for (const n of track.lead) {
    const dur = n.d * beatSec * 0.95;
    playNoteRaw(n.f, dur, track.leadType ?? "square", (n.v ?? 0.05), bgmGain, leadT);
    leadT += n.d * beatSec;
  }
  let bassT = 0;
  for (const n of track.bass) {
    const dur = n.d * beatSec * 0.95;
    playNoteRaw(n.f, dur, track.bassType ?? "triangle", (n.v ?? 0.04), bgmGain, bassT);
    bassT += n.d * beatSec;
  }
  const total = Math.max(leadT, bassT) * 1000;
  bgmTimer = window.setTimeout(() => {
    if (bgmActive) playTrackOnce(track);
  }, total);
}

export const bgm = {
  pickRandom() {
    bgmTrackIdx = Math.floor(Math.random() * TRACKS.length);
    return TRACKS[bgmTrackIdx].name;
  },
  start() {
    if (bgmActive) return;
    if (bgmTrackIdx < 0) bgm.pickRandom();
    bgmActive = true;
    playTrackOnce(TRACKS[bgmTrackIdx]);
  },
  stop() {
    bgmActive = false;
    if (bgmTimer != null) { clearTimeout(bgmTimer); bgmTimer = null; }
    if (bgmGain) {
      try { bgmGain.disconnect(); } catch {}
      bgmGain = null;
    }
  },
  setVolume(v: number) {
    if (bgmGain) bgmGain.gain.value = Math.max(0, Math.min(1, v));
  },
  current() { return bgmTrackIdx >= 0 ? TRACKS[bgmTrackIdx].name : ""; },
};

export function playMoveSfx(move: string) {
  const t = moveTypeOf(move);
  const map: Record<string, () => void> = {
    fire: sfx.moveFire, water: sfx.moveWater, grass: sfx.moveGrass,
    electric: sfx.moveElectric, ice: sfx.moveIce, psychic: sfx.movePsychic,
    flying: sfx.moveFlying, ground: sfx.moveGround, poison: sfx.movePoison,
    bug: sfx.moveBug, dragon: sfx.moveDragon, normal: sfx.moveNormal,
  };
  (map[t] ?? sfx.moveNormal)();
}
