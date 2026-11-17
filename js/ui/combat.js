import { eff } from '../systems/body.js';
// Turn-based 1v1 combat screen: two portraits, realm/level, HP bars, momentum chevrons,
// stamina + Qi bars and vertical move buttons with "Move info".
import { onBodyPath, effRealm, bodyTier } from '../systems/path.js';
import { BODY_MOVES } from '../data/bodypath.js';
import { h, icon } from './dom.js';
import { openModal } from './modal.js';
import { portraitFor, randomGenes } from './portrait.js';
import { fx, floatText, shake } from './fx.js';
import { MOVES, BASE_MOVES, DIFFICULTY, presence } from '../data/combat.js';
import { REALMS } from '../data/realms.js';
import { power } from '../systems/cultivation.js';
import { traitMult } from '../systems/traits.js';
import { stat } from '../systems/life.js';
import { ri, chance, clamp } from '../core/rng.js';
import { G } from '../core/state.js';
import { playStation, currentStation } from '../audio/music.js';
import { S } from '../settings.js';
import { gearStats } from '../systems/crafting.js';
import { bleedMult } from '../systems/health.js';
import { MINIS, playMini } from './minigames.js';
import { GROUPS } from '../data/body.js';
import { hitBody, combatMods } from '../systems/body.js';
import { die, statCap } from '../systems/life.js';
import { myHidden } from '../systems/trainers.js';
import { combatFx, qiColors, qiOf, qiSfx } from '../systems/qitype.js';
import { QI } from '../data/qitypes.js';
import { qiBurst, qiBadge } from './qiBadge.js';
import { playMoveFx, floatNum } from './moveFx.js';
import { meridianCombat } from '../systems/meridians.js';
const MOVE_COL = { fire: '#ff6a3d', water: '#4fb3ff', lightning: '#b18cff', eye: '#8fa8ff', star: '#ffe08a', demon: '#ff3a4a', metal: '#d0d6e0', heart: '#ff6fa8', skull: '#e9e6df', cultivation: '#7fe3ff' };
import { PLAYER_HP, ENEMY_HP, ENEMY_DMG, GEAR_DMG, SEVERED_EDGE, realmScale, enemyScale, enemyPct, playerPct, qiStat, enemyQiStat } from '../systems/combatcore.js';

const bkLabel = v => v >= 80 ? 'Master' : v >= 60 ? 'Veteran' : v >= 40 ? 'Seasoned' : v >= 20 ? 'Trained' : 'Novice';
const realmLabel = r => r === 0 ? 'Mortal' : REALMS[r].name;

