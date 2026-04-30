// Comprehensive move-name → Pokemon-type lookup.
//
// Why this exists: the original `MOVE_TYPE` map in `sfx.ts` only covered
// ~50 mostly Gen 1 moves, so most modern moves (Sucker Punch, Spectral
// Thief, Close Combat, etc.) fell back to "normal" and the Moveset tab in
// the Pokemon details screen showed every move as Normal. This module
// owns the full mapping and is re-exported through `sfx.ts` so all existing
// call sites keep working.

// Normalize move names for lookup: lowercase + strip every non-alphanumeric
// char. Handles punctuation/spacing variants like "U-turn" vs "U Turn",
// "Will-O-Wisp" vs "Will O Wisp", "Self-Destruct" vs "Self Destruct".
function norm(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Full type palette (all 18 Pokemon types). The original `TYPE_COLOR` was
// missing 6 types so badges for fighting/rock/ghost/dark/steel/fairy moves
// rendered grey. These are the standard Bulbapedia colors.
export const TYPE_COLOR: Record<string, string> = {
  normal:   "#A8A878",
  fire:     "#F08030",
  water:    "#6890F0",
  grass:    "#78C850",
  electric: "#F8D030",
  ice:      "#98D8D8",
  fighting: "#C03028",
  poison:   "#A040A0",
  ground:   "#E0C068",
  flying:   "#A890F0",
  psychic:  "#F85888",
  bug:      "#A8B820",
  rock:     "#B8A038",
  ghost:    "#705898",
  dragon:   "#7038F8",
  dark:     "#705848",
  steel:    "#B8B8D0",
  fairy:    "#EE99AC",
};

// Master move → type table. Keys are the human-readable move names exactly
// as they appear in `pokemon-data.ts` and `tm-data.ts` (we normalize at
// lookup time so punctuation differences don't matter).
const MOVE_TYPE_RAW: Record<string, string> = {
  // --- Normal ---
 "Tackle": "normal", "Scratch": "normal", "Slash": "normal", "Pound": "normal",
 "Headbutt": "normal", "Body Slam": "normal", "Double Edge": "normal", "Take Down": "normal",
 "Quick Attack": "normal", "Extreme Speed": "normal", "Hyper Fang": "normal", "Super Fang": "normal",
 "Hyper Beam": "normal", "Giga Impact": "normal", "Hyper Voice": "normal", "Boomburst": "normal",
 "Echoed Voice": "normal", "Round": "normal", "Uproar": "normal", "Snore": "normal",
 "Sing": "normal", "Supersonic": "normal", "Sonic Boom": "normal", "Tri Attack": "normal",
 "Swift": "normal", "Comet Punch": "normal", "Mega Punch": "normal", "Mega Kick": "normal",
 "Dizzy Punch": "normal", "Skull Bash": "normal", "Slam": "normal", "Stomp": "normal",
 "Strength": "normal", "Wrap": "normal", "Bind": "normal", "Constrict": "normal",
 "Fury Attack": "normal", "Fury Swipes": "normal", "Pin Missile": "normal",
 "Double Slap": "normal", "Double Hit": "normal", "Spike Cannon": "normal", "Tail Slap": "normal",
 "Barrage": "normal", "Egg Bomb": "normal", "Cut": "normal", "Vice Grip": "normal",
 "Horn Attack": "normal", "Horn Drill": "normal", "Guillotine": "normal", "Bide": "normal",
 "Crush Claw": "normal", "Crush Grip": "normal", "Wring Out": "normal", "Chip Away": "normal",
 "Endeavor": "normal", "Flail": "normal", "Reversal": "normal",
 "Last Resort": "normal", "False Swipe": "normal", "Facade": "normal", "Return": "normal",
 "Frustration": "normal", "Hidden Power": "normal", "Weather Ball": "normal",
 "Self Destruct": "normal", "Explosion": "normal", "Pay Day": "normal",
 "Present": "normal", "Natural Gift": "normal", "Nature Power": "normal", "Trump Card": "normal",
 "Techno Blast": "normal", "Multi Attack": "normal", "Judgment": "normal", "Tera Starstorm": "normal",
 "Terrain Pulse": "normal", "Revelation Dance": "normal", "Population Bomb": "normal",
 "Hyper Drill": "normal", "Head Charge": "normal", "Rage": "normal", "Thrash": "normal",
 "Spit Up": "normal", "Stockpile": "normal", "Swallow": "normal", "Mean Look": "normal",
 "Block": "normal", "Smelling Salts": "normal", "Razor Wind": "normal", "Rock Climb": "normal",
 "Splash": "normal", "Rest": "psychic", "Sleep Talk": "normal", 
  // --- Normal status ---
 "Growl": "normal", "Leer": "normal", "Tail Whip": "normal", "Roar": "normal",
 "Whirlwind": "normal", "Sand Attack": "ground", "Smokescreen": "normal", "Flash": "normal",
 "Glare": "normal", "Scary Face": "normal", "Lock On": "normal",
 "Mind Reader": "normal", "Foresight": "normal", "Odor Sleuth": "normal",
 "Defense Curl": "normal", "Harden": "normal", "Withdraw": "water", "Sharpen": "normal",
 "Minimize": "normal", "Double Team": "normal", "Focus Energy": "normal",
 "Mimic": "normal", "Sketch": "normal", "Transform": "normal", "Conversion": "normal",
 "Conversion 2": "normal", "Reflect Type": "normal", "Camouflage": "normal",
 "Disable": "normal", "Encore": "normal", "Endure": "normal", "Protect": "normal",
 "Detect": "fighting", "Recover": "normal", "Soft Boiled": "normal", "Milk Drink": "normal",
 "Slack Off": "normal", "Refresh": "normal", "Heal Bell": "normal", "Aromatherapy": "grass",
 "Substitute": "normal", "Pain Split": "normal", "Heart Swap": "psychic",
 "Belly Drum": "normal", "Swords Dance": "normal", "Howl": "normal", "Work Up": "normal",
 "Growth": "normal", "Charge": "electric", "Acupressure": "normal", "Heal Order": "bug",
 "Defend Order": "bug", "Attack Order": "bug", "Stuff Cheeks": "normal",
 "Tail Glow": "bug", "Tidy Up": "normal", "Shed Tail": "normal", "Fillet Away": "normal",
 "Take Heart": "psychic", "Doodle": "normal", "Revival Blessing": "normal",
 "Helping Hand": "normal", "Follow Me": "normal", "Rage Powder": "bug", "Spotlight": "normal",
 "After You": "normal", "Quash": "dark", "Bestow": "normal", "Recycle": "normal",
 "Court Change": "normal", "Heart Stamp": "psychic", "Snatch": "dark",
 "Switcheroo": "dark", "Trick": "psychic", "Role Play": "psychic", "Skill Swap": "psychic",
 "Power Trick": "psychic", "Power Split": "psychic", "Power Swap": "psychic",
 "Guard Split": "psychic", "Guard Swap": "psychic", "Speed Swap": "psychic",
 "Floral Healing": "fairy", "Heal Pulse": "psychic", "Wish": "normal", "Healing Wish": "psychic",
 "Lunar Dance": "psychic", "Lunar Blessing": "psychic", "Jungle Healing": "grass",
 "Life Dew": "water", "Strength Sap": "grass", "Shore Up": "ground",
 "Morning Sun": "normal", "Moonlight": "fairy", "Synthesis": "grass",
 "Sweet Scent": "normal", "Sweet Kiss": "fairy", "Lovely Kiss": "normal",
 "Captivate": "normal", "Attract": "normal", "Charm": "fairy", "Baby Doll Eyes": "fairy",
 "Tearful Look": "normal", "Play Nice": "normal", "Confide": "normal", "Noble Roar": "normal",
 "Tickle": "normal", "Fake Tears": "dark", "Metal Sound": "steel",
 "Screech": "normal", "Eerie Impulse": "electric", "Tar Shot": "rock", "Memento": "dark",
 "Final Gambit": "fighting", "Perish Song": "normal", "Destiny Bond": "ghost",
 "Grudge": "ghost", "Curse": "ghost", "Spite": "ghost", "Imprison": "psychic",
 "Embargo": "dark", "Heal Block": "psychic", "Magic Room": "psychic", "Wonder Room": "psychic",
 "Trick Room": "psychic", "Telekinesis": "psychic", "Magnet Rise": "electric",
 "Gravity": "psychic", "Ion Deluge": "electric", "Electrify": "electric",
 "Soak": "water", "Magic Powder": "psychic", "Forests Curse": "grass",
 "Trick Or Treat": "ghost", "Topsy Turvy": "dark", "Reflect": "psychic",
 "Light Screen": "psychic", "Aurora Veil": "ice", "Mist": "ice", "Safeguard": "normal",
 "Lucky Chant": "normal", "Tailwind": "flying", "Rain Dance": "water", "Sunny Day": "fire",
 "Hail": "ice", "Snowscape": "ice", "Sandstorm": "rock", "Mud Sport": "ground",
 "Water Sport": "water", "Stealth Rock": "rock", "Spikes": "ground", "Toxic Spikes": "poison",
 "Sticky Web": "bug", "Spider Web": "bug", "String Shot": "bug", "Cotton Spore": "grass",
 "Cotton Guard": "grass", "Aqua Ring": "water", "Ingrain": "grass",
 "Leech Seed": "grass", "Toxic": "poison", "Poison Powder": "poison", "Poison Gas": "poison",
 "Sleep Powder": "grass", "Stun Spore": "grass", "Spore": "grass", "Hypnosis": "psychic",
 "Yawn": "normal", "Thunder Wave": "electric", "Will O Wisp": "fire",
 "Confuse Ray": "ghost", "Worry Seed": "grass",
 "Gastro Acid": "poison", "Defog": "flying", "Haze": "ice", "Clear Smog": "poison",
 "Dragon Dance": "dragon", "Quiver Dance": "bug", "Calm Mind": "psychic",
 "Bulk Up": "fighting", "Nasty Plot": "dark", "Cosmic Power": "psychic",
 "Hone Claws": "dark", "Coil": "poison", "Iron Defense": "steel", "Acid Armor": "poison",
 "Barrier": "psychic", "Magic Coat": "psychic", "Counter": "fighting",
 "Mirror Coat": "psychic", "Metal Burst": "steel", "Comeuppance": "dark",
 "Revenge": "fighting", "Avalanche": "ice", "Payback": "dark", "Assurance": "dark",
 "Sucker Punch": "dark", "Pursuit": "dark", "Punishment": "dark", "Power Trip": "dark",
 "Stored Power": "psychic", "Hex": "ghost", "Venoshock": "poison", "Wake Up Slap": "fighting",
 "Acrobatics": "flying", "Knock Off": "dark",
 "Thief": "dark", "Fling": "dark", "Belch": "poison",
 "Magnet Bomb": "steel", "Mirror Shot": "steel", 
 "Future Sight": "psychic", "Doom Desire": "steel", 
 "Smart Strike": "steel", "Anchor Shot": "steel", "Spirit Shackle": "ghost",
 "Octolock": "fighting", "Jaw Lock": "dark", "Salt Cure": "rock",
 "Order Up": "dragon", "Power Up Punch": "fighting", "Hold Hands": "normal",
 "Celebrate": "normal", "Happy Hour": "normal", 
 "Magnetic Flux": "electric", "Gear Up": "steel", "Ally Switch": "psychic",

  // --- Fire ---
 "Ember": "fire", "Flamethrower": "fire", "Fire Blast": "fire", "Fire Spin": "fire",
 "Heat Wave": "fire", "Eruption": "fire", "Inferno": "fire", "Sacred Fire": "fire",
 "Blue Flare": "fire", "Mystical Fire": "fire", "Searing Shot": "fire",
 "Lava Plume": "fire", "Flame Burst": "fire", "Flame Charge": "fire", "Flame Wheel": "fire",
 "Fire Punch": "fire", "Fire Fang": "fire", "Fire Lash": "fire", "Pyro Ball": "fire",
 "Flare Blitz": "fire", "Burn Up": "fire", "Burning Bulwark": "fire",
 "V Create": "fire", "Heat Crash": "fire", "Magma Storm": "fire", "Overheat": "fire",
 "Fusion Flare": "fire", "Fiery Dance": "fire", "Mind Blown": "fire",
 "Bitter Blade": "fire", "Torch Song": "fire",
 "Armor Cannon": "fire", "Raging Fury": "fire", "Incinerate": "fire",
 "Shell Trap": "fire",

  // --- Water ---
 "Water Gun": "water", "Water Pulse": "water", "Bubble": "water", "Bubble Beam": "water",
 "Surf": "water", "Hydro Pump": "water", "Whirlpool": "water", "Brine": "water",
 "Scald": "water", "Steam Eruption": "water", "Hydro Steam": "water",
 "Aqua Tail": "water", "Aqua Jet": "water", "Aqua Cutter": "water", "Aqua Step": "water",
 "Crabhammer": "water", "Waterfall": "water", "Liquidation": "water", "Razor Shell": "water",
 "Wave Crash": "water", "Octazooka": "water", "Muddy Water": "water",
 "Water Spout": "water", "Origin Pulse": "water", "Sparkling Aria": "water",
 "Water Shuriken": "water", "Snipe Shot": "water", "Flip Turn": "water",
 "Triple Dive": "water", "Dive": "water", "Clamp": "water", "Fishious Rend": "water",
 "Water Pledge": "water", "Chilling Water": "water", "Jet Punch": "water",

  // --- Grass ---
 "Vine Whip": "grass", "Razor Leaf": "grass", "Solar Beam": "grass", "Solar Blade": "grass",
 "Leaf Blade": "grass", "Leaf Storm": "grass", "Leaf Tornado": "grass", "Leafage": "grass",
 "Magical Leaf": "grass", "Petal Dance": "grass", "Petal Blizzard": "grass",
 "Grass Knot": "grass", "Grass Whistle": "grass", "Energy Ball": "grass",
 "Giga Drain": "grass", "Mega Drain": "grass", "Absorb": "grass", "Drain Punch": "fighting",
 "Horn Leech": "grass", "Wood Hammer": "grass", "Power Whip": "grass",
 "Seed Bomb": "grass", "Bullet Seed": "grass", "Seed Flare": "grass",
 "Apple Acid": "grass", "Grav Apple": "grass", "Syrup Bomb": "grass",
 "Trop Kick": "grass", "Branch Poke": "grass", "Needle Arm": "grass",
 "Spiky Shield": "grass", "Drum Beating": "grass", "Sappy Seed": "grass",
 "Matcha Gotcha": "grass", "Spicy Extract": "grass",
 "Flower Trick": "grass", "Grassy Glide": "grass", "Ivy Cudgel": "grass",
 "Frenzy Plant": "grass", "Grassy Terrain": "grass", 

  // --- Electric ---
 "Thunder Shock": "electric", "Thunderbolt": "electric", "Thunder": "electric",
 "Thunder Punch": "electric", "Thunder Fang": "electric", "Thunder Cage": "electric",
 "Thunderclap": "electric", "Discharge": "electric", "Spark": "electric",
 "Volt Switch": "electric", "Volt Tackle": "electric", "Wild Charge": "electric",
 "Bolt Strike": "electric", "Bolt Beak": "electric", "Plasma Fists": "electric",
 "Fusion Bolt": "electric", "Charge Beam": "electric", "Electroweb": "electric",
 "Electro Ball": "electric", "Electro Drift": "electric", "Electro Shot": "electric",
 "Zap Cannon": "electric", "Zing Zap": "electric", "Shock Wave": "electric",
 "Aura Wheel": "electric", "Parabolic Charge": "electric", "Overdrive": "electric",
 "Rising Voltage": "electric", "Nuzzle": "electric", "Double Shock": "electric",
 "Electric Terrain": "electric", "Wildbolt Storm": "electric", 

  // --- Ice ---
 "Ice Beam": "ice", "Ice Shard": "ice", "Ice Punch": "ice", "Ice Fang": "ice",
 "Ice Hammer": "ice", "Ice Spinner": "ice", "Ice Ball": "ice",
 "Icicle Spear": "ice", "Icicle Crash": "ice", "Icy Wind": "ice", "Powder Snow": "ice",
 "Frost Breath": "ice", "Freeze Dry": "ice", "Sheer Cold": "ice",
 "Aurora Beam": "ice", "Glaciate": "ice", "Blizzard": "ice",

  // --- Fighting ---
 "Karate Chop": "fighting", "Cross Chop": "fighting", "Brick Break": "fighting",
 "Close Combat": "fighting", "Superpower": "fighting", "Aura Sphere": "fighting",
 "Focus Blast": "fighting", "Focus Punch": "fighting", "Force Palm": "fighting",
 "Mach Punch": "fighting", "Bullet Punch": "steel", "Sky Uppercut": "fighting",
 "Vital Throw": "fighting", "Vacuum Wave": "fighting", "Body Press": "fighting",
 "Rock Smash": "fighting", "Low Kick": "fighting", "Low Sweep": "fighting",
 "Double Kick": "fighting", "Triple Kick": "fighting", "Rolling Kick": "fighting",
 "High Jump Kick": "fighting", "Jump Kick": "fighting", "Blaze Kick": "fire",
 "Hammer Arm": "fighting", "Submission": "fighting",
 "Seismic Toss": "fighting", "Sacred Sword": "fighting", "Secret Sword": "fighting",
 "Storm Throw": "fighting", "Circle Throw": "fighting", "Dynamic Punch": "fighting",
 "Mat Block": "fighting", "Quick Guard": "fighting", "Wide Guard": "rock",
 "Crafty Shield": "fairy", 
 "Flying Press": "fighting", "Arm Thrust": "fighting",
 "Axe Kick": "fighting", "Collision Course": "fighting", "Meteor Assault": "fighting",
 "Headlong Rush": "ground", "No Retreat": "fighting", 

  // --- Poison ---
 "Acid": "poison", "Acid Spray": "poison", "Sludge": "poison", "Sludge Bomb": "poison",
 "Sludge Wave": "poison", "Smog": "poison", "Poison Sting": "poison",
 "Poison Jab": "poison", "Poison Tail": "poison",
 "Poison Fang": "poison", "Cross Poison": "poison", "Gunk Shot": "poison",
 "Mortal Spin": "poison", "Mud Bomb": "ground", "Venom Drench": "poison",
 "Toxic Thread": "poison", 
 "Baneful Bunker": "poison", "Barb Barrage": "poison", 
 "Dire Claw": "poison", "Malignant Chain": "poison",
 "Purify": "poison", 

  // --- Ground ---
 "Earthquake": "ground", "Earth Power": "ground", "Magnitude": "ground",
 "Bulldoze": "ground", "Fissure": "ground", "Dig": "ground",
 "Mud Slap": "ground", "Mud Shot": "ground", 
 "Sand Tomb": "ground", "Bone Club": "ground", "Bone Rush": "ground",
 "Bonemerang": "ground", "Drill Run": "ground", "High Horsepower": "ground",
 "Stomping Tantrum": "ground", "Precipice Blades": "ground", "Lands Wrath": "ground",
 "Thousand Arrows": "ground", "Thousand Waves": "ground", "Sandsear Storm": "ground",
 "Rototiller": "ground",

  // --- Flying ---
 "Gust": "flying", "Wing Attack": "flying", "Air Cutter": "flying", "Air Slash": "flying",
 "Aerial Ace": "flying", "Aeroblast": "flying", "Drill Peck": "flying", "Peck": "flying",
 "Pluck": "flying", "Fly": "flying", "Bounce": "flying", "Sky Attack": "flying",
 "Sky Drop": "flying", "Hurricane": "flying", "Brave Bird": "flying", 
 "Roost": "flying", "Feather Dance": "flying",
 "Mirror Move": "flying", "Beak Blast": "flying",
 "Dual Wingbeat": "flying", "Bleakwind Storm": "flying", "Springtide Storm": "fairy",
 "Oblivion Wing": "flying", "Chatter": "flying", "Dragon Ascent": "flying",

  // --- Psychic ---
 "Confusion": "psychic", "Psybeam": "psychic", "Psychic": "psychic", "Psychic Fangs": "psychic",
 "Psyshock": "psychic", "Psystrike": "psychic", "Psycho Cut": "psychic", "Psycho Boost": "psychic",
 "Psycho Shift": "psychic", "Psyshield Bash": "psychic", "Psyblade": "psychic",
 "Psywave": "psychic", "Zen Headbutt": "psychic", "Extrasensory": "psychic",
 "Expanding Force": "psychic",
 "Mist Ball": "psychic", "Luster Purge": "psychic", "Lumina Crash": "psychic",
 "Hyperspace Hole": "psychic", "Hyperspace Fury": "dark", "Photon Geyser": "psychic",
 "Synchronoise": "psychic", "Mystical Power": "psychic", "Dream Eater": "psychic",
 "Twin Beam": "psychic", "Prismatic Laser": "psychic", 
 "Agility": "psychic", "Amnesia": "psychic", 
 "Meditate": "psychic",
 "Kinesis": "psychic", "Teleport": "psychic",
 "Psychic Terrain": "psychic", "Psych Up": "normal", 

  // --- Bug ---
 "Bug Bite": "bug", "Bug Buzz": "bug", "X Scissor": "bug", "Megahorn": "bug",
 "Twineedle": "bug", "Fury Cutter": "bug", "Leech Life": "bug",
 "U Turn": "bug", "Lunge": "bug", "First Impression": "bug", "Skitter Smack": "bug",
 "Pollen Puff": "bug", "Infestation": "bug", "Struggle Bug": "bug", "Fell Stinger": "bug",
 "Steamroller": "bug", "Signal Beam": "bug", "Silver Wind": "bug", "Pounce": "bug",
 "Powder": "bug", "Silk Trap": "bug",

  // --- Rock ---
 "Rock Throw": "rock", "Rock Slide": "rock", "Rock Tomb": "rock", "Rock Blast": "rock",
 "Rock Wrecker": "rock", "Rock Polish": "rock", "Rollout": "rock", "Stone Edge": "rock",
 "Stone Axe": "rock", "Power Gem": "rock", "Ancient Power": "rock", "Head Smash": "rock",
 "Smack Down": "rock", "Diamond Storm": "rock", "Accelerock": "rock", "Mighty Cleave": "rock",

  // --- Ghost ---
 "Lick": "ghost", "Shadow Ball": "ghost", "Shadow Punch": "ghost", "Shadow Claw": "ghost",
 "Shadow Sneak": "ghost", "Shadow Force": "ghost", "Astonish": "ghost", 
 "Phantom Force": "ghost", "Spectral Thief": "ghost", 
 "Moongeist Beam": "ghost", "Night Shade": "ghost", "Ominous Wind": "ghost",
 "Nightmare": "ghost", 
 "Last Respects": "ghost", "Rage Fist": "ghost",

  // --- Dragon ---
 "Dragon Rage": "dragon", "Dragon Breath": "dragon", "Dragon Pulse": "dragon",
 "Dragon Claw": "dragon", "Dragon Tail": "dragon", "Dragon Rush": "dragon",
 "Dragon Hammer": "dragon", "Dragon Darts": "dragon", "Dragon Energy": "dragon",
 "Outrage": "dragon", "Twister": "dragon",
 "Spacial Rend": "dragon", "Roar Of Time": "dragon", "Eternabeam": "dragon",
 "Clanging Scales": "dragon", "Clangorous Soul": "dragon", "Core Enforcer": "dragon",
 "Draco Meteor": "dragon", "Dynamax Cannon": "dragon", "Dual Chop": "dragon",
 "Glaive Rush": "dragon", "Breaking Swipe": "dragon",
 "Fickle Beam": "dragon",

  // --- Dark ---
 "Bite": "dark", "Crunch": "dark", "Dark Pulse": "dark", "Dark Void": "dark",
 "Darkest Lariat": "dark", "Night Slash": "dark", "Night Daze": "dark",
 "Beat Up": "dark", "Brutal Swing": "dark", "Foul Play": "dark", "Feint Attack": "dark",
 "Flatter": "dark", "Snarl": "dark", 
 "Parting Shot": "dark",
 "Throat Chop": "dark", "Wicked Blow": "dark", "Ruination": "dark", "Kowtow Cleave": "dark",
 "Lash Out": "dark", "False Surrender": "dark",
 "Obstruct": "dark", 

  // --- Steel ---
 "Iron Head": "steel", "Iron Tail": "steel", "Steel Wing": "steel",
 "Steel Roller": "steel", "Steel Beam": "steel", "Flash Cannon": "steel",
 "Meteor Mash": "steel", 
 "Sunsteel Strike": "steel",
 "Heavy Slam": "steel", "Gyro Ball": "steel", "Gear Grind": "steel",
 "Metal Claw": "steel", 
 "Shift Gear": "steel", "Autotomize": "steel", "Shelter": "steel", "Spin Out": "steel",
 "Make It Rain": "steel", "Tachyon Cutter": "steel", "Gigaton Hammer": "steel",
 "Double Iron Bash": "steel", "Kings Shield": "steel", "Behemoth Bash": "steel",
 "Behemoth Blade": "steel",

  // --- Fairy ---
 "Fairy Wind": "fairy", "Fairy Lock": "fairy", "Dazzling Gleam": "fairy",
 "Moonblast": "fairy", "Play Rough": "fairy", "Disarming Voice": "fairy",
 "Draining Kiss": "fairy", 
 "Aromatic Mist": "fairy", "Misty Terrain": "fairy", "Decorate": "fairy",
 "Flower Shield": "fairy", "Geomancy": "fairy",
 "Fleur Cannon": "fairy", "Spirit Break": "fairy", 
 "Natures Madness": "fairy", 
};

// Build the normalized lookup once.
const MOVE_TYPE: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [name, type] of Object.entries(MOVE_TYPE_RAW)) {
    out[norm(name)] = type;
  }
  return out;
})();

