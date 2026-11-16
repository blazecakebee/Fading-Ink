// Co-op multiplayer over WebRTC (PeerJS, vendored in js/vendor). Works on static hosting like GitHub Pages:
// PeerJS's free cloud server only introduces players to each other; game data then flows peer-to-peer.
// Topology: the host's browser is the hub. Clients send everything to the host, who relays to the others.
// Everyone keeps their own life and ages at their own pace; co-op players show up in each other's People tab.
import { G, save } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, clamp, chance, uid } from '../core/rng.js';
import { mixGenes } from '../ui/portrait.js';
import { stat, money, fmtMoney, giftToChild } from '../systems/life.js';
import { fertile, conceive, uniqueFirst } from '../systems/family.js';
export const weddingCine = (c, p) => ui.cinematic?.({ motif: 'lotus', color: '#ff6a8a', lines: [`Red lanterns, two families, one table.`, `${c.first} and ${p.first} bow to heaven, to earth, and to each other.`], title: 'Married', sub: `${c.first} ♥ ${p.first}`, sound: 'milestone' });
export const sectCine = (c, name) => ui.cinematic?.({ motif: 'seal', color: '#9ad0ff', lines: ['The gate opens. Incense, bells, a long stair.', 'You kneel, and are given a name in the register.'], title: name, sub: 'You joined', sound: 'milestone' });
import { learnManual, sectName } from '../systems/cultivation.js';
import { gainClose } from '../systems/people.js';
import { SECTS } from '../data/realms.js';

const PREFIX = 'fadingink-v1-';
export const net = { peer: null, role: null, code: null, myId: null, conns: new Map(), peers: new Map(), chat: [], pending: new Map(), status: 'offline' };

let libPromise = null;
function loadLib() {
  if (window.Peer) return Promise.resolve();
  return libPromise ||= new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/vendor/peerjs.min.js'; s.onload = res; s.onerror = () => rej(new Error('Could not load PeerJS')); document.head.append(s); });
}
// ?peerhost=localhost&peerport=9000 lets you point at your own PeerJS server (used for local testing)
function peerOpts() {
  const q = new URLSearchParams(location.search); const o = { debug: 0 };
  if (q.get('peerhost')) Object.assign(o, { host: q.get('peerhost'), port: +q.get('peerport') || 9000, path: q.get('peerpath') || '/', secure: location.protocol === 'https:' });
  return o;
}
const refresh = () => { try { ui.refresh(); } catch (e) {} };
const setStatus = s => { net.status = s; refresh(); };

export function myProfile() {
  const c = G.char; if (!c) return null;
  return { charId: c.id, first: c.first, last: c.last, gender: c.gender, age: c.age, genes: c.genes, hair: c.hair, face: c.face, alive: c.alive,
    stats: { smarts: c.stats.smarts, strength: c.stats.strength, agility: c.stats.agility, charisma: c.stats.charisma, luck: c.stats.luck, looks: c.stats.looks, health: c.stats.health },
    realm: c.qi.realm, stage: c.qi.stage, techs: c.qi.techs, sect: c.sect, sectName: sectName(c), traits: c.traits, pregnant: !!c.expecting, city: c.city, partnerCharId: c.people.find(p => p.id === c.partnerId)?.coop || null, parentIds: c.people.filter(p => ['Father', 'Mother'].includes(p.role)).map(p => p.coop || p.id) };
}

// ---------- connecting
// ---- the room survives refreshes: we remember it and quietly reconnect on load
const ROOM_KEY = 'fadingink.room.v1';
const remember = () => { try { localStorage.setItem(ROOM_KEY, JSON.stringify({ code: net.code, role: net.role, chat: net.chat.slice(-40) })); } catch (e) {} };
const forget = () => { try { localStorage.removeItem(ROOM_KEY); } catch (e) {} };
let retryTimer = null, retries = 0;
const newCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[ri(0, 30)]).join('');

