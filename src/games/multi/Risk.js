import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Map Data ───────────────────────────────────────────────────────────────

const CONTINENTS = {
  'North America': {
    territories: ['Alaska', 'Northwest', 'Alberta', 'Ontario', 'Eastern US'],
    bonus: 3,
    color: '#2980b9',
  },
  'Europe': {
    territories: ['Britain', 'Northern Europe', 'Southern Europe', 'Ukraine', 'Scandinavia'],
    bonus: 3,
    color: '#8e44ad',
  },
  'Asia': {
    territories: ['Middle East', 'India', 'China', 'Japan', 'Siberia'],
    bonus: 3,
    color: '#c0392b',
  },
  'South America': {
    territories: ['Venezuela', 'Peru', 'Brazil', 'Argentina', 'Congo'],
    bonus: 2,
    color: '#27ae60',
  },
};

const ADJACENCY = {
  Alaska:            ['Northwest', 'Alberta', 'Japan'],
  Northwest:         ['Alaska', 'Alberta', 'Ontario'],
  Alberta:           ['Alaska', 'Northwest', 'Ontario', 'Eastern US'],
  Ontario:           ['Northwest', 'Alberta', 'Eastern US', 'Britain', 'Northern Europe'],
  'Eastern US':      ['Alberta', 'Ontario', 'Brazil', 'Venezuela'],
  Britain:           ['Ontario', 'Northern Europe', 'Southern Europe', 'Scandinavia'],
  'Northern Europe': ['Britain', 'Southern Europe', 'Ukraine', 'Scandinavia', 'Ontario'],
  'Southern Europe': ['Britain', 'Northern Europe', 'Ukraine', 'Middle East'],
  Ukraine:           ['Northern Europe', 'Southern Europe', 'Scandinavia', 'Middle East', 'India', 'China'],
  Scandinavia:       ['Britain', 'Northern Europe', 'Ukraine'],
  'Middle East':     ['Southern Europe', 'Ukraine', 'India', 'Congo'],
  India:             ['Middle East', 'Ukraine', 'China'],
  China:             ['Ukraine', 'India', 'Japan', 'Siberia'],
  Japan:             ['Alaska', 'China'],
  Siberia:           ['China', 'Ukraine'],
  Venezuela:         ['Eastern US', 'Peru', 'Brazil'],
  Peru:              ['Venezuela', 'Brazil', 'Argentina'],
  Brazil:            ['Eastern US', 'Venezuela', 'Peru', 'Congo'],
  Argentina:         ['Peru', 'Brazil'],
  Congo:             ['Brazil', 'Middle East'],
};

const ALL_TERRITORIES = Object.keys(ADJACENCY);
const PLAYER_COLORS = ['#e74c3c', '#3498db', '#27ae60', '#f39c12'];
const PLAYER_NAMES_CSS = ['red', 'blue', 'green', 'gold'];

// ─── Utilities ───────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rollDie() { return Math.floor(Math.random() * 6) + 1; }

function resolveBattle(attackerArmies, defenderArmies, maxAtkDice, maxDefDice) {
  const atkCount = Math.min(maxAtkDice, attackerArmies - 1);
  const defCount = Math.min(maxDefDice, defenderArmies);
  const attRolls = Array.from({ length: Math.max(1, atkCount) }, rollDie).sort((a, b) => b - a);
  const defRolls = Array.from({ length: Math.max(1, defCount) }, rollDie).sort((a, b) => b - a);
  let attLoss = 0, defLoss = 0;
  const pairs = Math.min(attRolls.length, defRolls.length);
  for (let i = 0; i < pairs; i++) {
    if (attRolls[i] > defRolls[i]) defLoss++;
    else attLoss++;
  }
  return { attLoss, defLoss, attRolls, defRolls };
}

function getContinentBonus(ownership, playerIdx) {
  let bonus = 0;
  for (const data of Object.values(CONTINENTS)) {
    if (data.territories.every(t => ownership[t] === playerIdx)) bonus += data.bonus;
  }
  return bonus;
}

