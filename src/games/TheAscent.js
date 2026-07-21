import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import HowToPlay from './HowToPlay';

const GAME_TYPE = 'the_ascent';
const START_MAX_HP = 60;
const START_MAX_ENERGY = 3;
const HAND_SIZE = 5;

// ── Cards ─────────────────────────────────────────────────────────────────
// Every numeric card effect lives in one of a handful of generic fields
// (dmg/block/heal/draw/energyGain) so a single interpreter in playCard()
// can resolve any card, and a single upgrade rule (+50% on the primary
// numbers) applies uniformly instead of needing a hand-written "+" variant
// of every card.
const CARD_LIBRARY = {
  strike:        { id: 'strike',        name: 'Strike',        type: 'attack', cost: 1, icon: '⚔️', dmg: 6 },
  heavy_blow:    { id: 'heavy_blow',    name: 'Heavy Blow',    type: 'attack', cost: 2, icon: '🔨', dmg: 13 },
  quick_stab:    { id: 'quick_stab',    name: 'Quick Stab',    type: 'attack', cost: 0, icon: '🗡️', dmg: 3 },
  cleave:        { id: 'cleave',        name: 'Cleave',        type: 'attack', cost: 1, icon: '🪓', dmg: 8, applyWeak: true },
  execute:       { id: 'execute',       name: 'Execute',       type: 'attack', cost: 2, icon: '☠️', dmg: 10, executeBonus: true },
  vampiric_strike:{ id: 'vampiric_strike', name: 'Vampiric Strike', type: 'attack', cost: 2, icon: '🩸', dmg: 8, vampiric: true },
  piercing_shot: { id: 'piercing_shot', name: 'Piercing Shot', type: 'attack', cost: 1, icon: '🏹', dmg: 7, ignoresBlock: true },
  guard:         { id: 'guard',         name: 'Guard',         type: 'skill',  cost: 1, icon: '🛡️', block: 5 },
  iron_wall:     { id: 'iron_wall',     name: 'Iron Wall',     type: 'skill',  cost: 2, icon: '🧱', block: 11 },
  focus:         { id: 'focus',         name: 'Focus',         type: 'skill',  cost: 1, icon: '🔎', draw: 2 },
  second_wind:   { id: 'second_wind',   name: 'Second Wind',   type: 'skill',  cost: 1, icon: '💨', energyGain: 2 },
  mend:          { id: 'mend',          name: 'Mend',          type: 'skill',  cost: 1, icon: '💚', heal: 5 },
  riposte:       { id: 'riposte',       name: 'Riposte',       type: 'skill',  cost: 1, icon: '🤺', block: 6, riposte: true },
  adrenaline:    { id: 'adrenaline',    name: 'Adrenaline',    type: 'skill',  cost: 0, icon: '⚡', block: 4, draw: 1 },
  focus_stance:  { id: 'focus_stance',  name: 'Focus Stance',  type: 'power',  cost: 1, icon: '🎯', powerAtkBonus: 2 },
  fortify:       { id: 'fortify',       name: 'Fortify',       type: 'power',  cost: 1, icon: '✨', powerFortifyBonus: 3 },
};
const STARTER_CARD_IDS = ['strike','strike','strike','strike','strike','guard','guard','guard','guard'];

function getCardView(cardId, upgraded) {
  const c = CARD_LIBRARY[cardId];
  const mult = upgraded ? 1.5 : 1;
  const dmg = c.dmg != null ? Math.round(c.dmg * mult) : undefined;
  const block = c.block != null ? Math.round(c.block * mult) : undefined;
  const heal = c.vampiric ? Math.round(dmg / 2) : (c.heal != null ? Math.round(c.heal * mult) : undefined);
  const draw = c.draw != null ? c.draw + (upgraded ? 1 : 0) : undefined;
  const energyGain = c.energyGain != null ? c.energyGain + (upgraded ? 1 : 0) : undefined;
  const counter = c.riposte ? Math.round(block * 0.7) : undefined;
  const powerAtkBonus = c.powerAtkBonus != null ? Math.round(c.powerAtkBonus * mult) : undefined;
  const powerFortifyBonus = c.powerFortifyBonus != null ? Math.round(c.powerFortifyBonus * mult) : undefined;
  const name = upgraded ? `${c.name}+` : c.name;

  const parts = [];
  if (dmg) parts.push(`Deal ${dmg} damage${c.ignoresBlock ? ' (ignores Block)' : ''}${c.executeBonus ? ' — x2 if the enemy is below 25% HP' : ''}.`);
  if (c.applyWeak) parts.push("Weakens the enemy's next attack by 25%.");
  if (c.vampiric) parts.push(`Heal ${heal}.`);
  if (block) parts.push(`Gain ${block} Block.`);
  if (c.riposte) parts.push(`If you still have Block when hit this turn, deal ${counter} back.`);
  if (draw) parts.push(`Draw ${draw} card${draw > 1 ? 's' : ''}.`);
  if (energyGain) parts.push(`Gain ${energyGain} Energy.`);
  if (!c.vampiric && heal) parts.push(`Heal ${heal}.`);
  if (powerAtkBonus) parts.push(`This fight: your Attacks deal +${powerAtkBonus} damage.`);
  if (powerFortifyBonus) parts.push(`This fight: gain ${powerFortifyBonus} Block at the start of each turn.`);

  return { ...c, name, dmg, block, heal, draw, energyGain, counter, powerAtkBonus, powerFortifyBonus, desc: parts.join(' ') };
}

