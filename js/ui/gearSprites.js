// Hand-made 16x16 pixel sprites for every weapon, armour and charm.
// Masks use letters for palette slots: a = main, b = highlight, c = shadow, h = handle, g = guard/trim, x = accent/glow.
// Outlines are added automatically.
const M = {
  sword: [
    '..............bb', '.............bab', '............bac.', '...........bac..', '..........bac...', '.........bac....', '........bac.....', '.......bac......',
    '..g...bac.......', '..gg.bac........', '...ggac.........', '....gg..........', '...hhgg.........', '..hh..gg........', '.xh.............', '.x..............'],
  dagger: [
    '................', '................', '................', '................', '.........bb.....', '........bab.....', '.......bac......', '......bac.......',
    '.....bac........', '..g.bac.........', '..ggac..........', '...gg...........', '..hhgg..........', '.hh..g..........', '.x..............', '................'],
  saber: [
    '...........bb...', '..........bab...', '.........bac....', '.........bac....', '........bac.....', '........bac.....', '.......bac......', '......bac.......',
    '..g..bac........', '..gg.ac.........', '...gg...........', '....g...........', '...hhg..........', '..hh............', '.xh.............', '.x..............'],
  twin: [
    '..bb........bb..', '..bab......bab..', '...cab....bac...', '....cab..bac....', '.....cabbac.....', '......caac......', '......ga.g......', '.....g.aa.g.....',
    '....gg.cc.gg....', '...hh......hh...', '..hh........hh..', '.xh..........hx.', '.x............x.', '................', '................', '................'],
  staff: [
    '............xbx.', '...........xbbx.', '............bx..', '...........hh...', '..........hh....', '.........hh.....', '........hh......', '.......hh.......',
    '......hh........', '.....hh.........', '....hh..........', '...hh...........', '..hh............', '.hh.............', '.h..............', '................'],
  spear: [
    '.............bb.', '............bab.', '...........bac..', '............c...', '..........gh....', '.........hh.....', '........hh......', '.......hh.......',
    '......hh........', '.....hh.........', '....hh..........', '...hh...........', '..hh............', '.hh.............', 'hh..............', '................'],
  hammer: [
    '.........bbb....', '........baaab...', '.......baaaac...', '......baaaac....', '.......caac.....', '.......hcc......', '......hh........', '.....hh.........',
    '....hh..........', '...hh...........', '..hh............', '.hh.............', '.g..............', '................', '................', '................'],
  glaive: [
    '..........bbb...', '.........baaab..', '........baaac...', '.........acc....', '........xhc.....', '.......hh.......', '......hh........', '.....hh.........',
    '....hh..........', '...hh...........', '..hh............', '.hh.............', 'gh..............', '................', '................', '................'],
  vest: [
    '................', '...gg......gg...', '..gaab....baag..', '..aaab....baaa..', '..aaaab..baaaa..', '..aaaaabbaaaaa..', '..caaaaaaaaaac..', '..caaaaxaaaaac..',
    '..caaaaaaaaaac..', '..caaaaxaaaaac..', '..caaaaaaaaaac..', '..ccaaaaaaaacc..', '...cccccccccc...', '................', '................', '................'],
  robe: [
    '....gg....gg....', '...gaab..baag...', '..aaaabggbaaaa..', '.aaaaaagxaaaaaa.', '.aa.aaagaaaa.aa.', '.aa.caaagaac.aa.', '....caaaagac....', '....caaaaagc....',
    '....gggggggg....', '....caaaaaac....', '...caaaaaaaac...', '...caaaaaaaac...', '..caaaaaaaaaac..', '..caaaaaaaaaac..', '..cccccccccccc..', '................'],
  plate: [
    '................', '...ggg....ggg...', '..gbbbg..gbbbg..', '..gaaab..baaag..', '...aabbbbbbaa...', '...abaaaaaaba...', '...aaxaaaaxaa...', '...cbbbbbbbbc...',
    '...caaaaaaaac...', '...cbbbbbbbbc...', '...caaaaaaaac...', '...cbbbbbbbbc...', '....cccccccc....', '................', '................', '................'],
  mail: [
    '................', '...aa......aa...', '..abab....baba..', '..babab..babab..', '..ababababababa..', '..babababababab..', '..ababababababa..', '..babababababab..',
    '..ababababababa..', '..babababababab..', '..ababababababa..', '..cbcbcbcbcbcbc..', '...cccccccccccc..', '................', '................', '................'],
  mantle: [
    '.....gxxg.......', '....gaaaag......', '...baaaaaab.....', '..baaaaaaaab....', '..aaaaaaaaaab...', '.baaaaaaaaaaab..', '.aaaaaaaaaaaaa..', '.aaacaaaaacaaa..',
    '.aaacaaaaacaaa..', 'baaacaaaaacaaab.', 'aaaacaaaaacaaaa.', 'aaaacaaaaacaaaa.', 'caaacaaaaacaaac.', '.cc.c.cc.c.c.cc.', '................', '................'],
  hide: [
    '................', '..gg.g....g.gg..', '.gggggg..gggggg.', '..aaab....baaa..', '..aaaab..baaaa..', '..aaaaabbaaaaa..', '..caxaaaaaaxac..', '..caaaaaaaaaac..',
    '..caaxaaaaxaac..', '..caaaaaaaaaac..', '..ccaaaaaaaacc..', '..g.g.g.g.g.g...', '................', '................', '................', '................'],
  coin: [
    '................', '................', '.....bbbbbb.....', '....baaaaaab....', '...baaaaaaaab...', '...baaa..aaac...', '...baa.x..aac...', '...baa..x.aac...',
    '...baaa..aaac...', '...baaaaaaaac...', '....caaaaaac....', '.....cccccc.....', '................', '................', '................', '................'],
  feather: [
    '............bb..', '...........baa..', '..........baaa..', '.........baaax..', '........baaax...', '.......baaax....', '......baaax.....', '.....baaax......',
    '....baaax.......', '....aaax........', '...caax.........', '...cax..........', '..hh............', '.hh.............', '.h..............', '................'],
  ring: [
    '................', '................', '................', '.......xx.......', '......xbbx......', '.....gbaabg.....', '....gg....gg....', '...gg......gg...',
    '...g........g...', '...g........g...', '...gg......gg...', '....gg....gg....', '.....gggggg.....', '................', '................', '................'],
  beads: [
    '................', '...aa......aa...', '..a..........a..', '.a............a.', '.a............a.', '.a............a.', '..a..........a..', '...a........a...',
    '....a......a....', '.....aa..aa.....', '.......gg.......', '......gxxg......', '.......gg.......', '........h.......', '........h.......', '................'],
  amulet: [
    '...h.........h..', '....h.......h...', '.....h.....h....', '......h...h.....', '.......hhh......', '.......ggg......', '......gaabg.....', '.....gaaabbg....',
    '.....gaaaabg....', '.....gcaaaag....', '......gcaag.....', '.......ggg......', '................', '................', '................', '................'],
  fang: [
    '..h..........h..', '...h........h...', '....hh....hh....', '......hhhh......', '.....b.bb.b.....', '.....a.aa.a.....', '.....a.aa.a.....', '......caac......',
    '.......cc.......', '................', '................', '................', '................', '................', '................', '................'],
};
// item → template + palette (a, b, c, h, g, x)
const P = (t, a, b, c, h, g, x) => ({ t, pal: { a, b, c, h, g, x } });
export const GEAR_SPRITES = {
  iron_sword: P('sword', '#b9c2cc', '#eef3f8', '#7a8590', '#6a4a2a', '#8a8f98', '#c9a23a'),
  spirit_blade: P('sword', '#7fd1ff', '#d9f4ff', '#3f8ac0', '#2a3a6a', '#5a6ad0', '#bff0ff'),
  demon_saber: P('saber', '#d8323e', '#ff8a8a', '#7a0d16', '#2a0a10', '#4a1a22', '#ff4f6a'),
  bronze_dagger: P('dagger', '#c98a3a', '#f0c27a', '#7a4a1a', '#5a3a1a', '#a06a2a', '#e0b050'),
  wooden_staff: P('staff', '#c9a23a', '#ffe9a0', '#8a6a1a', '#8a5a2a', '#6a4a2a', '#7fe3a0'),
  steel_saber: P('saber', '#d6dde5', '#ffffff', '#8a95a0', '#2a2a30', '#5a5f68', '#c9a23a'),
  twin_daggers: P('twin', '#c9d0d8', '#ffffff', '#7a8590', '#3a2a2a', '#8a6a3a', '#a0a8b0'),
  war_hammer: P('hammer', '#8a8f98', '#c9ced6', '#4a4f58', '#6a4a2a', '#c9a23a', '#ffffff'),
  long_spear: P('spear', '#d0d6de', '#ffffff', '#7a8590', '#8a5a2a', '#c9323e', '#ffffff'),
  jade_sword: P('sword', '#4fc98a', '#bfffd8', '#1f7a4a', '#2a4a3a', '#c9a23a', '#7fffc0'),
  flame_glaive: P('glaive', '#ff7a2a', '#ffd06a', '#a8320f', '#5a2a1a', '#ff4f2a', '#ffef7a'),
  thunder_blade: P('sword', '#9a7aff', '#e6dcff', '#4a2ab0', '#1a1440', '#ffd84a', '#fff27a'),
  void_edge: P('saber', '#3a2a6a', '#8a7aff', '#140a30', '#0a0a14', '#6a4aff', '#c08aff'),
  celestial_sword: P('sword', '#fff4b0', '#ffffff', '#c9a23a', '#8a6a1a', '#ffd84a', '#7fe3ff'),
  padded_robe: P('robe', '#7a5a8a', '#a88ab8', '#4a3a5a', '#000', '#c9a23a', '#e0d0f0'),
  iron_mail: P('mail', '#9aa3ad', '#d0d6de', '#5a626c', '#000', '#5a626c', '#fff'),
  dragon_vest: P('plate', '#d9622b', '#ffb347', '#7a2a0f', '#000', '#ffd84a', '#fff27a'),
  leather_vest: P('vest', '#8a5a2a', '#b98a4a', '#5a3a1a', '#000', '#6a4a2a', '#c9a23a'),
  sect_robe: P('robe', '#3a7ab0', '#7fb8e8', '#1f4a7a', '#000', '#e9e6df', '#ffffff'),
  bronze_plate: P('plate', '#b07a3a', '#e0b070', '#6a4a1a', '#000', '#8a5a2a', '#ffe0a0'),
  beast_hide: P('hide', '#8a6a4a', '#b8987a', '#5a4030', '#000', '#e9e0d0', '#3a2a1a'),
  jade_scale: P('plate', '#3fa36a', '#9affc8', '#1f5a3a', '#000', '#c9a23a', '#bfffd8'),
  void_mantle: P('mantle', '#2a1a4a', '#6a4aff', '#120a24', '#000', '#8a7aff', '#c08aff'),
  celestial_armor: P('plate', '#fff4b0', '#ffffff', '#c9a23a', '#000', '#7fe3ff', '#ffffff'),
  jade_charm: P('amulet', '#4fc98a', '#bfffd8', '#1f7a4a', '#c9b79a', '#c9a23a', '#fff'),
  silver_locket: P('amulet', '#d8dde6', '#ffffff', '#8a93a3', '#c9c9d0', '#a9b3bf', '#fff'),
  spirit_pendant: P('amulet', '#5fd38a', '#cfffe0', '#1f7a4a', '#8a6a3a', '#d8b46a', '#e8fff0'),
  dragon_tooth: P('fang', '#f2efe6', '#ffffff', '#b0a080', '#3a2a1a', '#000', '#ff6a3d'),
  prayer_beads: P('beads', '#8a5a3a', '#c08a5a', '#4a2a1a', '#6a4a2a', '#c9a23a', '#ffd36f'),
  iron_band: P('ring', '#a9b3bf', '#e0e6ee', '#5a6370', '#000', '#a9b3bf', '#cfd8e3'),
  ruby_ring: P('ring', '#d81b3a', '#ff8a9a', '#7a0a1a', '#000', '#c9a23a', '#ff4f6a'),
  storage_ring: P('ring', '#ffd36f', '#fff4b0', '#a8822a', '#000', '#ffd36f', '#7fe3ff'),
  sword_ring: P('ring', '#e0e6ff', '#ffffff', '#8a93b3', '#000', '#c9ced8', '#7fa8ff'),
  fang_necklace: P('fang', '#efe8d8', '#ffffff', '#a89a80', '#6a4a2a', '#000', '#fff'),
  lucky_coin: P('coin', '#e0b040', '#fff0a0', '#9a7a1a', '#000', '#000', '#5a3a1a'),
  phoenix_feather: P('feather', '#ff6a3a', '#ffd06a', '#a8320f', '#c9a23a', '#000', '#ffef7a'),
  // v0.9.6 crafted gear
  bone_club: P('hammer', '#e8e0c8', '#ffffff', '#a89a78', '#6a4a2a', '#3a2a1a', '#c9b79a'),
  jade_spear: P('spear', '#5fd38a', '#cfffe0', '#1f7a4a', '#8a6a3a', '#3a2a1a', '#e8fff0'),
  void_needles: P('twin', '#9a7aff', '#e0d0ff', '#4a2a9a', '#2a1a4a', '#000', '#7fe3ff'),
  scale_glaive: P('glaive', '#ff8a3d', '#ffd06a', '#a8420f', '#6a4a2a', '#3a2a1a', '#ff4f2a'),
  herb_robe: P('robe', '#7aa86a', '#bfe0a8', '#3a5a2a', '#c9a23a', '#000', '#e8fff0'),
  core_lamellar: P('plate', '#c98a4a', '#f0c08a', '#7a4a1a', '#3a2a1a', '#000', '#ffd36f'),
  demon_harness: P('hide', '#8a1a2a', '#d84a5a', '#4a0a1a', '#2a0a0a', '#000', '#ff4f6a'),
  scale_coat: P('vest', '#ff8a3d', '#ffd06a', '#a8420f', '#6a2a0a', '#000', '#ffef7a'),
  herb_sachet: P('amulet', '#7aa86a', '#bfe0a8', '#3a5a2a', '#8a6a3a', '#c9a23a', '#e8fff0'),
  demon_eye: P('amulet', '#d81b3a', '#ff8a9a', '#5a0a1a', '#2a0a0a', '#000', '#ffd36f'),
  core_ring: P('ring', '#c98a4a', '#f0c08a', '#7a4a1a', '#000', '#c98a4a', '#ffb02e'),
  jade_ring: P('ring', '#5fd38a', '#cfffe0', '#1f7a4a', '#000', '#c9a23a', '#8affb0'),
  scale_amulet: P('fang', '#ff8a3d', '#ffd06a', '#a8420f', '#6a4a2a', '#000', '#ffef7a'),
  // v0.9.4 Fable gear
  fable_locket: P('amulet', '#ff9d5c', '#ffe0c0', '#a8420f', '#6a2a0a', '#ffd36f', '#fff4b0'),
  fable_robe: P('mantle', '#3a7aa8', '#9fd8ff', '#1a3a5a', '#0a1a2a', '#000', '#e0f4ff'),
  fable_sword: P('sword', '#c0c8d8', '#ffffff', '#6a7383', '#3a2a1a', '#ffd36f', '#e0e6ff'),
  fable_ring: P('ring', '#d8d0ff', '#ffffff', '#7a70a8', '#000', '#e0d8ff', '#fff4b0'),
  fable_mirror: P('coin', '#bfe6ff', '#ffffff', '#5a7a9a', '#000', '#e0f4ff', '#ffffff'),
  fable_oar: P('staff', '#3a5a5a', '#6fd3c8', '#1a2a2a', '#0a1a1a', '#6fd3c8', '#e0fff8'),
  fable_pelt: P('hide', '#ffb02e', '#ffe0a0', '#7a4a0a', '#1a1208', '#000', '#fff4b0'),
  fable_hearth: P('amulet', '#ff7a4a', '#ffd0a0', '#a8320f', '#5a1a0a', '#ffd36f', '#fff4b0'),
};
const cache = {};
export function gearSprite(id, size = 32) {
  const S = GEAR_SPRITES[id];
  const cv = document.createElement('canvas'); cv.width = 18; cv.height = 18; cv.className = 'gear-sprite';
  Object.assign(cv.style, { width: size + 'px', height: size + 'px', imageRendering: 'pixelated', flex: 'none' });
  if (!S) return cv;
  const key = id; let px = cache[key];
  if (!px) {
    const m = M[S.t]; px = [];
    m.forEach((row, y) => [...row].forEach((ch, x) => { const col = S.pal[ch]; if (col && col !== '#000') px.push([x + 1, y + 1, col]); }));
    cache[key] = px;
  }
  const ctx = cv.getContext('2d'); const filled = new Set(px.map(([x, y]) => x + ',' + y));
  ctx.fillStyle = '#140c1a';
  for (const [x, y] of px) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!filled.has((x + dx) + ',' + (y + dy))) ctx.fillRect(x + dx, y + dy, 1, 1);
  for (const [x, y, col] of px) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
  return cv;
}