export function resumeRoom() {
  let saved = null; try { saved = JSON.parse(localStorage.getItem(ROOM_KEY) || 'null'); } catch (e) {}
  if (!saved?.code) return;
  net.chat = saved.chat || [];
  sys(`Reconnecting to room ${saved.code}…`);
  if (saved.role === 'host') hostRoom(saved.code, true); else joinRoom(saved.code, true);
}

// Host with a fresh code, or re-claim an existing code after a refresh (PeerJS may hold the old id for a few seconds).
export async function hostRoom(code, resuming) {
  await loadLib(); teardown(); clearTimeout(retryTimer);
  code = code || newCode(); if (!resuming) retries = 0;
  setStatus(resuming ? 'reconnecting' : 'connecting');
  const peer = new window.Peer(PREFIX + code, peerOpts()); net.peer = peer;
  peer.on('open', id => { retries = 0; net.myId = id; net.role = 'host'; net.code = code; setStatus('online'); remember();
    sys(resuming ? `Room ${code} is back up. Friends will reconnect automatically.` : `Room ${code} is open. Share the code with your friends.`); });
  peer.on('connection', conn => wire(conn));
  peer.on('error', e => {
    if (e.type === 'unavailable-id') {
      if (resuming && retries++ < 12) { teardown(); retryTimer = setTimeout(() => hostRoom(code, true), 2500); return; }
      return hostRoom(resuming ? code : newCode(), false);
    }
    if (resuming && retries++ < 12) { teardown(); retryTimer = setTimeout(() => hostRoom(code, true), 3000); return; }
    fail(e);
  });
  peer.on('disconnected', () => { if (net.peer === peer && !peer.destroyed) peer.reconnect(); });
}
export async function joinRoom(code, resuming) {
  code = String(code || '').trim().toUpperCase(); if (!code) return;
  await loadLib(); teardown(); clearTimeout(retryTimer); if (!resuming) retries = 0;
  setStatus(resuming ? 'reconnecting' : 'connecting');
  const peer = new window.Peer(undefined, peerOpts()); net.peer = peer;
  const retry = () => { if (retries++ < 25) { teardown(); setStatus('reconnecting'); retryTimer = setTimeout(() => joinRoom(code, true), 3000); return true; } return false; };
  peer.on('open', id => {
    net.myId = id; net.role = 'client'; net.code = code; remember();
    const conn = peer.connect(PREFIX + code, { reliable: true }); wire(conn);
    setTimeout(() => { if (net.peer === peer && net.status !== 'online') { if (!(resuming && retry())) fail({ type: 'timeout', message: 'No room with that code answered.' }); } }, 9000);
  });
  peer.on('error', e => { if (resuming && retry()) return; fail(e); });
}
// teardown = close sockets but keep the remembered room; leave = the player chose to go
function teardown() {
  if (net.peer) { try { net.peer.destroy(); } catch (e) {} }
  Object.assign(net, { peer: null, myId: null }); net.conns.clear(); net.peers.clear();
  for (const [, p] of net.pending) p.resolve(null); net.pending.clear(); markAllOffline();
}
export function leave(silent) {
  clearTimeout(retryTimer); retries = 99;
  if (net.peer) { try { broadcast({ t: 'bye' }); } catch (e) {} }
  teardown(); Object.assign(net, { role: null, code: null, status: 'offline' }); forget();
  if (!silent) { sys('You left the room.'); refresh(); }
}
function fail(e) {
  const msg = e?.type === 'peer-unavailable' ? 'No room with that code exists (or the host left).' : e?.message || String(e);
  ui.toast('Co-op: ' + msg); sys('Error: ' + msg); leave(true); setStatus('offline');
}
function wire(conn) {
  conn.on('open', () => {
    net.conns.set(conn.peer, conn); if (net.role === 'client') setStatus('online');
    conn.send({ t: 'hello', from: net.myId, profile: myProfile() });
    if (net.role === 'host') for (const [pid, prof] of net.peers) conn.send({ t: 'profile', from: pid, profile: prof }); // catch the newcomer up
  });
  conn.on('data', d => onData(conn, d));
  conn.on('close', () => dropped(conn.peer));
  conn.on('error', () => dropped(conn.peer));
}
function dropped(pid) {
  net.conns.delete(pid);
  if (net.role === 'client') { if (net.status === 'online') { sys('Lost connection to the host — reconnecting…'); const code = net.code; retries = 0; teardown(); setStatus('reconnecting'); retryTimer = setTimeout(() => joinRoom(code, true), 2000); } return; }
  gone(pid); broadcast({ t: 'bye', from: pid });
}