// Keyword-based fallback for any move that slipped through. Order matters:
// more specific keywords first (e.g. "shadow" before "punch").
const KEYWORD_FALLBACK: [string, string][] = [
  ["shadow",   "ghost"],
  ["spectral", "ghost"],
  ["phantom",  "ghost"],
  ["ghost",    "ghost"],
  ["dragon",   "dragon"],
  ["fairy",    "fairy"],
  ["moon",     "fairy"],
  ["dark",     "dark"],
  ["night",    "dark"],
  ["steel",    "steel"],
  ["iron",     "steel"],
  ["metal",    "steel"],
  ["fire",     "fire"],
  ["flame",    "fire"],
  ["flare",    "fire"],
  ["blaze",    "fire"],
  ["burn",     "fire"],
  ["heat",     "fire"],
  ["water",    "water"],
  ["aqua",     "water"],
  ["hydro",    "water"],
  ["wave",     "water"],
  ["leaf",     "grass"],
  ["grass",    "grass"],
  ["seed",     "grass"],
  ["petal",    "grass"],
  ["vine",     "grass"],
  ["thunder",  "electric"],
  ["bolt",     "electric"],
  ["volt",     "electric"],
  ["shock",    "electric"],
  ["spark",    "electric"],
  ["electro",  "electric"],
  ["ice",      "ice"],
  ["icicle",   "ice"],
  ["frost",    "ice"],
  ["freeze",   "ice"],
  ["snow",     "ice"],
  ["earth",    "ground"],
  ["ground",   "ground"],
  ["mud",      "ground"],
  ["dig",      "ground"],
  ["sand",     "ground"],
  ["rock",     "rock"],
  ["stone",    "rock"],
  ["wing",     "flying"],
  ["fly",      "flying"],
  ["aerial",   "flying"],
  ["aero",     "flying"],
  ["sky",      "flying"],
  ["psy",      "psychic"],
  ["psycho",   "psychic"],
  ["mind",     "psychic"],
  ["mental",   "psychic"],
  ["bug",      "bug"],
  ["beetle",   "bug"],
  ["sting",    "bug"],
  ["spider",   "bug"],
  ["poison",   "poison"],
  ["toxic",    "poison"],
  ["sludge",   "poison"],
  ["acid",     "poison"],
  ["venom",    "poison"],
  ["gunk",     "poison"],
  ["kick",     "fighting"],
  ["punch",    "fighting"],
  ["chop",     "fighting"],
  ["fist",     "fighting"],
  ["fight",    "fighting"],
  ["combat",   "fighting"],
];

export function moveTypeOf(move: string): string {
  if (!move) return "normal";
  const key = norm(move);
  const direct = MOVE_TYPE[key];
  if (direct) return direct;
  for (const [needle, type] of KEYWORD_FALLBACK) {
    if (key.includes(needle)) return type;
  }
  return "normal";
}
