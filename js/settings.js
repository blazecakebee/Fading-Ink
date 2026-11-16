// Player options. Stored in META.settings (localStorage) and applied as CSS variables/classes.
import { META, save } from './core/state.js';
import { setVolumes } from './audio/sfx.js';
import { playStation, currentStation } from './audio/music.js';

export const THEMES = [
  ['amber', 'Amber Chronicle', ['#3a2414', '#ffcc33', '#e0761a']], ['parchment', 'Ink & Parchment', ['#fbf3e0', '#7a1f1f', '#2b1d10']],
  ['jade', 'Jade Sect', ['#0f2a22', '#9affd0', '#3fcf9a']], ['crimson', 'Crimson Lotus', ['#2a0a10', '#ff4f6a', '#b0142c']],
  ['neon', 'Neon Night City', ['#0d0a1f', '#00f0ff', '#ff2fd0']], ['frontier', 'Frontier Dust', ['#3a362c', '#d8c690', '#8a9a5a']],
  ['pastel', 'Pastel Dream', ['#ffd6e8', '#ff7ab8', '#c08aff']], ['midnight', 'Midnight', ['#121a2e', '#8ab4ff', '#4a7aff']],
  ['sakura', 'Sakura', ['#3a1a28', '#ffc0d4', '#ff8ab0']], ['terminal', 'Terminal', ['#041204', '#3fff7a', '#0a3a14']],
  ['clean', 'Clean Life', ['#ffffff', '#1f9a5a', '#0f6fb0']], ['void', 'Void', ['#12061e', '#c08aff', '#5a1ad0']],
  ['ocean', 'Ocean', ['#0a2a40', '#6ae0ff', '#2ab0e0']], ['autumn', 'Autumn Ink', ['#2e1608', '#ff8a3a', '#a0400f']],
  // v0.9.16
  ['obsidian', 'Obsidian Gold', ['#0c0c0e', '#e8c46a', '#8a6a2a']],
  ['blossom', 'Plum Blossom', ['#2a1424', '#ffb3d9', '#c7569a']],
  ['desert', 'Desert Mirage', ['#3a2a18', '#ffd9a0', '#d08a3a']],
  ['arctic', 'Arctic Light', ['#eaf4fb', '#2a6aa8', '#7ac0e8']],
  ['emerald', 'Emerald Court', ['#06231c', '#4fe0a0', '#e8c46a']],
  ['bloodmoon', 'Blood Moon', ['#140406', '#ff3a3a', '#7a0a14']],
  ['ink', 'Ink Wash', ['#f2efe6', '#1a1a1a', '#8a8a80']],
  ['cyber', 'Synthwave', ['#1a0a2e', '#ff7ad9', '#7afcff']],
  ['forest', 'Deep Forest', ['#10200f', '#b6e07a', '#6a8a3a']],
  ['storm', 'Thunderstorm', ['#151a26', '#c8b8ff', '#ffe066']],
];

export const DEFAULTS = {
  theme: 'amber', font: 'default', fontSize: 16, uiScale: 1, panelOpacity: 1, animSpeed: 1, portraitSize: 64,
  master: 0.8, music: 0.45, sfx: 0.7, station: 'sect', musicOn: true,
  reduceMotion: false, showIcons: true, showNumbers: true, compact: false, iconsOnly: false, hints: true,
  showRight: true, minorFx: true, showChronicle: true, showWorldNews: true, confirmAgeUp: true, highContrast: false, cbBars: false,
  fxOn: true, screenShake: true, uiSounds: true, autoOpenCats: false, cinematics: true, arenaFights: true,
};
export const S = () => ({ ...DEFAULTS, ...META.settings });
export function set(k, v) { META.settings[k] = v; apply(); save(); }

export function apply() {
  const s = S(), b = document.body, r = document.documentElement;
  b.dataset.theme = s.theme; b.dataset.font = s.font;
  r.style.setProperty('--fs', s.fontSize + 'px');
  r.style.setProperty('--ui-scale', s.uiScale);
  r.style.setProperty('--panel-opacity', s.panelOpacity);
  r.style.setProperty('--anim', s.reduceMotion ? 0.01 : 1 / s.animSpeed);
  const cls = { 'reduce-motion': s.reduceMotion, 'no-icons': !s.showIcons, 'hide-numbers': !s.showNumbers, compact: s.compact, 'icons-only': s.iconsOnly,
    'hide-right': !s.showRight, 'high-contrast': s.highContrast, 'cb-bars': s.cbBars, 'hide-hints': !s.hints };
  for (const [c, on] of Object.entries(cls)) b.classList.toggle(c, on);
  setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
}
export function syncMusic() {
  const s = S(); const want = s.musicOn ? s.station : 'off';
  if ((currentStation() || 'off') !== want) playStation(want);
}
