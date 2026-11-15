// Google Drive cloud saves (hidden "appDataFolder", only this game can see the file).
// Connecting MERGES: every local slot is kept. If the cloud and this device both changed the same slot,
// the newer one wins and the other is kept as a separate "(backup)" slot — nothing is ever wiped.
import { META, SLOTS, rawSlot, writeSlot, writeSlots, save } from '../core/state.js';
import { GOOGLE_CLIENT_ID } from '../cloud-config.js';

const FILE = 'fadingink-cloud.json', SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const LINK_KEY = 'fadingink.cloud.v1';
export const cloud = { status: 'off', last: null, error: null };
let token = null, tokenExp = 0, tokenClient = null;
export const cloudConfigured = () => !!GOOGLE_CLIENT_ID;
export const cloudLinked = () => { try { return !!JSON.parse(localStorage.getItem(LINK_KEY) || 'null')?.linked; } catch { return false; } };

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = res; s.onerror = () => rej(new Error('Could not reach Google')); document.head.append(s); });
}
async function getToken(interactive) {
  if (token && Date.now() < tokenExp - 60000) return token;
  await loadGis();
  return new Promise((res, rej) => {
    tokenClient = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: SCOPE,
      callback: r => { if (r.error) return rej(new Error(r.error)); token = r.access_token; tokenExp = Date.now() + r.expires_in * 1000; res(token); },
      error_callback: e => rej(new Error(e.type || 'popup closed')) });
    tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
  });
}
async function api(path, opts = {}) {
  const r = await fetch('https://www.googleapis.com' + path, { ...opts, headers: { Authorization: 'Bearer ' + token, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`Drive ${r.status}`); return r;
}
async function findFile() {
  const q = encodeURIComponent(`name='${FILE}'`);
  const d = await (await api(`/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)`)).json();
  return d.files?.[0] || null;
}
async function download(f) { return f ? (await api(`/drive/v3/files/${f.id}?alt=media`)).json() : null; }
async function upload(f, data) {
  const body = JSON.stringify(data);
  if (f) return api(`/upload/drive/v3/files/${f.id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
  const meta = { name: FILE, parents: ['appDataFolder'] }, b = 'fi' + Math.random().toString(36).slice(2);
  const multipart = `--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${b}--`;
  return api('/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: multipart });
}
const localBundle = () => ({ v: 1, meta: META, slots: SLOTS.list.map(s => ({ ...s, data: rawSlot(s.id) })).filter(s => s.data) });

// Merge cloud into local. firstLink = keep BOTH versions when a slot differs on each side.
function merge(remote, firstLink) {
  if (!remote) return;
  const m = remote.meta || {};
  META.legacy = Math.max(META.legacy || 0, m.legacy || 0); META.lives = Math.max(META.lives || 0, m.lives || 0); META.bestRealm = Math.max(META.bestRealm || 0, m.bestRealm || 0);
  for (const [k, v] of Object.entries(m.perks || {})) META.perks[k] = Math.max(META.perks[k] || 0, v);
  Object.assign(META.unlockedTraits, m.unlockedTraits || {});
  for (const rs of remote.slots || []) {
    const ls = SLOTS.list.find(s => s.id === rs.id); const { data, ...entry } = rs;
    if (!ls) { writeSlot(rs.id, data); SLOTS.list.push(entry); continue; }
    if ((rs.updated || 0) === (ls.updated || 0)) continue;
    const cloudNewer = (rs.updated || 0) > (ls.updated || 0);
    if (firstLink) { // keep both: the older side becomes a backup slot
      let n = 1; while (SLOTS.list.some(s => s.id === `${rs.id}b${n}`)) n++; const bid = `${rs.id}b${n}`;
      if (cloudNewer) { writeSlot(bid, rawSlot(ls.id)); SLOTS.list.push({ ...ls, id: bid, name: ls.name + ' (this device backup)' }); writeSlot(rs.id, data); Object.assign(ls, entry); }
      else { writeSlot(bid, data); SLOTS.list.push({ ...entry, id: bid, name: entry.name + ' (cloud backup)' }); }
    } else if (cloudNewer) { writeSlot(rs.id, data); Object.assign(ls, entry); }
  }
  writeSlots();
}

export async function connect() {
  if (!cloudConfigured()) throw new Error('Cloud saves are not set up for this site yet.');
  cloud.status = 'syncing'; await getToken(true);
  await syncNow(true);
  localStorage.setItem(LINK_KEY, JSON.stringify({ linked: true }));
}
export async function syncNow(firstLink = false) {
  try {
    cloud.status = 'syncing'; await getToken(false);
    const f = await findFile(); merge(await download(f), firstLink); save();
    await upload(f, localBundle()); cloud.status = 'ok'; cloud.last = Date.now(); cloud.error = null;
  } catch (e) { cloud.status = 'error'; cloud.error = e.message; throw e; }
}
export function disconnect() { localStorage.removeItem(LINK_KEY); token = null; cloud.status = 'off'; }
// Background upload a while after saves, if linked and the token is still valid (never pops up a window)
let timer = null;
export function scheduleSync() {
  if (!cloudLinked() || !cloudConfigured() || !token || Date.now() > tokenExp - 60000) return;
  clearTimeout(timer); timer = setTimeout(() => syncNow().catch(() => {}), 45000);
}