// ---------- messaging (host relays for clients)
function sendTo(to, msg) {
  msg.from ||= net.myId;
  if (net.conns.has(to)) net.conns.get(to).send(msg);
  else if (net.role === 'client') net.conns.forEach(c => c.send({ ...msg, to }));
}
function broadcast(msg) {
  msg.from ||= net.myId;
  if (net.role === 'host') net.conns.forEach((c, pid) => { if (pid !== msg.from) c.send(msg); });
  else net.conns.forEach(c => c.send({ ...msg, to: '*' }));
}
function onData(conn, d) {
  if (!d || typeof d !== 'object') return;
  if (net.role === 'host') {
    d.from = d.t === 'profile' && d.from && d.from !== conn.peer ? d.from : conn.peer; // clients can't spoof another sender
    if (d.to && d.to !== net.myId) {
      if (d.to === '*') { const { to, ...m } = d; net.conns.forEach((c, pid) => { if (pid !== conn.peer) c.send(m); }); }
      else { const { to, ...m } = d; net.conns.get(to)?.send(m); return; }
    }
    if (d.t === 'hello') { const { to, ...m } = d; net.conns.forEach((c, pid) => { if (pid !== conn.peer) c.send({ ...m, t: 'profile' }); }); }
  }
  handle(d);
}

// ---------- incoming
function handle(d) {
  switch (d.t) {
    case 'hello': case 'profile': {
      if (!d.profile) return; const isNew = !net.peers.has(d.from);
      net.peers.set(d.from, d.profile); upsertPerson(d.from, d.profile);
      if (isNew) sys(`${d.profile.first} ${d.profile.last} joined.`);
      return refresh();
    }
    case 'bye': { const p = net.peers.get(d.from); if (p) sys(`${p.first} left.`); gone(d.from); return refresh(); }
    case 'chat': net.chat.push({ who: net.peers.get(d.from)?.first || '?', text: String(d.text).slice(0, 300) }); trimChat(); ui.fx('click'); return refresh();
    case 'req': return onRequest(d);
    case 'res': { const p = net.pending.get(d.id); if (p) { net.pending.delete(d.id); p.resolve(d); } return; }
    case 'note': return onNote(d);
    case 'vote_yes': return net.role === 'host' ? hostVote(d.from) : undefined;
    case 'vote': net.vote = d.vote; voteTick(); return;
    case 'vote_go': return voteGo(d.id);
  }
}
function gone(pid) { net.peers.delete(pid); if (net.role === 'host' && net.vote) checkVote(); const c = G.char; c?.people.forEach(p => { if (p.peerId === pid) p.online = false; }); }
function markAllOffline() { G.char?.people.forEach(p => { if (p.coop) p.online = false; }); }
const sys = text => { net.chat.push({ who: '•', text }); trimChat(); };
const trimChat = () => { if (net.chat.length > 80) net.chat.splice(0, net.chat.length - 80); if (net.code) remember(); };
export function sendChat(text) { text = String(text || '').trim(); if (!text || !net.peer) return; net.chat.push({ who: G.char.first, text, me: true }); broadcast({ t: 'chat', text }); refresh(); }

