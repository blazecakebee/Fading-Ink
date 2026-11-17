// Tabs added in v0.6.0: Bloodline (genetics tree + heirlooms) and Sect & Guild (missions, ranks, disciples, exchange).
import { G } from '../core/state.js';
import * as SE from './sectEmblem.js';
import { h, icon } from './dom.js';
import { choice, toast } from './modal.js';
import { portraitFor } from './portrait.js';
import { BASE_GENES, TREE_GENES, BRANCHES, GENE, MAX_AWAKENED } from '../data/genes.js';
import { HEIRLOOMS, HEIRLOOM_TIERS, MAX_ATTUNED } from '../data/heirlooms.js';
import { ensureDna, geneState, awaken, geneName } from '../systems/genetics.js';
import { attuned } from '../systems/bonus.js';
import { heirloomsOf } from '../systems/heirlooms.js';
import { REALMS, SECTS } from '../data/realms.js';
import { ITEMS } from '../data/items.js';
import { fmtMoney } from '../systems/life.js';
import * as F from '../systems/factions.js';

let R = null; // render() + runActivity() handed in by render.js to avoid a circular import
export function bindPanels(render, runActivity) { R = { render, run: runActivity }; }

const card = (...k) => h('div', { class: 'card' }, ...k);
const geneChip = id => { const g = GENE(id); const col = g?.neg ? '#ff7a6a' : g?.trans ? '#ffd36f' : TREE_GENES[id] ? '#b18cff' : '#b9b9b9';
  return h('span', { class: 'chip-gene', style: { borderColor: col, color: col }, 'data-tip': g?.desc || '', 'data-tip-title': g?.name || id }, geneName(id)); };
export const geneChips = ids => (ids || []).map(geneChip);