function getReinforcementArmies(ownership, playerIdx) {
  const count = ALL_TERRITORIES.filter(t => ownership[t] === playerIdx).length;
  return Math.max(3, Math.floor(count / 3)) + getContinentBonus(ownership, playerIdx);
}

function checkWinner(ownership, n) {
  for (let i = 0; i < n; i++) {
    if (ALL_TERRITORIES.every(t => ownership[t] === i)) return i;
  }
  return null;
}

function isConnected(ownership, from, to, playerIdx) {
  if (from === to) return true;
  const visited = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    for (const adj of (ADJACENCY[cur] || [])) {
      if (adj === to) return true;
      if (!visited.has(adj) && ownership[adj] === playerIdx) {
        visited.add(adj);
        queue.push(adj);
      }
    }
  }
  return false;
}

function initGame(players) {
  const n = players.length;
  const shuffled = shuffle([...ALL_TERRITORIES]);
  const ownership = {};
  const armies = {};
  shuffled.forEach((t, i) => {
    ownership[t] = i % n;
    armies[t] = 3;
  });
  return { ownership, armies };
}

// ─── Bot AI ──────────────────────────────────────────────────────────────────

function botReinforce(ownership, armies, playerIdx, toPlace, difficulty) {
  const myTerrs = ALL_TERRITORIES.filter(t => ownership[t] === playerIdx);
  const newArm = { ...armies };
  let remaining = toPlace;

  if (difficulty === 'easy') {
    while (remaining > 0) {
      const t = myTerrs[Math.floor(Math.random() * myTerrs.length)];
      newArm[t]++;
      remaining--;
    }
  } else if (difficulty === 'medium') {
    // Reinforce border territories
    const borders = myTerrs.filter(t =>
      (ADJACENCY[t] || []).some(adj => ownership[adj] !== playerIdx)
    );
    const targets = borders.length > 0 ? borders : myTerrs;
    while (remaining > 0) {
      // Pick weakest border
      const t = targets.reduce((a, b) => newArm[a] <= newArm[b] ? a : b);
      newArm[t]++;
      remaining--;
    }
  } else {
    // hard: reinforce territories that help complete continents
    const incompleteConts = Object.entries(CONTINENTS).filter(([, data]) =>
      data.territories.some(t => ownership[t] === playerIdx) &&
      !data.territories.every(t => ownership[t] === playerIdx)
    );
    const hotSpots = incompleteConts.flatMap(([, data]) =>
      data.territories.filter(t => ownership[t] === playerIdx &&
        (ADJACENCY[t] || []).some(adj => ownership[adj] !== playerIdx))
    );
    const targets = hotSpots.length > 0 ? hotSpots : myTerrs;
    while (remaining > 0) {
      const t = targets[Math.floor(Math.random() * targets.length)];
      newArm[t]++;
      remaining--;
    }
  }
  return newArm;
}

