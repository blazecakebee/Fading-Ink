// Settings tab: themes, sliders, toggles, music stations, save management.
import { h, icon } from './dom.js';
import { THEMES, S, set, syncMusic, DEFAULTS } from '../settings.js';
import { STATIONS, loadFiles, playlistNames, skipTrack } from '../audio/music.js';
import { META, G, save, wipeSave, SAVE_KEY, META_KEY } from '../core/state.js';
import { choice, toast } from './modal.js';
import { fx } from './fx.js';

let rerender = () => {};
export function setRerender(f) { rerender = f; }

const slider = (label, key, min, max, step, fmt = v => v) => {
  const val = h('span', { class: 'v' }, fmt(S()[key]));
  return h('div', { class: 'setting' }, h('label', {}, label),
    h('input', { type: 'range', min, max, step, value: S()[key], oninput: e => { const v = +e.target.value; val.textContent = fmt(v); set(key, v); }, onchange: () => rerender() }), val);
};
const toggle = (label, key, after) => h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked: !!S()[key], onchange: e => { set(key, e.target.checked); after?.(); rerender(); } }), label);

export function renderSettings() {
  const s = S();
  return [h('h2', { class: 'display' }, 'Settings'),
    h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, 'Theme'),
    h('div', { class: 'themes' }, THEMES.map(([id, name, sw]) => h('button', { class: 'theme-sw' + (s.theme === id ? ' on' : ''), style: { background: sw[0], color: sw[1] }, onclick: () => { fx('click'); set('theme', id); rerender(); } },
      name, h('div', {}, sw.map(c => h('i', { style: { background: c } })))))),
    h('div', { class: 'setting' }, h('label', {}, 'Font style'), h('select', { onchange: e => { set('font', e.target.value); rerender(); } },
      [['default', 'Storybook (default)'], ['serif', 'All serif'], ['sans', 'Clean sans'], ['pixel', 'Pixel']].map(([v, l]) => h('option', { value: v, selected: s.font === v }, l))), h('span')),

    h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, 'Display'),
    slider('Font size', 'fontSize', 12, 24, 1, v => v + 'px'),
    slider('UI scale', 'uiScale', 0.6, 1.6, 0.05, v => Math.round(v * 100) + '%'),
    slider('Panel opacity', 'panelOpacity', 0.6, 1, 0.05, v => Math.round(v * 100) + '%'),
    slider('Animation speed', 'animSpeed', 0.5, 3, 0.25, v => v + '×'),
    slider('Portrait size', 'portraitSize', 48, 128, 8, v => v + 'px'),
    h('div', { class: 'grid2' },
      h('div', {}, toggle('Show icons', 'showIcons'), toggle('Icons-only navigation', 'iconsOnly'), toggle('Compact mode', 'compact'), toggle('Show stat numbers', 'showNumbers'), toggle('High contrast', 'highContrast'), toggle('Colorblind-friendly bars', 'cbBars')),
      h('div', {}, toggle('Show right stats panel', 'showRight'), toggle('Show chronicle in sidebar', 'showChronicle'), toggle('Show world news', 'showWorldNews'), toggle('Activity categories start open', 'autoOpenCats'), toggle('Confirm age-up with unused actions', 'confirmAgeUp'), toggle('Show hints', 'hints'))),

    h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, 'Effects'),
    h('div', { class: 'grid2' }, h('div', {}, toggle('Visual effects', 'fxOn'), toggle('Screen shake in combat', 'screenShake')), h('div', {}, toggle('Reduce motion', 'reduceMotion'), toggle('UI click sounds', 'uiSounds'))),

    h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, 'Audio'),
    slider('Master volume', 'master', 0, 1, 0.05, v => Math.round(v * 100) + '%'),
    slider('Music volume', 'music', 0, 1, 0.05, v => Math.round(v * 100) + '%'),
    slider('Effects volume', 'sfx', 0, 1, 0.05, v => Math.round(v * 100) + '%'),
    toggle('Background music', 'musicOn', syncMusic),
    h('p', { class: 'muted' }, 'Stations are original music composed live by the game, each going for a different mood. You can also play your own audio files — they stay on your device.'),
    h('div', { class: 'grid2' }, [...Object.entries(STATIONS).map(([id, st]) => [id, st.name, st.mood]), ['files', 'Your Music', playlistNames().length ? `${playlistNames().length} file(s) loaded` : 'Load files below']].map(([id, name, mood]) =>
      h('button', { class: 'card', style: { textAlign: 'left', borderColor: s.station === id ? 'var(--accent)' : '' }, onclick: () => { set('station', id); set('musicOn', true); syncMusic(); rerender(); } },
        h('b', {}, (s.station === id && s.musicOn ? '♪ ' : '') + name), h('div', { class: 'muted' }, mood)))),
    h('div', { class: 'row', style: { marginTop: '10px' } },
      h('label', { class: 'btn ghost' }, 'Load your own music…', h('input', { type: 'file', accept: 'audio/*', multiple: true, style: { display: 'none' }, onchange: e => { const n = loadFiles(e.target.files); toast(`${n} track(s) loaded`); set('station', 'files'); set('musicOn', true); syncMusic(); rerender(); } })),
      h('button', { class: 'btn ghost', onclick: skipTrack }, 'Next track ⏭')),

    h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, 'Save data'),
    h('div', { class: 'row' },
      h('button', { class: 'btn ghost', onclick: () => { const blob = new Blob([JSON.stringify({ char: G.char, world: G.world, meta: META })], { type: 'application/json' }); const a = h('a', { href: URL.createObjectURL(blob), download: `fading-ink-${G.char.first}.json` }); a.click(); } }, 'Export save'),
      h('label', { class: 'btn ghost' }, 'Import save', h('input', { type: 'file', accept: '.json', style: { display: 'none' }, onchange: async e => { try { const d = JSON.parse(await e.target.files[0].text()); const st = await import('../core/state.js'); st.startSlot(st.newSlotId()); G.char = d.char; G.world = d.world; for (const [k, v] of Object.entries(d.meta?.perks || {})) META.perks[k] = Math.max(META.perks[k] || 0, v); Object.assign(META.unlockedTraits, d.meta?.unlockedTraits || {}); META.legacy = Math.max(META.legacy, d.meta?.legacy || 0); save(); toast('Imported into a new save slot.'); location.reload(); } catch { toast('That file is not a Fading Ink save.'); } } })),
      h('button', { class: 'btn ghost', onclick: () => { META.settings = {}; save(); location.reload(); } }, 'Reset settings'),
      h('button', { class: 'btn ghost', style: { borderColor: 'var(--bad)', color: 'var(--bad)' }, onclick: async () => { const ok = await choice({ title: 'Start over?', text: 'This ends your current life without legacy points. Legacy perks you already own are kept.', options: [{ label: 'Yes, start a new life', value: true }, { label: 'Cancel', value: false, ghost: true }] }); if (ok) { wipeSave(); G.char = null; (await import('../core/bus.js')).ui.toMenu?.(); } } }, 'Abandon this life')),
  ];
}