// ── Relics ────────────────────────────────────────────────────────────────
const RELIC_LIBRARY = {
  iron_skin:         { id: 'iron_skin',         name: 'Iron Skin',         icon: '🛡️', desc: 'Start each fight with 5 Block.' },
  second_heart:      { id: 'second_heart',      name: 'Second Heart',      icon: '❤️', desc: 'Permanently gain 15 Max HP.' },
  overcharge:        { id: 'overcharge',        name: 'Overcharge Core',   icon: '🔋', desc: '+1 Energy every turn.' },
  vampire_fang:      { id: 'vampire_fang',      name: 'Vampire Fang',      icon: '🦇', desc: 'Heal 1 HP whenever you play an Attack.' },
  battle_trance:     { id: 'battle_trance',     name: 'Battle Trance',     icon: '🧘', desc: 'Draw 1 extra card on the first turn of each fight.' },
  adrenal_gland:     { id: 'adrenal_gland',     name: 'Adrenal Gland',     icon: '💉', desc: '+1 Energy on the first turn of each fight.' },
  thorns:            { id: 'thorns',            name: 'Thorned Vest',      icon: '🌵', desc: 'Whenever an enemy hits you, they take 3 damage.' },
  lucky_coin:        { id: 'lucky_coin',        name: 'Lucky Coin',        icon: '🪙', desc: 'Your Attacks have a 15% chance to deal double damage.' },
  chainmail:         { id: 'chainmail',         name: 'Chainmail Scrap',   icon: '⛓️', desc: 'Reduce all unblocked damage you take by 1.' },
  reinforced_gloves: { id: 'reinforced_gloves', name: 'Reinforced Gloves', icon: '🥊', desc: 'Your first Attack each turn costs 1 less Energy.' },
};

// ── Enemies ───────────────────────────────────────────────────────────────
// Every enemy's next move is rolled and shown BEFORE the player acts (see
// spawnEnemy/advanceEnemyTurn) -- that's the one rule this whole design
// leans on to keep "hard" feeling "fair": nothing ever hits you without
// having told you it was coming first.
const ENEMY_LIBRARY = {
  grouch:     { id: 'grouch',     name: 'Grouch',      icon: '😠', minLevel: 1,  hpMult: 1.0, dmgMult: 1.0, pattern: ['ATTACK','DEFEND','ATTACK','ATTACK','DEFEND'] },
  sneak:      { id: 'sneak',      name: 'Sneak',       icon: '🥷', minLevel: 3,  hpMult: 0.85,dmgMult: 1.0, pattern: ['ATTACK','MULTI2','ATTACK','DEFEND','MULTI2'] },
  bruiser:    { id: 'bruiser',    name: 'Bruiser',     icon: '🦍', minLevel: 5,  hpMult: 1.2, dmgMult: 1.05,pattern: ['ATTACK','ATTACK','BIG','ATTACK','DEFEND'] },
  warden:     { id: 'warden',     name: 'Warden',      icon: '🧙', minLevel: 7,  hpMult: 1.1, dmgMult: 0.9, pattern: ['BUFF','ATTACK','ATTACK','BUFF','BIG'] },
  twin_fangs: { id: 'twin_fangs', name: 'Twin Fangs',  icon: '🐺', minLevel: 10, hpMult: 1.6, dmgMult: 1.1, pattern: ['MULTI3','ATTACK','BIG','MULTI3','DEFEND'], boss: true },
  overseer:   { id: 'overseer',   name: 'Overseer',    icon: '👹', minLevel: 15, hpMult: 2.0, dmgMult: 1.2, pattern: ['DEFEND','BIG','ATTACK','BUFF','BIG'], boss: true },
};

