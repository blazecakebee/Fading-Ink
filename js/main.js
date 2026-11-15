// Boot: load saves & icons, wire UI hooks into the game systems, start the first life.
import { G, META, SLOTS, loadMeta, loadSlot, newSlotId, startSlot, save, onSave } from './core/state.js';
import { showMenu } from './ui/menu.js';
import { migratePerks } from './data/legacyTree.js';
import { h } from './ui/dom.js';
import { sfx } from './audio/sfx.js';
import { ensureBody } from './systems/body.js';
import { scheduleSync } from './net/cloud.js';
import { ui } from './core/bus.js';
import { ERAS } from './data/countries.js';
import { REALMS } from './data/realms.js';
import { pick, ri } from './core/rng.js';
import { loadIcons } from './ui/dom.js';
import { render, logLine, openSalon } from './ui/render.js';
import { choice, toast } from './ui/modal.js';
import { fx } from './ui/fx.js';
import { fight } from './ui/combat.js';
import { apply, syncMusic } from './settings.js';
import { setRerender } from './ui/settingsPanel.js';
import { newLife } from './systems/life.js';
import { deathScreen } from './ui/legacyPanel.js';
import { startUpdateChecks } from './core/updates.js';
import { openChangelog } from './ui/render.js';
import { resumeRoom } from './net/coop.js';

// Achievement popup (top-right). Several in a row stack and play one after another.
const achQueue = []; let achBusy = false;
function showAch() {
  if (achBusy || !achQueue.length) return; achBusy = true; const a = achQueue.shift();
  const el = h('div', { class: 'ach-pop' }, h('span', { class: 'trophy' }, '🏆'), h('div', {}, h('small', {}, 'Achievement unlocked'), h('div', {}, h('b', {}, a.name)), h('div', { class: 'muted small' }, `${a.desc} · +${a.pts} Legacy`)));
  document.body.append(el); sfx('trait'); setTimeout(() => { el.remove(); achBusy = false; showAch(); }, 4300);
}
Object.assign(ui, {
  achievement: a => { achQueue.push(a); showAch(); },
  log: logLine, toast, fx, choice, fight, refresh: render, openSalon,
  openTab: tab => { G.ui.tab = tab; render(); },
});
setRerender(render);
window.FadingInk = { G, META }; // handy for debugging in the browser console

// Before v0.3.0 every realm had 9 stages; now they have 5. Rescale older cultivators proportionally (9 → 5, 7 → 4, 5 → 3…).
function migrateStages(c) {
  if (!c || c.flags?.stageSystem === 5) return;
  c.flags ||= {};
  const prev = META.lastSeenVersion; const older = !prev || prev.split('.').map(Number).reduce((a, n, i) => a + n * [1e6, 1e3, 1][i], 0) < 3000;
  const R = REALMS[c.qi.realm];
  if (c.qi.realm > 0 && R.stages > 1 && (c.qi.stage > R.stages || older)) {
    const before = c.qi.stage; c.qi.stage = Math.max(1, Math.min(R.stages, Math.ceil(before * R.stages / 9)));
    c.qi.qi = Math.min(c.qi.qi, Math.round(R.maxQi * (1 + (c.qi.stage - 1) * 0.7)));
    if (before !== c.qi.stage) logLine(`The heavens re-measured my cultivation: ${R.name} Stage ${before}/9 is now Stage ${c.qi.stage}/5.`, 'qi');
  }
  c.flags.stageSystem = 5;
}

// Enter the game with a slot (or a brand-new life when id is null)
let roomResumed = false;
function play(id) {
  if (id && loadSlot(id)) { /* loaded */ }
  else { startSlot(newSlotId()); G.world = { year: ri(820, 900), era: pick(ERAS) }; newLife(); }
  const c = G.char; migrateStages(c);
  c.stats.mood ??= 60; c.stats.battle ??= 5; c.conditions ||= []; c.lastTrained ||= {}; c.qi.methods ||= ['basic']; c.gear ||= {}; c.maxActions ||= 4; ensureBody(c);
  G.ui = { tab: 'life', openCats: {} };
  sessionStorage.setItem('fi-in-game', '1');
  save(); render();
  if (!G.char.alive) deathScreen();
  if (!roomResumed) { roomResumed = true; resumeRoom(); } // rejoin the co-op room you were in before refreshing
}
export function toMenu() { save(); sessionStorage.removeItem('fi-in-game'); document.getElementById('modal-root').replaceChildren(); showMenu(play); }
ui.toMenu = toMenu;

async function boot() {
  await loadIcons();
  loadMeta(); migratePerks(); apply();
  onSave(scheduleSync);
  // ?play skips the menu straight into your last slot (handy after the auto-updater refreshes mid-game)
  const resume = sessionStorage.getItem('fi-in-game') && SLOTS.active;
  if (resume) play(SLOTS.active); else showMenu(play);
  addEventListener('beforeunload', () => { if (G.char && sessionStorage.getItem('fi-in-game')) save(); });
  // browsers only allow audio after a user gesture
  const startAudio = () => { syncMusic(); removeEventListener('pointerdown', startAudio); };
  addEventListener('pointerdown', startAudio);
  setInterval(() => { if (G.char && document.getElementById('app').style.display !== 'none') save(); }, 15000);
  startUpdateChecks(entries => { if (entries.length) openChangelog(entries, true); });
}
boot();