// v0.8.7 the DNA double helix beside the Awakening tree: one rung per awakened slot, gold when filled
function helix(n, max, pts) {
  const NS = 'http://www.w3.org/2000/svg', W = 150, H = 420, R = 22, el = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'helix-svg' }), x = (y, ph) => W / 2 + Math.sin(y / 38 + ph) * 46;
  const path = ph => { let d = ''; for (let y = 0; y <= H; y += 6) d += `${y ? 'L' : 'M'}${x(y, ph).toFixed(1)} ${y}`; return d; };
  const rungs = Math.max(max, 8);
  for (let i = 0; i < rungs; i++) { const y = 20 + i * (H - 40) / (rungs - 1), x1 = x(y, 0), x2 = x(y, Math.PI), on = i < n && i < max;
    svg.append(el('line', { x1, y1: y, x2, y2: y, class: 'rung' + (on ? ' on' : i < max ? '' : ' dim') })); if (on) svg.append(el('circle', { cx: (x1 + x2) / 2, cy: y, r: 4, class: 'rung-dot' })); }
  svg.append(el('path', { d: path(0), class: 'strand a' }), el('path', { d: path(Math.PI), class: 'strand b' }));
  return h('div', { class: 'helix' }, h('div', { class: 'helix-head' }, h('span', { class: 'muted small' }, 'STRANDS'), h('b', {}, ` ${n}/${max}`)), svg, h('div', { class: 'muted small', style: { textAlign: 'center' } }, `${pts}◆ to spend`));
}
// v0.9.36 the Awakening tree as a radial graph: four arms (Body, Spirit, Mind, Blood) grow out of your core,
// and cross-branch genes sit between the arms they need. Click a gene to see it and awaken it.
function geneGraph(c, d) {
  const NS = 'http://www.w3.org/2000/svg', el = (t, a = {}, txt) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; return e; };
  const W = 1060, H = 1000, cx = W / 2, cy = H / 2, ANG = { body: -135, spirit: -45, mind: 45, blood: 135 }, col = Object.fromEntries(BRANCHES.map(b => [b.id, b.color]));
  const pos = {};
  for (const [id, g] of Object.entries(TREE_GENES)) if (g.branch !== 'cross') { const a = ANG[g.branch] * Math.PI / 180, r = 130 + g.row * 88; pos[id] = [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
  for (const [id, g] of Object.entries(TREE_GENES)) if (g.branch === 'cross') { const ps = g.req.map(r => pos[r]).filter(Boolean), mx = ps.reduce((s, p) => s + p[0], 0) / ps.length - cx, my = ps.reduce((s, p) => s + p[1], 0) / ps.length - cy, len = Math.hypot(mx, my) || 1, dist = ps.reduce((s, p) => s + Math.hypot(p[0] - cx, p[1] - cy), 0) / ps.length + 40; pos[id] = [cx + mx / len * dist, cy + my / len * dist]; }
  const hex = (x, y, r) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 180 * (60 * i - 30); return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'gg-svg' });
  // arms & links
  for (const [id, g] of Object.entries(TREE_GENES)) {
    const from = g.req.length ? g.req : ['core'];
    for (const r of from) { const [x1, y1] = r === 'core' ? [cx, cy] : pos[r], [x2, y2] = pos[id], lit = r === 'core' ? d.awakened.includes(id) : d.awakened.includes(r) && d.awakened.includes(id), c2 = g.branch === 'cross' ? '#ffd36f' : col[g.branch];
      svg.append(el('line', { x1, y1, x2, y2, class: 'gg-link' + (lit ? ' lit' : '') + (g.branch === 'cross' ? ' cross' : ''), style: `--gc:${c2}` })); }
  }
  // the core
  svg.append(el('circle', { cx, cy, r: 62, class: 'gg-core' }), el('text', { x: cx, y: cy - 6, class: 'gg-core-t', 'text-anchor': 'middle' }, '🧬'), el('text', { x: cx, y: cy + 22, class: 'gg-core-s', 'text-anchor': 'middle' }, `${d.points}◆ to spend`));
  for (const b of BRANCHES) { const a = ANG[b.id] * Math.PI / 180, r = 130 + 4 * 88 + 56; svg.append(el('text', { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r + 6, class: 'gg-arm', 'text-anchor': 'middle', style: `fill:${b.color}` }, b.name)); }
  // genes
  const sel = G.ui.geneSel;
  for (const [id, g] of Object.entries(TREE_GENES)) {
    const st = geneState(c, id).state, [x, y] = pos[id], c2 = g.branch === 'cross' ? '#ffd36f' : col[g.branch], r = g.trans ? 34 : 29;
    const gr = el('g', { class: `gg-node ${st}${g.neg ? ' neg' : ''}${g.trans ? ' trans' : ''}${sel === id ? ' sel' : ''}`, style: `--gc:${c2}`, tabindex: 0, role: 'button' });
    gr.append(el('polygon', { points: hex(x, y, r), class: 'gg-bg' }), el('text', { x, y: y + 6, 'text-anchor': 'middle', class: 'gg-ico' }, st === 'owned' ? '✓' : g.neg ? '⚠' : g.trans ? '✦' : `${g.cost}◆`));
    const nm = g.name.length > 17 ? g.name.slice(0, 16) + '…' : g.name; const side = g.branch === 'cross' ? 0 : Math.cos(ANG[g.branch] * Math.PI / 180) > 0 ? 1 : -1; // labels sit beside the node, away from the arm
    gr.append(el('text', side ? { x: x + side * (r + 8), y: y + 5, 'text-anchor': side > 0 ? 'start' : 'end', class: 'gg-name' } : { x, y: y + r + 16, 'text-anchor': 'middle', class: 'gg-name' }, nm));
    gr.append(el('title', {}, `${g.name}\n${g.desc}`));
    gr.addEventListener('click', () => { G.ui.geneSel = id; R.render(); }); gr.addEventListener('keydown', e => { if (e.key === 'Enter') { G.ui.geneSel = id; R.render(); } });
    svg.append(gr);
  }
  const g = sel && TREE_GENES[sel], st = g && geneState(c, sel);
  const detail = g ? h('div', { class: 'card gg-detail', style: { '--gc': g.branch === 'cross' ? '#ffd36f' : col[g.branch] } },
      h('b', {}, (g.trans ? '✦ ' : g.neg ? '⚠ ' : '') + g.name), h('div', { class: 'small' }, g.desc), h('div', { class: 'small muted' }, `Cost ${g.cost}◆ · Needs ${REALMS[g.realm]?.name || 'a high realm'}${g.req.length ? ' · after ' + g.req.map(r => TREE_GENES[r].name).join(' + ') : ''}`),
      st.state === 'locked' ? h('div', { class: 'small', style: { color: '#ff9a8a' } }, '🔒 ' + st.why.join(' · ')) : null,
      g.neg && st.state !== 'owned' ? h('div', { class: 'small', style: { color: '#ff9a8a' } }, 'This is a FLAW. You must accept it to reach the transcendent gene beyond.') : null,
      h('button', { class: 'btn', disabled: st.state !== 'open', onclick: () => { const t = awaken(c, sel); if (t) R.run({ id: 'awaken', cost: 'free', run: () => ({ text: t, cls: g.neg ? 'bad' : 'qi' }) }); } }, st.state === 'owned' ? 'Awakened' : st.state === 'open' ? `Awaken · ${g.cost}◆` : 'Locked'))
    : h('div', { class: 'card gg-detail muted small' }, 'Click a gene to read it and awaken it. Each arm grows outward from your core; the gold genes between arms need both sides.');
  return h('div', { class: 'gg-col' }, h('div', { class: 'gg-wrap' }, svg), detail);
}
// ---------------- Bloodline tab
export function bloodlineTab() {
  const c = G.char, d = ensureDna(c);
  const node = id => {
    const g = TREE_GENES[id], st = geneState(c, id), br = BRANCHES.find(b => b.id === g.branch) || { color: '#ffd36f' };
    return h('div', { class: `gene-node ${st.state}${g.neg ? ' neg' : ''}${g.trans ? ' trans' : ''}`, style: { '--gc': br.color },
      'data-tip': st.why?.length ? st.why.join(' · ') : st.state === 'owned' ? 'Awakened' : 'Click to awaken', 'data-tip-title': g.name,
      onclick: async () => {
        if (st.state !== 'open') return toast(st.why?.[0] || 'Already awakened.');
        const ok = await choice({ title: `Awaken ${g.name}?`, icon: 'flask', text: `${g.desc}\n\nCost: ${g.cost} Awakening point${g.cost > 1 ? 's' : ''}. Awakened genes are permanent.${g.neg ? '\n\nThis is a FLAW. You must accept it to reach the transcendent gene beyond.' : ''}`, options: [{ label: 'Awaken', value: true }, { label: 'Cancel', value: false, ghost: true }] });
        if (ok) { const t = awaken(c, id); if (t) { R.run({ id: 'awaken', cost: 'free', run: () => ({ text: t, cls: g.neg ? 'bad' : 'qi' }) }); } } } },
      h('span', { class: 'gcost' }, st.state === 'owned' ? '✓' : `${g.cost}◆`), h('b', {}, (g.trans ? '✦ ' : g.neg ? '⚠ ' : '') + g.name),
      h('div', { class: 'muted small' }, g.desc), h('div', { class: 'small', style: { opacity: 0.7 } }, `Needs ${REALMS[g.realm].name}`));
  };
  const cols = BRANCHES.map(b => h('div', { class: 'gene-col' }, h('h4', { style: { color: b.color } }, b.name),
    ...Object.keys(TREE_GENES).filter(id => TREE_GENES[id].branch === b.id).sort((x, y) => TREE_GENES[x].row - TREE_GENES[y].row).map(node)));
  const cross = Object.keys(TREE_GENES).filter(id => TREE_GENES[id].branch === 'cross').map(node);
  const hl = heirloomsOf(c), att = attuned(c);
  return [h('h2', { class: 'display' }, 'Bloodline'),
    h('p', { class: 'muted' }, 'Your genes and your family treasures. Both pass to your children — and both end when the bloodline does.'),
    card(h('h3', {}, 'Genes'), h('div', {}, h('span', { class: 'muted small' }, 'Base: '), ...geneChips(d.base)),
      h('div', { style: { marginTop: '4px' } }, h('span', { class: 'muted small' }, 'Awakened: '), d.awakened.length ? geneChips(d.awakened) : h('span', { class: 'muted small' }, 'none yet')),
      h('div', { class: 'small', style: { marginTop: '6px' } }, h('b', {}, `${d.points}◆ Awakening points`), ` · ${d.awakened.length}/${MAX_AWAKENED} awakened slots · earn 1◆ for each new realm, 1◆ at 18, or refine Bloodline Essence.`)),
    h('h3', { class: 'display', style: { margin: '14px 0 6px' } }, 'Awakening tree'),
    h('p', { class: 'muted small' }, 'Branch outward to wake dormant genes. Deeper genes need higher realms — and the transcendent genes at the bottom demand you first accept a flaw (⚠).'),
    h('div', { class: 'dna-wrap' }, geneGraph(c, d), helix(d.awakened.length, MAX_AWAKENED, d.points)),
    h('h3', { class: 'display', style: { margin: '18px 0 6px' } }, 'Family heirlooms'),
    h('p', { class: 'muted small' }, `Only your ${MAX_ATTUNED} finest heirlooms are attuned at once. Each one has a small chance to be lost every time it passes to the next generation. Found in Gates (rarely), by luck at birth, or in old ruins — Mythic pieces are 1 in 1,000 finds.`),
    hl.length ? h('div', { class: 'grid2' }, hl.map(x => { const H = HEIRLOOMS[x.id], T = HEIRLOOM_TIERS[H.tier];
      return h('div', { class: 'card heir-card', style: { '--hc': T.color } }, h('div', { class: 'row' }, icon(H.icon, 'lg'), h('div', {}, h('b', { style: { color: T.color } }, H.name), h('div', { class: 'muted small' }, `${T.name}${att.includes(x) ? ' · attuned' : ' · dormant'}`))),
        h('div', { class: 'small', style: { marginTop: '6px' } }, H.desc), h('div', { class: 'muted small' }, `First owned by ${x.found || 'an ancestor'}${x.gens ? ` · ${x.gens} generation${x.gens > 1 ? 's' : ''} in the family` : ''}`)); }))
      : card(h('span', { class: 'muted' }, 'Your family owns no heirlooms yet.')), divinePanel()];
}

