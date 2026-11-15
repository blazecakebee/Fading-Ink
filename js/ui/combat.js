// Turn-based 1v1 combat screen: two portraits, realm/level, HP bars, momentum chevrons,
// stamina + Qi bars and vertical move buttons with "Move info".
import { h, icon } from './dom.js';
import { openModal } from './modal.js';
import { portraitFor, randomGenes } from './portrait.js';
import { fx, floatText, shake } from './fx.js';
import { MOVES, BASE_MOVES, DIFFICULTY } from '../data/combat.js';
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
import { die } from '../systems/life.js';

const bkLabel = v => v >= 80 ? 'Master' : v >= 60 ? 'Veteran' : v >= 40 ? 'Seasoned' : v >= 20 ? 'Trained' : 'Novice';
const realmLabel = r => r === 0 ? 'Mortal' : REALMS[r].name;

export function fight(enemyDef, opts = {}) {
  const c = G.char;
  return new Promise(resolve => {
    const pPow = power(c), gs = gearStats(c);
    const me = {
      name: 'You', maxHp: Math.round((40 + c.stats.health * 0.5 + c.stats.strength * 0.3) * (1 + (pPow - 1) * 0.5) + gs.hp), gear: gs,
      mods: combatMods(c), str: c.stats.strength, agi: (c.stats.agility + gs.agi) * combatMods(c).agi, bk: c.stats.battle || 0, pow: pPow, stam: 100, qi: c.qi.qi, maxQi: Math.max(1, c.qi.qi), mom: 0, guard: false, armor: 0, evade: false, burn: 0,
    };
    me.hp = me.maxHp;
    const ePow = REALMS[enemyDef.realm || 0].power * (enemyDef.kind === 'spirit' ? traitMult(c, 'spiritBane') ** -1 : 1);
    const diff = enemyDef.sparring ? 1 : DIFFICULTY;
    const en = { ...enemyDef, maxHp: Math.round(enemyDef.hp * (1 + (ePow - 1) * 0.5) * diff), str: Math.round(enemyDef.str * diff), agi: enemyDef.agi, pow: ePow, stam: 100, qi: 999, mom: 0, guard: false, armor: 0, evade: false, burn: 0, stun: 0, weak: false };
    en.hp = en.maxHp;
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
      const info = h('div', { class: 'info' }, h('div', { class: 'fname' }, isMe ? 'You' : who.name),
        h('div', { class: 'flvl' }, `${isMe ? realmLabel(c.qi.realm) + (c.qi.realm ? ' ' + c.qi.stage : '') : realmLabel(who.realm || 0)} · Power ${Math.round(who.pow * 10) / 10}${isMe ? ` · ${bkLabel(c.stats.battle || 0)}` : ''}`),
        h('div', { class: 'hpbar' }, hp), hpTxt, mom);
      const pf = h('div', { class: 'fportrait' }, isMe ? mePortrait : ePortrait); ui[isMe ? 'mePf' : 'enPf'] = pf;
      return h('div', { class: 'fighter' + (isMe ? ' me' : '') }, isMe ? [pf, info] : [info, pf]);
    };
    const stamBar = h('i', { style: { '--c': '#3fcf5f' } }), qiBar = h('i', { style: { '--c': 'var(--qi)' } });
    const log = h('div', { class: 'flog' }, opts.tribulation ? 'The sky splits open. Survive.' : enemyDef.sparring ? 'A friendly bout. Nobody gets badly hurt.' : `${en.name} squares up.`);
    const movesBox = h('div', { class: 'moves' }); const targetRow = h('div', { class: 'targets' });
    const infoBox = h('div', { class: 'flog', style: { display: 'none' } });
    const box = h('div', {}, h('div', { class: 'ftitle' }, opts.tribulation ? 'Tribulation' : enemyDef.sparring ? 'Sparring' : 'Fight'),
      h('div', { class: 'stage' }, fighterRow(en, false), fighterRow(me, true),
        h('div', { class: 'res' }, 'Stamina', h('div', { class: 'bar' }, stamBar)),
        c.qi.realm ? h('div', { class: 'res' }, 'Qi', h('div', { class: 'bar' }, qiBar)) : null),
      log, targetRow, movesBox, infoBox,
      h('div', { class: 'finfo' }, h('a', { onclick: () => { infoBox.style.display = infoBox.style.display === 'none' ? 'block' : 'none'; } }, 'Move info')));
    const m = openModal(box, { cls: 'fight', dismiss: false });

    const myMoves = [...BASE_MOVES, ...(c.qi.realm >= 1 ? ['qi_palm'] : []), ...c.qi.techs];
    infoBox.append(...myMoves.map(k => h('div', {}, icon(MOVES[k].icon, 'sm'), ' ', h('b', {}, MOVES[k].name + ': '), MOVES[k].info, MOVES[k].qi ? ` (${MOVES[k].qi} Qi)` : '')));
    const mini = enemyDef.mini && MINIS[enemyDef.mini] ? enemyDef.mini : null; let miniUsed = false;
    if (mini) myMoves.push('special');
    if (!opts.noFlee) myMoves.push('flee');
    if (mini) infoBox.append(h('div', {}, icon(MINIS[mini].icon, 'sm'), ' ', h('b', {}, MINIS[mini].name + ' (special, once per fight): '), `${MINIS[mini].how} ${MINIS[mini].win}`));

    function draw() {
      ui.meHp.style.width = (me.hp / me.maxHp * 100) + '%'; ui.enHp.style.width = (en.hp / en.maxHp * 100) + '%';
      ui.meHpTxt.textContent = `${Math.max(0, Math.round(me.hp))}/${me.maxHp}`; ui.enHpTxt.textContent = `${Math.max(0, Math.round(en.hp))}/${en.maxHp}`;
      ui.meMom.textContent = '«'.repeat(1 + me.mom * 2); ui.enMom.textContent = '»'.repeat(1 + en.mom * 2);
      ui.meMom.classList.toggle('off', me.mom === 0); ui.enMom.classList.toggle('off', en.mom === 0);
      stamBar.style.width = me.stam + '%'; qiBar.style.width = (me.qi / me.maxQi * 100) + '%';
      targetRow.replaceChildren(h('span', { class: 'muted small' }, 'Target:'), ...Object.entries(GROUPS).map(([g, G2]) => h('button', { class: 'tchip' + (target === g ? ' on' : '') + (en.crippled[g] ? ' crip' : ''), title: G2.note, onclick: () => { target = g; fx('click'); draw(); } }, G2.name, en.crippled[g] ? ' ✗' : '')));
      movesBox.replaceChildren(...myMoves.map(k => {
        if (k === 'special') return h('button', { class: 'btn special', disabled: miniUsed, onclick: () => special() }, icon(MINIS[mini].icon, 'sm'), MINIS[mini].name, h('small', {}, miniUsed ? 'used' : 'special'));
        if (k === 'flee') return h('button', { class: 'btn', style: { background: '#6a6a72' }, onclick: () => turn('flee') }, icon('travel', 'sm'), 'Flee');
        const mv = MOVES[k]; const can = me.stam >= Math.max(0, mv.cost) && (!mv.qi || me.qi >= mv.qi);
        return h('button', { class: 'btn', disabled: !can, onclick: () => turn(k) }, icon(mv.icon, 'sm'), mv.name, mv.qi ? h('small', {}, `${mv.qi} Qi`) : mv.cost > 0 ? h('small', {}, `${mv.cost} sta`) : null);
      }));
    }
    function attack(att, def, mvKey, attIsMe) {
      const mv = MOVES[mvKey];
      att.stam = clamp(att.stam - mv.cost); if (mv.qi && attIsMe) att.qi -= mv.qi;
      if (mv.guard) { att.guard = true; return `${attIsMe ? 'You brace' : en.name + ' braces'} and steady${attIsMe ? '' : 's'} ${attIsMe ? 'your' : 'its'} breath.`; }
      if (mv.armor) { att.armor = mv.armor; return `${attIsMe ? 'Your' : en.name + "'s"} skin hardens like iron.`; }
      let acc = mv.acc + (att.agi - def.agi) / 400 + (att.bk || 0) / 400 - (def.evade ? 0.4 : 0) + (attIsMe ? GROUPS[target].acc + me.mods.acc : 0); def.evade = false;
      const defPf = attIsMe ? ui.enPf : ui.mePf, attPf = attIsMe ? ui.mePf : ui.enPf;
      attPf.classList.add(attIsMe ? 'lunge-r' : 'lunge-l'); setTimeout(() => attPf.classList.remove('lunge-r', 'lunge-l'), 140);
      if (!chance(clamp(acc, 0.1, 0.98) * 100 / 100)) { att.mom = 0; fx('miss'); return `${attIsMe ? 'You' : en.name} used ${mv.name}... and missed.`; }
      const statV = mv.stat === 'qi' ? 60 + (attIsMe ? c.qi.affinity : 40) : mv.stat === 'agility' ? att.agi : att.str;
      let dmg = ri(...mv.dmg) * (0.6 + statV / 100) * (mv.stat === 'qi' ? att.pow : Math.sqrt(att.pow)) * (1 + att.mom * 0.1) * (1 + (att.gear?.dmg || 0)) * (1 + (att.bk || 0) / 250) * (!attIsMe || !en.weak ? 1 : 1.5) * (attIsMe ? (mv.stat === 'qi' ? me.mods.qi : me.mods.dmg) : (en.crippled.arms ? 0.65 : 1));
      if (def.guard) { dmg *= 0.5; def.guard = false; } if (def.armor) { dmg *= 0.5; def.armor--; }
      const crit = chance(0.08 + (attIsMe ? (c.stats.luck + gs.luck) / 1000 + (c.stats.battle || 0) / 2000 : 0)); if (crit) dmg *= 1.7;
      if (enemyDef.sparring && attIsMe === false) dmg *= 0.7;
      dmg = Math.max(1, Math.round(dmg)); def.hp -= dmg; att.mom = Math.min(3, att.mom + (mv.mom || 1)); def.mom = 0;
      if (mv.drain) att.hp = Math.min(att.maxHp, att.hp + dmg * mv.drain);
      if (mv.burn) def.burn = 2; if (mv.evade) att.evade = true; if (mv.stun && chance(mv.stun)) def.stun = 1;
      fx(crit ? 'crit' : 'hit'); shake(defPf);
      const r = defPf.getBoundingClientRect(); floatText((crit ? 'CRIT ' : '-') + dmg, r.left + r.width / 2 - 20, r.top + 10, crit ? '#ffd84a' : '#ff6b6b');
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
        const res = hitBody(c, { amount: dmg, type: mv.burn ? 'burn' : cuts ? 'cut' : 'blunt', ratio: en.pow / me.pow, sparring: !!enemyDef.sparring });
        if (res.text) extra = ` (${res.text})`;
        if (res.lost) { me.mods = combatMods(c); me.agi = (c.stats.agility + gs.agi) * me.mods.agi; }
        if (res.fatal) fatal = res.part.name;
        if (dmg >= me.maxHp * 0.2) fx('heavy');
      }
      return `${attIsMe ? 'You' : en.name} used ${mv.name} for ${dmg}${crit ? ' (critical!)' : ''}.${def.stun ? ' Stunned!' : ''}${extra}`;
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
      if (k === 'flee') {
        if (chance(0.35 + (me.agi - en.agi) / 200)) return end('flee', 'You slipped away.');
        log.textContent = 'You tried to flee but were cut off!'; await enemyTurn(); busy = false; return draw();
      }
      // initiative: faster fighter acts first; momentum shown with chevrons
      const meFirst = me.agi + ri(0, 30) + (traitMult(c, 'initiative') > 1 ? 15 : 0) >= en.agi + ri(0, 30);
      const lines = [];
      if (meFirst) { lines.push(attack(me, en, k, true)); draw(); if (en.hp > 0) { await wait(380); lines.push(await enemyTurn(true)); } }
      else { lines.push(await enemyTurn(true)); draw(); if (me.hp > 0) { await wait(380); lines.push(attack(me, en, k, true)); } }
      for (const f of [me, en]) { if (f.burn > 0) { f.burn--; f.hp -= 6; } f.stam = clamp(f.stam + 8 * (f === me ? me.mods.stam : 1)); }
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
      if (c.qi.realm) c.qi.qi = Math.max(0, Math.round(me.qi));
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