// Co-op players live in your People list (role "Co-op Friend" until you date/marry them).
function upsertPerson(peerId, prof) {
  const c = G.char; if (!c) return;
  let p = c.people.find(x => x.coop === prof.charId);
  // a co-op player who continued as OUR child (or parent) keeps that family role
  if (!p) { p = c.people.find(x => x.id === prof.charId && !x.coop); if (p) { p.coop = prof.charId; ui.log(`${prof.first} is a player now — my ${p.role.toLowerCase()} lives on.`, 'good'); } }
  if (!p && prof.parentIds?.includes(c.id)) { p = { id: prof.charId, coop: prof.charId, role: prof.gender === 'F' ? 'Daughter' : 'Son', close: 85, met: G.world.year }; c.people.push(p); }
  if (!p) {
    p = { id: uid(), coop: prof.charId, role: 'Co-op Friend', close: 50, met: G.world.year };
    c.people.push(p); ui.log(`I met ${prof.first} ${prof.last} (another player).`, 'good');
  }
  Object.assign(p, { peerId, online: true, first: prof.first, last: prof.last, gender: prof.gender, age: prof.age, genes: prof.genes, hair: prof.hair, face: prof.face,
    alive: prof.alive, stats: { ...prof.stats }, realm: prof.realm, techs: prof.techs, sect: prof.sect, sectName: prof.sectName, traits: prof.traits, pregnant: prof.pregnant });
  if (!prof.alive && !p.deathNoted) { p.deathNoted = true; ui.log(`${prof.first} ${prof.last} has died.`, 'death'); if (c.partnerId === p.id) c.partnerId = null; }
}

// ---------- requests: sender pays a Social action; receiver gets a popup to accept or decline
export const COOP_ACTIONS = [
  { id: 'hangout', emoji: '🍵', name: 'Hang out', ask: 'wants to hang out.' },
  { id: 'gym', emoji: '🏋️', name: 'Hit the gym together', ask: 'wants to hit the gym with you.', age: 12 },
  { id: 'train', emoji: '🌀', name: 'Train Qi together', ask: 'wants to circulate Qi together.', need: (c, p) => c.qi.realm >= 1 && p.realm >= 1 },
  { id: 'spar', emoji: '⚔️', name: 'Spar', ask: 'challenges you to a friendly spar.', age: 8 },
  { id: 'sect', emoji: '🏯', name: 'Invite to my sect/gang', ask: 'invites you to join their', need: (c, p) => !!c.sect && c.sect !== 'guest' && p.sect !== c.sect && (p.sectName || '') !== (sectName(c) || '') && p.age >= 12 },
  { id: 'money', emoji: '💸', name: 'Send money', notice: true, need: (c, p) => c.money > 0 },
  { id: 'movein', emoji: '🏠', name: 'Move in together', ask: 'wants to move in together.', need: (c, p) => ['Partner', 'Spouse'].includes(p.role) && !p.livesWith },
  { id: 'date', emoji: '🌹', name: 'Ask out', ask: 'is asking you out!', age: 14, need: (c, p) => !c.partnerId && p.role === 'Co-op Friend' && p.age >= 14 },
  { id: 'marry', emoji: '💍', name: 'Propose', ask: 'is proposing to you!', age: 18, need: (c, p) => p.role === 'Partner' && p.age >= 18 },
  { id: 'baby', emoji: '👶', name: 'Try for a baby', ask: 'wants to have a child with you.', age: 18, need: (c, p) => ['Partner', 'Spouse'].includes(p.role) && (p.livesWith || p.role === 'Spouse') && fertile(c, p) && !c.expecting && !p.pregnant },
  { id: 'breakup', emoji: '💔', name: 'Break up', need: (c, p) => ['Partner', 'Spouse'].includes(p.role), notice: true },
];

function request(peerId, kind, data = {}) {
  return new Promise(resolve => {
    const id = uid(); net.pending.set(id, { resolve });
    sendTo(peerId, { t: 'req', id, kind, data, profile: myProfile() });
    setTimeout(() => { if (net.pending.has(id)) { net.pending.delete(id); resolve(null); } }, 60000);
  });
}
const respond = (to, id, ok, data = {}) => sendTo(to, { t: 'res', id, ok, data, profile: myProfile() });

