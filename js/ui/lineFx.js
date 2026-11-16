// v0.9.18 Life-log polish: (1) a fitting icon for each story line, matched from what it says;
// (2) small "moment" alerts — a brief coloured edge flash and a banner for notable good/bad things that happen.
import { h } from './dom.js';
import { S } from '../settings.js';
import { sfx } from '../audio/sfx.js';

// first match wins: [regex, emoji]
const ICONS = [
  [/basketball/i, '🏀'], [/football|soccer/i, '⚽'], [/badminton/i, '🏸'], [/volleyball/i, '🏐'], [/tennis/i, '🎾'], [/snowball/i, '❄️'],
  [/\bgym\b|lifted|spotted me|workout/i, '🏋️'], [/\bran\b|running|jog/i, '🏃'], [/kata|dojo|belt|martial|sparr?|bout/i, '🥋'], [/fight footage|drills/i, '📼'],
  [/died|death|funeral|killed|passed away|overdose/i, '🕯️'], [/married|wedding|propos/i, '💍'], [/baby|pregnan|gave birth|born a/i, '👶'], [/dating|date night|kissed|crush/i, '💕'], [/broke up|divorc/i, '💔'],
  [/breakthrough|realm|meridian/i, '✨'], [/circulated my qi|meditat|qi pill|\bqi\b/i, '🌀'], [/tribulation|lightning/i, '⚡'],
  [/sick|fever|flu|illness|diagnosed|disease|cancer|pneumonia|infect|caught (a )?(cold|chickenpox)|chickenpox|hospital/i, '🤒'], [/injur|fracture|broken|pulled something|hurt|sprain|bleed|wound/i, '🩹'], [/doctor|surgery|medicine|salve/i, '🩺'],
  [/prison|arrest|police|sentenced|jail/i, '🚔'], [/shoplift|pickpocket|burgl|stole|lifted a wallet/i, '🕵️'], [/bounty|demonic cultivator/i, '🎯'],
  [/gate|rift|dungeon/i, '🌀'], [/hunt/i, '🏹'], [/fable/i, '📖'], [/breach/i, '🛡️'],
  [/hired|new job|promot|job as/i, '💼'], [/fired|lost (my )?job/i, '📦'], [/earned|salary|bonus|paid|tithe|sold|money|lent|loan|coins?/i, '💰'], [/casino|gambl/i, '🎰'], [/stock|invest/i, '📈'],
  [/library|read|book|stud(y|ied)|exam|grade|school|diploma|graduat|universit/i, '📚'], [/journal|wrote/i, '✍️'], [/craft|forg|alchem|furnace|pill/i, '⚗️'],
  [/fish|carp|koi|trout|catfish|eel|pike/i, '🎣'], [/hike|mountain|peak/i, '⛰️'], [/forag|herb|gather/i, '🌿'], [/vacation|trip|travel/i, '✈️'], [/party|danc|karaoke|night market/i, '🎉'],
  [/pet|dog|cat|puppy|rabbit/i, '🐾'], [/car\b|driv|licen[cs]e/i, '🚗'], [/house|home|apartment|villa|moved in/i, '🏠'], [/sect|disciple|elder|clan/i, '🏯'],
  [/trait|personality|i've become|something in me/i, '🎭'], [/heirloom|relic|treasure/i, '🏺'], [/fame|famous|news:/i, '📰'], [/earthquake|flood|storm|drought|fire|sandstorm|heatwave|winter|summer/i, '🌪️'],
  [/world:/i, '🌍'], [/achievement/i, '🏆'],
];
export function lineIcon(text, cls = '') {
  if (/say/.test(cls)) return '💬';
  for (const [re, ic] of ICONS) if (re.test(text)) return ic;
  return null;
}

// ---------- moment alerts
const NOTABLE_GOOD = /married|wedding|baby|promot|hired|graduat|breakthrough|heirloom|relic|found my|met .* at|won|bonus|cured|recovered|passed my|license|became|trait|title|fable|held the|cleared|slew|defeated|discovered|enlighten|peak flow/i;
const queue = []; let busy = false, shownThisTurn = 0, turnTimer = null;
export function moment(text, cls = '') {
  if (S().minorFx === false || !text) return;
  const kind = /death/.test(cls) ? 'death' : /bad/.test(cls) ? 'bad' : /big|trait/.test(cls) ? 'big' : /good/.test(cls) && NOTABLE_GOOD.test(text) ? 'good' : null;
  if (!kind || /say|ambient|world|muted/.test(cls)) return;
  // a year can log many things: show the most important few, briefly
  clearTimeout(turnTimer); turnTimer = setTimeout(() => { shownThisTurn = 0; }, 2500);
  if (++shownThisTurn > 4) return;
  queue.push({ text, kind, ic: lineIcon(text, cls) || { death: '🕯️', bad: '⚠️', big: '🌟', good: '✨' }[kind] });
  if (!busy) next();
}
function next() {
  const it = queue.shift(); if (!it) { busy = false; return; } busy = true;
  if (document.querySelector('.cine, .tg-wrap, .modal.fight, .arena-wrap, .fable-modal, .breach-modal')) { queue.unshift(it); return setTimeout(next, 500); } // never on top of bigger moments
  const fast = S().reduceMotion, dur = (fast ? 1300 : 2100) + Math.min(1200, it.text.length * 12);
  const edge = h('div', { class: 'mo-edge ' + it.kind });
  const short = it.text.length > 120 ? it.text.slice(0, 117).replace(/\s+\S*$/, '') + '…' : it.text;
  const banner = h('div', { class: 'mo-banner ' + it.kind }, h('span', { class: 'mo-ic' }, it.ic), h('div', {}, h('small', {}, { death: 'Loss', bad: 'Bad news', big: 'Something big', good: 'Good news' }[it.kind]), h('div', {}, short)));
  document.body.append(edge, banner);
  requestAnimationFrame(() => { edge.classList.add('on'); banner.classList.add('on'); });
  if (it.kind === 'bad' || it.kind === 'death') { sfx('miss'); if (!fast && S().screenShake !== false && it.kind === 'death') document.body.classList.add('mo-shake'); }
  else sfx('click');
  banner.onclick = () => close();
  let gone = false; const close = () => { if (gone) return; gone = true; edge.classList.remove('on'); banner.classList.remove('on'); document.body.classList.remove('mo-shake'); setTimeout(() => { edge.remove(); banner.remove(); setTimeout(next, 120); }, 300); };
  setTimeout(close, dur);
}
