// v0.9.53 Bestiary: 30 new foes, a CC0 pixel sprite for every creature (Angais/pixel-art-atlas-1.4m), and a short cutscene
// the first time you meet each one. Humans keep their generated faces.
import { ENEMIES, GATE_RANKS } from './combat.js';

export const ENEMY_ART = {"hungry_ghost": 0, "jiangshi": 1, "fox_spirit": 2, "corrupt_soul": 3, "yaoguai": 4, "ghost_king": 5, "spirit_wolf": 6, "tiger_beast": 7, "stone_golem": 8, "drowned_ghost": 9, "young_dragon": 10, "void_wraith": 11, "ancient_qilin": 12, "fallen_immortal": 13, "vampire_bat": 14, "cave_spider": 15, "sand_scorpion": 16, "crystal_slime": 17, "mushroom_fiend": 18, "man_eater": 19, "gargoyle": 20, "imp": 21, "wisp": 22, "bone_serpent": 23, "kraken": 24, "hydra": 25, "basilisk": 26, "storm_wyvern": 27, "phoenix": 28, "griffin": 29, "centipede": 30, "eye_horror": 31, "abyss_tentacle": 32, "magma_golem": 33, "frost_golem": 34, "brown_bear": 35, "river_croc": 36, "spirit_deer": 37};
export const ENEMY_COLS = 8;

const E = (id, name, kind, realm, hp, str, agi, moves, mini, extra = {}) => ({ id, name, kind, realm, hp, str, agi, moves, mini, ...extra });
export const NEW_ENEMIES = [
  // people
  E('street_boxer', 'Back-Alley Boxer', 'human', 0, 50, 50, 40, ['jab', 'punch', 'guard'], 'dodge'),
  E('knife_mugger', 'Knife Mugger', 'human', 0, 40, 40, 55, ['jab', 'slap', 'kick'], 'dodge'),
  E('corrupt_cop', 'Corrupt Cop', 'human', 1, 70, 55, 45, ['punch', 'kick', 'guard'], 'dodge'),
  E('poison_alchemist', 'Poison Alchemist', 'human', 3, 140, 50, 60, ['qi_palm', 'jab', 'blood_drain'], 'qi_clash'),
  E('shadow_assassin', 'Shadow Pavilion Assassin', 'human', 4, 190, 70, 95, ['river_step', 'kick', 'jab'], 'dodge'),
  E('iron_monk', 'Fallen Iron Monk', 'human', 5, 380, 105, 45, ['iron_skin', 'thunder_fist', 'punch'], 'weakpoint'),
  // creatures
  E('vampire_bat', 'Blood-Drinker Bat', 'beast', 1, 45, 35, 80, ['jab', 'slap', 'blood_drain'], 'dodge'),
  E('cave_spider', 'Cave Widow Spider', 'beast', 2, 75, 50, 65, ['jab', 'kick', 'slap'], 'dodge'),
  E('sand_scorpion', 'Golden Sand Scorpion', 'beast', 2, 90, 60, 50, ['punch', 'jab', 'kick'], 'weakpoint'),
  E('crystal_slime', 'Crystal Slime', 'spirit', 1, 70, 30, 25, ['slap', 'slap', 'jab', 'iron_skin'], 'weakpoint', { regen: 0.02 }),
  E('mushroom_fiend', 'Red-Cap Mushroom Fiend', 'spirit', 1, 60, 40, 30, ['slap', 'jab'], 'breath'),
  E('man_eater', 'Man-Eater Vine', 'spirit', 2, 110, 60, 20, ['kick', 'slap', 'blood_drain'], 'weakpoint', { regen: 0.02 }),
  E('gargoyle', 'Temple Gargoyle', 'construct', 3, 220, 80, 35, ['punch', 'iron_skin', 'kick'], 'weakpoint'),
  E('imp', 'Grinning Imp', 'spirit', 2, 70, 45, 85, ['jab', 'slap', 'flame_palm'], 'seal'),
  E('wisp', 'Lost Will-o\'-Wisp', 'spirit', 2, 55, 35, 90, ['slap', 'jab', 'blood_drain'], 'seal'),
  E('bone_serpent', 'Bone Serpent', 'spirit', 4, 240, 80, 70, ['kick', 'blood_drain', 'punch'], 'seal'),
  E('kraken', 'Abyssal Kraken', 'beast', 6, 700, 130, 55, ['sword_rain', 'frost_lance', 'guard'], 'weakpoint'),
  E('hydra', 'Nine-Headed Swamp Hydra', 'beast', 7, 900, 140, 50, ['sword_rain', 'blood_drain', 'flame_palm'], 'weakpoint', { regen: 0.02 }),
  E('basilisk', 'Stone-Gaze Basilisk', 'beast', 5, 420, 110, 60, ['earth_prison', 'soul_chains', 'kick'], 'seal'),
  E('storm_wyvern', 'Storm Wyvern', 'beast', 6, 560, 125, 95, ['thunder_fist', 'gale_slash', 'azure_dragon'], 'dodge'),
  E('phoenix', 'Vermilion Phoenix', 'beast', 9, 1100, 150, 110, ['qilin_flame', 'sun_pillar', 'lotus_bloom'], 'seal', { regen: 0.02 }),
  E('griffin', 'Azure Griffin', 'beast', 5, 400, 105, 100, ['gale_slash', 'kick', 'river_step'], 'dodge'),
  E('centipede', 'Thousand-Leg Centipede', 'beast', 3, 200, 75, 70, ['jab', 'kick', 'punch'], 'dodge'),
  E('eye_horror', 'The Watching Eye', 'spirit', 6, 520, 90, 80, ['soul_chains', 'void_rend', 'heaven_mirror'], 'seal'),
  E('abyss_tentacle', 'Thing From the Abyss', 'spirit', 8, 950, 145, 70, ['void_rend', 'soul_chains', 'blood_drain'], 'seal', { regen: 0.02 }),
  E('magma_golem', 'Magma Golem', 'construct', 5, 520, 120, 20, ['flame_palm', 'iron_skin', 'earth_prison'], 'weakpoint'),
  E('frost_golem', 'Frost Golem', 'construct', 4, 380, 100, 20, ['punch', 'iron_skin', 'kick'], 'weakpoint'),
  E('brown_bear', 'Spirit-Touched Bear', 'beast', 2, 130, 80, 35, ['punch', 'kick', 'guard'], 'dodge'),
  E('river_croc', 'River Dragon Crocodile', 'beast', 3, 210, 90, 40, ['kick', 'blood_drain', 'guard'], 'weakpoint'),
  E('spirit_deer', 'Moonlit Spirit Deer', 'beast', 4, 260, 70, 110, ['river_step', 'kick', 'jab'], 'dodge'),
];

