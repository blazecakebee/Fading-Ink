// Tabs added in v0.6.0: Bloodline (genetics tree + heirlooms) and Sect & Guild (missions, ranks, disciples, exchange).
import { G } from '../core/state.js';
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
    h('div', { class: 'gene-tree' }, cols), cross.length ? h('div', { style: { maxWidth: '260px', marginTop: '6px' } }, h('div', { class: 'muted small' }, 'Cross-branch'), ...cross) : null,
    h('h3', { class: 'display', style: { margin: '18px 0 6px' } }, 'Family heirlooms'),
    h('p', { class: 'muted small' }, `Only your ${MAX_ATTUNED} finest heirlooms are attuned at once. Each one has a small chance to be lost every time it passes to the next generation. Found in Gates (rarely), by luck at birth, or in old ruins — Mythic pieces are 1 in 1,000 finds.`),
    hl.length ? h('div', { class: 'grid2' }, hl.map(x => { const H = HEIRLOOMS[x.id], T = HEIRLOOM_TIERS[H.tier];
      return h('div', { class: 'card heir-card', style: { '--hc': T.color } }, h('div', { class: 'row' }, icon(H.icon, 'lg'), h('div', {}, h('b', { style: { color: T.color } }, H.name), h('div', { class: 'muted small' }, `${T.name}${att.includes(x) ? ' · attuned' : ' · dormant'}`))),
        h('div', { class: 'small', style: { marginTop: '6px' } }, H.desc), h('div', { class: 'muted small' }, `First owned by ${x.found || 'an ancestor'}${x.gens ? ` · ${x.gens} generation${x.gens > 1 ? 's' : ''} in the family` : ''}`)); }))
      : card(h('span', { class: 'muted' }, 'Your family owns no heirlooms yet.'))];
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
  const act = (label, f, d) => h('button', { class: 'btn ghost', disabled: c.social <= 0, onclick: () => R.run({ id: 'disciple', cost: 's', run: cc => f(cc, d) }) }, label);
  return card(h('h3', {}, `Personal disciples (${list.length}/${slots})`),
    h('p', { class: 'muted small' }, 'Teach them (💬1) and they grow; ignore them and loyalty sours — disloyal disciples betray you. Assigned disciples earn contribution each year and fight beside you in sect wars.'),
    ...list.map(d => h('div', { class: 'row', style: { gap: '10px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' } }, portraitFor({ genes: d.genes, age: d.age, gender: d.gender, realm: d.realm }, 48),
      h('div', { style: { flex: 1, minWidth: '160px' } }, h('b', {}, `${d.first} ${d.last}`), h('div', { class: 'muted small' }, `Age ${d.age} · ${REALMS[d.realm].name}${d.realm ? ` (${Math.round(d.prog)}%)` : ` (${Math.round(d.prog)}% to Qi Refining)`} · talent ${d.talent} · loyalty ${d.loyalty}`), h('div', {}, ...geneChips(d.dna))),
      act('Instruct', F.teach, d), act('Spar', F.sparDisciple, d), act('Gift pill', F.giftDisciple, d),
      h('button', { class: 'btn ghost', onclick: () => { d.assigned = !d.assigned; R.render(); } }, d.assigned ? 'Assigned ✓' : 'Assign'))),
    list.length < slots ? h('button', { class: 'btn', disabled: c.actions <= 0, onclick: () => R.run({ id: 'scout', cat: 'cultivation', run: async cc => {
      const cand = F.scout(cc);
      const v = await choice({ title: 'Scouting for disciples', icon: 'people', text: cand.map((d, i) => `${'ABC'[i]}. ${d.first} ${d.last}, ${d.age} — talent ${d.talent}, ${REALMS[d.realm].name}. Genes: ${d.dna.map(geneName).join(', ')}${d.traits.length ? `. Trait: ${d.traits[0]}` : ''}`).join('\n\n'),
        options: [...cand.map((d, i) => ({ label: `Accept ${d.first} (${'ABC'[i]})`, value: i })), { label: 'Accept none', value: -1, ghost: true }] });
      if (v == null || v < 0) return 'I found no one worth teaching this year.';
      return { text: F.recruit(cc, cand[v]), cls: 'good', big: true }; } }) }, '⚡ Scout for disciples') : null);
}
export function factionsTab() {
  const c = G.char, B = F.boards(c), out = [h('h2', { class: 'display' }, 'Sect & Guild')];
  // Sect
  if (c.sect) {
    const nx = F.nextRank(c);
    out.push(card(h('h3', {}, F.sectLabel(c)), h('div', {}, h('b', {}, F.rankName(c)), F.isOwn(c) ? '' : ` · ${c.contrib || 0} contribution`),
      nx ? h('div', { class: 'small', style: { marginTop: '6px' } }, `Next: ${nx.R.name} — `, nx.ok ? h('button', { class: 'btn', onclick: () => R.run({ id: 'promote', cost: 'free', run: cc => F.promote(cc) }) }, 'Request promotion') : h('span', { class: 'muted' }, nx.why.join(', '))) : null,
      h('div', { class: 'muted small', style: { marginTop: '6px' } }, 'Missions earn contribution, stipends grow with rank. Contribution below -30, or years of idleness as an outer disciple, gets you expelled.')));
    out.push(h('h3', { class: 'display', style: { margin: '12px 0 6px' } }, 'Sect mission board'), ...B.sect.map((m, i) => missionRow(c, m, i)));
    out.push(disciplesBox(c));
    if (!['own', 'guest'].includes(c.sect) || true) {
      F.ensureRels(c); const ex = F.exchange(c);
      out.push(card(h('h3', {}, 'Relations & exchange'), h('div', { class: 'small' }, ...F.others(c).map(s => h('div', {}, s.name, ' ', relPill(c.sectRel[s.id])))),
        h('p', { class: 'muted small' }, 'Allied sects sell for 20% less, hostile ones for 35% more; sects at war won\'t trade at all. Stock refreshes every year and world news moves prices.'),
        ex.length ? h('div', {}, ...ex.map((o, i) => h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '4px' } },
          h('span', {}, icon(ITEMS[o.id].icon, 'sm'), ` ${ITEMS[o.id].name} `, h('span', { class: 'muted small' }, `· ${SECTS.find(s => s.id === o.sect).name} · ${o.left} left`)),
          h('button', { class: 'btn ghost', disabled: o.left <= 0 || c.money < o.price, onclick: () => { const t = F.buyOffer(c, i); if (t) R.run({ id: 'buy_ex', cost: 'free', run: () => t }); } }, fmtMoney(c, o.price))))) : h('span', { class: 'muted small' }, 'Nobody will trade with you this year.')));
    }
  } else out.push(card(h('h3', {}, 'No sect'), h('span', { class: 'muted small' }, c.qi.known ? 'Seek a hidden sect from the Cultivation activities, or found your own from the Cultivation tab.' : 'You know nothing of sects… yet.')));
  // Guild
  if (c.guild) {
    const nx = F.guildNext(c);
    out.push(card(h('h3', {}, 'Hunter Guild'), h('div', {}, h('b', {}, `${F.GUILD_RANKS[c.guild.rank]}-rank Hunter`), ` · ${c.guild.merit} merit · retainer ${fmtMoney(c, F.guildSalary(c))}/yr`),
      nx ? h('div', { class: 'small', style: { marginTop: '6px' } }, `Next: ${nx.name}-rank — `, nx.ok ? h('button', { class: 'btn', onclick: () => R.run({ id: 'gpromote', cost: 'free', run: cc => F.guildPromote(cc) }) }, 'Take the promotion exam') : h('span', { class: 'muted' }, nx.why.join(', '))) : h('div', { class: 'small' }, 'You stand at the very top of the Guild.'),
      h('div', { class: 'muted small' }, 'Clearing Gates near your rank also earns merit. Mortal "Rankers" can climb to B-rank on Battle Knowledge alone.')));
    out.push(h('h3', { class: 'display', style: { margin: '12px 0 6px' } }, 'Guild contracts'), ...B.guild.map((m, i) => missionRow(c, m, i)));
  } else {
    const why = F.guildJoinReq(c);
    out.push(card(h('h3', {}, 'Hunter Guild'), h('p', { class: 'muted small' }, 'The Guild Association licenses Gate hunters — cultivators and mortal Rankers alike. Entry is brutal: you must meet every requirement and then beat an examiner at least as strong as you, with no fleeing.'),
      why.length ? h('div', { class: 'small' }, 'Requirements: ', why.join(' · ')) : h('button', { class: 'btn', disabled: c.actions <= 0, onclick: () => R.run({ id: 'guild_trial', cat: 'adventure', run: cc => F.guildTrial(cc) }) }, '⚡ Take the entrance trial')));
  }
  return out;
}
