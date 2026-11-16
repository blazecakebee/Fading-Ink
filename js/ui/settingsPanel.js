// Settings tab: themes, sliders, toggles, music stations, save management.
import { h, icon } from './dom.js';
import { THEMES, S, set, syncMusic, DEFAULTS } from '../settings.js';
import { STATIONS, loadFiles, playlistNames, skipTrack } from '../audio/music.js';
import { META, G, save, wipeSave, SAVE_KEY, META_KEY } from '../core/state.js';
import { choice, toast } from './modal.js';
import { fx } from './fx.js';

let rerender = () => {};
export function setRerender(f) { rerender = f; }

// Sleek controls: filled range sliders with a round thumb, and pill toggle switches.
const pct = (v, min, max) => ((v - min) / (max - min) * 100) + '%';
const slider = (label, key, min, max, step, fmt = v => v) => {
  const val = h('span', { class: 'v' }, fmt(S()[key]));
  const input = h('input', { type: 'range', class: 'range', min, max, step, value: S()[key],
    oninput: e => { const v = +e.target.value; val.textContent = fmt(v); input.style.setProperty('--p', pct(v, min, max)); set(key, v); }, onchange: () => rerender() });
  input.style.setProperty('--p', pct(S()[key], min, max));
  return h('div', { class: 'set-row' }, h('div', { class: 'set-label' }, label, val), input);
};
const toggle = (label, key, after, hint) => h('label', { class: 'switch-row' },
  h('span', {}, label, hint ? h('small', { class: 'muted' }, hint) : null),
  h('span', { class: 'switch' }, h('input', { type: 'checkbox', checked: !!S()[key], onchange: e => { fx('click'); set(key, e.target.checked); after?.(); rerender(); } }), h('i')));
const card = (title, icon, ...kids) => h('section', { class: 'set-card' }, h('h3', {}, h('span', { class: 'set-ic' }, icon), title), ...kids);
const seg = (key, opts) => h('div', { class: 'seg' }, opts.map(([v, l]) => h('button', { class: S()[key] === v ? 'on' : '', onclick: () => { fx('click'); set(key, v); rerender(); } }, l)));