function enemyBaseHp(level) { return Math.round(22 + 6 * level + 0.9 * Math.pow(level, 1.7)); }
function enemyBaseDmg(level) { return Math.round(4 + 1.15 * level); }

function pickEnemyDef(level) {
  if (level % 10 === 0) {
    return (Math.floor(level / 10) % 2 === 1) ? ENEMY_LIBRARY.twin_fangs : ENEMY_LIBRARY.overseer;
  }
  const pool = Object.values(ENEMY_LIBRARY).filter(e => !e.boss && e.minLevel <= level);
  return pool[Math.floor(Math.random() * pool.length)];
}

function moveIntent(def, moveType, baseDmg, dmgMultAccum) {
  const eff = baseDmg * def.dmgMult * dmgMultAccum;
  switch (moveType) {
    case 'ATTACK': return { type: 'ATTACK', icon: '⚔️', label: 'Attack', hits: [Math.round(eff)] };
    case 'BIG':    return { type: 'BIG',    icon: '💥', label: 'Heavy Attack', hits: [Math.round(eff * 1.8)] };
    case 'MULTI2': return { type: 'MULTI2', icon: '⚡', label: '2× Strike', hits: [Math.round(eff * 0.55), Math.round(eff * 0.55)] };
    case 'MULTI3': return { type: 'MULTI3', icon: '⚡', label: '3× Strike', hits: [Math.round(eff * 0.42), Math.round(eff * 0.42), Math.round(eff * 0.42)] };
    case 'DEFEND': return { type: 'DEFEND', icon: '🛡️', label: 'Guarding', value: Math.round(eff * 1.3) };
    case 'BUFF':   return { type: 'BUFF',   icon: '📈', label: 'Powering Up', value: null };
    default: return { type: 'ATTACK', icon: '⚔️', label: 'Attack', hits: [Math.round(eff)] };
  }
}

function spawnEnemy(level, relics) {
  const def = pickEnemyDef(level);
  const maxHp = Math.round(enemyBaseHp(level) * def.hpMult);
  const baseDmg = enemyBaseDmg(level);
  const turnIndex = 0;
  const dmgMultAccum = 1;
  const intent = moveIntent(def, def.pattern[turnIndex % def.pattern.length], baseDmg, dmgMultAccum);
  return {
    key: def.id, name: def.name, icon: def.icon, def, maxHp, hp: maxHp,
    block: relics.includes('iron_skin') ? 5 : 0,
    baseDmg, dmgMultAccum, weak: false, turnIndex, intent,
  };
}

// ── Small helpers ────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function weightedSample(library, n, exclude = []) {
  const excludeSet = new Set(exclude);
  const weighted = [];
  Object.values(library).forEach(c => {
    if (excludeSet.has(c.id)) return;
    const w = c.type === 'power' ? 1 : 3;
    for (let i = 0; i < w; i++) weighted.push(c.id);
  });
  const chosen = [];
  const seen = new Set();
  let guard = 0;
  while (chosen.length < n && seen.size < weighted.length && guard < 300) {
    guard++;
    const id = weighted[Math.floor(Math.random() * weighted.length)];
    if (!seen.has(id)) { seen.add(id); chosen.push(id); }
  }
  return chosen;
}
function drawCards(drawPile, discardPile, n) {
  let dp = [...drawPile], disc = [...discardPile];
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (dp.length === 0) {
      if (disc.length === 0) break;
      dp = shuffle(disc);
      disc = [];
    }
    drawn.push(dp.shift());
  }
  return { drawn, drawPile: dp, discardPile: disc };
}