// ---------------- Sect & Guild tab
const relPill = r => h('span', { class: 'rel-pill', style: { background: F.REL_INFO[r].color } }, F.REL_INFO[r].name);
function missionRow(c, m, i) {
  const I = F.missionInfo(c, m);
  return h('div', { class: 'card mission' }, icon(m.icon, 'lg'), h('div', { class: 'grow' }, h('b', {}, m.name),
    h('div', { class: 'muted small' }, `${I.diff} · foes around ${I.enemy}${m.check ? ` · tests ${m.check.join(' & ')}` : ''} · reward ${m.org === 'sect' ? `+${I.contrib} contribution` : `+${I.merit} merit, ${fmtMoney(c, I.money)}`}`)),
    h('button', { class: 'btn', disabled: m.done || c.actions <= 0 || !c.alive, onclick: () => R.run({ id: 'mission_' + m.org, cat: 'adventure', run: cc => F.runMission(cc, m) }) }, m.done ? 'Done' : '⚡ Go'));
}
function disciplesBox(c) {
  const slots = F.discipleSlots(c); if (!slots) return card(h('h3', {}, 'Personal disciples'), h('span', { class: 'muted small' }, 'Become a Core Disciple (or found your own sect) to take personal disciples.'));
  const list = c.disciples || [];
  const act = (label, f, d) => h('button', { class: 'btn ghost mini', disabled: c.social <= 0, onclick: () => R.run({ id: 'disciple', cost: 's', run: cc => f(cc, d) }) }, label);
  return card(h('h3', {}, `Personal disciples (${list.length}/${slots})`),
    h('p', { class: 'muted small' }, 'Teach them (💬1) and they grow; ignore them and loyalty sours — disloyal disciples betray you. Assigned disciples earn contribution each year and fight beside you in sect wars.'),
    ...list.map(d => h('div', { class: 'fac-disc' }, portraitFor({ genes: d.genes, age: d.age, gender: d.gender, realm: d.realm }, 48),
      h('div', { style: { flex: 1, minWidth: '160px' } }, h('b', {}, `${d.first} ${d.last}`), h('span', { class: 'muted small' }, ` · ${F.discRank(d)} disciple`), h('div', { class: 'muted small' }, `Age ${d.age} · ${REALMS[d.realm].name}${d.realm ? ` (${Math.round(d.prog)}%)` : ` (${Math.round(d.prog)}% to Qi Refining)`} · talent ${d.talent} · loyalty ${d.loyalty}`), h('div', {}, ...geneChips(d.dna))),
      act('Instruct', F.teach, d), act('Spar', F.sparDisciple, d), act('Gift pill', F.giftDisciple, d),
      (pr => h('button', { class: 'btn ghost', disabled: !pr.ok, title: pr.ok ? '' : pr.why.join(', '), onclick: () => R.run({ id: 'promote_disciple', cost: 'free', run: cc => F.promoteDisciple(cc, d) }) }, (d.rank || 0) >= 3 ? 'Elder' : 'Promote'))(F.canPromoteDisciple(c, d)),
      h('button', { class: 'btn ghost', onclick: () => { d.assigned = !d.assigned; R.render(); } }, d.assigned ? 'Assigned ✓' : 'Assign'))),
    list.length < slots ? h('button', { class: 'btn', disabled: c.actions <= 0, onclick: () => R.run({ id: 'scout', cat: 'cultivation', run: async cc => {
      const cand = F.scout(cc);
      const v = await choice({ title: 'Scouting for disciples', icon: 'people', text: cand.map((d, i) => `${'ABC'[i]}. ${d.first} ${d.last}, ${d.age} — talent ${d.talent}, ${REALMS[d.realm].name}. Genes: ${d.dna.map(geneName).join(', ')}${d.traits.length ? `. Trait: ${d.traits[0]}` : ''}`).join('\n\n'),
        options: [...cand.map((d, i) => ({ label: `Accept ${d.first} (${'ABC'[i]})`, value: i })), { label: 'Accept none', value: -1, ghost: true }] });
      if (v == null || v < 0) return 'I found no one worth teaching this year.';
      return { text: F.recruit(cc, cand[v]), cls: 'good', big: true }; } }) }, '⚡ Scout for disciples') : null);
}
// v0.9.1 Sect & Guild, rebuilt: a header card per organisation, stat tiles, progress bars and card grids
const tile = (ic, label, val) => h('div', { class: 'fac-tile' }, icon(ic, 'sm'), h('div', {}, h('div', { class: 'muted small' }, label), h('b', {}, val)));
const progress = (cur, need, label) => need && isFinite(need) ? h('div', { class: 'fac-prog' }, h('div', { class: 'muted small' }, label, h('span', {}, ` ${Math.min(cur, need)}/${need}`)), h('div', { class: 'bar' }, h('i', { style: { width: Math.min(100, cur / need * 100) + '%', '--c': 'var(--accent)' } }))) : null;
function facHero(glyph, title, sub, badge, color, ...rest) {
  const el = h('div', { class: 'fac-hero' }, h('div', { class: 'fac-emblem' }, glyph), h('div', { class: 'grow', style: { minWidth: 0 } }, h('div', { class: 'fac-title display' }, title, badge ? h('span', { class: 'fac-badge' }, badge) : null), h('div', { class: 'muted small' }, sub), ...rest));
  el.style.setProperty('--fc', color || 'var(--accent)'); return el;
}
const DIFF_COL = { Easy: '#5fd38a', Fair: '#b9c0ca', Hard: '#ff8a3a' };
function missionCard(c, m) {
  const I = F.missionInfo(c, m), dc = DIFF_COL[I.diff] || 'var(--muted)';
  const el = h('div', { class: 'fac-mission' + (m.done ? ' done' : '') }, h('div', { class: 'row', style: { gap: '8px' } }, icon(m.icon, 'lg'), h('div', { class: 'grow' }, h('b', {}, m.name), h('div', {}, h('span', { class: 'diff-pill' }, I.diff), h('span', { class: 'muted small' }, ` foes ~${I.enemy}`)))),
    m.check ? h('div', { class: 'muted small' }, `Tests ${m.check.join(' & ')}`) : null,
    h('div', { class: 'row', style: { justifyContent: 'space-between', marginTop: 'auto' } }, h('span', { class: 'small good' }, m.org === 'sect' ? `+${I.contrib} contribution` : `+${I.merit} merit · ${fmtMoney(c, I.money)}`),
      h('button', { class: 'btn mini', disabled: m.done || c.actions <= 0 || !c.alive, onclick: () => R.run({ id: 'mission_' + m.org, cat: 'adventure', run: cc => F.runMission(cc, m) }) }, m.done ? 'Done ✓' : 'Go ⚡1')));
  el.style.setProperty('--dc', dc); return el;
}
export function factionsTab() {
  const c = G.char, B = F.boards(c), own = F.isOwn(c);
  const tabs = [['overview', 'Overview', 'crown'], ...(c.sect ? [['missions', 'Missions', 'gates'], ['disciples', 'Disciples', 'people'], ['exchange', 'Relations', 'shop']] : []), ...(own ? [['halls', 'Halls', 'anvil']] : []), ['guild', 'Hunter Guild', 'combat']];
  let sub = G.ui.facTab || 'overview'; if (!tabs.some(t => t[0] === sub)) sub = 'overview';
  const nav = h('div', { class: 'fac-tabs' }, tabs.map(([k, v, ic]) => h('button', { class: sub === k ? 'on' : '', onclick: () => { G.ui.facTab = k; R.render(); } }, icon(ic, 'sm'), v, k === 'missions' ? h('span', { class: 'n' }, B.sect.filter(m => !m.done).length) : null)));
  const out = [h('h2', { class: 'display' }, 'Sect & Guild'), nav];
  const sectHero = () => { const nx = F.nextRank(c), dis = c.disciples || [];
    const redesign = own ? h('button', { class: 'btn ghost mini', style: { marginTop: '6px' }, onclick: async () => { const v = await SE.designSect({ emblem: c.ownSect.emblem, askNames: false, title: 'Redesign your sect', okLabel: 'Save' }); if (v) { c.ownSect.emblem = v.emblem; R.render(); } } }, c.ownSect.emblem ? '🎨 Redesign emblem & robes' : '🎨 Design an emblem') : null;
    const em = own && c.ownSect.emblem; const robe = em ? SE.ROBES[em.robe] : null;
    return facHero(em ? SE.emblemSvg(em, 52) : own ? '宗' : '門', F.sectLabel(c), own ? `Founded at age ${c.ownSect.founded}${robe ? ` · disciples wear ${robe[0].toLowerCase()} robes` : ''}${em?.motto ? ` · “${em.motto}”` : ''}` : 'Your sect', F.rankName(c), em ? em.fg : null, redesign,
      h('div', { class: 'fac-tiles' }, own ? tile('people', 'Members', c.ownSect.disciples) : tile('star', 'Contribution', c.contrib || 0), tile('education', 'Disciples', `${dis.length}/${F.discipleSlots(c)}`), tile('gates', 'Missions left', B.sect.filter(m => !m.done).length), tile('bell', 'Fame', (c.fame || 0).toLocaleString())),
      nx ? h('div', { class: 'fac-next' }, progress(c.contrib || 0, nx.R.contrib, `Next rank: ${nx.R.name}`), nx.ok ? h('button', { class: 'btn', onclick: () => R.run({ id: 'promote', cost: 'free', run: cc => F.promote(cc) }) }, 'Request promotion') : h('div', { class: 'muted small' }, 'Needs ', nx.why.join(' · '))) : null); };
  const guildHero = () => { const g = c.guild, nx = F.guildNext(c);
    return facHero(F.GUILD_RANKS[g.rank], 'Hunter Guild Association', `${F.GUILD_RANKS[g.rank]}-rank Hunter${g.elite ? ' · Elite' : ''} · retainer ${fmtMoney(c, F.guildSalary(c))}/yr`, null, '#4fa3ff',
      h('div', { class: 'fac-tiles' }, tile('star', 'Merit', g.merit), tile('gates', 'Gates cleared', c.gatesCleared), tile('trophy', 'Bounties', c.bountiesDone || 0), tile('combat', 'Contracts left', B.guild.filter(m => !m.done).length)),
      nx ? h('div', { class: 'fac-next' }, progress(g.merit, F.MERIT?.[g.rank + 1], `Next: ${nx.name}-rank`), nx.ok ? h('button', { class: 'btn', onclick: () => R.run({ id: 'gpromote', cost: 'free', run: cc => F.guildPromote(cc) }) }, 'Take the promotion exam') : h('div', { class: 'muted small' }, 'Needs ', nx.why.join(' · '))) : h('div', { class: 'small good' }, 'Highest rank.')); };
  if (sub === 'overview') {
    out.push(c.sect ? sectHero() : facHero('無', 'No sect', c.qi.known ? 'Seek a hidden sect (Cultivation actions), or found your own from the Cultivation tab.' : 'You know nothing of sects… yet.', null, 'var(--muted)'));
    out.push(c.guild ? guildHero() : facHero('?', 'Hunter Guild', 'Not a member yet — see the Hunter Guild tab.', null, 'var(--muted)'));
  }
  if (sub === 'missions') out.push(h('p', { class: 'muted small' }, 'Three missions a year, 1 action each. They earn contribution; failing them costs it.'), h('div', { class: 'fac-grid' }, B.sect.map(m => missionCard(c, m))));
  if (sub === 'disciples') out.push(disciplesBox(c));
  if (sub === 'exchange') {
    F.ensureRels(c); const ex = F.exchange(c);
    out.push(h('h3', { class: 'display fac-h' }, 'Relations'), h('div', { class: 'fac-grid small-cards' }, F.others(c).map(x => h('div', { class: 'fac-rel' }, h('b', {}, x.name), relPill(c.sectRel[x.id])))),
      h('p', { class: 'muted small' }, 'Allied sects sell for 20% less, hostile ones for 35% more; sects at war won\'t trade. Missions against rivals sour relations.'),
      h('h3', { class: 'display fac-h' }, 'Exchange'), ex.length ? h('div', { class: 'fac-grid' }, ex.map((o, i) => h('div', { class: 'fac-mission' }, h('div', { class: 'row', style: { gap: '8px' } }, icon(ITEMS[o.id].icon, 'lg'), h('div', { class: 'grow' }, h('b', {}, ITEMS[o.id].name), h('div', { class: 'muted small' }, `${SECTS.find(x => x.id === o.sect).name} · ${o.left} left`))),
        h('button', { class: 'btn mini', style: { marginTop: 'auto' }, disabled: o.left <= 0 || c.money < o.price, onclick: () => { const t = F.buyOffer(c, i); if (t) R.run({ id: 'buy_ex', cost: 'free', run: () => t }); } }, `Buy · ${fmtMoney(c, o.price)}`)))) : h('p', { class: 'muted small' }, 'Nobody will trade with you this year.'));
  }
  if (sub === 'halls') {
    const o = c.ownSect; o.halls ||= {};
    out.push(facHero('宗', o.name || F.sectLabel(c), `${o.disciples} members · more members, bigger yearly tithes`, 'Sect Master', null,
      h('button', { class: 'btn', style: { marginTop: '8px' }, disabled: c.actions <= 0, onclick: () => R.run({ id: 'recruit_drive', cat: 'cultivation', run: cc => F.recruitDrive(cc) || 'I couldn\'t afford a recruitment drive.' }) }, 'Hold a recruitment drive ⚡1')),
      h('div', { class: 'fac-grid' }, Object.entries(F.HALLS).map(([id, H]) => { const lvl = o.halls[id] || 0, cost = F.hallCost(c, lvl);
        return h('div', { class: 'fac-mission' }, h('div', { class: 'row', style: { gap: '8px' } }, icon(H.icon, 'lg'), h('div', { class: 'grow' }, h('b', {}, H.name), h('div', { class: 'lvl-pips' }, [0, 1, 2].map(k => h('i', { class: k < lvl ? 'on' : '' }))))), h('div', { class: 'muted small' }, H.desc),
          h('button', { class: 'btn mini', style: { marginTop: 'auto' }, disabled: lvl >= 3 || c.money < cost, onclick: () => R.run({ id: 'build_hall', cost: 'free', run: cc => F.buildHall(cc, id) }) }, lvl >= 3 ? 'Maxed' : `Build · ${fmtMoney(c, cost)}`)); })));
  }
  if (sub === 'guild') {
    if (c.guild) out.push(guildHero(), h('h3', { class: 'display fac-h' }, 'Guild contracts'), h('div', { class: 'fac-grid' }, B.guild.map(m => missionCard(c, m))), h('p', { class: 'muted small' }, 'Clearing Gates near your rank also earns merit. Mortal "Rankers" can climb to B-rank on Battle Knowledge alone.'));
    else { const why = F.guildJoinReq(c);
      out.push(facHero('?', 'Hunter Guild Association', 'Licenses Gate hunters — cultivators and mortal Rankers alike. Meet every requirement, then beat an examiner at least as strong as you. No fleeing.', null, '#4fa3ff',
        why.length ? h('div', { class: 'fac-req' }, why.map(w => h('span', { class: 'chip' }, w))) : h('button', { class: 'btn', style: { marginTop: '8px' }, disabled: c.actions <= 0, onclick: () => R.run({ id: 'guild_trial', cat: 'adventure', run: cc => F.guildTrial(cc) }) }, 'Take the entrance trial ⚡1'))); }
  }
  return out;
}