export function renderSettings() {
  const s = S();
  const stations = [...Object.entries(STATIONS).filter(([, st]) => !st.menuOnly).map(([id, st]) => [id, st.name, st.mood]), ['files', 'Your Music', playlistNames().length ? `${playlistNames().length} file(s) loaded` : 'Load files below']];
  return [h('h2', { class: 'display' }, 'Settings'),
    h('div', { class: 'set-grid' },
      card('Theme', '🎨',
        h('div', { class: 'themes' }, THEMES.map(([id, name, sw]) => h('button', { class: 'theme-sw' + (s.theme === id ? ' on' : ''), style: { background: sw[0], color: sw[1] }, title: name, onclick: () => { fx('click'); set('theme', id); rerender(); } },
          h('span', {}, name), h('span', { class: 'dots' }, sw.map(c => h('i', { style: { background: c } })))))),
        h('div', { class: 'set-label', style: { marginTop: '12px' } }, 'Font style'),
        seg('font', [['default', 'Storybook'], ['serif', 'Serif'], ['sans', 'Clean'], ['pixel', 'Pixel']])),
      card('Display', '🖥️',
        slider('Font size', 'fontSize', 12, 24, 1, v => v + 'px'),
        slider('UI scale', 'uiScale', 0.6, 1.6, 0.05, v => Math.round(v * 100) + '%'),
        slider('Panel opacity', 'panelOpacity', 0.6, 1, 0.05, v => Math.round(v * 100) + '%'),
        slider('Animation speed', 'animSpeed', 0.5, 3, 0.25, v => v + '×'),
        slider('Portrait size', 'portraitSize', 48, 128, 8, v => v + 'px')),
      card('Layout', '🧩',
        toggle('Show icons', 'showIcons'), toggle('Icons-only navigation', 'iconsOnly'), toggle('Compact mode', 'compact'),
        toggle('Right stats panel', 'showRight'), toggle('Chronicle in sidebar', 'showChronicle'), toggle('Activity categories start open', 'autoOpenCats')),
      card('Gameplay', '🎲',
        toggle('Show stat numbers', 'showNumbers'), toggle('Show world news', 'showWorldNews'), toggle('Show hints', 'hints'),
        toggle('Confirm age-up', 'confirmAgeUp', null, 'when you still have actions left')),
      card('Accessibility & effects', '✨',
        h('button', { class: 'btn ghost', style: { margin: '4px 0 8px' }, onclick: () => import('./guide.js').then(m => m.openGuide()) }, '📖 Open the starter guide'), toggle('Visual effects', 'fxOn'), toggle('Cinematic scenes (birth, breakthroughs, heirlooms)', 'cinematics'), toggle('Screen shake in combat', 'screenShake'), toggle('Reduce motion', 'reduceMotion'),
        toggle('UI click sounds', 'uiSounds'), toggle('High contrast', 'highContrast'), toggle('Colorblind-friendly bars', 'cbBars')),
      card('Audio', '🎵',
        slider('Master volume', 'master', 0, 1, 0.05, v => Math.round(v * 100) + '%'),
        slider('Music volume', 'music', 0, 1, 0.05, v => Math.round(v * 100) + '%'),
        slider('Effects volume', 'sfx', 0, 1, 0.05, v => Math.round(v * 100) + '%'),
        toggle('Background music', 'musicOn', syncMusic)),
      h('section', { class: 'set-card wide' }, h('h3', {}, h('span', { class: 'set-ic' }, '📻'), 'Music stations'),
        h('p', { class: 'muted small' }, 'Original music composed live by the game, each with its own mood. You can also play your own audio files — they stay on your device.'),
        h('div', { class: 'stations' }, stations.map(([id, name, mood]) => h('button', { class: 'station' + (s.station === id ? ' on' : ''), onclick: () => { fx('click'); set('station', id); set('musicOn', true); syncMusic(); rerender(); } },
          h('b', {}, (s.station === id && s.musicOn ? '♪ ' : '') + name), h('span', { class: 'muted small' }, mood)))),
        h('div', { class: 'row', style: { marginTop: '10px' } },
          h('label', { class: 'pill' }, '📁 Load your own music…', h('input', { type: 'file', accept: 'audio/*', multiple: true, style: { display: 'none' }, onchange: e => { const n = loadFiles(e.target.files); toast(`${n} track(s) loaded`); set('station', 'files'); set('musicOn', true); syncMusic(); rerender(); } })),
          h('button', { class: 'pill', onclick: skipTrack }, '⏭ Next track'))),
    ),
    h('section', { class: 'set-card wide', style: { marginTop: '14px' } }, h('h3', {}, h('span', { class: 'set-ic' }, '💾'), 'Save data'), h('div', { class: 'row' },
      h('button', { class: 'pill', onclick: () => { const blob = new Blob([JSON.stringify({ char: G.char, world: G.world, meta: META })], { type: 'application/json' }); const a = h('a', { href: URL.createObjectURL(blob), download: `fading-ink-${G.char.first}.json` }); a.click(); } }, 'Export save'),
      h('label', { class: 'pill' }, 'Import save', h('input', { type: 'file', accept: '.json', style: { display: 'none' }, onchange: async e => { try { const d = JSON.parse(await e.target.files[0].text()); const st = await import('../core/state.js'); st.startSlot(st.newSlotId()); G.char = d.char; G.world = d.world; for (const [k, v] of Object.entries(d.meta?.perks || {})) META.perks[k] = Math.max(META.perks[k] || 0, v); Object.assign(META.unlockedTraits, d.meta?.unlockedTraits || {}); META.legacy = Math.max(META.legacy, d.meta?.legacy || 0); save(); toast('Imported into a new save slot.'); location.reload(); } catch { toast('That file is not a Fading Ink save.'); } } })),
      h('button', { class: 'pill', onclick: () => { META.settings = {}; save(); location.reload(); } }, 'Reset settings'),
      h('button', { class: 'pill danger', onclick: async () => { const ok = await choice({ title: 'Start over?', text: 'This ends your current life without legacy points. Legacy perks you already own are kept.', options: [{ label: 'Yes, start a new life', value: true }, { label: 'Cancel', value: false, ghost: true }] }); if (ok) { wipeSave(); G.char = null; (await import('../core/bus.js')).ui.toMenu?.(); } } }, 'Abandon this life'))),
  ];
}