function botChooseAttack(ownership, armies, playerIdx, difficulty) {
  const myStrong = ALL_TERRITORIES.filter(t => ownership[t] === playerIdx && armies[t] > 1);
  const attacks = [];

  for (const from of myStrong) {
    const enemies = (ADJACENCY[from] || []).filter(t => ownership[t] !== playerIdx);
    for (const to of enemies) {
      attacks.push({ from, to, advantage: armies[from] - armies[to] });
    }
  }
  if (attacks.length === 0) return null;

  if (difficulty === 'easy') {
    return Math.random() > 0.45 ? attacks[Math.floor(Math.random() * attacks.length)] : null;
  } else if (difficulty === 'medium') {
    const good = attacks.filter(a => a.advantage > 1);
    if (good.length === 0) return null;
    return good.reduce((best, a) => a.advantage > best.advantage ? a : best, good[0]);
  } else {
    // hard: prioritize continent completion
    const contAttacks = attacks.filter(({ to }) => {
      return Object.values(CONTINENTS).some(data => {
        const owned = data.territories.filter(t => ownership[t] === playerIdx).length;
        return data.territories.includes(to) && owned >= data.territories.length - 1;
      });
    });
    const pool = contAttacks.length > 0 ? contAttacks : attacks.filter(a => a.advantage > 0);
    if (pool.length === 0) return null;
    return pool.reduce((best, a) => a.advantage > best.advantage ? a : best, pool[0]);
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Risk({ players, onBack }) {
  const n = players.length;
  const [gameState] = useState(() => initGame(players));
  const [ownership, setOwnership] = useState(gameState.ownership);
  const [armies, setArmies] = useState(gameState.armies);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [phase, setPhase] = useState('reinforce');
  const [armiesToPlace, setArmiesToPlace] = useState(() =>
    getReinforcementArmies(gameState.ownership, 0)
  );
  const [attackFrom, setAttackFrom] = useState(null);
  const [fortifyFrom, setFortifyFrom] = useState(null);
  const [fortifyCount, setFortifyCount] = useState(1);
  const [battleResult, setBattleResult] = useState(null);
  const [winner, setWinner] = useState(null);
  const [log, setLog] = useState([`${players[0].name}'s turn — Place ${getReinforcementArmies(gameState.ownership, 0)} armies`]);
  const botTimerRef = useRef(null);

  const addLog = useCallback(msg => {
    setLog(prev => [...prev.slice(-9), msg]);
  }, []);

  // ── End turn helper ──────────────────────────────────────────────────────
  const endTurn = useCallback((ownSnap, armSnap) => {
    const own = ownSnap;
    const arm = armSnap;
    let next = (currentPlayer + 1) % n;
    // Skip eliminated players
    for (let i = 0; i < n; i++) {
      const idx = (currentPlayer + 1 + i) % n;
      if (ALL_TERRITORIES.some(t => own[t] === idx)) { next = idx; break; }
    }
    const newArmies = getReinforcementArmies(own, next);
    setCurrentPlayer(next);
    setPhase('reinforce');
    setArmiesToPlace(newArmies);
    setAttackFrom(null);
    setFortifyFrom(null);
    setBattleResult(null);
    setFortifyCount(1);
    addLog(`${players[next].name}'s turn — Place ${newArmies} armies`);
  }, [currentPlayer, n, players, addLog]);

  // ── Attack execution ─────────────────────────────────────────────────────
  const executeAttack = useCallback((from, to, ownSnap, armSnap, isBot) => {
    const atkDice = Math.min(3, armSnap[from] - 1);
    const defDice = Math.min(2, armSnap[to]);
    const { attLoss, defLoss, attRolls, defRolls } = resolveBattle(
      armSnap[from], armSnap[to], atkDice, defDice
    );
    const newArm = { ...armSnap };
    const newOwn = { ...ownSnap };
    newArm[from] = Math.max(1, newArm[from] - attLoss);
    newArm[to] = Math.max(0, newArm[to] - defLoss);
    let captured = false;
    if (newArm[to] <= 0) {
      captured = true;
      newOwn[to] = currentPlayer;
      const move = Math.max(1, atkDice - attLoss);
      newArm[from] = Math.max(1, newArm[from] - move);
      newArm[to] = move;
      addLog(`${players[currentPlayer].name} captured ${to}!`);
    } else {
      addLog(`${from}→${to}: [${attRolls}] vs [${defRolls}] — atk-${attLoss} def-${defLoss}`);
    }
    setOwnership(newOwn);
    setArmies(newArm);
    if (!isBot) {
      setBattleResult({ from, to, attRolls, defRolls, attLoss, defLoss, captured });
      setAttackFrom(null);
    }
    const w = checkWinner(newOwn, n);
    if (w !== null) { setWinner(w); return { newOwn, newArm, done: true }; }
    return { newOwn, newArm, done: false, captured };
  }, [currentPlayer, n, players, addLog]);

  // ── Bot logic ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (winner !== null) return;
    if (!players[currentPlayer]?.isBot) return;
    const diff = players[currentPlayer].botDifficulty || 'medium';

    if (phase === 'reinforce') {
      botTimerRef.current = setTimeout(() => {
        setArmies(prev => {
          const newArm = botReinforce(ownership, prev, currentPlayer, armiesToPlace, diff);
          return newArm;
        });
        setArmiesToPlace(0);
        setPhase('attack');
        addLog(`${players[currentPlayer].name} reinforced.`);
      }, 700);
    }

    if (phase === 'attack') {
      botTimerRef.current = setTimeout(() => {
        // Loop attacks until bot can't or won't attack anymore
        let curOwn = { ...ownership };
        let curArm = { ...armies };
        let keepAttacking = true;
        while (keepAttacking) {
          const attack = botChooseAttack(curOwn, curArm, currentPlayer, diff);
          if (!attack) { keepAttacking = false; break; }
          const result = executeAttack(attack.from, attack.to, curOwn, curArm, true);
          if (result.done) return; // winner found, executeAttack already set winner
          curOwn = result.newOwn;
          curArm = result.newArm;
          const canAttackMore = ALL_TERRITORIES.some(t =>
            curOwn[t] === currentPlayer && curArm[t] > 1 &&
            (ADJACENCY[t] || []).some(adj => curOwn[adj] !== currentPlayer)
          );
          if (!canAttackMore) { keepAttacking = false; }
        }
        setPhase('fortify');
        botTimerRef.current = setTimeout(() => endTurn(curOwn, curArm), 700);
      }, 700);
    }

    return () => clearTimeout(botTimerRef.current);
  }, [phase, currentPlayer, winner]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Human territory click ────────────────────────────────────────────────
  function handleTerritoryClick(terr) {
    if (players[currentPlayer]?.isBot || winner !== null) return;

    if (phase === 'reinforce') {
      if (ownership[terr] !== currentPlayer || armiesToPlace <= 0) return;
      const newArm = { ...armies };
      newArm[terr]++;
      setArmies(newArm);
      const remaining = armiesToPlace - 1;
      setArmiesToPlace(remaining);
      if (remaining === 0) {
        setPhase('attack');
        addLog('All armies placed — Attack or skip to Fortify.');
      }
    } else if (phase === 'attack') {
      if (attackFrom === null) {
        if (ownership[terr] === currentPlayer && armies[terr] > 1) {
          setAttackFrom(terr);
        }
      } else if (terr === attackFrom) {
        setAttackFrom(null);
      } else if (ownership[terr] !== currentPlayer && (ADJACENCY[attackFrom] || []).includes(terr)) {
        executeAttack(attackFrom, terr, ownership, armies, false);
      } else if (ownership[terr] === currentPlayer && armies[terr] > 1) {
        setAttackFrom(terr);
      } else {
        setAttackFrom(null);
      }
    } else if (phase === 'fortify') {
      if (fortifyFrom === null) {
        if (ownership[terr] === currentPlayer && armies[terr] > 1) {
          setFortifyFrom(terr);
          setFortifyCount(1);
        }
      } else if (terr === fortifyFrom) {
        setFortifyFrom(null);
      } else if (
        ownership[terr] === currentPlayer &&
        isConnected(ownership, fortifyFrom, terr, currentPlayer)
      ) {
        const move = Math.min(fortifyCount, armies[fortifyFrom] - 1);
        const newArm = { ...armies };
        newArm[fortifyFrom] -= move;
        newArm[terr] += move;
        setArmies(newArm);
        setFortifyFrom(null);
        addLog(`${players[currentPlayer].name} moved ${move} armies ${fortifyFrom}→${terr}`);
        endTurn(ownership, newArm);
      }
    }
  }

  // ── Winner screen ────────────────────────────────────────────────────────
  if (winner !== null) {
    return (
      <div className="game-page" style={{ overflowX: 'hidden' }}>
        <div className="gs-container" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div className="gs-card" style={{ maxWidth: 420, margin: '0 auto', padding: 'clamp(20px, 8vw, 40px)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌍</div>
            <h2 style={{ color: 'var(--accent)', marginBottom: 8 }}>World Conquest!</h2>
            <p style={{ fontSize: 22, fontWeight: 'bold', color: PLAYER_COLORS[winner], marginBottom: 24 }}>
              {players[winner].name} conquers the world!
            </p>
            <button className="gs-btn gs-btn-primary" style={{ minHeight: 44 }} onClick={onBack}>Back to Lobby</button>
          </div>
        </div>
      </div>
    );
  }

  const currentColor = PLAYER_COLORS[currentPlayer];

  return (
    <div className="game-page" style={{ paddingBottom: 40, overflowX: 'hidden' }}>
      <div className="gs-container">
        {/* Header */}
        <div className="game-header" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="gs-btn gs-btn-outline gs-btn-sm" style={{ minHeight: 40 }} onClick={onBack}>← Back</button>
          <h2 style={{ margin: 0, flex: 1 }}>Risk</h2>
          <div
            style={{
              background: currentColor,
              color: '#fff',
              fontWeight: 'bold',
              padding: '6px 14px',
              borderRadius: 'var(--radius)',
              fontSize: 14,
            }}
          >
            {players[currentPlayer].name} — {phase === 'reinforce' ? `Reinforce (${armiesToPlace} left)` : phase === 'attack' ? 'Attack' : 'Fortify'}
          </div>
        </div>

        {/* Player scoreboard */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {players.map((p, i) => {
            const terrCount = ALL_TERRITORIES.filter(t => ownership[t] === i).length;
            const armyCount = ALL_TERRITORIES.filter(t => ownership[t] === i).reduce((s, t) => s + armies[t], 0);
            return (
              <div
                key={i}
                style={{
                  border: `2px solid ${PLAYER_COLORS[i]}`,
                  borderRadius: 'var(--radius)',
                  padding: '6px 12px',
                  background: i === currentPlayer ? 'var(--surface)' : 'transparent',
                  fontSize: 13,
                  opacity: terrCount === 0 ? 0.4 : 1,
                }}
              >
                <span style={{ color: PLAYER_COLORS[i], fontWeight: 'bold' }}>{p.name}</span>
                <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{terrCount}T / {armyCount}A</span>
              </div>
            );
          })}
        </div>

        {/* Map by continent */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 10, marginBottom: 12 }}>
          {Object.entries(CONTINENTS).map(([contName, contData]) => (
            <div
              key={contName}
              className="gs-card"
              style={{ borderLeft: `4px solid ${contData.color}`, padding: 10 }}
            >
              <div style={{ fontWeight: 'bold', color: contData.color, marginBottom: 6, fontSize: 13 }}>
                {contName} <span style={{ color: 'var(--muted)', fontWeight: 'normal' }}>(+{contData.bonus})</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {contData.territories.map(terr => {
                  const owner = ownership[terr];
                  const armyCount = armies[terr];
                  const isAttFrom = attackFrom === terr;
                  const isFortFrom = fortifyFrom === terr;
                  const isTarget = attackFrom && (ADJACENCY[attackFrom] || []).includes(terr) && owner !== currentPlayer;
                  const isFortTarget = fortifyFrom && (ADJACENCY[fortifyFrom] || []).includes(terr) && owner === currentPlayer && terr !== fortifyFrom;
                  const isOwnedByCurrent = owner === currentPlayer;
                  let borderStyle = '2px solid transparent';
                  if (isAttFrom || isFortFrom) borderStyle = `2px solid #f39c12`;
                  else if (isTarget) borderStyle = `2px solid #fff`;
                  else if (isFortTarget) borderStyle = `2px solid #2ecc71`;

                  return (
                    <div
                      key={terr}
                      onClick={() => handleTerritoryClick(terr)}
                      style={{
                        background: PLAYER_COLORS[owner] || 'var(--muted)',
                        border: borderStyle,
                        borderRadius: 6,
                        padding: '5px 8px',
                        minWidth: 70,
                        textAlign: 'center',
                        cursor: players[currentPlayer]?.isBot ? 'default' : 'pointer',
                        opacity: isOwnedByCurrent ? 1 : 0.75,
                        transition: 'border 0.15s',
                        color: '#fff',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ fontSize: 9, fontWeight: 'bold', lineHeight: 1.2 }}>{terr}</div>
                      <div style={{ fontSize: 16, fontWeight: 'bold' }}>{armyCount}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Battle result */}
        {battleResult && (
          <div
            className="gs-card"
            style={{
              marginBottom: 12,
              borderLeft: '4px solid var(--accent)',
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 6 }}>
              {battleResult.from} → {battleResult.to}
            </div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 8, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Attacker dice</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {battleResult.attRolls.map((d, i) => (
                    <span
                      key={i}
                      style={{
                        background: '#e74c3c',
                        color: '#fff',
                        borderRadius: 4,
                        width: 28,
                        height: 28,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: 15,
                      }}
                    >{d}</span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Lost: {battleResult.attLoss}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Defender dice</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {battleResult.defRolls.map((d, i) => (
                    <span
                      key={i}
                      style={{
                        background: '#3498db',
                        color: '#fff',
                        borderRadius: 4,
                        width: 28,
                        height: 28,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: 15,
                      }}
                    >{d}</span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Lost: {battleResult.defLoss}</div>
              </div>
            </div>
            {battleResult.captured && (
              <div style={{ color: '#f39c12', fontWeight: 'bold', marginBottom: 8 }}>Territory Captured!</div>
            )}
            <button className="gs-btn gs-btn-sm gs-btn-outline" style={{ minHeight: 40 }} onClick={() => setBattleResult(null)}>OK</button>
          </div>
        )}

        {/* Phase controls (human only) */}
        {!players[currentPlayer]?.isBot && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            {phase === 'attack' && (
              <>
                {attackFrom && (
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                    Attacking from: <strong style={{ color: PLAYER_COLORS[currentPlayer] }}>{attackFrom}</strong> — click an adjacent enemy
                  </span>
                )}
                {!attackFrom && (
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                    Click one of your territories (2+ armies) to attack
                  </span>
                )}
                <button
                  className="gs-btn gs-btn-outline gs-btn-sm"
                  style={{ minHeight: 40 }}
                  onClick={() => {
                    setPhase('fortify');
                    setAttackFrom(null);
                    addLog('Skipped to Fortify.');
                  }}
                >
                  Skip to Fortify →
                </button>
              </>
            )}
            {phase === 'fortify' && (
              <>
                {fortifyFrom && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Move from <strong style={{ color: PLAYER_COLORS[currentPlayer] }}>{fortifyFrom}</strong>:
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={Math.max(1, (armies[fortifyFrom] || 2) - 1)}
                      value={fortifyCount}
                      onChange={e => setFortifyCount(+e.target.value)}
                      style={{ flex: '0 1 120px', minWidth: 100, height: 32 }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>{fortifyCount}</span>
                  </div>
                )}
                {!fortifyFrom && (
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                    Click a territory to move armies, or End Turn
                  </span>
                )}
                <button
                  className="gs-btn gs-btn-primary gs-btn-sm"
                  style={{ minHeight: 40 }}
                  onClick={() => endTurn(ownership, armies)}
                >
                  End Turn
                </button>
              </>
            )}
          </div>
        )}

        {/* Event log */}
        <div
          className="gs-card"
          style={{ padding: 10, maxHeight: 140, overflowY: 'auto' }}
        >
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 'bold' }}>EVENT LOG</div>
          {[...log].reverse().map((entry, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>{entry}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
