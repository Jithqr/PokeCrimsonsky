export type FormCategory = "mega" | "alolan" | "galarian" | "hisuian" | "paldean" | "other";

export type FormEntry = {
  id: number;
  name: string;
  sprite: string;
  type1: string;
  type2: string | null;
  hp: number; atk: number; def: number; spa: number; spd: number; spe: number;
  moves: string[];
  category: FormCategory;
  baseId: number;
  gen: number;
};

export const POKEMON_FORMS: FormEntry[] = [
  // ── MEGA EVOLUTIONS ──────────────────────────────────────────
  { id:10001, name:"Mega Venusaur",      sprite:"venusaurmega",     type1:"Grass",    type2:"Poison",   hp:80,  atk:100, def:123, spa:122, spd:120, spe:80,  moves:["Solar Beam","Petal Blizzard","Sludge Bomb","Synthesis"],        category:"mega", baseId:3,   gen:6 },
  { id:10002, name:"Mega Charizard X",   sprite:"charizardmegax",   type1:"Fire",     type2:"Dragon",   hp:78,  atk:130, def:111, spa:130, spd:85,  spe:100, moves:["Dragon Claw","Flare Blitz","Dragon Dance","Thunder Punch"],    category:"mega", baseId:6,   gen:6 },
  { id:10003, name:"Mega Charizard Y",   sprite:"charizardmegay",   type1:"Fire",     type2:"Flying",   hp:78,  atk:104, def:78,  spa:159, spd:115, spe:100, moves:["Fire Blast","Air Slash","Solar Beam","Focus Blast"],          category:"mega", baseId:6,   gen:6 },
  { id:10004, name:"Mega Blastoise",     sprite:"blastoisemega",    type1:"Water",    type2:null,       hp:79,  atk:103, def:120, spa:135, spd:115, spe:78,  moves:["Hydro Pump","Dark Pulse","Aura Sphere","Water Pulse"],         category:"mega", baseId:9,   gen:6 },
  { id:10005, name:"Mega Beedrill",      sprite:"beedrillmega",     type1:"Bug",      type2:"Poison",   hp:65,  atk:150, def:40,  spa:15,  spd:80,  spe:145, moves:["Poison Jab","X-Scissor","Fell Stinger","Agility"],            category:"mega", baseId:15,  gen:6 },
  { id:10006, name:"Mega Pidgeot",       sprite:"pidgeotmega",      type1:"Normal",   type2:"Flying",   hp:83,  atk:80,  def:80,  spa:135, spd:80,  spe:121, moves:["Hurricane","Air Slash","Hyper Voice","Heat Wave"],            category:"mega", baseId:18,  gen:6 },
  { id:10007, name:"Mega Alakazam",      sprite:"alakazammega",     type1:"Psychic",  type2:null,       hp:55,  atk:50,  def:65,  spa:175, spd:95,  spe:150, moves:["Psychic","Focus Blast","Shadow Ball","Dazzling Gleam"],       category:"mega", baseId:65,  gen:6 },
  { id:10008, name:"Mega Slowbro",       sprite:"slowbromega",      type1:"Water",    type2:"Psychic",  hp:95,  atk:75,  def:180, spa:130, spd:80,  spe:30,  moves:["Psychic","Scald","Fire Blast","Slack Off"],                   category:"mega", baseId:80,  gen:6 },
  { id:10009, name:"Mega Gengar",        sprite:"gengarmega",       type1:"Ghost",    type2:"Poison",   hp:60,  atk:65,  def:80,  spa:170, spd:95,  spe:130, moves:["Shadow Ball","Sludge Wave","Focus Blast","Dazzling Gleam"],   category:"mega", baseId:94,  gen:6 },
  { id:10010, name:"Mega Kangaskhan",    sprite:"kangaskhanmega",   type1:"Normal",   type2:null,       hp:105, atk:125, def:100, spa:60,  spd:100, spe:100, moves:["Return","Power-Up Punch","Earthquake","Sucker Punch"],        category:"mega", baseId:115, gen:6 },
  { id:10011, name:"Mega Pinsir",        sprite:"pinsirmega",       type1:"Bug",      type2:"Flying",   hp:65,  atk:155, def:120, spa:65,  spd:90,  spe:105, moves:["X-Scissor","Earthquake","Return","Quick Attack"],             category:"mega", baseId:127, gen:6 },
  { id:10012, name:"Mega Gyarados",      sprite:"gyaradosmega",     type1:"Water",    type2:"Dark",     hp:95,  atk:155, def:109, spa:70,  spd:130, spe:81,  moves:["Waterfall","Earthquake","Crunch","Ice Fang"],                 category:"mega", baseId:130, gen:6 },
  { id:10013, name:"Mega Aerodactyl",    sprite:"aerodactylmega",   type1:"Rock",     type2:"Flying",   hp:80,  atk:135, def:85,  spa:70,  spd:95,  spe:150, moves:["Rock Slide","Aerial Ace","Earthquake","Ice Fang"],            category:"mega", baseId:142, gen:6 },
  { id:10014, name:"Mega Mewtwo X",      sprite:"mewtwomegax",      type1:"Psychic",  type2:"Fighting", hp:106, atk:190, def:100, spa:154, spd:100, spe:130, moves:["Psychic","Aura Sphere","Ice Beam","Recover"],                 category:"mega", baseId:150, gen:6 },
  { id:10015, name:"Mega Mewtwo Y",      sprite:"mewtwomegay",      type1:"Psychic",  type2:null,       hp:106, atk:150, def:70,  spa:194, spd:120, spe:140, moves:["Psystrike","Aura Sphere","Focus Blast","Ice Beam"],           category:"mega", baseId:150, gen:6 },
  { id:10016, name:"Mega Ampharos",      sprite:"ampharosmega",     type1:"Electric", type2:"Dragon",   hp:90,  atk:95,  def:105, spa:165, spd:110, spe:45,  moves:["Thunderbolt","Dragon Pulse","Focus Blast","Power Gem"],       category:"mega", baseId:181, gen:6 },
  { id:10017, name:"Mega Steelix",       sprite:"steelixmega",      type1:"Steel",    type2:"Ground",   hp:75,  atk:125, def:230, spa:55,  spd:65,  spe:30,  moves:["Earthquake","Iron Tail","Heavy Slam","Stealth Rock"],         category:"mega", baseId:208, gen:6 },
  { id:10018, name:"Mega Scizor",        sprite:"scizormega",       type1:"Bug",      type2:"Steel",    hp:70,  atk:150, def:140, spa:65,  spd:100, spe:75,  moves:["Bullet Punch","X-Scissor","Swords Dance","Roost"],            category:"mega", baseId:212, gen:6 },
  { id:10019, name:"Mega Heracross",     sprite:"heracrossmega",    type1:"Bug",      type2:"Fighting", hp:80,  atk:185, def:115, spa:40,  spd:105, spe:75,  moves:["Megahorn","Close Combat","Earthquake","Swords Dance"],        category:"mega", baseId:214, gen:6 },
  { id:10020, name:"Mega Houndoom",      sprite:"houndoommega",     type1:"Dark",     type2:"Fire",     hp:75,  atk:90,  def:90,  spa:140, spd:90,  spe:115, moves:["Dark Pulse","Fire Blast","Nasty Plot","Sludge Bomb"],         category:"mega", baseId:229, gen:6 },
  { id:10021, name:"Mega Tyranitar",     sprite:"tyranitarmega",    type1:"Rock",     type2:"Dark",     hp:100, atk:164, def:150, spa:95,  spd:120, spe:71,  moves:["Stone Edge","Crunch","Earthquake","Ice Punch"],               category:"mega", baseId:248, gen:6 },
  { id:10022, name:"Mega Blaziken",      sprite:"blazikenmega",     type1:"Fire",     type2:"Fighting", hp:80,  atk:160, def:80,  spa:130, spd:80,  spe:100, moves:["Flare Blitz","High Jump Kick","Swords Dance","Brave Bird"],    category:"mega", baseId:257, gen:6 },
  { id:10023, name:"Mega Gardevoir",     sprite:"gardevoirmega",    type1:"Psychic",  type2:"Fairy",    hp:68,  atk:85,  def:65,  spa:165, spd:135, spe:100, moves:["Moonblast","Psychic","Focus Blast","Shadow Ball"],            category:"mega", baseId:282, gen:6 },
  { id:10024, name:"Mega Mawile",        sprite:"mawilemega",       type1:"Steel",    type2:"Fairy",    hp:50,  atk:105, def:125, spa:55,  spd:95,  spe:50,  moves:["Play Rough","Iron Head","Sucker Punch","Swords Dance"],       category:"mega", baseId:303, gen:6 },
  { id:10025, name:"Mega Aggron",        sprite:"aggronmega",       type1:"Steel",    type2:null,       hp:70,  atk:140, def:230, spa:60,  spd:80,  spe:50,  moves:["Heavy Slam","Iron Head","Earthquake","Stealth Rock"],         category:"mega", baseId:306, gen:6 },
  { id:10026, name:"Mega Medicham",      sprite:"medichammega",     type1:"Fighting", type2:"Psychic",  hp:60,  atk:100, def:85,  spa:80,  spd:85,  spe:100, moves:["High Jump Kick","Zen Headbutt","Thunder Punch","Ice Punch"],  category:"mega", baseId:308, gen:6 },
  { id:10027, name:"Mega Manectric",     sprite:"manectricmega",    type1:"Electric", type2:null,       hp:70,  atk:75,  def:80,  spa:135, spd:80,  spe:135, moves:["Thunderbolt","Overheat","Volt Switch","Hidden Power"],        category:"mega", baseId:310, gen:6 },
  { id:10028, name:"Mega Sharpedo",      sprite:"sharpedomega",     type1:"Water",    type2:"Dark",     hp:70,  atk:140, def:70,  spa:110, spd:65,  spe:105, moves:["Crunch","Waterfall","Ice Fang","Psychic Fangs"],              category:"mega", baseId:319, gen:6 },
  { id:10029, name:"Mega Camerupt",      sprite:"cameruptmega",     type1:"Fire",     type2:"Ground",   hp:70,  atk:120, def:100, spa:145, spd:105, spe:20,  moves:["Eruption","Earth Power","Ancient Power","Fire Blast"],       category:"mega", baseId:323, gen:6 },
  { id:10030, name:"Mega Altaria",       sprite:"altariamega",      type1:"Dragon",   type2:"Fairy",    hp:75,  atk:110, def:110, spa:110, spd:105, spe:80,  moves:["Moonblast","Dragon Claw","Fire Blast","Roost"],              category:"mega", baseId:334, gen:6 },
  { id:10031, name:"Mega Banette",       sprite:"banettemega",      type1:"Ghost",    type2:null,       hp:64,  atk:165, def:75,  spa:93,  spd:83,  spe:75,  moves:["Shadow Claw","Knock Off","Sucker Punch","Destiny Bond"],      category:"mega", baseId:354, gen:6 },
  { id:10032, name:"Mega Absol",         sprite:"absolmega",        type1:"Dark",     type2:null,       hp:65,  atk:150, def:60,  spa:115, spd:60,  spe:115, moves:["Night Slash","Psycho Cut","Swords Dance","Sucker Punch"],    category:"mega", baseId:359, gen:6 },
  { id:10033, name:"Mega Glalie",        sprite:"glaliemega",       type1:"Ice",      type2:null,       hp:80,  atk:120, def:80,  spa:120, spd:80,  spe:100, moves:["Freeze-Dry","Crunch","Earthquake","Explosion"],              category:"mega", baseId:362, gen:6 },
  { id:10034, name:"Mega Salamence",     sprite:"salamencemega",    type1:"Dragon",   type2:"Flying",   hp:95,  atk:145, def:130, spa:120, spd:90,  spe:120, moves:["Dragon Claw","Aerial Ace","Earthquake","Dragon Dance"],      category:"mega", baseId:373, gen:6 },
  { id:10035, name:"Mega Metagross",     sprite:"metagrossmega",    type1:"Steel",    type2:"Psychic",  hp:80,  atk:145, def:150, spa:105, spd:110, spe:110, moves:["Meteor Mash","Earthquake","Ice Punch","Zen Headbutt"],       category:"mega", baseId:376, gen:6 },
  { id:10036, name:"Mega Latias",        sprite:"latiasmega",       type1:"Dragon",   type2:"Psychic",  hp:80,  atk:100, def:120, spa:140, spd:150, spe:110, moves:["Dragon Pulse","Psychic","Surf","Calm Mind"],                 category:"mega", baseId:380, gen:6 },
  { id:10037, name:"Mega Latios",        sprite:"latiosmega",       type1:"Dragon",   type2:"Psychic",  hp:80,  atk:130, def:100, spa:160, spd:120, spe:110, moves:["Dragon Pulse","Psychic","Thunder","Calm Mind"],              category:"mega", baseId:381, gen:6 },
  { id:10038, name:"Mega Lucario",       sprite:"lucariomega",      type1:"Fighting", type2:"Steel",    hp:70,  atk:145, def:88,  spa:140, spd:70,  spe:112, moves:["Close Combat","Flash Cannon","Dragon Pulse","Swords Dance"],  category:"mega", baseId:448, gen:6 },
  { id:10039, name:"Mega Abomasnow",     sprite:"abomasnowmega",    type1:"Grass",    type2:"Ice",      hp:90,  atk:132, def:105, spa:132, spd:105, spe:30,  moves:["Blizzard","Wood Hammer","Earthquake","Ice Shard"],           category:"mega", baseId:460, gen:6 },
  { id:10040, name:"Mega Lopunny",       sprite:"lopunnymega",      type1:"Normal",   type2:"Fighting", hp:65,  atk:136, def:94,  spa:54,  spd:96,  spe:135, moves:["Return","High Jump Kick","Ice Punch","Fire Punch"],          category:"mega", baseId:428, gen:6 },
  { id:10041, name:"Mega Garchomp",      sprite:"garchompmega",     type1:"Dragon",   type2:"Ground",   hp:108, atk:170, def:115, spa:120, spd:95,  spe:92,  moves:["Dragon Claw","Earthquake","Stone Edge","Swords Dance"],      category:"mega", baseId:445, gen:6 },
  { id:10042, name:"Mega Diancie",       sprite:"dianciemega",      type1:"Rock",     type2:"Fairy",    hp:50,  atk:160, def:110, spa:160, spd:110, spe:110, moves:["Diamond Storm","Moonblast","Earth Power","Ancient Power"],   category:"mega", baseId:719, gen:6 },

  // ── ALOLAN FORMS ─────────────────────────────────────────────
  { id:10101, name:"Rattata (Alola)",    sprite:"rattata-alola",    type1:"Normal",   type2:"Dark",     hp:30,  atk:56,  def:35,  spa:25,  spd:35,  spe:72,  moves:["Quick Attack","Bite","Sucker Punch","Double Edge"],           category:"alolan", baseId:19,  gen:7 },
  { id:10102, name:"Raticate (Alola)",   sprite:"raticate-alola",   type1:"Normal",   type2:"Dark",     hp:75,  atk:71,  def:70,  spa:40,  spd:80,  spe:77,  moves:["Crunch","Double Edge","Sucker Punch","Hyper Fang"],          category:"alolan", baseId:20,  gen:7 },
  { id:10103, name:"Raichu (Alola)",     sprite:"raichu-alola",     type1:"Electric", type2:"Psychic",  hp:60,  atk:85,  def:50,  spa:95,  spd:85,  spe:110, moves:["Thunderbolt","Psychic","Surf","Nasty Plot"],                 category:"alolan", baseId:26,  gen:7 },
  { id:10104, name:"Sandshrew (Alola)",  sprite:"sandshrew-alola",  type1:"Ice",      type2:"Steel",    hp:50,  atk:75,  def:90,  spa:10,  spd:35,  spe:40,  moves:["Ice Ball","Iron Defense","Rapid Spin","Icicle Crash"],        category:"alolan", baseId:27,  gen:7 },
  { id:10105, name:"Sandslash (Alola)",  sprite:"sandslash-alola",  type1:"Ice",      type2:"Steel",    hp:75,  atk:100, def:120, spa:25,  spd:65,  spe:65,  moves:["Icicle Crash","Iron Head","Slash","Swords Dance"],           category:"alolan", baseId:28,  gen:7 },
  { id:10106, name:"Vulpix (Alola)",     sprite:"vulpix-alola",     type1:"Ice",      type2:null,       hp:38,  atk:41,  def:40,  spa:50,  spd:65,  spe:65,  moves:["Blizzard","Powder Snow","Moonblast","Aurora Veil"],          category:"alolan", baseId:37,  gen:7 },
  { id:10107, name:"Ninetales (Alola)",  sprite:"ninetales-alola",  type1:"Ice",      type2:"Fairy",    hp:73,  atk:67,  def:75,  spa:81,  spd:100, spe:109, moves:["Blizzard","Moonblast","Aurora Veil","Dazzling Gleam"],       category:"alolan", baseId:38,  gen:7 },
  { id:10108, name:"Diglett (Alola)",    sprite:"diglett-alola",    type1:"Ground",   type2:"Steel",    hp:10,  atk:55,  def:30,  spa:35,  spd:45,  spe:90,  moves:["Dig","Iron Head","Sucker Punch","Sand Attack"],              category:"alolan", baseId:50,  gen:7 },
  { id:10109, name:"Dugtrio (Alola)",    sprite:"dugtrio-alola",    type1:"Ground",   type2:"Steel",    hp:35,  atk:100, def:60,  spa:50,  spd:70,  spe:110, moves:["Earthquake","Iron Head","Sucker Punch","Stealth Rock"],      category:"alolan", baseId:51,  gen:7 },
  { id:10110, name:"Meowth (Alola)",     sprite:"meowth-alola",     type1:"Dark",     type2:null,       hp:40,  atk:35,  def:35,  spa:50,  spd:40,  spe:90,  moves:["Bite","Scratch","Pay Day","Hone Claws"],                     category:"alolan", baseId:52,  gen:7 },
  { id:10111, name:"Persian (Alola)",    sprite:"persian-alola",    type1:"Dark",     type2:null,       hp:65,  atk:60,  def:60,  spa:75,  spd:65,  spe:115, moves:["Night Slash","Fake Out","Power Gem","Nasty Plot"],           category:"alolan", baseId:53,  gen:7 },
  { id:10112, name:"Geodude (Alola)",    sprite:"geodude-alola",    type1:"Rock",     type2:"Electric", hp:40,  atk:80,  def:100, spa:30,  spd:30,  spe:20,  moves:["Spark","Rock Blast","Thunder Punch","Rollout"],              category:"alolan", baseId:74,  gen:7 },
  { id:10113, name:"Graveler (Alola)",   sprite:"graveler-alola",   type1:"Rock",     type2:"Electric", hp:55,  atk:95,  def:115, spa:45,  spd:45,  spe:35,  moves:["Spark","Rock Slide","Thunder Punch","Rollout"],              category:"alolan", baseId:75,  gen:7 },
  { id:10114, name:"Golem (Alola)",      sprite:"golem-alola",      type1:"Rock",     type2:"Electric", hp:80,  atk:120, def:130, spa:55,  spd:65,  spe:45,  moves:["Wild Charge","Stone Edge","Earthquake","Explosion"],         category:"alolan", baseId:76,  gen:7 },
  { id:10115, name:"Grimer (Alola)",     sprite:"grimer-alola",     type1:"Poison",   type2:"Dark",     hp:80,  atk:80,  def:50,  spa:40,  spd:50,  spe:25,  moves:["Crunch","Poison Jab","Bite","Sludge Bomb"],                  category:"alolan", baseId:88,  gen:7 },
  { id:10116, name:"Muk (Alola)",        sprite:"muk-alola",        type1:"Poison",   type2:"Dark",     hp:105, atk:105, def:75,  spa:65,  spd:100, spe:50,  moves:["Gunk Shot","Crunch","Poison Jab","Sludge Wave"],             category:"alolan", baseId:89,  gen:7 },
  { id:10117, name:"Exeggutor (Alola)",  sprite:"exeggutor-alola",  type1:"Grass",    type2:"Dragon",   hp:95,  atk:105, def:85,  spa:125, spd:75,  spe:45,  moves:["Dragon Hammer","Leaf Storm","Flamethrower","Earthquake"],    category:"alolan", baseId:103, gen:7 },
  { id:10118, name:"Marowak (Alola)",    sprite:"marowak-alola",    type1:"Fire",     type2:"Ghost",    hp:60,  atk:80,  def:110, spa:50,  spd:80,  spe:45,  moves:["Shadow Bone","Flare Blitz","Bonemerang","Will-O-Wisp"],      category:"alolan", baseId:105, gen:7 },

  // ── GALARIAN FORMS ───────────────────────────────────────────
  { id:10201, name:"Meowth (Galar)",     sprite:"meowth-galar",     type1:"Steel",    type2:null,       hp:50,  atk:65,  def:55,  spa:40,  spd:40,  spe:40,  moves:["Iron Head","Scratch","Metal Claw","Hone Claws"],              category:"galarian", baseId:52,  gen:8 },
  { id:10202, name:"Ponyta (Galar)",     sprite:"ponyta-galar",     type1:"Psychic",  type2:null,       hp:50,  atk:85,  def:55,  spa:65,  spd:65,  spe:90,  moves:["Psybeam","Stomp","Morning Sun","Heal Pulse"],                category:"galarian", baseId:77,  gen:8 },
  { id:10203, name:"Rapidash (Galar)",   sprite:"rapidash-galar",   type1:"Psychic",  type2:"Fairy",    hp:65,  atk:100, def:70,  spa:80,  spd:80,  spe:105, moves:["Psycho Cut","Play Rough","Megahorn","Healing Wish"],          category:"galarian", baseId:78,  gen:8 },
  { id:10204, name:"Slowpoke (Galar)",   sprite:"slowpoke-galar",   type1:"Psychic",  type2:null,       hp:90,  atk:65,  def:65,  spa:40,  spd:40,  spe:15,  moves:["Psychic","Yawn","Flamethrower","Water Gun"],                 category:"galarian", baseId:79,  gen:8 },
  { id:10205, name:"Slowbro (Galar)",    sprite:"slowbro-galar",    type1:"Poison",   type2:"Psychic",  hp:95,  atk:100, def:95,  spa:100, spd:70,  spe:30,  moves:["Sludge Bomb","Psychic","Flamethrower","Shell Side Arm"],     category:"galarian", baseId:80,  gen:8 },
  { id:10206, name:"Slowking (Galar)",   sprite:"slowking-galar",   type1:"Poison",   type2:"Psychic",  hp:95,  atk:65,  def:80,  spa:110, spd:110, spe:30,  moves:["Sludge Bomb","Psychic","Future Sight","Eerie Spell"],        category:"galarian", baseId:199, gen:8 },
  { id:10207, name:"Farfetch'd (Galar)", sprite:"farfetchd-galar",  type1:"Fighting", type2:null,       hp:52,  atk:95,  def:55,  spa:58,  spd:62,  spe:60,  moves:["Brutal Swing","Slash","Detect","Leaf Blade"],                category:"galarian", baseId:83,  gen:8 },
  { id:10208, name:"Weezing (Galar)",    sprite:"weezing-galar",    type1:"Poison",   type2:"Fairy",    hp:65,  atk:90,  def:120, spa:85,  spd:70,  spe:60,  moves:["Strange Steam","Sludge Bomb","Explosion","Fairy Wind"],      category:"galarian", baseId:110, gen:8 },
  { id:10209, name:"Mr. Mime (Galar)",   sprite:"mrmime-galar",     type1:"Ice",      type2:"Psychic",  hp:40,  atk:45,  def:65,  spa:100, spd:120, spe:90,  moves:["Ice Punch","Psychic","Triple Axel","Nasty Plot"],            category:"galarian", baseId:122, gen:8 },
  { id:10210, name:"Corsola (Galar)",    sprite:"corsola-galar",    type1:"Ghost",    type2:null,       hp:60,  atk:55,  def:100, spa:65,  spd:100, spe:30,  moves:["Shadow Ball","Will-O-Wisp","Strength Sap","Curse"],          category:"galarian", baseId:222, gen:8 },
  { id:10211, name:"Zigzagoon (Galar)",  sprite:"zigzagoon-galar",  type1:"Dark",     type2:"Normal",   hp:38,  atk:30,  def:41,  spa:30,  spd:41,  spe:60,  moves:["Tackle","Bite","Sand Attack","Flail"],                       category:"galarian", baseId:263, gen:8 },
  { id:10212, name:"Linoone (Galar)",    sprite:"linoone-galar",    type1:"Dark",     type2:"Normal",   hp:78,  atk:70,  def:61,  spa:50,  spd:61,  spe:100, moves:["Belly Drum","Extreme Speed","Seed Bomb","Shadow Claw"],      category:"galarian", baseId:264, gen:8 },
  { id:10213, name:"Darumaka (Galar)",   sprite:"darumaka-galar",   type1:"Ice",      type2:null,       hp:70,  atk:90,  def:45,  spa:15,  spd:45,  spe:50,  moves:["Ice Punch","Belly Drum","Headbutt","Work Up"],               category:"galarian", baseId:554, gen:8 },
  { id:10214, name:"Darmanitan (Galar)", sprite:"darmanitan-galar", type1:"Ice",      type2:null,       hp:105, atk:140, def:55,  spa:30,  spd:55,  spe:95,  moves:["Icicle Crash","Flare Blitz","Earthquake","Rock Slide"],       category:"galarian", baseId:555, gen:8 },
  { id:10215, name:"Yamask (Galar)",     sprite:"yamask-galar",     type1:"Ground",   type2:"Ghost",    hp:38,  atk:55,  def:85,  spa:30,  spd:65,  spe:30,  moves:["Shadow Ball","Earthquake","Will-O-Wisp","Ancient Power"],    category:"galarian", baseId:562, gen:8 },
  { id:10216, name:"Stunfisk (Galar)",   sprite:"stunfisk-galar",   type1:"Ground",   type2:"Steel",    hp:109, atk:81,  def:99,  spa:66,  spd:84,  spe:32,  moves:["Snap Trap","Earthquake","Iron Head","Discharge"],            category:"galarian", baseId:618, gen:8 },
  { id:10217, name:"Articuno (Galar)",   sprite:"articuno-galar",   type1:"Psychic",  type2:"Flying",   hp:90,  atk:85,  def:85,  spa:125, spd:100, spe:95,  moves:["Freezing Glare","Air Slash","Psyshield Bash","Roost"],       category:"galarian", baseId:144, gen:8 },
  { id:10218, name:"Zapdos (Galar)",     sprite:"zapdos-galar",     type1:"Fighting", type2:"Flying",   hp:90,  atk:125, def:90,  spa:85,  spd:90,  spe:100, moves:["Thunderous Kick","Brave Bird","Bulk Up","Drill Peck"],       category:"galarian", baseId:145, gen:8 },
  { id:10219, name:"Moltres (Galar)",    sprite:"moltres-galar",    type1:"Dark",     type2:"Flying",   hp:90,  atk:85,  def:90,  spa:100, spd:125, spe:90,  moves:["Fiery Wrath","Air Slash","Nasty Plot","Roost"],              category:"galarian", baseId:146, gen:8 },

  // ── HISUIAN FORMS ────────────────────────────────────────────
  { id:10301, name:"Growlithe (Hisui)",  sprite:"growlithe-hisui",  type1:"Fire",     type2:"Rock",     hp:60,  atk:75,  def:45,  spa:65,  spd:50,  spe:55,  moves:["Ember","Rock Slide","Wild Charge","Flare Blitz"],            category:"hisuian", baseId:58,  gen:8 },
  { id:10302, name:"Arcanine (Hisui)",   sprite:"arcanine-hisui",   type1:"Fire",     type2:"Rock",     hp:90,  atk:115, def:80,  spa:95,  spd:80,  spe:90,  moves:["Flare Blitz","Rock Slide","Wild Charge","Extreme Speed"],    category:"hisuian", baseId:59,  gen:8 },
  { id:10303, name:"Voltorb (Hisui)",    sprite:"voltorb-hisui",    type1:"Electric", type2:"Grass",    hp:40,  atk:30,  def:50,  spa:55,  spd:55,  spe:100, moves:["Thunderbolt","Energy Ball","Spark","Self-Destruct"],         category:"hisuian", baseId:100, gen:8 },
  { id:10304, name:"Electrode (Hisui)",  sprite:"electrode-hisui",  type1:"Electric", type2:"Grass",    hp:60,  atk:50,  def:70,  spa:80,  spd:80,  spe:150, moves:["Thunder","Energy Ball","Thunderbolt","Explosion"],           category:"hisuian", baseId:101, gen:8 },
  { id:10305, name:"Typhlosion (Hisui)", sprite:"typhlosion-hisui", type1:"Fire",     type2:"Ghost",    hp:84,  atk:84,  def:78,  spa:109, spd:85,  spe:100, moves:["Shadow Ball","Flamethrower","Infernal Parade","Hex"],        category:"hisuian", baseId:157, gen:8 },
  { id:10306, name:"Qwilfish (Hisui)",   sprite:"qwilfish-hisui",   type1:"Dark",     type2:"Poison",   hp:65,  atk:95,  def:85,  spa:55,  spd:55,  spe:85,  moves:["Barb Barrage","Crunch","Poison Jab","Toxic Spikes"],         category:"hisuian", baseId:211, gen:8 },
  { id:10307, name:"Sneasel (Hisui)",    sprite:"sneasel-hisui",    type1:"Fighting", type2:"Poison",   hp:55,  atk:95,  def:55,  spa:35,  spd:75,  spe:115, moves:["Triple Axel","Poison Jab","Close Combat","Swords Dance"],    category:"hisuian", baseId:215, gen:8 },
  { id:10308, name:"Samurott (Hisui)",   sprite:"samurott-hisui",   type1:"Water",    type2:"Dark",     hp:90,  atk:108, def:80,  spa:100, spd:65,  spe:108, moves:["Ceaseless Edge","Surging Strikes","Night Slash","Swords Dance"], category:"hisuian", baseId:503, gen:8 },
  { id:10309, name:"Lilligant (Hisui)",  sprite:"lilligant-hisui",  type1:"Grass",    type2:"Fighting", hp:70,  atk:105, def:75,  spa:50,  spd:75,  spe:105, moves:["Victory Dance","Leaf Blade","Close Combat","Sleep Powder"],  category:"hisuian", baseId:549, gen:8 },
  { id:10310, name:"Zorua (Hisui)",      sprite:"zorua-hisui",      type1:"Normal",   type2:"Ghost",    hp:35,  atk:60,  def:40,  spa:65,  spd:40,  spe:42,  moves:["Astonish","Scratch","Night Daze","Memento"],                 category:"hisuian", baseId:570, gen:8 },
  { id:10311, name:"Zoroark (Hisui)",    sprite:"zoroark-hisui",    type1:"Normal",   type2:"Ghost",    hp:55,  atk:100, def:60,  spa:120, spd:60,  spe:105, moves:["Shadow Ball","Bitter Malice","Night Daze","Nasty Plot"],     category:"hisuian", baseId:571, gen:8 },
  { id:10312, name:"Braviary (Hisui)",   sprite:"braviary-hisui",   type1:"Psychic",  type2:"Flying",   hp:110, atk:83,  def:70,  spa:112, spd:70,  spe:65,  moves:["Esper Wing","Air Slash","Psycho Cut","Calm Mind"],           category:"hisuian", baseId:628, gen:8 },
  { id:10313, name:"Goodra (Hisui)",     sprite:"goodra-hisui",     type1:"Steel",    type2:"Dragon",   hp:80,  atk:100, def:100, spa:110, spd:150, spe:60,  moves:["Dragon Pulse","Iron Defense","Aqua Tail","Shelter"],         category:"hisuian", baseId:706, gen:8 },
  { id:10314, name:"Avalugg (Hisui)",    sprite:"avalugg-hisui",    type1:"Ice",      type2:"Rock",     hp:95,  atk:127, def:184, spa:34,  spd:36,  spe:28,  moves:["Avalanche","Stone Edge","Rapid Spin","Earthquake"],          category:"hisuian", baseId:713, gen:8 },
  { id:10315, name:"Decidueye (Hisui)",  sprite:"decidueye-hisui",  type1:"Grass",    type2:"Fighting", hp:88,  atk:112, def:80,  spa:95,  spd:95,  spe:60,  moves:["Triple Arrows","Leaf Blade","Close Combat","Swords Dance"],  category:"hisuian", baseId:724, gen:8 },

  // ── PALDEAN FORMS ────────────────────────────────────────────
  { id:10401, name:"Tauros (Combat)",    sprite:"tauros-paldeacombat", type1:"Fighting", type2:null,    hp:75,  atk:110, def:105, spa:30,  spd:70,  spe:100, moves:["Close Combat","Zen Headbutt","Earthquake","Bulk Up"],        category:"paldean", baseId:128, gen:9 },
  { id:10402, name:"Tauros (Blaze)",     sprite:"tauros-paldeafire",   type1:"Fighting", type2:"Fire",  hp:75,  atk:110, def:105, spa:30,  spd:70,  spe:100, moves:["Flare Blitz","Close Combat","Bulk Up","Earthquake"],         category:"paldean", baseId:128, gen:9 },
  { id:10403, name:"Tauros (Aqua)",      sprite:"tauros-paldeawater",  type1:"Fighting", type2:"Water", hp:75,  atk:110, def:105, spa:30,  spd:70,  spe:100, moves:["Aqua Jet","Close Combat","Bulk Up","Earthquake"],            category:"paldean", baseId:128, gen:9 },
  { id:10404, name:"Wooper (Paldea)",    sprite:"wooper-paldea",       type1:"Poison",   type2:"Ground",hp:55,  atk:45,  def:45,  spa:25,  spd:25,  spe:15,  moves:["Sludge Bomb","Earthquake","Poison Jab","Amnesia"],           category:"paldean", baseId:194, gen:9 },

  // ── OTHER ALTERNATE FORMS ─────────────────────────────────────
  { id:10501, name:"Deoxys (Attack)",    sprite:"deoxys-attack",    type1:"Psychic",  type2:null,       hp:50,  atk:180, def:20,  spa:180, spd:20,  spe:150, moves:["Psycho Boost","Zap Cannon","Ice Beam","Extreme Speed"],       category:"other", baseId:386, gen:3 },
  { id:10502, name:"Deoxys (Defense)",   sprite:"deoxys-defense",   type1:"Psychic",  type2:null,       hp:50,  atk:70,  def:160, spa:70,  spd:160, spe:90,  moves:["Psycho Boost","Recover","Stealth Rock","Cosmic Power"],       category:"other", baseId:386, gen:3 },
  { id:10503, name:"Deoxys (Speed)",     sprite:"deoxys-speed",     type1:"Psychic",  type2:null,       hp:50,  atk:95,  def:90,  spa:95,  spd:90,  spe:180, moves:["Psycho Boost","Extreme Speed","Ice Beam","Spikes"],           category:"other", baseId:386, gen:3 },
  { id:10504, name:"Wormadam (Sandy)",   sprite:"wormadam-sandy",   type1:"Bug",      type2:"Ground",   hp:60,  atk:79,  def:105, spa:59,  spd:85,  spe:36,  moves:["Earthquake","Bug Bite","Stealth Rock","Protect"],             category:"other", baseId:413, gen:4 },
  { id:10505, name:"Wormadam (Trash)",   sprite:"wormadam-trash",   type1:"Bug",      type2:"Steel",    hp:60,  atk:69,  def:95,  spa:69,  spd:95,  spe:36,  moves:["Iron Head","Bug Bite","Protect","Flash Cannon"],              category:"other", baseId:413, gen:4 },
  { id:10506, name:"Rotom (Heat)",       sprite:"rotom-heat",       type1:"Electric", type2:"Fire",     hp:50,  atk:65,  def:107, spa:105, spd:107, spe:86,  moves:["Overheat","Thunderbolt","Shadow Ball","Volt Switch"],          category:"other", baseId:479, gen:4 },
  { id:10507, name:"Rotom (Wash)",       sprite:"rotom-wash",       type1:"Electric", type2:"Water",    hp:50,  atk:65,  def:107, spa:105, spd:107, spe:86,  moves:["Hydro Pump","Thunderbolt","Shadow Ball","Volt Switch"],        category:"other", baseId:479, gen:4 },
  { id:10508, name:"Rotom (Frost)",      sprite:"rotom-frost",      type1:"Electric", type2:"Ice",      hp:50,  atk:65,  def:107, spa:105, spd:107, spe:86,  moves:["Blizzard","Thunderbolt","Shadow Ball","Volt Switch"],          category:"other", baseId:479, gen:4 },
  { id:10509, name:"Rotom (Fan)",        sprite:"rotom-fan",        type1:"Electric", type2:"Flying",   hp:50,  atk:65,  def:107, spa:105, spd:107, spe:86,  moves:["Air Slash","Thunderbolt","Shadow Ball","Volt Switch"],         category:"other", baseId:479, gen:4 },
  { id:10510, name:"Rotom (Mow)",        sprite:"rotom-mow",        type1:"Electric", type2:"Grass",    hp:50,  atk:65,  def:107, spa:105, spd:107, spe:86,  moves:["Leaf Storm","Thunderbolt","Shadow Ball","Volt Switch"],        category:"other", baseId:479, gen:4 },
  { id:10511, name:"Giratina (Origin)",  sprite:"giratina-origin",  type1:"Ghost",    type2:"Dragon",   hp:150, atk:120, def:100, spa:120, spd:100, spe:90,  moves:["Shadow Force","Dragon Pulse","Aura Sphere","Hex"],            category:"other", baseId:487, gen:4 },
  { id:10512, name:"Shaymin (Sky)",      sprite:"shaymin-sky",      type1:"Grass",    type2:"Flying",   hp:100, atk:103, def:75,  spa:120, spd:75,  spe:127, moves:["Seed Flare","Air Slash","Earth Power","Synthesis"],           category:"other", baseId:492, gen:4 },
  { id:10513, name:"Tornadus (Therian)", sprite:"tornadus-therian", type1:"Flying",   type2:null,       hp:79,  atk:100, def:80,  spa:110, spd:90,  spe:121, moves:["Hurricane","Focus Blast","Knock Off","Nasty Plot"],           category:"other", baseId:641, gen:5 },
  { id:10514, name:"Thundurus (Therian)",sprite:"thundurus-therian",type1:"Electric", type2:"Flying",   hp:79,  atk:105, def:70,  spa:145, spd:80,  spe:101, moves:["Thunder","Focus Blast","Knock Off","Nasty Plot"],             category:"other", baseId:642, gen:5 },
  { id:10515, name:"Landorus (Therian)", sprite:"landorus-therian", type1:"Ground",   type2:"Flying",   hp:89,  atk:145, def:90,  spa:105, spd:80,  spe:91,  moves:["Earthquake","Stone Edge","U-turn","Rock Polish"],             category:"other", baseId:645, gen:5 },
  { id:10516, name:"Kyurem (Black)",     sprite:"kyurem-black",     type1:"Dragon",   type2:"Ice",      hp:125, atk:170, def:100, spa:120, spd:90,  spe:95,  moves:["Fusion Bolt","Ice Burn","Dragon Claw","Freeze Shock"],        category:"other", baseId:646, gen:5 },
  { id:10517, name:"Kyurem (White)",     sprite:"kyurem-white",     type1:"Dragon",   type2:"Ice",      hp:125, atk:120, def:90,  spa:170, spd:100, spe:95,  moves:["Fusion Flare","Ice Burn","Draco Meteor","Blizzard"],          category:"other", baseId:646, gen:5 },
  { id:10518, name:"Meloetta (Pirouette)",sprite:"meloetta-pirouette",type1:"Normal", type2:"Fighting", hp:100, atk:128, def:90,  spa:77,  spd:77,  spe:128, moves:["Relic Song","Close Combat","Hyper Voice","Teeter Dance"],     category:"other", baseId:648, gen:5 },
  { id:10519, name:"Zygarde (10%)",      sprite:"zygarde10",        type1:"Dragon",   type2:"Ground",   hp:54,  atk:100, def:71,  spa:61,  spd:85,  spe:115, moves:["Thousand Arrows","Dragon Tail","Coil","Crunch"],              category:"other", baseId:718, gen:6 },
  { id:10520, name:"Hoopa (Unbound)",    sprite:"hoopa-unbound",    type1:"Psychic",  type2:"Dark",     hp:80,  atk:160, def:60,  spa:170, spd:130, spe:80,  moves:["Hyperspace Fury","Psychic","Dark Pulse","Focus Blast"],       category:"other", baseId:720, gen:6 },
  { id:10521, name:"Lycanroc (Midnight)",sprite:"lycanroc-midnight",type1:"Rock",     type2:null,       hp:85,  atk:115, def:75,  spa:55,  spd:75,  spe:82,  moves:["Stone Edge","Crunch","Sucker Punch","Thunder Fang"],          category:"other", baseId:745, gen:7 },
  { id:10522, name:"Lycanroc (Dusk)",    sprite:"lycanroc-dusk",    type1:"Rock",     type2:null,       hp:75,  atk:117, def:65,  spa:55,  spd:65,  spe:110, moves:["Stone Edge","Crunch","Accelerock","Swords Dance"],            category:"other", baseId:745, gen:7 },
  { id:10523, name:"Oricorio (Pompom)",  sprite:"oricorio-pompom",  type1:"Electric", type2:"Flying",   hp:75,  atk:70,  def:70,  spa:98,  spd:70,  spe:93,  moves:["Revelation Dance","Air Slash","Calm Mind","Roost"],          category:"other", baseId:741, gen:7 },
  { id:10524, name:"Oricorio (Pa'u)",    sprite:"oricorio-pau",     type1:"Psychic",  type2:"Flying",   hp:75,  atk:70,  def:70,  spa:98,  spd:70,  spe:93,  moves:["Revelation Dance","Psychic","Calm Mind","Roost"],            category:"other", baseId:741, gen:7 },
  { id:10525, name:"Oricorio (Sensu)",   sprite:"oricorio-sensu",   type1:"Ghost",    type2:"Flying",   hp:75,  atk:70,  def:70,  spa:98,  spd:70,  spe:93,  moves:["Revelation Dance","Shadow Ball","Calm Mind","Roost"],        category:"other", baseId:741, gen:7 },
  { id:10526, name:"Necrozma (Dusk Mane)",sprite:"necrozma-duskmane",type1:"Psychic", type2:"Steel",    hp:97,  atk:157, def:127, spa:113, spd:109, spe:77,  moves:["Sunsteel Strike","Photon Geyser","Dragon Pulse","Morning Sun"], category:"other", baseId:800, gen:7 },
  { id:10527, name:"Necrozma (Dawn Wings)",sprite:"necrozma-dawnwings",type1:"Psychic",type2:"Ghost",   hp:97,  atk:113, def:109, spa:157, spd:127, spe:77,  moves:["Moongeist Beam","Photon Geyser","Dark Pulse","Moonlight"],    category:"other", baseId:800, gen:7 },
  { id:10528, name:"Urshifu (Rapid)",    sprite:"urshifurapidstrike",type1:"Fighting",type2:"Water",    hp:100, atk:130, def:100, spa:63,  spd:60,  spe:97,  moves:["Surging Strikes","Close Combat","Aqua Jet","Swords Dance"],   category:"other", baseId:892, gen:8 },
  { id:10529, name:"Calyrex (Ice Rider)",sprite:"calyrex-ice",      type1:"Psychic",  type2:"Ice",      hp:100, atk:165, def:150, spa:85,  spd:130, spe:50,  moves:["Glacial Lance","Psychic","High Horsepower","Swords Dance"],   category:"other", baseId:898, gen:8 },
  { id:10530, name:"Calyrex (Shadow)",   sprite:"calyrex-shadow",   type1:"Psychic",  type2:"Ghost",    hp:100, atk:85,  def:80,  spa:165, spd:100, spe:150, moves:["Astral Barrage","Psychic","Nasty Plot","Energy Ball"],        category:"other", baseId:898, gen:8 },

  // ── UNOWN FORMS (B–Z, !, ?) ───────────────────────────────────
  { id:10531, name:"Unown (B)",  sprite:"unown-b",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10532, name:"Unown (C)",  sprite:"unown-c",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10533, name:"Unown (D)",  sprite:"unown-d",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10534, name:"Unown (E)",  sprite:"unown-e",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10535, name:"Unown (F)",  sprite:"unown-f",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10536, name:"Unown (G)",  sprite:"unown-g",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10537, name:"Unown (H)",  sprite:"unown-h",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10538, name:"Unown (I)",  sprite:"unown-i",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10539, name:"Unown (J)",  sprite:"unown-j",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10540, name:"Unown (K)",  sprite:"unown-k",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10541, name:"Unown (L)",  sprite:"unown-l",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10542, name:"Unown (M)",  sprite:"unown-m",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10543, name:"Unown (N)",  sprite:"unown-n",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10544, name:"Unown (O)",  sprite:"unown-o",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10545, name:"Unown (P)",  sprite:"unown-p",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10546, name:"Unown (Q)",  sprite:"unown-q",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10547, name:"Unown (R)",  sprite:"unown-r",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10548, name:"Unown (S)",  sprite:"unown-s",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10549, name:"Unown (T)",  sprite:"unown-t",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10550, name:"Unown (U)",  sprite:"unown-u",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10551, name:"Unown (V)",  sprite:"unown-v",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10552, name:"Unown (W)",  sprite:"unown-w",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10553, name:"Unown (X)",  sprite:"unown-x",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10554, name:"Unown (Y)",  sprite:"unown-y",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10555, name:"Unown (Z)",  sprite:"unown-z",           type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10556, name:"Unown (!)",  sprite:"unown-exclamation", type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },
  { id:10557, name:"Unown (?)",  sprite:"unown-question",    type1:"Psychic", type2:null, hp:48, atk:72, def:48, spa:72, spd:48, spe:48, moves:["Hidden Power"], category:"other", baseId:201, gen:2 },

  // ── CASTFORM WEATHER FORMS ────────────────────────────────────
  { id:10558, name:"Castform (Sunny)",  sprite:"castform-sunny",  type1:"Fire",  type2:null, hp:70, atk:70, def:70, spa:70, spd:70, spe:70, moves:["Fire Blast","Sunny Day","Weather Ball","Morning Sun"],  category:"other", baseId:351, gen:3 },
  { id:10559, name:"Castform (Rainy)",  sprite:"castform-rainy",  type1:"Water", type2:null, hp:70, atk:70, def:70, spa:70, spd:70, spe:70, moves:["Hydro Pump","Rain Dance","Weather Ball","Thunder"],      category:"other", baseId:351, gen:3 },
  { id:10560, name:"Castform (Snowy)",  sprite:"castform-snowy",  type1:"Ice",   type2:null, hp:70, atk:70, def:70, spa:70, spd:70, spe:70, moves:["Blizzard","Hail","Weather Ball","Ice Beam"],             category:"other", baseId:351, gen:3 },

  // ── CHERRIM SUNSHINE ─────────────────────────────────────────
  { id:10561, name:"Cherrim (Sunshine)", sprite:"cherrim-sunshine", type1:"Grass", type2:null, hp:70, atk:60, def:70, spa:87, spd:78, spe:85, moves:["Petal Blizzard","Solar Beam","Sunny Day","Aromatherapy"], category:"other", baseId:421, gen:4 },

  // ── SHELLOS & GASTRODON EAST SEA ─────────────────────────────
  { id:10562, name:"Shellos (East)",   sprite:"shellos-east",   type1:"Water", type2:null,    hp:76, atk:48, def:48, spa:57, spd:62, spe:34, moves:["Muddy Water","Water Pulse","Earth Power","Rain Dance"], category:"other", baseId:422, gen:4 },
  { id:10563, name:"Gastrodon (East)", sprite:"gastrodon-east", type1:"Water", type2:"Ground", hp:111, atk:83, def:68, spa:92, spd:82, spe:39, moves:["Muddy Water","Earth Power","Scald","Recover"],        category:"other", baseId:423, gen:4 },

  // ── BURMY CLOAKS ─────────────────────────────────────────────
  { id:10564, name:"Burmy (Sandy)",  sprite:"burmy-sandy",  type1:"Bug", type2:null, hp:40, atk:29, def:45, spa:29, spd:45, spe:36, moves:["Bug Bite","Protect","Tackle","Sand Attack"],   category:"other", baseId:412, gen:4 },
  { id:10565, name:"Burmy (Trash)",  sprite:"burmy-trash",  type1:"Bug", type2:null, hp:40, atk:29, def:45, spa:29, spd:45, spe:36, moves:["Bug Bite","Protect","Tackle","Iron Defense"],   category:"other", baseId:412, gen:4 },

  // ── BASCULIN BLUE-STRIPED ─────────────────────────────────────
  { id:10566, name:"Basculin (Blue-Striped)", sprite:"basculin-bluestriped", type1:"Water", type2:null, hp:70, atk:92, def:65, spa:80, spd:55, spe:98, moves:["Aqua Tail","Crunch","Final Gambit","Wave Crash"], category:"other", baseId:550, gen:5 },

  // ── DEERLING SEASONAL FORMS ───────────────────────────────────
  { id:10567, name:"Deerling (Summer)", sprite:"deerling-summer", type1:"Normal", type2:"Grass", hp:60, atk:60, def:50, spa:40, spd:50, spe:75, moves:["Energy Ball","Double Kick","Agility","Jump Kick"], category:"other", baseId:585, gen:5 },
  { id:10568, name:"Deerling (Autumn)", sprite:"deerling-autumn", type1:"Normal", type2:"Grass", hp:60, atk:60, def:50, spa:40, spd:50, spe:75, moves:["Energy Ball","Double Kick","Agility","Jump Kick"], category:"other", baseId:585, gen:5 },
  { id:10569, name:"Deerling (Winter)", sprite:"deerling-winter", type1:"Normal", type2:"Grass", hp:60, atk:60, def:50, spa:40, spd:50, spe:75, moves:["Energy Ball","Double Kick","Agility","Jump Kick"], category:"other", baseId:585, gen:5 },

  // ── SAWSBUCK SEASONAL FORMS ───────────────────────────────────
  { id:10570, name:"Sawsbuck (Summer)", sprite:"sawsbuck-summer", type1:"Normal", type2:"Grass", hp:80, atk:100, def:70, spa:60, spd:70, spe:95, moves:["Horn Leech","Jump Kick","Nature Power","Double Edge"], category:"other", baseId:586, gen:5 },
  { id:10571, name:"Sawsbuck (Autumn)", sprite:"sawsbuck-autumn", type1:"Normal", type2:"Grass", hp:80, atk:100, def:70, spa:60, spd:70, spe:95, moves:["Horn Leech","Jump Kick","Nature Power","Double Edge"], category:"other", baseId:586, gen:5 },
  { id:10572, name:"Sawsbuck (Winter)", sprite:"sawsbuck-winter", type1:"Normal", type2:"Grass", hp:80, atk:100, def:70, spa:60, spd:70, spe:95, moves:["Horn Leech","Jump Kick","Nature Power","Double Edge"], category:"other", baseId:586, gen:5 },

  // ── VIVILLON WING PATTERNS ────────────────────────────────────
  { id:10573, name:"Vivillon (Archipelago)", sprite:"vivillon-archipelago", type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10574, name:"Vivillon (Continental)", sprite:"vivillon-continental", type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10575, name:"Vivillon (Elegant)",     sprite:"vivillon-elegant",     type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10576, name:"Vivillon (Fancy)",       sprite:"vivillon-fancy",       type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10577, name:"Vivillon (Garden)",      sprite:"vivillon-garden",      type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10578, name:"Vivillon (High Plains)", sprite:"vivillon-highplains",  type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10579, name:"Vivillon (Icy Snow)",    sprite:"vivillon-icysnow",     type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10580, name:"Vivillon (Jungle)",      sprite:"vivillon-jungle",      type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10581, name:"Vivillon (Marine)",      sprite:"vivillon-marine",      type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10582, name:"Vivillon (Modern)",      sprite:"vivillon-modern",      type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10583, name:"Vivillon (Monsoon)",     sprite:"vivillon-monsoon",     type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10584, name:"Vivillon (Ocean)",       sprite:"vivillon-ocean",       type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10585, name:"Vivillon (Polar)",       sprite:"vivillon-polar",       type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10586, name:"Vivillon (River)",       sprite:"vivillon-river",       type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10587, name:"Vivillon (Sandstorm)",   sprite:"vivillon-sandstorm",   type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10588, name:"Vivillon (Savanna)",     sprite:"vivillon-savanna",     type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10589, name:"Vivillon (Sun)",         sprite:"vivillon-sun",         type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10590, name:"Vivillon (Tundra)",      sprite:"vivillon-tundra",      type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },
  { id:10591, name:"Vivillon (Poke Ball)",   sprite:"vivillon-pokeball",    type1:"Bug", type2:"Flying", hp:80, atk:52, def:50, spa:90, spd:50, spe:89, moves:["Powder","Hurricane","Quiver Dance","Bug Buzz"], category:"other", baseId:666, gen:6 },

  // ── ZYGARDE COMPLETE ─────────────────────────────────────────
  { id:10592, name:"Zygarde (Complete)", sprite:"zygarde-complete", type1:"Dragon", type2:"Ground", hp:216, atk:100, def:121, spa:91, spd:95, spe:85, moves:["Core Enforcer","Thousand Arrows","Extreme Speed","Coil"], category:"other", baseId:718, gen:6 },

  // ── FLABÉBÉ COLOR FORMS ───────────────────────────────────────
  { id:10593, name:"Flabebe (Yellow)", sprite:"flabebe-yellow", type1:"Fairy", type2:null, hp:44, atk:38, def:39, spa:61, spd:79, spe:42, moves:["Moonblast","Fairy Wind","Aromatherapy","Wish"], category:"other", baseId:669, gen:6 },
  { id:10594, name:"Flabebe (Orange)", sprite:"flabebe-orange", type1:"Fairy", type2:null, hp:44, atk:38, def:39, spa:61, spd:79, spe:42, moves:["Moonblast","Fairy Wind","Aromatherapy","Wish"], category:"other", baseId:669, gen:6 },
  { id:10595, name:"Flabebe (Blue)",   sprite:"flabebe-blue",   type1:"Fairy", type2:null, hp:44, atk:38, def:39, spa:61, spd:79, spe:42, moves:["Moonblast","Fairy Wind","Aromatherapy","Wish"], category:"other", baseId:669, gen:6 },
  { id:10596, name:"Flabebe (White)",  sprite:"flabebe-white",  type1:"Fairy", type2:null, hp:44, atk:38, def:39, spa:61, spd:79, spe:42, moves:["Moonblast","Fairy Wind","Aromatherapy","Wish"], category:"other", baseId:669, gen:6 },

  // ── FLOETTE COLOR FORMS ───────────────────────────────────────
  { id:10597, name:"Floette (Yellow)", sprite:"floette-yellow", type1:"Fairy", type2:null, hp:54, atk:45, def:47, spa:75, spd:98, spe:52, moves:["Moonblast","Dazzling Gleam","Aromatherapy","Wish"], category:"other", baseId:670, gen:6 },
  { id:10598, name:"Floette (Orange)", sprite:"floette-orange", type1:"Fairy", type2:null, hp:54, atk:45, def:47, spa:75, spd:98, spe:52, moves:["Moonblast","Dazzling Gleam","Aromatherapy","Wish"], category:"other", baseId:670, gen:6 },
  { id:10599, name:"Floette (Blue)",   sprite:"floette-blue",   type1:"Fairy", type2:null, hp:54, atk:45, def:47, spa:75, spd:98, spe:52, moves:["Moonblast","Dazzling Gleam","Aromatherapy","Wish"], category:"other", baseId:670, gen:6 },
  { id:10600, name:"Floette (White)",  sprite:"floette-white",  type1:"Fairy", type2:null, hp:54, atk:45, def:47, spa:75, spd:98, spe:52, moves:["Moonblast","Dazzling Gleam","Aromatherapy","Wish"], category:"other", baseId:670, gen:6 },

  // ── FURFROU TRIMS ─────────────────────────────────────────────
  { id:10601, name:"Furfrou (Heart)",     sprite:"furfrou-heart",     type1:"Normal", type2:null, hp:75, atk:80, def:60, spa:65, spd:90, spe:102, moves:["Retaliate","Return","Charm","Sucker Punch"], category:"other", baseId:676, gen:6 },
  { id:10602, name:"Furfrou (Star)",      sprite:"furfrou-star",      type1:"Normal", type2:null, hp:75, atk:80, def:60, spa:65, spd:90, spe:102, moves:["Retaliate","Return","Charm","Sucker Punch"], category:"other", baseId:676, gen:6 },
  { id:10603, name:"Furfrou (Diamond)",   sprite:"furfrou-diamond",   type1:"Normal", type2:null, hp:75, atk:80, def:60, spa:65, spd:90, spe:102, moves:["Retaliate","Return","Charm","Sucker Punch"], category:"other", baseId:676, gen:6 },
  { id:10604, name:"Furfrou (Debutante)", sprite:"furfrou-debutante", type1:"Normal", type2:null, hp:75, atk:80, def:60, spa:65, spd:90, spe:102, moves:["Retaliate","Return","Charm","Sucker Punch"], category:"other", baseId:676, gen:6 },
  { id:10605, name:"Furfrou (Matron)",    sprite:"furfrou-matron",    type1:"Normal", type2:null, hp:75, atk:80, def:60, spa:65, spd:90, spe:102, moves:["Retaliate","Return","Charm","Sucker Punch"], category:"other", baseId:676, gen:6 },
  { id:10606, name:"Furfrou (Dandy)",     sprite:"furfrou-dandy",     type1:"Normal", type2:null, hp:75, atk:80, def:60, spa:65, spd:90, spe:102, moves:["Retaliate","Return","Charm","Sucker Punch"], category:"other", baseId:676, gen:6 },
  { id:10607, name:"Furfrou (La Reine)",  sprite:"furfrou-lareine",   type1:"Normal", type2:null, hp:75, atk:80, def:60, spa:65, spd:90, spe:102, moves:["Retaliate","Return","Charm","Sucker Punch"], category:"other", baseId:676, gen:6 },
  { id:10608, name:"Furfrou (Kabuki)",    sprite:"furfrou-kabuki",    type1:"Normal", type2:null, hp:75, atk:80, def:60, spa:65, spd:90, spe:102, moves:["Retaliate","Return","Charm","Sucker Punch"], category:"other", baseId:676, gen:6 },
  { id:10609, name:"Furfrou (Pharaoh)",   sprite:"furfrou-pharaoh",   type1:"Normal", type2:null, hp:75, atk:80, def:60, spa:65, spd:90, spe:102, moves:["Retaliate","Return","Charm","Sucker Punch"], category:"other", baseId:676, gen:6 },

  // ── MEOWSTIC FEMALE ───────────────────────────────────────────
  { id:10610, name:"Meowstic (Female)", sprite:"meowstic-f", type1:"Psychic", type2:null, hp:74, atk:48, def:76, spa:83, spd:81, spe:104, moves:["Psychic","Shadow Ball","Moonblast","Helping Hand"], category:"other", baseId:678, gen:6 },

  // ── AEGISLASH BLADE ───────────────────────────────────────────
  { id:10611, name:"Aegislash (Blade)", sprite:"aegislash-blade", type1:"Steel", type2:"Ghost", hp:60, atk:150, def:50, spa:150, spd:50, spe:60, moves:["Shadow Sneak","Kings Shield","Sacred Sword","Shadow Ball"], category:"other", baseId:681, gen:6 },

  // ── PUMPKABOO SIZE FORMS ──────────────────────────────────────
  { id:10612, name:"Pumpkaboo (Small)", sprite:"pumpkaboo-small", type1:"Ghost", type2:"Grass", hp:44, atk:66, def:70, spa:44, spd:55, spe:56, moves:["Shadow Ball","Leech Seed","Will-O-Wisp","Trick Or Treat"], category:"other", baseId:710, gen:6 },
  { id:10613, name:"Pumpkaboo (Large)", sprite:"pumpkaboo-large", type1:"Ghost", type2:"Grass", hp:54, atk:66, def:70, spa:44, spd:55, spe:42, moves:["Shadow Ball","Leech Seed","Will-O-Wisp","Trick Or Treat"], category:"other", baseId:710, gen:6 },
  { id:10614, name:"Pumpkaboo (Super)", sprite:"pumpkaboo-super", type1:"Ghost", type2:"Grass", hp:59, atk:66, def:70, spa:44, spd:55, spe:36, moves:["Shadow Ball","Leech Seed","Will-O-Wisp","Trick Or Treat"], category:"other", baseId:710, gen:6 },

  // ── GOURGEIST SIZE FORMS ──────────────────────────────────────
  { id:10615, name:"Gourgeist (Small)", sprite:"gourgeist-small", type1:"Ghost", type2:"Grass", hp:55, atk:85,  def:122, spa:58, spd:75, spe:99, moves:["Shadow Ball","Leech Seed","Phantom Force","Will-O-Wisp"], category:"other", baseId:711, gen:6 },
  { id:10616, name:"Gourgeist (Large)", sprite:"gourgeist-large", type1:"Ghost", type2:"Grass", hp:75, atk:95,  def:122, spa:58, spd:75, spe:69, moves:["Shadow Ball","Leech Seed","Phantom Force","Will-O-Wisp"], category:"other", baseId:711, gen:6 },
  { id:10617, name:"Gourgeist (Super)", sprite:"gourgeist-super", type1:"Ghost", type2:"Grass", hp:85, atk:100, def:122, spa:58, spd:75, spe:54, moves:["Shadow Ball","Leech Seed","Phantom Force","Will-O-Wisp"], category:"other", baseId:711, gen:6 },

  // ── WISHIWASHI SCHOOL ─────────────────────────────────────────
  { id:10618, name:"Wishiwashi (School)", sprite:"wishiwashi-school", type1:"Water", type2:null, hp:45, atk:140, def:130, spa:140, spd:135, spe:30, moves:["Aqua Tail","Liquidation","Ice Beam","Endeavor"], category:"other", baseId:746, gen:7 },

  // ── MINIOR CORE COLORS ────────────────────────────────────────
  { id:10619, name:"Minior (Red Core)",    sprite:"minior-red",    type1:"Rock", type2:"Flying", hp:60, atk:100, def:60, spa:100, spd:60, spe:120, moves:["Acrobatics","Power Gem","Shell Smash","Swift"], category:"other", baseId:774, gen:7 },
  { id:10620, name:"Minior (Orange Core)", sprite:"minior-orange", type1:"Rock", type2:"Flying", hp:60, atk:100, def:60, spa:100, spd:60, spe:120, moves:["Acrobatics","Power Gem","Shell Smash","Swift"], category:"other", baseId:774, gen:7 },
  { id:10621, name:"Minior (Yellow Core)", sprite:"minior-yellow", type1:"Rock", type2:"Flying", hp:60, atk:100, def:60, spa:100, spd:60, spe:120, moves:["Acrobatics","Power Gem","Shell Smash","Swift"], category:"other", baseId:774, gen:7 },
  { id:10622, name:"Minior (Green Core)",  sprite:"minior-green",  type1:"Rock", type2:"Flying", hp:60, atk:100, def:60, spa:100, spd:60, spe:120, moves:["Acrobatics","Power Gem","Shell Smash","Swift"], category:"other", baseId:774, gen:7 },
  { id:10623, name:"Minior (Blue Core)",   sprite:"minior-blue",   type1:"Rock", type2:"Flying", hp:60, atk:100, def:60, spa:100, spd:60, spe:120, moves:["Acrobatics","Power Gem","Shell Smash","Swift"], category:"other", baseId:774, gen:7 },
  { id:10624, name:"Minior (Indigo Core)", sprite:"minior-indigo", type1:"Rock", type2:"Flying", hp:60, atk:100, def:60, spa:100, spd:60, spe:120, moves:["Acrobatics","Power Gem","Shell Smash","Swift"], category:"other", baseId:774, gen:7 },
  { id:10625, name:"Minior (Violet Core)", sprite:"minior-violet", type1:"Rock", type2:"Flying", hp:60, atk:100, def:60, spa:100, spd:60, spe:120, moves:["Acrobatics","Power Gem","Shell Smash","Swift"], category:"other", baseId:774, gen:7 },

  // ── MIMIKYU BUSTED ────────────────────────────────────────────
  { id:10626, name:"Mimikyu (Busted)", sprite:"mimikyu-busted", type1:"Ghost", type2:"Fairy", hp:55, atk:90, def:80, spa:50, spd:105, spe:96, moves:["Shadow Sneak","Play Rough","Wood Hammer","Swords Dance"], category:"other", baseId:778, gen:7 },

  // ── TOXTRICITY LOW KEY ────────────────────────────────────────
  { id:10627, name:"Toxtricity (Low Key)", sprite:"toxtricity-lowkey", type1:"Electric", type2:"Poison", hp:75, atk:98, def:70, spa:114, spd:70, spe:75, moves:["Discharge","Sludge Wave","Shift Gear","Venoshock"], category:"other", baseId:849, gen:8 },

  // ── INDEEDEE FEMALE ───────────────────────────────────────────
  { id:10628, name:"Indeedee (Female)", sprite:"indeedee-f", type1:"Psychic", type2:"Normal", hp:70, atk:55, def:65, spa:95, spd:110, spe:85, moves:["Psychic","Dazzling Gleam","Follow Me","Healing Wish"], category:"other", baseId:876, gen:8 },

  // ── ENAMORUS THERIAN ──────────────────────────────────────────
  { id:10629, name:"Enamorus (Therian)", sprite:"enamorus-therian", type1:"Fairy", type2:"Flying", hp:74, atk:115, def:80, spa:115, spd:90, spe:106, moves:["Springtide Storm","Earth Power","Fly","Calm Mind"], category:"other", baseId:905, gen:8 },

  // ── PALAFIN HERO ─────────────────────────────────────────────
  { id:10630, name:"Palafin (Hero)", sprite:"palafin-hero", type1:"Water", type2:null, hp:100, atk:160, def:97, spa:106, spd:87, spe:100, moves:["Wave Crash","Flip Turn","Jet Punch","Mach Punch"], category:"other", baseId:964, gen:9 },

  // ── MAUSHOLD FAMILY OF THREE ──────────────────────────────────
  { id:10631, name:"Maushold (Three)", sprite:"maushold-three", type1:"Normal", type2:null, hp:74, atk:75, def:70, spa:65, spd:75, spe:111, moves:["Population Bomb","Tidy Up","After You","Helping Hand"], category:"other", baseId:925, gen:9 },

  // ── SQUAWKABILLY COLOR FORMS ──────────────────────────────────
  { id:10632, name:"Squawkabilly (Blue)",   sprite:"squawkabilly-blue",   type1:"Normal", type2:"Flying", hp:82, atk:96, def:51, spa:45, spd:51, spe:92, moves:["Boomburst","Brave Bird","Quick Attack","Taunt"], category:"other", baseId:931, gen:9 },
  { id:10633, name:"Squawkabilly (Yellow)", sprite:"squawkabilly-yellow", type1:"Normal", type2:"Flying", hp:82, atk:96, def:51, spa:45, spd:51, spe:92, moves:["Boomburst","Brave Bird","Quick Attack","Taunt"], category:"other", baseId:931, gen:9 },
  { id:10634, name:"Squawkabilly (White)",  sprite:"squawkabilly-white",  type1:"Normal", type2:"Flying", hp:82, atk:96, def:51, spa:45, spd:51, spe:92, moves:["Boomburst","Brave Bird","Quick Attack","Taunt"], category:"other", baseId:931, gen:9 },

  // ── TERAPAGOS STELLAR ────────────────────────────────────────
  { id:10635, name:"Terapagos (Stellar)", sprite:"terapagos-stellar", type1:"Normal", type2:null, hp:160, atk:105, def:110, spa:130, spd:110, spe:85, moves:["Tera Starstorm","Earth Power","Calm Mind","Ancient Power"], category:"other", baseId:1024, gen:9 },

  // ── OGERPON MASK FORMS ────────────────────────────────────────
  { id:10636, name:"Ogerpon (Wellspring)",  sprite:"ogerpon-wellspring",  type1:"Grass", type2:"Water",    hp:80, atk:120, def:84, spa:60, spd:96, spe:110, moves:["Ivy Cudgel","Aqua Cutter","Wood Hammer","Follow Me"], category:"other", baseId:1017, gen:9 },
  { id:10637, name:"Ogerpon (Hearthflame)", sprite:"ogerpon-hearthflame", type1:"Grass", type2:"Fire",     hp:80, atk:120, def:84, spa:60, spd:96, spe:110, moves:["Ivy Cudgel","Fire Lash","Wood Hammer","Follow Me"],  category:"other", baseId:1017, gen:9 },
  { id:10638, name:"Ogerpon (Cornerstone)", sprite:"ogerpon-cornerstone", type1:"Grass", type2:"Rock",     hp:80, atk:120, def:84, spa:60, spd:96, spe:110, moves:["Ivy Cudgel","Rock Smash","Wood Hammer","Follow Me"], category:"other", baseId:1017, gen:9 },
];
