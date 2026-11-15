// Boot: load saves & icons, wire UI hooks into the game systems, start the first life.
import { G, META, load, save } from './core/state.js';
import { ui } from './core/bus.js';
import { ERAS } from './data/countries.js';
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

Object.assign(ui, {
  log: logLine, toast, fx, choice, fight, refresh: render, openSalon,
  openTab: tab => { G.ui.tab = tab; render(); },
});
setRerender(render);
window.FadingInk = { G, META }; // handy for debugging in the browser console

async function boot() {
  await loadIcons();
  const had = load();
  apply();
  if (!had) { G.world = { year: ri(820, 900), era: pick(ERAS) }; newLife(); }
  // migrate older saves
  const c = G.char; c.stats.mood ??= 60; c.stats.battle ??= 5; c.conditions ||= []; c.lastTrained ||= {}; c.qi.methods ||= ['basic']; c.gear ||= {}; c.maxActions ||= 4;
  G.ui = { tab: 'life', openCats: {} };
  render();
  if (!G.char.alive) deathScreen();
  // browsers only allow audio after a user gesture
  const startAudio = () => { syncMusic(); removeEventListener('pointerdown', startAudio); };
  addEventListener('pointerdown', startAudio);
  setInterval(save, 15000);
  resumeRoom(); // rejoin the co-op room you were in before refreshing
  startUpdateChecks(entries => { if (entries.length) openChangelog(entries, true); });
}
boot();