// a short cutscene the first time you meet each creature: [motif, colour, line 1, line 2]
export const INTROS = {
  hungry_ghost: ['seal', '#9aa4b8', 'A thin wail from an empty room.', 'It is so hungry it has forgotten what for.'],
  jiangshi: ['seal', '#7fe3a0', 'Something hops in the dark. Thump. Thump.', 'Its arms are stretched out, searching for breath.'],
  fox_spirit: ['lotus', '#ff9a4a', 'A woman smiles at you from the bamboo.', 'Behind her, nine shadows sway like tails.'],
  corrupt_soul: ['crack', '#b18cff', 'A violet flame flickers with a face inside it.', 'It whispers your name, wrongly.'],
  yaoguai: ['crack', '#e05555', 'The trees bend. Something huge is walking through them.', 'Two red eyes open at the height of a roof.'],
  ghost_king: ['seal', '#8a6aff', 'Every candle in the hall goes out at once.', 'A crowned skull rises from the throne.'],
  spirit_wolf: ['mountain', '#7fd1ff', 'Lightning in fur. A howl that crackles.', 'The spirit wolf circles, sparking.'],
  tiger_beast: ['sword', '#ffb02e', 'The grass goes silent.', 'A white tiger the size of a cart steps out of it.'],
  stone_golem: ['crack', '#a0a0a0', 'The cliff face moves.', 'It was never a cliff. It stands up.'],
  drowned_ghost: ['seal', '#4fb3ff', 'Wet footprints lead from the river to your door.', 'It is still dripping.'],
  young_dragon: ['mountain', '#ff7a3a', 'The river boils. A horned head breaks the surface.', 'A flood dragon, young and furious.'],
  void_wraith: ['crack', '#6fe0d0', 'Space folds like paper.', 'A skull floats through the crease, grinning.'],
  ancient_qilin: ['lotus', '#ffd36f', 'Hooves of flame on clouds.', 'The Qilin judges you with ancient, patient eyes.'],
  fallen_immortal: ['lotus', '#bff2ff', 'A pale figure drifts down like snow.', 'It was an immortal once. Now it only remembers falling.'],
  vampire_bat: ['seal', '#d8323e', 'Leathery wings. A shriek too high to hear.', 'It goes for your throat.'],
  cave_spider: ['crack', '#6a4a9a', 'Silk across the tunnel, thick as rope.', 'Eight eyes catch your torchlight.'],
  sand_scorpion: ['sword', '#e0b84a', 'The sand shifts in a ring around you.', 'A golden tail rises, dripping.'],
  crystal_slime: ['seal', '#9ad0ff', 'A wobbling crystal, humming to itself.', 'It is cute. It is also eating a sword.'],
  mushroom_fiend: ['seal', '#e05555', 'A ring of red mushrooms. You stepped inside it.', 'The biggest one opens its eyes.'],
  man_eater: ['crack', '#5fd38a', 'The vines here move without wind.', 'A flower opens: it is all teeth.'],
  gargoyle: ['seal', '#7a8a7a', 'Stone wings crack open on the temple roof.', 'The guardian has decided you are a thief.'],
  imp: ['crack', '#ff4f4f', 'Giggling, from everywhere at once.', 'A little red demon juggles fire and waits.'],
  wisp: ['seal', '#6fe0d0', 'A small light bobs ahead, beckoning.', 'Everyone who followed it is still out there.'],
  bone_serpent: ['crack', '#e9e2cf', 'Bones rattle across the floor and click together.', 'They make a snake. A very long one.'],
  kraken: ['mountain', '#8a1a3a', 'The sea goes flat and black.', 'Then the tentacles come up, all around the boat.'],
  hydra: ['crack', '#3fa36a', 'Nine heads rise from the swamp.', 'Cut one off, they say, and two grow back.'],
  basilisk: ['enso', '#5fd38a', 'Statues in the courtyard, frozen mid-scream.', 'Do not meet its eyes. Do not meet its eyes.'],
  storm_wyvern: ['mountain', '#6a7bff', 'Thunder with wings.', 'The wyvern dives out of the storm cloud at you.'],
  phoenix: ['lotus', '#ff7a1a', 'The sky turns the colour of embers.', 'A phoenix that has died and risen a thousand times. It is not afraid of you.'],
  griffin: ['sword', '#4fa3ff', 'A shadow sweeps across the mountain pass.', 'Eagle head, lion body, very bad temper.'],
  centipede: ['crack', '#c98a3a', 'A sound like a thousand fingers drumming.', 'It pours out of the wall, and keeps coming.'],
  eye_horror: ['enso', '#ff4f6a', 'You feel watched. You have felt watched for days.', 'Now you see it, and it sees you.'],
  abyss_tentacle: ['crack', '#a83a6a', 'The Gate bleeds darkness.', 'Something with too many arms reaches through.'],
  magma_golem: ['mountain', '#ff6a3d', 'The ground glows red.', 'Molten rock stands up in the shape of a man.'],
  frost_golem: ['seal', '#bff2ff', 'Your breath freezes in the air.', 'A hill of ice turns its head toward you.'],
  brown_bear: ['sword', '#8a5a32', 'Snapped branches. A low, rumbling huff.', 'A bear with glowing eyes. The spirit vein got to it first.'],
  river_croc: ['crack', '#3fa36a', 'Two eyes on the water. They do not blink.', 'The log is not a log.'],
  spirit_deer: ['lotus', '#d8dcff', 'A deer made of moonlight, in the middle of the road.', 'It lowers antlers like silver blades.'],
};

// register: into ENEMIES and into the Gate pools by realm
for (const e of NEW_ENEMIES) if (!ENEMIES.some(x => x.id === e.id)) ENEMIES.push(e);
const POOL_BY_REALM = r => r <= 0 ? 'E' : r <= 2 ? 'D' : r <= 3 ? 'C' : r <= 4 ? 'B' : r <= 6 ? 'A' : r <= 7 ? 'S' : r <= 9 ? 'SS' : 'SSS';
for (const e of NEW_ENEMIES) { const g = GATE_RANKS.find(x => x.rank === POOL_BY_REALM(e.realm)); if (g && !g.pool.includes(e.id)) g.pool.push(e.id); }
