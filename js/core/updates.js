// Live-update checker. Polls /version.json (uncached); when it differs from the running VERSION,
// shows a notice, saves, refreshes the browser cache for every loaded file, then reloads.
import { VERSION, CHANGELOG } from '../version.js';
import { G, META, save } from './state.js';

const POLL_MS = 60000;
let shown = false;

async function remoteVersion() {
  try { const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return null; return (await r.json()).version; } catch { return null; }
}
// v0.9.23 never refresh in the middle of anything: a year passing, an activity, a fight, a minigame, a cutscene, any open dialog or a Fable
const busy = () => (window.__fiBusy || 0) > 0 || !!document.querySelector('.fight, .tg-wrap, .howto-wrap, .arena-wrap, .cine, .breach-modal, .br-wrap, .modal-back') || !!G.char?.fableRun;

// GitHub Pages lets browsers cache files for ~10 minutes, so force-refresh every loaded script/style first.
async function hardReload() {
  save();
  const urls = new Set([location.href.split('#')[0], 'version.json', ...performance.getEntriesByType('resource').map(e => e.name).filter(u => u.startsWith(location.origin) && /\.(js|css|json|png)(\?|$)/.test(u))]);
  await Promise.all([...urls].map(u => fetch(u, { cache: 'reload' }).catch(() => {})));
  location.reload();
}

function notice(v) {
  if (shown) return; shown = true;
  let n = 10;
  const el = document.createElement('div'); el.className = 'update-bar';
  const txt = document.createElement('span'); const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = 'Refresh now';
  btn.onclick = () => { clearInterval(t); txt.textContent = 'Updating…'; hardReload(); };
  el.append(txt, btn); document.body.append(el);
  const t = setInterval(() => {
    if (busy()) { txt.textContent = `Version ${v} is out! Refreshing when you finish what you're doing…`; return; }
    txt.textContent = `Version ${v} is out! Refreshing in ${n}s — your life is saved.`;
    if (n-- <= 0) { clearInterval(t); txt.textContent = 'Updating…'; hardReload(); }
  }, 1000);
}

async function check() {
  if (shown) return;
  const v = await remoteVersion();
  if (!v || v === VERSION) return;
  // loop guard: if we already reloaded for this version but still run old code, stop nagging this session
  if (sessionStorage.getItem('fi-reloaded-for') === v) return;
  sessionStorage.setItem('fi-reloaded-for', v);
  notice(v);
}

export function startUpdateChecks(onNewVersionSeen) {
  setTimeout(check, 5000); setInterval(check, POLL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  // first launch after an update → show what's new once
  if (META.lastSeenVersion && META.lastSeenVersion !== VERSION) onNewVersionSeen?.(CHANGELOG.filter(e => cmp(e.v, META.lastSeenVersion) > 0));
  META.lastSeenVersion = VERSION; save();
}
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