// Called from the People popup. Returns chronicle text (or null = cancelled, Social action refunded).
export async function doCoopAction(p, kind) {
  const c = G.char;
  if (!p.online || !net.peers.has(p.peerId)) { ui.toast(`${p.first} is not online.`); return null; }
  const A = COOP_ACTIONS.find(a => a.id === kind);
  if (kind === 'money') {
    const amts = [0.05, 0.1, 0.25, 0.5].map(f => Math.max(1, Math.round(c.money * f))).filter((v, i, a) => a.indexOf(v) === i);
    const amt = await ui.choice({ title: `Send money to ${p.first}`, icon: 'market', text: `You have ${fmtMoney(c, c.money)}.`, options: [...amts.map(v => ({ label: fmtMoney(c, v), value: v })), { label: 'Cancel', value: null, ghost: true }] });
    if (!amt || amt > c.money) return null;
    const t = giftToChild(c, p, { money: amt }); return t ? { text: t, cls: 'good' } : null;
  }
  if (A.notice) { // one-way, no permission needed
    sendTo(p.peerId, { t: 'note', kind, profile: myProfile() });
    if (p.role === 'Spouse') c.flags.divorces = (c.flags.divorces || 0) + 1; p.role = 'Ex'; c.partnerId = null; p.close = clamp(p.close - 30); return { text: `${p.first} and I broke up.`, cls: 'bad' };
  }
  let data = {};
  if (kind === 'sect') { data.sect = c.sect; data.name = sectName(c); }
  if (kind === 'baby') data.kid = makeKid(c, p);
  ui.toast(`Waiting for ${p.first} to answer…`);
  const r = await request(p.peerId, kind, data);
  if (!r) { ui.toast(`${p.first} didn't answer.`); return null; }
  if (!r.ok) { p.close = clamp(p.close - 2); return { text: `${p.first} declined (${A.name.toLowerCase()}).`, cls: kind === 'date' || kind === 'marry' ? 'bad' : '' }; }
  return applyAccepted(c, p, kind, data, r.data, true);
}

async function onRequest(d) {
  const c = G.char; if (!c) return;
  upsertPerson(d.from, d.profile); const p = c.people.find(x => x.coop === d.profile.charId);
  const A = COOP_ACTIONS.find(a => a.id === d.kind); if (!A) return respond(d.from, d.id, false);
  // auto-decline what this character can't do right now
  const blocked = !c.alive || (A.age && c.age < A.age) || (d.kind === 'date' && c.partnerId) || (d.kind === 'marry' && p.role !== 'Partner') || (d.kind === 'baby' && (!fertile(c, p) || c.expecting || !['Partner', 'Spouse'].includes(p.role)));
  if (blocked) return respond(d.from, d.id, false);
  if (AUTO.includes(d.kind)) { respond(d.from, d.id, true); applyAccepted(c, p, d.kind, d.data, {}, false); save(); return refresh(); }
  ui.fx('milestone');
  const sn = d.kind === 'sect' ? ' ' + (d.data.name || 'sect') + '.' : '';
  const ok = await ui.choice({ title: `${d.profile.first} ${d.profile.last}`, icon: 'people', text: `${d.profile.first} ${A.ask}${sn}`, dismiss: false,
    options: [{ label: 'Accept', value: true }, { label: 'Decline', value: false, ghost: true }] });
  respond(d.from, d.id, !!ok);
  if (ok) { applyAccepted(c, p, d.kind, d.data, {}, false); save(); refresh(); }
}
// small, friendly things don't need a popup; sparring and life-changing choices still ask
const AUTO = ['hangout', 'gym', 'train'];
function onNote(d) {
  const c = G.char; const p = c?.people.find(x => x.coop === d.profile?.charId); if (!p) return;
  if (d.kind === 'gift') { if (d.asset) { c.assets.push(d.asset); ui.log(`${p.first} gave me their ${d.asset.name.toLowerCase()}!`, 'good'); } if (d.money > 0) { money(c, d.money); ui.log(`${p.first} sent me ${fmtMoney(c, d.money)}.`, 'good'); } p.close = clamp(p.close + 5); ui.fx('coin'); }
  if (d.kind === 'breakup') { p.role = 'Ex'; if (c.partnerId === p.id) c.partnerId = null; p.close = clamp(p.close - 30); ui.log(`${p.first} broke up with me.`, 'bad'); ui.fx('fail'); }
  if (d.kind === 'spar_result') ui.log(`${p.first} sparred with me: ${d.text}`);
  save(); refresh();
}