export default function TheAscent() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState('intro'); // intro | combat | reward | relic | rest | gameover
  const [bestLevel, setBestLevel] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  // Run-level (persists across fights within a run)
  const [level, setLevel] = useState(1);
  const [maxHp, setMaxHp] = useState(START_MAX_HP);
  const [hp, setHp] = useState(START_MAX_HP);
  const [deck, setDeck] = useState([]); // [{uid, cardId, upgraded}]
  const [relics, setRelics] = useState([]);

  // Combat-only state
  const [combat, setCombat] = useState(null);
  const [queue, setQueue] = useState([]); // post-victory screen queue: 'reward' | 'relic' | 'rest'
  const [rewardOptions, setRewardOptions] = useState([]);
  const [relicOptions, setRelicOptions] = useState([]);
  const [restNote, setRestNote] = useState('');
  const [deathLevel, setDeathLevel] = useState(0);
  const [showDeck, setShowDeck] = useState(false);

  const uidRef = useRef(0);
  const relicsRef = useRef(relics);
  relicsRef.current = relics;
  const savedRef = useRef(false);

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest('GET', null, '/game/stats').then((s) => setBestLevel(s?.[GAME_TYPE]?.best_score || 0)).catch(() => {});
    }
  }, []);

  const nextUid = () => `c${uidRef.current++}`;

  const saveRun = useCallback(async (finalLevel) => {
    if (!isLoggedIn() || savedRef.current) return;
    savedRef.current = true;
    try {
      await apiRequest('POST', { game_type: GAME_TYPE, result: 'loss', difficulty: 'medium', score: finalLevel }, '/game/save');
    } catch (_) {}
  }, []);

  function startRun() {
    savedRef.current = false;
    uidRef.current = 0;
    const startDeck = STARTER_CARD_IDS.map(cardId => ({ uid: nextUid(), cardId, upgraded: false }));
    setDeck(startDeck);
    setRelics([]);
    setMaxHp(START_MAX_HP);
    setHp(START_MAX_HP);
    setLevel(1);
    setQueue([]);
    enterCombat(1, startDeck, []);
  }

  function enterCombat(lvl, deckForFight, relicList) {
    const enemy = spawnEnemy(lvl, relicList);
    const drawPile = shuffle(deckForFight);
    const firstHandSize = HAND_SIZE + (relicList.includes('battle_trance') ? 1 : 0);
    const { drawn, drawPile: dp, discardPile } = drawCards(drawPile, [], firstHandSize);
    const maxEnergy = START_MAX_ENERGY + (relicList.includes('overcharge') ? 1 : 0);
    const energy = maxEnergy + (relicList.includes('adrenal_gland') ? 1 : 0);
    setCombat({
      enemy, hand: drawn, drawPile: dp, discardPile,
      energy, maxEnergy, block: enemy.block, log: [`Level ${lvl}: ${enemy.name} appears!`],
      powers: { atkBonus: 0, fortifyBonus: 0 },
      firstAttackPlayed: false, riposteActive: false, turnBusy: false,
    });
    setLevel(lvl);
    setScreen('combat');
  }

  function playCard(uid) {
    if (!combat || combat.turnBusy) return;
    const inst = combat.hand.find(c => c.uid === uid);
    if (!inst) return;
    const view = getCardView(inst.cardId, inst.upgraded);
    const isFirstAttack = view.type === 'attack' && !combat.firstAttackPlayed;
    const discount = (relicsRef.current.includes('reinforced_gloves') && isFirstAttack) ? 1 : 0;
    const cost = Math.max(0, view.cost - discount);
    if (combat.energy < cost) return;

    let next = {
      ...combat,
      energy: combat.energy - cost,
      hand: combat.hand.filter(c => c.uid !== uid),
      discardPile: [...combat.discardPile, inst],
      log: [...combat.log],
      powers: { ...combat.powers },
    };
    if (view.type === 'attack') next.firstAttackPlayed = true;

    let enemyObj = { ...combat.enemy };
    let hpDelta = 0;

    if (view.dmg) {
      let dmg = view.dmg + next.powers.atkBonus;
      let crit = false;
      if (relicsRef.current.includes('lucky_coin') && Math.random() < 0.15) { dmg *= 2; crit = true; }
      if (view.executeBonus && enemyObj.hp <= enemyObj.maxHp * 0.25) dmg *= 2;
      if (!view.ignoresBlock && enemyObj.block > 0) {
        const absorbed = Math.min(enemyObj.block, dmg);
        enemyObj.block -= absorbed;
        dmg -= absorbed;
      }
      enemyObj.hp = Math.max(0, enemyObj.hp - dmg);
      next.log.push(`You play ${view.name}${crit ? ' — CRITICAL!' : ''} for ${dmg} damage.`);
      if (view.applyWeak) { enemyObj.weak = true; next.log.push(`${enemyObj.name} is weakened.`); }
      if (relicsRef.current.includes('vampire_fang')) hpDelta += 1;
    }
    if (view.block) {
      next.block = combat.block + view.block;
      next.log.push(`You play ${view.name}, gaining ${view.block} Block.`);
    }
    if (view.heal) {
      hpDelta += view.heal;
      next.log.push(`You play ${view.name}, healing ${view.heal}.`);
    }
    if (view.draw) {
      const { drawn, drawPile, discardPile } = drawCards(next.drawPile, next.discardPile, view.draw);
      next.hand = [...next.hand, ...drawn];
      next.drawPile = drawPile; next.discardPile = discardPile;
    }
    if (view.energyGain) next.energy += view.energyGain;
    if (view.riposte) { next.riposteActive = true; next.riposteCounter = view.counter; }
    if (view.powerAtkBonus) { next.powers.atkBonus += view.powerAtkBonus; next.log.push(`${view.name} activated.`); }
    if (view.powerFortifyBonus) { next.powers.fortifyBonus += view.powerFortifyBonus; next.log.push(`${view.name} activated.`); }
    next.enemy = enemyObj;
    next.block = next.block ?? combat.block;

    setCombat(next);
    if (hpDelta) setHp(h => Math.min(maxHp, h + hpDelta));

    if (enemyObj.hp <= 0) {
      setTimeout(() => handleVictory(level), 400);
    }
  }

  function endTurn() {
    if (!combat || combat.turnBusy) return;
    setCombat(prev => ({ ...prev, turnBusy: true, log: [...prev.log, `${prev.enemy.name} acts...`] }));
    setTimeout(() => resolveEnemyTurn(), 650);
  }

  function resolveEnemyTurn() {
    setCombat(prev => {
      if (!prev) return prev;
      const intent = prev.enemy.intent;
      let enemyObj = { ...prev.enemy };
      let log = [...prev.log];
      let block = prev.block;
      let dmgToPlayer = 0;
      let dmgToEnemy = 0;
      const relicList = relicsRef.current;
      const weakMult = enemyObj.weak ? 0.75 : 1;

      if (intent.type === 'DEFEND') {
        enemyObj.block += intent.value;
        log.push(`${enemyObj.name} guards up (+${intent.value} Block).`);
      } else if (intent.type === 'BUFF') {
        enemyObj.dmgMultAccum = (enemyObj.dmgMultAccum || 1) * 1.15;
        log.push(`${enemyObj.name} powers up!`);
      } else {
        const hits = intent.hits.map(h => Math.max(1, Math.round(h * weakMult)));
        hits.forEach(raw => {
          let dmg = raw;
          if (block > 0) {
            const absorbed = Math.min(block, dmg);
            block -= absorbed;
            dmg -= absorbed;
          }
          if (dmg > 0 && relicList.includes('chainmail')) dmg = Math.max(0, dmg - 1);
          dmgToPlayer += dmg;
          if (relicList.includes('thorns')) dmgToEnemy += 3;
        });
        log.push(`${enemyObj.name} hits you for ${dmgToPlayer} damage${hits.length > 1 ? ` (${hits.length} hits)` : ''}.`);
        if (prev.riposteActive && prev.block > 0) {
          const riposteDmg = prev.riposteCounter || 4;
          dmgToEnemy += riposteDmg;
          log.push(`Riposte strikes back for ${riposteDmg}!`);
        }
        // Weak only ever promises to blunt the enemy's next ATTACK -- only
        // clear it here, on an actual damaging move, so a Defend/Buff turn
        // (visible in advance via the intent icon) doesn't silently burn it.
        if (enemyObj.weak) enemyObj.weak = false;
      }

      if (dmgToEnemy > 0) enemyObj.hp = Math.max(0, enemyObj.hp - dmgToEnemy);

      return { ...prev, enemy: enemyObj, block, log, _dmgToPlayer: dmgToPlayer, _defeated: enemyObj.hp <= 0 };
    });
    setTimeout(() => finishEnemyTurn(), 500);
  }

  function finishEnemyTurn() {
    setCombat(prev => {
      if (!prev) return prev;
      const dmg = prev._dmgToPlayer || 0;
      if (dmg > 0) setHp(h => Math.max(0, h - dmg));
      const defeated = prev._defeated;
      const rest = { ...prev };
      delete rest._dmgToPlayer;
      delete rest._defeated;

      if (defeated) {
        setTimeout(() => handleVictory(level), 300);
        return { ...rest, turnBusy: true };
      }
      // Check death after applying damage — use a microtask-delayed check via effect below.
      setTimeout(() => checkPlayerAlive(dmg, prev), 50);
      return { ...rest, turnBusy: true };
    });
  }

  function checkPlayerAlive(dmgJustTaken, prevCombat) {
    setHp(currentHp => {
      if (currentHp <= 0) {
        setTimeout(() => handleDefeat(), 300);
      } else {
        setTimeout(() => startNextPlayerTurn(prevCombat), 200);
      }
      return currentHp;
    });
  }

  function startNextPlayerTurn(prevCombat) {
    setCombat(prev => {
      const base = prev || prevCombat;
      const relicList = relicsRef.current;
      const enemyObj = { ...base.enemy, turnIndex: base.enemy.turnIndex + 1 };
      enemyObj.intent = moveIntent(enemyObj.def, enemyObj.def.pattern[enemyObj.turnIndex % enemyObj.def.pattern.length], enemyObj.baseDmg, enemyObj.dmgMultAccum);

      const { drawn, drawPile, discardPile } = drawCards(base.drawPile, [...base.discardPile, ...base.hand], HAND_SIZE);
      const fortifyBlock = base.powers.fortifyBonus || 0;

      return {
        ...base,
        enemy: enemyObj,
        hand: drawn, drawPile, discardPile,
        energy: base.maxEnergy,
        block: fortifyBlock,
        firstAttackPlayed: false,
        riposteActive: false,
        turnBusy: false,
        log: [...base.log, fortifyBlock ? `Fortify grants ${fortifyBlock} Block.` : `Your turn.`].slice(-8),
      };
    });
  }

  function handleVictory(clearedLevel) {
    const q = ['reward'];
    if (clearedLevel % 3 === 0) q.push('relic');
    if (clearedLevel % 5 === 0) q.push('rest');
    setQueue(q);
    setRewardOptions(weightedSample(CARD_LIBRARY, 3).map(id => CARD_LIBRARY[id]));
    setScreen(q[0]);
  }

  // currentDeck/currentRelics are threaded through explicitly rather than
  // read from the deck/relics state variables -- a picker below may have
  // just called setDeck/setRelics in this same synchronous handler, and
  // that update isn't visible on `deck`/`relics` until the next render, so
  // reading the state vars here would silently hand enterCombat a
  // one-step-stale deck/relic list on whichever pick ends the queue.
  function advanceQueue(currentDeck, currentRelics) {
    setQueue(prev => {
      const rest = prev.slice(1);
      if (rest.length === 0) {
        enterCombat(level + 1, currentDeck, currentRelics);
      } else {
        if (rest[0] === 'relic') {
          const opts = weightedSample(RELIC_LIBRARY, 3, currentRelics).map(id => RELIC_LIBRARY[id]);
          setRelicOptions(opts);
        }
        setScreen(rest[0]);
      }
      return rest;
    });
  }

  function pickReward(cardId) {
    const newDeck = cardId ? [...deck, { uid: nextUid(), cardId, upgraded: false }] : deck;
    if (cardId) setDeck(newDeck);
    advanceQueue(newDeck, relics);
  }

  function pickRelic(relicId) {
    let newRelics = relics;
    if (relicId) {
      newRelics = [...relics, relicId];
      setRelics(newRelics);
      if (relicId === 'second_heart') {
        setMaxHp(m => m + 15);
        setHp(h => h + 15);
      }
    }
    advanceQueue(deck, newRelics);
  }

  function pickRest(option) {
    let newDeck = deck;
    if (option === 'heal') {
      setHp(h => Math.min(maxHp, h + Math.round(maxHp * 0.3)));
      setRestNote(`Healed ${Math.round(maxHp * 0.3)} HP.`);
    } else if (option === 'upgrade') {
      const eligible = deck.filter(c => !c.upgraded);
      if (eligible.length) {
        const target = eligible[Math.floor(Math.random() * eligible.length)];
        newDeck = deck.map(c => c.uid === target.uid ? { ...c, upgraded: true } : c);
        setDeck(newDeck);
        setRestNote(`Upgraded a ${CARD_LIBRARY[target.cardId].name} to +!`);
      } else {
        setRestNote('Nothing left to upgrade.');
      }
    } else if (option === 'cleanse') {
      const eligible = deck.filter(c => c.cardId === 'strike' || c.cardId === 'guard');
      if (eligible.length) {
        const target = eligible[Math.floor(Math.random() * eligible.length)];
        newDeck = deck.filter(c => c.uid !== target.uid);
        setDeck(newDeck);
        setRestNote(`Removed a ${CARD_LIBRARY[target.cardId].name} from your deck.`);
      } else {
        setRestNote('No basic cards left to remove.');
      }
    }
    setTimeout(() => { setRestNote(''); advanceQueue(newDeck, relics); }, 900);
  }

  function handleDefeat() {
    setDeathLevel(level);
    setIsNewBest(level > bestLevel);
    setBestLevel(b => Math.max(b, level));
    saveRun(level);
    setScreen('gameover');
  }

  // ── Render ────────────────────────────────────────────────────────────
  if (screen === 'intro') {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div style={{ marginBottom: 16 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          </div>
          <div className="game-header">
            <h1>🏔️ The Ascent</h1>
            <p style={{ color: 'var(--muted)' }}>A deckbuilding climb. Every level is a fight, every win is a choice, every choice makes the next fight possible — or doesn't.</p>
          </div>

          {bestLevel > 0 && <div className="game-msg info">Your best climb: Level {bestLevel}</div>}

          <HowToPlay defaultOpen>
            <p><b>Objective:</b> defeat one enemy per level, forever. There's no ending — only how far you get.</p>
            <ul>
              <li>Each turn, spend Energy to play cards from your hand: Attacks deal damage, Skills block or support, Powers give permanent buffs for the fight.</li>
              <li>The enemy always shows you its <b>next move</b> before you act — plan around it, don't just guess.</li>
              <li>Win a fight → pick 1 of 3 new cards for your deck (or skip to keep it lean). Every 3 levels you also get a Relic (permanent passive). Every 5 levels you get a free Rest Site instead of extra rewards.</li>
              <li>Enemies get tougher every single level — more HP, harder hits, new attack patterns. Your deck has to keep pace, or you won't.</li>
              <li>Lose all your HP and the run ends. Your score is the level you reached — beat your best next time.</li>
            </ul>
          </HowToPlay>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="gs-btn gs-btn-primary" style={{ minWidth: 200, fontSize: 16, padding: '12px 24px' }} onClick={startRun}>
              Begin the Ascent →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'gameover') {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div style={{ marginBottom: 16 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          </div>
          <div className="game-header" style={{ textAlign: 'center' }}>
            <h1>💀 You Fell</h1>
          </div>
          <div className="game-msg fail">You were defeated at Level {deathLevel}.</div>
          {isNewBest && <div className="game-msg success">New personal best!</div>}
          <div style={{ textAlign: 'center', color: 'var(--muted)', margin: '8px 0 20px' }}>
            Final deck size: {deck.length} cards · Relics collected: {relics.length}
          </div>
          <div className="game-controls">
            <button className="gs-btn gs-btn-primary" onClick={startRun}>Try Again</button>
            <button className="gs-btn gs-btn-outline" onClick={() => navigate('/games')}>Back to Games</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'reward') {
    return (
      <div className="game-page">
        <div className="gs-container ascent-reward">
          <h2 className="ascent-stage-title">🎉 Level {level} Cleared!</h2>
          <p className="ascent-stage-sub">Choose a card to add to your deck.</p>
          <div className="ascent-card-row">
            {rewardOptions.map((c) => {
              const view = getCardView(c.id, false);
              return <AscentCard key={c.id} view={view} onClick={() => pickReward(c.id)} />;
            })}
          </div>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => pickReward(null)}>Skip</button>
        </div>
      </div>
    );
  }

  if (screen === 'relic') {
    return (
      <div className="game-page">
        <div className="gs-container ascent-reward">
          <h2 className="ascent-stage-title">✨ Relic Found</h2>
          <p className="ascent-stage-sub">Pick one permanent upgrade for this run.</p>
          <div className="ascent-card-row">
            {relicOptions.map((r) => (
              <div key={r.id} className="ascent-card ascent-relic-card" onClick={() => pickRelic(r.id)}>
                <div className="ascent-card-icon">{r.icon}</div>
                <div className="ascent-card-name">{r.name}</div>
                <div className="ascent-card-desc">{r.desc}</div>
              </div>
            ))}
            {relicOptions.length === 0 && <p style={{ color: 'var(--muted)' }}>You already hold every relic in existence.</p>}
          </div>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => pickRelic(null)}>Skip</button>
        </div>
      </div>
    );
  }

  if (screen === 'rest') {
    return (
      <div className="game-page">
        <div className="gs-container ascent-reward">
          <h2 className="ascent-stage-title">🏕️ Rest Site</h2>
          <p className="ascent-stage-sub">Take a breather before the climb continues.</p>
          {restNote ? (
            <div className="game-msg success">{restNote}</div>
          ) : (
            <div className="ascent-rest-options">
              <button className="gs-btn gs-btn-primary" onClick={() => pickRest('heal')}>🛌 Rest<br /><span className="ascent-rest-sub">Heal 30% of Max HP</span></button>
              <button className="gs-btn gs-btn-primary" onClick={() => pickRest('upgrade')}>🛠️ Upgrade<br /><span className="ascent-rest-sub">Improve a random card</span></button>
              <button className="gs-btn gs-btn-primary" onClick={() => pickRest('cleanse')}>✂️ Cleanse<br /><span className="ascent-rest-sub">Remove a basic Strike/Guard</span></button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // combat
  if (!combat) return null;
  const { enemy } = combat;
  return (
    <div className="game-page">
      <div className="gs-container ascent-combat">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <span className="diff-badge diff-medium">Level {level}</span>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setShowDeck(true)}>📚 Deck ({deck.length})</button>
        </div>

        <div className="ascent-enemy-panel">
          <div className="ascent-enemy-sprite">{enemy.icon}</div>
          <div className="ascent-enemy-info">
            <div className="ascent-enemy-name">{enemy.name}{enemy.weak && <span className="ascent-weak-tag">Weak</span>}</div>
            <BarRow label="HP" value={enemy.hp} max={enemy.maxHp} color="var(--danger)" />
            {enemy.block > 0 && <div className="ascent-block-tag">🛡️ {enemy.block} Block</div>}
          </div>
          <div className="ascent-intent" title={enemy.intent.label}>
            <div className="ascent-intent-icon">{enemy.intent.icon}</div>
            <div className="ascent-intent-value">
              {enemy.intent.type === 'DEFEND' ? `+${enemy.intent.value}` :
               enemy.intent.type === 'BUFF' ? '' :
               enemy.intent.hits.length > 1 ? `${enemy.intent.hits.length}×${enemy.intent.hits[0]}` : enemy.intent.hits[0]}
            </div>
          </div>
        </div>

        <div className="ascent-log">
          {combat.log.slice(-4).map((line, i) => <div key={i} className="ascent-log-line">{line}</div>)}
        </div>

        <div className="ascent-player-panel">
          <BarRow label="You" value={hp} max={maxHp} color="var(--success)" />
          <div className="ascent-player-meta">
            {combat.block > 0 && <span className="ascent-block-tag">🛡️ {combat.block} Block</span>}
            <span className="ascent-energy-pips">
              {Array.from({ length: combat.maxEnergy }).map((_, i) => (
                <span key={i} className={`ascent-pip${i < combat.energy ? ' filled' : ''}`} />
              ))}
            </span>
            <span className="ascent-pile-count">Deck {combat.drawPile.length} · Discard {combat.discardPile.length}</span>
          </div>
        </div>

        <div className="ascent-hand">
          {combat.hand.map((inst) => {
            const view = getCardView(inst.cardId, inst.upgraded);
            const isFirstAttack = view.type === 'attack' && !combat.firstAttackPlayed;
            const discount = (relics.includes('reinforced_gloves') && isFirstAttack) ? 1 : 0;
            const cost = Math.max(0, view.cost - discount);
            const playable = !combat.turnBusy && combat.energy >= cost;
            return (
              <AscentCard key={inst.uid} view={{ ...view, cost }} onClick={() => playCard(inst.uid)} disabled={!playable} />
            );
          })}
        </div>

        <div className="game-controls">
          <button className="gs-btn gs-btn-primary" disabled={combat.turnBusy} onClick={endTurn}>
            {combat.turnBusy ? 'Resolving…' : 'End Turn'}
          </button>
        </div>
      </div>

      {showDeck && (
        <div className="ascent-deck-modal" onClick={() => setShowDeck(false)}>
          <div className="ascent-deck-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Your Deck ({deck.length})</h3>
              <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setShowDeck(false)}>Close</button>
            </div>
            {relics.length > 0 && (
              <div className="ascent-relic-row">
                {relics.map((rid, i) => (
                  <span key={i} className="ascent-relic-icon" title={`${RELIC_LIBRARY[rid].name}: ${RELIC_LIBRARY[rid].desc}`}>{RELIC_LIBRARY[rid].icon}</span>
                ))}
              </div>
            )}
            <div className="ascent-deck-list">
              {deck.map((c) => {
                const view = getCardView(c.cardId, c.upgraded);
                return (
                  <div key={c.uid} className="ascent-deck-row">
                    <span className="ascent-deck-row-icon">{view.icon}</span>
                    <span className="ascent-deck-row-name">{view.name}</span>
                    <span className="ascent-deck-row-cost">{view.cost}⚡</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BarRow({ label, value, max, color }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="ascent-bar-row">
      <div className="ascent-bar-label">{label} {Math.max(0, value)}/{max}</div>
      <div className="ascent-bar-track">
        <div className="ascent-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function AscentCard({ view, onClick, disabled }) {
  return (
    <div className={`ascent-card ascent-card-${view.type}${disabled ? ' disabled' : ''}`} onClick={disabled ? undefined : onClick}>
      <div className="ascent-card-cost">{view.cost}</div>
      <div className="ascent-card-icon">{view.icon}</div>
      <div className="ascent-card-name">{view.name}</div>
      <div className="ascent-card-desc">{view.desc}</div>
    </div>
  );
}