// ---------------- End-game hunts (shown under Dungeons & Gates) and divine favour
import * as EG from '../systems/endgame.js';
import * as RN from '../systems/renown.js';
import { wage } from '../systems/life.js';
export function huntsPanel() {
  const c = G.char, cur = c.hunt && EG.HUNT[c.hunt.id];
  return h('div', { style: { marginTop: '18px' } }, h('h3', { class: 'display' }, 'End-game Hunts'),
    h('p', { class: 'muted small' }, 'Legendary monsters, hunted over several years — one stage a year, 2 actions each. Losing a stage can kill you. Finishing pays a fortune, treasures, an heirloom, Awakening points and Legacy.'),
    cur ? h('div', { class: 'card', style: { borderColor: cur.color } }, h('b', { style: { color: cur.color } }, cur.name), h('div', { class: 'muted small' }, `Stage ${c.hunt.stage + 1} / ${cur.stages.length}: ${cur.stages[c.hunt.stage]}${c.hunt.last === G.world.year ? ' — you already fought this year' : ''}`),
      h('div', { class: 'row', style: { marginTop: '8px', gap: '6px' } }, h('button', { class: 'btn', disabled: !EG.canRunStage(c) || !c.alive, onclick: () => R.run({ id: 'hunt_stage', cat: 'adventure', run: cc => EG.huntStage(cc) }) }, '⚡⚡ Face this year\'s stage'),
        h('button', { class: 'btn ghost', onclick: () => R.run({ id: 'hunt_quit', cost: 'free', run: cc => EG.abandonHunt(cc) }) }, 'Abandon'))) : null,
    h('div', { class: 'grid2' }, EG.HUNTS.map(H => { const open = EG.huntOpen(c, H), done = (c.huntsDone || []).includes(H.id);
      return h('div', { class: 'card', style: { opacity: open ? 1 : 0.55, borderColor: done ? H.color : '' } }, h('b', { style: { color: H.color } }, H.name), h('div', { class: 'muted small' }, H.desc),
        h('div', { class: 'small', style: { marginTop: '4px' } }, `${H.stages.length} stages · foes around ${REALMS[H.minEq].name}, final stage ${REALMS[H.minEq + 1].name} · pays ~${fmtMoney(c, H.pay * 0.6)}+`),
        done ? h('div', { class: 'small', style: { color: H.color } }, '✓ Slain this life') : !open ? h('div', { class: 'small muted' }, H.elite && !c.guild?.elite ? 'Guild secret: needs the Guild\'s invitation (100,000 Fame)' : `Needs ${REALMS[H.minEq].name} (or the matching body tier)`) :
          h('button', { class: 'btn mini', style: { marginTop: '6px' }, disabled: !!c.hunt || !c.alive || c.age < 18, onclick: () => R.run({ id: 'hunt_start', cost: 'free', run: cc => EG.startHunt(cc, H.id) }) }, 'Take up the hunt')); })),
    wantedPanel(c));
}
// v0.8.7 Wanted board: demonic cultivators with a price on their heads
function wantedPanel(c) {
  if (c.age < 16) return null; const list = RN.bountyBoard(c);
  return h('div', { style: { marginTop: '18px' } }, h('h3', { class: 'display' }, 'Wanted: Demonic Cultivators'),
    h('p', { class: 'muted small' }, `Posted by the Hunter Association. Track one down (1 action) for the bounty and Fame. Bounties expire. Brought down: ${c.bountiesDone || 0}.`),
    h('div', { class: 'grid2' }, list.map(b => h('div', { class: 'card wanted' }, h('b', {}, b.name), h('div', { class: 'muted small' }, `${REALMS[b.realm].name} · ${b.years} year${b.years > 1 ? 's' : ''} left`),
      h('div', { class: 'small' }, `Reward ${fmtMoney(c, b.reward * wage(c))} · Fame +${b.fame.toLocaleString()}`),
      h('button', { class: 'btn mini', style: { marginTop: '6px' }, disabled: !c.alive || c.actions <= 0, onclick: () => R.run({ id: 'bounty', cat: 'adventure', run: cc => RN.huntBounty(cc, b.id) }) }, 'Hunt them (⚡1)')))));
}
export function divinePanel() {
  const c = G.char; if (!(c.divine || []).length) return null;
  return h('div', {}, h('h3', { class: 'display', style: { margin: '18px 0 6px' } }, 'Divine favour'), h('div', { class: 'grid2' }, c.divine.map(d => { const g = EG.GOD[d.god];
    return h('div', { class: 'card heir-card', style: { '--hc': g.color } }, h('b', { style: { color: g.color } }, `${d.kind === 'blessing' ? 'Blessing' : 'Shard of power'}: ${g.name}`), h('div', { class: 'muted small' }, g.title), h('div', { class: 'small' }, d.kind === 'blessing' ? g.blessTxt : g.shardTxt)); })));
}