function applyAccepted(c, p, kind, data, resData, iAmSender) {
  switch (kind) {
    case 'hangout': gainClose(c, p, ri(8, 15)); stat(c, 'happiness', 6); stat(c, 'stress', -6);
      return logRet(c, iAmSender, `I hung out with ${p.first} ${pick(['at the night market', 'on the rooftop', 'at the arcade', 'by the river'])}.`, 'good');
    case 'gym': { const g = ri(3, 6); stat(c, 'strength', g); stat(c, 'health', 3); gainClose(c, p, 6); return logRet(c, iAmSender, `${p.first} and I hit the gym together. Strength +${g}.`, 'good'); }
    case 'train': { const g = Math.round(15 + (c.qi.affinity + 50) / 4); c.qi.qi += g; gainClose(c, p, 6); return logRet(c, iAmSender, `${p.first} and I circulated Qi in harmony. +${g} Qi.`, 'qi'); }
    case 'spar': {
      if (!iAmSender) { ui.log(`I accepted ${p.first}'s spar challenge.`); return; }
      return ui.fight({ id: 'player', kind: 'human', name: `${p.first} ${p.last}`, genes: p.genes, gender: p.gender, age: p.age, hair: p.hair, realm: p.realm || 0, hp: 30 + (p.stats.health || 50) * 0.5, str: p.stats.strength, agi: p.stats.agility,
        moves: ['jab', 'punch', 'kick', 'guard', ...(p.realm >= 1 ? ['qi_palm'] : []), ...(p.techs || [])], sparring: true }).then(r => {
        const txt = r === 'win' ? 'VICTORY' : r === 'flee' ? 'I yielded' : 'DEFEAT'; gainClose(c, p, 3); if (r === 'win') c.wins++;
        sendTo(p.peerId, { t: 'note', kind: 'spar_result', text: r === 'win' ? 'they won.' : 'I won.', profile: myProfile() });
        return { text: `Spar vs ${p.first} (player): ${txt}.`, cls: r === 'win' ? 'good' : '' }; });
    }
    case 'sect': {
      if (iAmSender) return { text: `${p.first} joined my ${data.name}.`, cls: 'good', big: true };
      if (SECTS.some(s => s.id === data.sect)) c.sect = data.sect; else { c.sect = 'guest'; c.guestSect = data.name; }
      learnManual(c, 'breathing'); ui.log(`I joined the ${data.name} with ${p.first}.`, 'qi'); sectCine(c, data.name); return;
    }
    case 'date': p.role = 'Partner'; c.partnerId = p.id; gainClose(c, p, 15); stat(c, 'happiness', 12);
      return logRet(c, iAmSender, `${p.first} and I are dating!`, 'good', true);
    case 'marry': p.role = 'Spouse'; p.livesWith = true; c.partnerId = p.id; c.flags.coopMarried = true; gainClose(c, p, 20); stat(c, 'happiness', 20); weddingCine(c, p);
      return logRet(c, iAmSender, `${p.first} and I got married!`, 'good', true);
    case 'baby': return logRet(c, iAmSender, conceive(c, p, { ...data.kid }), 'good', true);
    case 'movein': p.livesWith = true; gainClose(c, p, 8); stat(c, 'happiness', 6); return logRet(c, iAmSender, `${p.first} and I moved in together.`, 'good', true);
  }
}
function logRet(c, iAmSender, text, cls, big) { if (iAmSender) return { text, cls, big }; ui.log(text, cls); if (big) ui.fx('milestone'); }