export function fight(enemyDef, opts = {}) {
  const c = G.char;
  return new Promise(resolve => {
    const pPow = power(c), gs = gearStats(c), cap = statCap(c);
    const pct = k => playerPct(eff(c, k) || 0, cap); // stats count as a % of your realm's cap
    const me = {
      name: 'You', maxHp: Math.round(((40 + c.stats.health * 0.5 + eff(c, 'strength') * 0.3) * (1 + (pPow - 1) * 0.5) + gs.hp) * PLAYER_HP), gear: { ...gs, dmg: (gs.dmg || 0) * GEAR_DMG },
      mods: combatMods(c), str: pct('strength'), agi: pct('agility') + gs.agi, bk: pct('battle'), pow: pPow, stam: 100, qi: 0, maxQi: 1, mom: 0, guard: false, armor: 0, evade: false, burn: 0,
    };
    const QF = combatFx(c), qCol = qiColors(c), qSnd = qiOf(c) ? QI[c.qiType.primary.type].snd : 'pure'; // your Qi type's riders, colours and sound
    if (QF.hp) me.maxHp = Math.round(me.maxHp * (1 + QF.hp));
    // v0.9.25 battle Qi: your meridians can only hold so much at once. The rest stays in your dantian and must be charged.
    const qiUser = !onBodyPath(c) && c.qi.realm >= 1, stored = isFinite(c.qi.qi) ? Math.max(0, c.qi.qi) : 1e6;
    const MC = qiUser ? meridianCombat(c) : { qi: 0, hp: 0, charge: 1, seize: 0, crit: 0, tech: 1, cost: 1 }; // v0.9.32 open meridians matter in battle
    if (MC.hp) { me.maxHp = Math.round(me.maxHp * (1 + MC.hp)); me.hp = me.maxHp; }
    me.maxQi = qiUser ? 80 + c.qi.realm * 35 + MC.qi : 1; me.qi = Math.min(stored, me.maxQi); me.reserve = stored - me.qi; me.charges = 0; me.dry = false; me.exhaust = 0; me.reflect = 0;
    me.hp = me.maxHp;
    const ePow = REALMS[enemyDef.realm || 0].power * (enemyDef.kind === 'spirit' ? traitMult(c, 'spiritBane') ** -1 : 1);
    const sc = enemyDef.sparring || opts.tribulation ? 1 : enemyScale(enemyDef.id, enemyDef.realm);
    const hpK = enemyDef.sparring ? PLAYER_HP : ENEMY_HP;
    const en = { ...enemyDef, sc, dmgK: enemyDef.sparring ? 1 : opts.tribulation ? ENEMY_DMG * 1.6 : ENEMY_DMG * sc, maxHp: Math.round(enemyDef.hp * (1 + (ePow - 1) * 0.5) * hpK * sc), str: enemyPct(enemyDef, enemyDef.str), agi: enemyPct(enemyDef, enemyDef.agi), pow: ePow, stam: 100, qi: 999, mom: 0, guard: false, armor: 0, evade: false, burn: 0, stun: 0, weak: false };
    en.hp = en.maxHp;
    const P = presence(opts.tribulation || enemyDef.kind === 'heaven' || enemyDef.sparring ? 0 : (onBodyPath(c) ? Math.max(0, effRealm(c) - (enemyDef.realm || 0)) : c.qi.realm - (enemyDef.realm || 0))); // the Severed have no Qi to suppress
    if (P.crushed) me.stam = 50;
    // enemies have a simple 4-zone body: crippling a zone weakens them
    en.zones = { head: en.maxHp * 0.25, torso: en.maxHp * 0.6, arms: en.maxHp * 0.35, legs: en.maxHp * 0.35 }; en.zMax = { ...en.zones }; en.crippled = {};
    let target = 'torso', fatal = null;
    const cuts = enemyDef.kind === 'beast' || ['demonic', 'blood_cultist', 'young_dragon'].includes(enemyDef.id);
    const prevStation = currentStation(); if (S().musicOn && !opts.quietMusic) playStation('battle');

    // portraits: humans get a generated face, spirits/heaven get a big CC0 sprite
    const ePortrait = enemyDef.kind === 'human' ? portraitFor({ genes: enemyDef.genes || randomGenes(chance(0.5) ? 'M' : 'F'), age: enemyDef.age || 25, gender: enemyDef.gender || 'M', hair: enemyDef.hair, realm: enemyDef.realm || 0 }, 112)
      : icon(enemyDef.kind === 'heaven' ? 'lightning' : enemyDef.id === 'hungry_ghost' || enemyDef.id === 'corrupt_soul' ? 'ghost' : 'demon', 'xl');
    const mePortrait = portraitFor(c, 112);
    const ui = {};
    const fighterRow = (who, isMe) => {
      const hp = h('i'); const mom = h('div', { class: 'mom off' }, isMe ? '«««««' : '»»»»»');
      ui[isMe ? 'meHp' : 'enHp'] = hp; ui[isMe ? 'meMom' : 'enMom'] = mom;
      const hpTxt = h('div', { class: 'flvl' }); ui[isMe ? 'meHpTxt' : 'enHpTxt'] = hpTxt;
      const qb = isMe && qiOf(c) ? qiBadge(c.qiType.primary, 20, c.qiType.fused ? c.qiType.secondary : null) : null; if (qb) qb.style.marginLeft = '6px';
      const info = h('div', { class: 'info' }, h('div', { class: 'fname' }, isMe ? 'You' : who.name, qb),
        h('div', { class: 'flvl' }, `${isMe ? (onBodyPath(c) ? bodyTier(c).name : realmLabel(c.qi.realm) + (c.qi.realm ? ' ' + c.qi.stage : '')) : realmLabel(who.realm || 0)} · Power ${Math.round(who.pow * 10) / 10}${isMe ? ` · ${bkLabel(me.bk)}` : ''}`),
        h('div', { class: 'hpbar' }, hp), hpTxt, mom);
      const pf = h('div', { class: 'fportrait' }, isMe ? mePortrait : ePortrait); ui[isMe ? 'mePf' : 'enPf'] = pf;
      return h('div', { class: 'fighter' + (isMe ? ' me' : '') }, isMe ? [pf, info] : [info, pf]);
    };
    const stamBar = h('i', { style: { '--c': '#3fcf5f' } }), qiBar = h('i', { style: { '--c': 'var(--qi)' } }), qiTxt = h('span', { class: 'qi-num small' });
    const log = h('div', { class: 'flog' }, opts.tribulation ? 'The sky splits open. Survive.' : enemyDef.sparring ? 'A friendly bout. Nobody gets badly hurt.' : `${en.name} squares up.${P.line ? ' ' + P.line : onBodyPath(c) && (enemyDef.realm || 0) > effRealm(c) ? ' Their aura washes over you — and finds nothing to grip.' : ''}`);
    const movesBox = h('div', { class: 'moves' }); const targetRow = h('div', { class: 'targets' });
    const infoBox = h('div', { class: 'flog', style: { display: 'none' } });
    const box = h('div', {}, h('div', { class: 'ftitle' }, opts.tribulation ? 'Tribulation' : enemyDef.sparring ? 'Sparring' : 'Fight'),
      h('div', { class: 'stage' }, fighterRow(en, false), fighterRow(me, true),
        h('div', { class: 'res' }, 'Stamina', h('div', { class: 'bar' }, stamBar)),
        c.qi.realm ? h('div', { class: 'res' }, 'Qi', h('div', { class: 'bar' }, qiBar), qiTxt) : null),
      log, targetRow, movesBox, infoBox,
      h('div', { class: 'finfo' }, h('a', { onclick: () => { infoBox.style.display = infoBox.style.display === 'none' ? 'block' : 'none'; } }, 'Move info')));
    const m = openModal(box, { cls: 'fight', dismiss: false });

    const myMoves = [...(onBodyPath(c) ? [...BASE_MOVES, ...Object.keys(BODY_MOVES).filter(k => (c.bodyPath.tier || 0) >= BODY_MOVES[k].tier)] : [...BASE_MOVES, ...(c.qi.realm >= 1 ? ['qi_palm'] : []), ...c.qi.techs]), ...myHidden(c).filter(k => !MOVES[k].qi || c.qi.realm >= 1)];
    infoBox.append(...myMoves.filter(k => MOVES[k]).map(k => h('div', {}, icon(MOVES[k].icon, 'sm'), ' ', h('b', {}, MOVES[k].name + ': '), MOVES[k].info, MOVES[k].qi ? ` (${MOVES[k].qi} Qi)` : '')));
    const mini = enemyDef.mini && MINIS[enemyDef.mini] ? enemyDef.mini : null; let miniUsed = false;
    if (qiUser) myMoves.push('charge');
    if (mini) myMoves.push('special');
    if (P.crush) myMoves.unshift('presence');
    if (!opts.noFlee) myMoves.push('flee');
    if (qiUser) infoBox.append(h('div', {}, icon('meditate', 'sm'), ' ', h('b', {}, 'Charge Qi: '), `Your meridians hold ${me.maxQi} Qi in battle; the rest waits in your dantian. Charging spends your turn to draw up to half a bar back (the enemy gets a free hit). Each charge risks your meridians seizing for the rest of the fight, and running your Qi dry can lock charging for 2 turns.`));
    if (mini) infoBox.append(h('div', {}, icon(MINIS[mini].icon, 'sm'), ' ', h('b', {}, MINIS[mini].name + ' (special, once per fight): '), `${MINIS[mini].how} ${MINIS[mini].win}`));

    function draw() {
      ui.meHp.style.width = (me.hp / me.maxHp * 100) + '%'; ui.enHp.style.width = (en.hp / en.maxHp * 100) + '%';
      ui.meHpTxt.textContent = `${Math.max(0, Math.round(me.hp))}/${me.maxHp}`; ui.enHpTxt.textContent = `${Math.max(0, Math.round(en.hp))}/${en.maxHp}`;
      ui.meMom.textContent = '«'.repeat(1 + me.mom * 2); ui.enMom.textContent = '»'.repeat(1 + en.mom * 2);
      ui.meMom.classList.toggle('off', me.mom === 0); ui.enMom.classList.toggle('off', en.mom === 0);
      stamBar.style.width = me.stam + '%'; qiBar.style.width = Math.max(0, Math.min(100, me.qi / me.maxQi * 100)) + '%'; qiTxt.textContent = ` ${Math.round(me.qi)}/${me.maxQi}`; qiBar.parentElement?.classList.toggle('qi-dry', me.dry || me.exhaust > 0);
      targetRow.replaceChildren(h('span', { class: 'muted small' }, 'Target:'), ...Object.entries(GROUPS).map(([g, G2]) => h('button', { class: 'tchip' + (target === g ? ' on' : '') + (en.crippled[g] ? ' crip' : ''), title: G2.note, onclick: () => { target = g; fx('click'); draw(); } }, G2.name, en.crippled[g] ? ' ✗' : '')));
      movesBox.classList.toggle('many', myMoves.length > 7); // v0.9.25 lots of techniques → a compact grid so the fighters stay in view
      movesBox.replaceChildren(...myMoves.map(k => {
        if (k === 'special') return h('button', { class: 'btn special', disabled: miniUsed, onclick: () => special() }, icon(MINIS[mini].icon, 'sm'), MINIS[mini].name, h('small', {}, miniUsed ? 'used' : 'special'));
        if (k === 'presence') return h('button', { class: 'btn special', onclick: () => turn('presence') }, icon('crown', 'sm'), 'Crush with presence', h('small', {}, 'ends it'));
        if (k === 'charge') { const why = me.dry ? 'meridians seized' : me.exhaust > 0 ? `exhausted (${me.exhaust})` : me.reserve <= 0 ? 'dantian empty' : me.qi >= me.maxQi ? 'full' : `+${Math.min(Math.round(me.reserve), Math.round(me.maxQi * 0.5))} Qi`;
          return h('button', { class: 'btn charge', disabled: me.dry || me.exhaust > 0 || me.reserve <= 0 || me.qi >= me.maxQi, title: 'Spend your turn drawing Qi from your dantian. The enemy gets a free attack, and your meridians may seize.', onclick: () => turn('charge') }, icon('meditate', 'sm'), 'Charge Qi', h('small', {}, why)); }
        if (k === 'flee') return h('button', { class: 'btn', style: { background: '#6a6a72' }, onclick: () => turn('flee') }, icon('travel', 'sm'), 'Flee');
        const mv = MOVES[k]; const can = me.stam >= Math.max(0, mv.cost) && (!mv.qi || me.qi >= Math.round(mv.qi * MC.cost));
        return h('button', { class: 'btn', disabled: !can, onclick: () => turn(k) }, icon(mv.icon, 'sm'), mv.name, mv.qi ? h('small', {}, `${Math.round(mv.qi * MC.cost)} Qi`) : mv.cost > 0 ? h('small', {}, `${mv.cost} sta`) : null);
      }));
    }
    function attack(att, def, mvKey, attIsMe) {
      const mv = MOVES[mvKey];
      att.stam = clamp(att.stam - mv.cost); if (mv.qi && attIsMe) att.qi -= Math.round(mv.qi * MC.cost);
      const defPf0 = attIsMe ? ui.enPf : ui.mePf, attPf0 = attIsMe ? ui.mePf : ui.enPf, fxCol = attIsMe && mv.stat === 'qi' ? qCol[0] : MOVE_COL[mv.icon] || (attIsMe ? '#ffd36f' : '#ff7a6a');
      if (mv.guard || mv.armor || mv.heal || mv.reflect) playMoveFx(mvKey, attPf0, attPf0, fxCol);
      if (mv.heal) { const n = Math.round(att.maxHp * mv.heal); att.hp = Math.min(att.maxHp, att.hp + n); floatNum(attPf0, '+' + n, '#7fe3a0'); return `${attIsMe ? 'You' : en.name} used ${mv.name} and recovered ${n} HP.`; }
      if (mv.reflect) { att.reflect = mv.reflect; return `${attIsMe ? 'A mirror of Qi shimmers around you.' : 'A mirror of Qi shimmers around ' + en.name + '.'}`; }
      if (mv.guard) { att.guard = true; return `${attIsMe ? 'You brace' : en.name + ' braces'} and steady${attIsMe ? '' : 's'} ${attIsMe ? 'your' : 'its'} breath.`; }
      if (mv.armor) { att.armor = mv.armor; return `${attIsMe ? 'Your' : en.name + "'s"} skin hardens like iron.`; }
      let acc = mv.acc + (att.agi - def.agi) / 400 + (att.bk || 0) / 400 - (def.evade ? 0.4 : 0) + (attIsMe ? GROUPS[target].acc + me.mods.acc : 0); def.evade = false;
      const defPf = attIsMe ? ui.enPf : ui.mePf, attPf = attIsMe ? ui.mePf : ui.enPf;
      attPf.classList.add(attIsMe ? 'lunge-r' : 'lunge-l'); setTimeout(() => attPf.classList.remove('lunge-r', 'lunge-l'), 140);
      if (!chance(clamp(acc, 0.1, 0.98) * 100 / 100)) { att.mom = 0; fx('miss'); return `${attIsMe ? 'You' : en.name} used ${mv.name}... and missed.`; }
      const statV = mv.stat === 'qi' ? (attIsMe ? qiStat(c.qi.affinity) : enemyQiStat(enemyDef.realm)) : mv.stat === 'agility' ? att.agi : att.str;
      const hits = mv.hits || 1; let roll = 0; for (let i = 0; i < hits; i++) roll += ri(...mv.dmg);
      let dmg = roll * (0.6 + statV / 100) * (mv.stat === 'qi' || mv.body ? att.pow : Math.sqrt(att.pow)) * (1 + att.mom * 0.1) * (1 + (att.gear?.dmg || 0)) * (1 + (att.bk || 0) / 250) * (!attIsMe || !en.weak ? 1 : 1.5) * (attIsMe ? (mv.stat === 'qi' ? me.mods.qi : me.mods.dmg) : (en.crippled.arms ? 0.65 : 1));
      dmg *= attIsMe ? P.me : P.them * en.dmgK;
      if (attIsMe && onBodyPath(c) && ((enemyDef.realm || 0) > 0 || enemyDef.kind === 'spirit')) dmg *= SEVERED_EDGE; // Qi users can't sense the Severed coming
      const qiMove = attIsMe && mv.stat === 'qi';
      if (qiMove) { dmg *= (1 + (QF.dmg || 0)) * MC.tech; if (QF.holy && (enemyDef.kind === 'spirit' || /demon|ghost|blood|corrupt/.test(enemyDef.id || ''))) dmg *= 1 + QF.holy; }
      if (att.weakT > 0) dmg *= 0.75; // weakened by soul chains / pressure points / a titan's grip
      if (mv.shatter) { if (def.guard || def.armor) dmg *= 1.25; def.guard = false; def.armor = 0; }
      const pierce = mv.pierce || (qiMove && chance(QF.pierce || 0));
      if (def.guard && !pierce) { dmg *= 0.5; def.guard = false; } if (def.armor && !pierce) { dmg *= 0.5; def.armor--; }
      const crit = chance(0.08 + (attIsMe ? (c.stats.luck + gs.luck) / 1000 + me.bk / 2000 + (qiMove ? QF.crit || 0 : 0) + MC.crit : 0)); if (crit) dmg *= 1.7;
      if (enemyDef.sparring && attIsMe === false) dmg *= 0.7;
      dmg = Math.max(1, Math.round(dmg)); def.hp -= dmg; att.mom = Math.min(3, att.mom + (mv.mom || 1)); def.mom = 0;
      if (mv.drain) att.hp = Math.min(att.maxHp, att.hp + dmg * mv.drain);
      if (mv.burn) def.burn = 2; if (mv.evade) att.evade = true; if (mv.stun && chance(mv.stun)) def.stun = 1;
      if (mv.sap) def.stam = Math.max(0, def.stam - mv.sap); if (mv.weaken) def.weakT = mv.weaken;
      let refl = ''; if (def.reflect && !attIsMe) { const back = Math.round(dmg * def.reflect); att.hp -= back; def.reflect = 0; floatNum(attPf, '-' + back, '#bfe6ff'); playMoveFx('heaven_mirror', defPf, attPf, '#bfe6ff'); refl = ` The Heavenly Mirror threw ${back} back at ${en.name}!`; }
      if (qiMove) { // Qi-type riders + colour and sound
        if (QF.burn && chance(QF.burn)) def.burn = 2; if (QF.stun && chance(QF.stun)) def.stun = 1; if (QF.evade && chance(QF.evade)) att.evade = true;
        if (QF.heal || QF.drain) att.hp = Math.min(att.maxHp, att.hp + att.maxHp * ((QF.heal || 0) + (QF.drain || 0)) * 0.2); // a share of YOUR max HP, so it doesn't snowball at high realms
        qiBurst(ui.enPf, qCol, crit); qiSfx(qSnd); }
      if (crit) fx('crit'); playMoveFx(mvKey, attPf, defPf, fxCol, crit); shake(defPf);
      floatNum(defPf, (crit ? 'CRIT ' : '-') + dmg, crit ? '#ffd84a' : qiMove ? qCol[0] : '#ff6b6b');
      let extra = '';
      if (attIsMe) { // targeted zone damage on the enemy
        en.zones[target] -= dmg;
        if (target === 'head' && chance(0.18)) { en.stun = Math.max(en.stun, 1); extra = ' A blow to the head — stunned!'; }
        if (!en.crippled[target] && en.zones[target] <= en.zMax[target] * 0.35) {
          en.crippled[target] = true;
          if (target === 'legs') { en.agi *= 0.6; extra += ` ${en.name}'s legs buckle!`; }
          if (target === 'arms') { const sever = (c.gear?.weapon || me.pow / en.pow >= 2) && chance(0.4); extra += sever ? ` You SEVER its arm!` : ` ${en.name}'s arms are crippled!`; if (sever) { en.str *= 0.5; fx('limb'); } }
          if (target === 'torso') { en.stam = Math.max(0, en.stam - 40); extra += ' Its ribs crack — it gasps for breath.'; }
        }
      } else if (!def.isEnemy) { // the enemy hits YOUR body: real injuries
        const res = hitBody(c, { amount: dmg / me.maxHp * 150, type: mv.burn ? 'burn' : cuts ? 'cut' : 'blunt', ratio: en.pow / me.pow, sparring: !!enemyDef.sparring });
        if (res.text) extra = ` (${res.text})`;
        if (res.lost) { me.mods = combatMods(c); me.agi = pct('agility') + gs.agi; }
        if (res.fatal) fatal = res.part.name;
        if (dmg >= me.maxHp * 0.2) fx('heavy');
      }
      if (attIsMe && mv.qi && me.qi < 12 && me.reserve > 0 && !me.dry && chance(0.35)) { me.exhaust = 3; extra += ' Your Qi gutters out — your meridians need 2 turns before you can charge again.'; }
      return `${attIsMe ? 'You' : en.name} used ${mv.name} for ${dmg}${hits > 1 ? ` (${hits} hits)` : ''}${crit ? ' (critical!)' : ''}.${def.stun ? ' Stunned!' : ''}${extra}${refl}`;
    }
    function enemyMove() {
      const opts2 = en.moves.filter(k => en.stam >= Math.max(0, MOVES[k].cost));
      if (en.stam < 15 && chance(0.5)) return 'guard';
      return opts2.length ? opts2[ri(0, opts2.length - 1)] : 'guard';
    }
    let busy = false;
    // Mini-game special: plays inside the fight, then the enemy takes its turn
    async function special() {
      if (busy || miniUsed) return; busy = true; miniUsed = true; fx('click');
      const holder = h('div', { class: 'mg-holder' }); movesBox.replaceChildren(holder);
      const ok = await playMini(mini, holder, Math.max(1, Math.min(3, (enemyDef.realm || 0))));
      let line;
      if (mini === 'seal') line = ok ? (en.hp -= Math.round(en.maxHp * 0.3), en.stun = 1, `You slap a talisman on ${en.name}! It burns and freezes.`) : 'The talisman fizzles.';
      if (mini === 'dodge') line = ok ? (me.mom = 3, me.evade = true, 'You read every move. Full momentum!') : 'You misjudge the rhythm.';
      if (mini === 'qi_clash') line = ok ? (en.hp -= Math.round(en.maxHp * 0.25), `Your Qi crashes through! ${en.name} reels.`) : (me.hp -= Math.round(me.maxHp * 0.15), 'Your Qi buckles — the backlash hurts.');
      if (mini === 'breath') line = ok ? (en.stun = 2, `${en.name} loses track of you.`) : `${en.name} hears you breathe.`;
      if (mini === 'weakpoint') line = ok ? (en.weak = true, 'You found the weak point! Your hits deal +50% from now on.') : 'You strike solid stone.';
      if (ok) { shake(ui.enPf); c.flags.miniWin = true; }
      log.textContent = line; draw();
      if (en.hp <= 0) return end('win', `${en.name} is defeated!`);
      await wait(500); log.textContent = line + ' ' + await enemyTurn(true); if (fatal) me.hp = 0; draw();
      if (me.hp <= 0) return end('lose', 'You collapse.');
      busy = false;
    }
    async function turn(k) {
      if (busy) return; busy = true; fx('click');
      if (k === 'presence') { c.flags.presenceWin = true; fx('heavy'); return end('win', `You release your aura. ${en.name} collapses, unable to lift a finger.`); }
      if (k === 'flee') {
        if (chance(0.35 + (me.agi - en.agi) / 200)) return end('flee', 'You slipped away.');
        log.textContent = 'You tried to flee but were cut off! ' + await enemyTurn(true); if (fatal) me.hp = 0; draw(); if (me.hp <= 0) return end('lose', 'You were cut down as you ran.'); busy = false; return;
      }
      // initiative: faster fighter acts first; momentum shown with chevrons
      if (k === 'charge') { // v0.9.25 you stand still and draw Qi up: the enemy always gets its swing first
        const gain = Math.min(Math.round(me.reserve), Math.round(me.maxQi * 0.5 * MC.charge), me.maxQi - Math.round(me.qi)); me.qi += gain; me.reserve -= gain; me.charges++;
        playMoveFx('_charge', ui.mePf, ui.mePf, qCol[0]); floatNum(ui.mePf, `+${gain} Qi`, qCol[0]);
        let line = `You sink into your dantian and draw up ${gain} Qi.`;
        if (chance(Math.max(0.03, 0.12 + 0.12 * (me.charges - 1) + MC.seize))) { me.dry = true; line += ' Your meridians seize up — you can\'t charge again this fight.'; }
        else if (me.reserve <= 0) line += ' Your dantian is empty now.';
        const hit = await enemyTurn(true); log.textContent = line + ' ' + hit; draw();
        if (fatal) me.hp = 0; return afterTurn([line, hit]);
      }
      const meFirst = me.agi + ri(0, 30) + (traitMult(c, 'initiative') > 1 ? 15 : 0) + (QF.init || 0) >= en.agi + ri(0, 30);
      const lines = [];
      if (meFirst) { lines.push(attack(me, en, k, true)); draw(); if (en.hp > 0) { await wait(380); lines.push(await enemyTurn(true)); } }
      else { lines.push(await enemyTurn(true)); draw(); if (me.hp > 0) { await wait(380); lines.push(attack(me, en, k, true)); } }
      return afterTurn(lines);
    }
    function afterTurn(lines) {
      for (const f of [me, en]) { if (f.weakT > 0) f.weakT--; } if (me.exhaust > 0) me.exhaust--;
      for (const f of [me, en]) { if (f.burn > 0) { f.burn--; f.hp -= 6; } f.stam = clamp(f.stam + 8 * (f === me ? me.mods.stam * (P.crushed ? 0.5 : 1) * (onBodyPath(c) ? 1.75 : 1) : 1)); } // the Severed live on stamina, not Qi
      if (en.regen && en.hp > 0) en.hp = Math.min(en.maxHp, en.hp + Math.round(en.maxHp * en.regen));
      if (fatal) { me.hp = 0; }
      log.textContent = lines.join(' ');
      draw();
      if (en.hp <= 0) return end('win', `${en.name} is defeated!`);
      if (me.hp <= 0) return end('lose', fatal ? `Your ${fatal.toLowerCase()} gives out…` : 'You collapse.');
      busy = false;
    }
    async function enemyTurn(silent) {
      if (en.stun > 0) { en.stun--; return `${en.name} is stunned.`; }
      const line = attack(en, me, enemyMove(), false); if (!silent) log.textContent = line; return line;
    }
    function end(result, text) {
      draw(); log.textContent = text; fx(result === 'win' ? 'win' : result === 'lose' ? 'lose' : 'click');
      c.lastFightHpPct = Math.max(0, me.hp) / me.maxHp;
      if (qiUser && isFinite(c.qi.qi)) c.qi.qi = Math.max(0, Math.round(me.qi + me.reserve));
      const hurt = Math.round((1 - c.lastFightHpPct) * (enemyDef.sparring ? 4 : 12) * bleedMult(c));
      if (hurt) stat(c, 'health', -hurt);
      stat(c, 'battle', (enemyDef.sparring ? ri(2, 3) : result === 'win' ? 2 : 1)); // every fight teaches you something
      if (fatal && !enemyDef.sparring) { die(c, `killed in battle by ${en.name} (${fatal.toLowerCase()} destroyed)`); result = 'lose'; }
      movesBox.replaceChildren(h('button', { class: 'btn', onclick: () => { m.close(); if (S().musicOn) playStation(prevStation || S().station); resolve(result); } },
        result === 'win' ? 'Victory — continue' : result === 'flee' ? 'Escaped — continue' : 'Defeat — continue'));
    }
    const wait = ms => new Promise(r => setTimeout(r, ms * (S().reduceMotion ? 0.1 : 1)));
    draw();
  });
}