// The child exists in BOTH players' lives (same id) so either parent can continue as them.
function makeKid(c, p) {
  const gender = chance(0.5) ? 'F' : 'M';

  const st = {}; for (const k of ['smarts', 'strength', 'agility', 'charisma', 'luck']) st[k] = clamp(Math.round(((c.stats[k] ?? 50) + (p.stats?.[k] ?? 50)) / 2 + ri(-15, 15)));
  return { id: uid(), first: uniqueFirst(c, gender), last: c.ownSect || c.gender === 'M' ? c.last : p.gender === 'M' ? p.last : c.last, gender, age: 0, role: gender === 'F' ? 'Daughter' : 'Son', alive: true, close: 90,
    genes: mixGenes(c.genes, p.genes, gender), stats: st, realm: 0, met: G.world.year };
}

// Push my profile to everyone whenever my character changes (throttled).
let lastSent = 0, queued = false;
// ---------- shared age-up vote: everyone in the room must agree. The first "yes" starts a 60s timer;
// when everyone has agreed (or the timer runs out) every player moves on to the next year together.
export const VOTE_SECONDS = 60;
// only living players vote (a finished life shouldn't hold the room up)
const voters = () => [...(G.char?.alive ? [net.myId] : []), ...[...net.peers.entries()].filter(([, p]) => p.alive !== false).map(([id]) => id)];
export const inCoopRoom = () => net.status === 'online' && voters().length > 1 && !!G.char?.alive;
export function voteInfo() {
  const v = net.vote; if (!v) return null;
  const need = voters();
  return { left: Math.max(0, Math.ceil((v.ends - Date.now()) / 1000)), yes: v.yes.filter(id => need.includes(id)).length, total: need.length, mine: v.yes.includes(net.myId),
    waiting: need.filter(id => !v.yes.includes(id)).map(id => id === net.myId ? 'you' : net.peers.get(id)?.first || '?') };
}
export function voteAgeUp() {
  if (net.vote?.yes.includes(net.myId)) return;
  if (net.role === 'host') hostVote(net.myId); else net.conns.forEach(c => c.send({ t: 'vote_yes', from: net.myId }));
}
function hostVote(pid) {
  if (!net.vote) { net.vote = { id: Math.random().toString(36).slice(2, 8), ends: Date.now() + VOTE_SECONDS * 1000, yes: [] }; const who = pid === net.myId ? G.char.first : net.peers.get(pid)?.first || 'Someone'; sys(`${who} is ready to age up. Everyone has ${VOTE_SECONDS}s to agree.`); }
  if (!net.vote.yes.includes(pid)) net.vote.yes.push(pid);
  broadcast({ t: 'vote', vote: net.vote }); voteTick(); checkVote();
}
function checkVote() {
  const v = net.vote; if (!v) return;
  const need = voters();
  const all = need.every(id => v.yes.includes(id));
  if (all || Date.now() >= v.ends) { sys(all ? 'Everyone agreed — on to the next year.' : 'Time\'s up — the year moves on for everyone.'); broadcast({ t: 'vote_go', id: v.id }); voteGo(v.id); }
}
let voteTimer = null;
function voteTick() {
  clearInterval(voteTimer);
  if (!net.vote) { net.onVote?.(); return; }
  net.onVote?.(); refresh();
  voteTimer = setInterval(() => { if (!net.vote) return clearInterval(voteTimer); if (net.role === 'host') checkVote(); net.onVote?.(); }, 1000);
}
function voteGo(id) {
  if (!net.vote || net.vote.id !== id) { if (net.lastGo === id) return; }
  net.lastGo = id; net.vote = null; clearInterval(voteTimer); net.onVote?.();
  net.doAgeUp?.();
}
// gifts to another player (called through ui.coopGift by giftToChild)
ui.coopGift = (p, what) => { if (!p.online || !net.peers.has(p.peerId)) return false; sendTo(p.peerId, { t: 'note', kind: 'gift', asset: what.asset || null, money: what.money || 0, profile: myProfile() }); return true; };
export function coopTick() {
  if (net.status !== 'online') return;
  const now = Date.now(); if (now - lastSent < 1500) { if (!queued) { queued = true; setTimeout(() => { queued = false; coopTick(); }, 1600); } return; }
  lastSent = now; broadcast({ t: 'profile', profile: myProfile() });
}
