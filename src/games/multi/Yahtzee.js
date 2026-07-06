import React, { useState, useEffect, useCallback, useRef } from 'react';

const CATEGORIES = [
  { id: 'ones', label: 'Ones', section: 'upper' },
  { id: 'twos', label: 'Twos', section: 'upper' },
  { id: 'threes', label: 'Threes', section: 'upper' },
  { id: 'fours', label: 'Fours', section: 'upper' },
  { id: 'fives', label: 'Fives', section: 'upper' },
  { id: 'sixes', label: 'Sixes', section: 'upper' },
  { id: 'threeOfKind', label: 'Three of a Kind', section: 'lower' },
  { id: 'fourOfKind', label: 'Four of a Kind', section: 'lower' },
  { id: 'fullHouse', label: 'Full House (25)', section: 'lower' },
  { id: 'smallStraight', label: 'Small Straight (30)', section: 'lower' },
  { id: 'largeStraight', label: 'Large Straight (40)', section: 'lower' },
  { id: 'yahtzee', label: 'YAHTZEE (50)', section: 'lower' },
  { id: 'chance', label: 'Chance', section: 'lower' },
];

function rollDie() { return Math.floor(Math.random() * 6) + 1; }

function calcScore(catId, dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  dice.forEach(d => counts[d]++);
  const sum = dice.reduce((a, b) => a + b, 0);
  const upperMap = { ones: 1, twos: 2, threes: 3, fours: 4, fives: 5, sixes: 6 };
  if (upperMap[catId]) return counts[upperMap[catId]] * upperMap[catId];
  if (catId === 'threeOfKind') return counts.some(c => c >= 3) ? sum : 0;
  if (catId === 'fourOfKind') return counts.some(c => c >= 4) ? sum : 0;
  if (catId === 'fullHouse') return (counts.some(c => c === 3) && counts.some(c => c === 2)) ? 25 : 0;
  if (catId === 'smallStraight') {
    const uniq = [...new Set(dice)].sort((a, b) => a - b);
    const seqs = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
    return seqs.some(seq => seq.every(v => uniq.includes(v))) ? 30 : 0;
  }
  if (catId === 'largeStraight') {
    const uniq = [...new Set(dice)].sort((a, b) => a - b);
    return (JSON.stringify(uniq) === JSON.stringify([1, 2, 3, 4, 5]) || JSON.stringify(uniq) === JSON.stringify([2, 3, 4, 5, 6])) ? 40 : 0;
  }
  if (catId === 'yahtzee') return counts.some(c => c >= 5) ? 50 : 0;
  if (catId === 'chance') return sum;
  return 0;
}

function calcTotalScore(scoreCard) {
  let upper = 0;
  for (const id of ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes']) {
    if (scoreCard[id] !== undefined && scoreCard[id] !== null) upper += scoreCard[id];
  }
  const bonus = upper >= 63 ? 35 : 0;
  let lower = 0;
  for (const cat of CATEGORIES) {
    if (cat.section === 'lower' && scoreCard[cat.id] !== undefined && scoreCard[cat.id] !== null) {
      lower += scoreCard[cat.id];
    }
  }
  return upper + bonus + lower;
}

function botChooseCategory(scoreCard, dice) {
  let best = null, bestScore = -1;
  for (const cat of CATEGORIES) {
    if (scoreCard[cat.id] !== undefined && scoreCard[cat.id] !== null) continue;
    const s = calcScore(cat.id, dice);
    if (s > bestScore) { bestScore = s; best = cat.id; }
  }
  // if all scores are 0, pick the first available
  if (best === null) {
    for (const cat of CATEGORIES) {
      if (scoreCard[cat.id] === undefined || scoreCard[cat.id] === null) { best = cat.id; break; }
    }
  }
  return best;
}

function botChooseKeep(dice, rollsLeft, difficulty) {
  if (difficulty === 'easy') return dice.map(() => Math.random() > 0.5);
  const counts = [0, 0, 0, 0, 0, 0, 0];
  dice.forEach(d => counts[d]++);
  const maxCount = Math.max(...counts);
  const maxVal = counts.indexOf(maxCount);
  return dice.map(d => d === maxVal);
}

export default function Yahtzee({ players, onBack }) {
  const n = players.length;
  const initScoreCards = () => players.map(() => {
    const sc = {};
    CATEGORIES.forEach(c => { sc[c.id] = null; });
    return sc;
  });

  const [scoreCards, setScoreCards] = useState(initScoreCards);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [dice, setDice] = useState([1, 1, 1, 1, 1]);
  const [kept, setKept] = useState([false, false, false, false, false]);
  const [rollsLeft, setRollsLeft] = useState(3);
  const [rolling, setRolling] = useState(false);
  const [phase, setPhase] = useState('rolling'); // rolling, scoring
  const [gameOver, setGameOver] = useState(false);
  const [round, setRound] = useState(1);
  const rollRef = useRef(null);

  const rollDice = useCallback((keepOverride) => {
    if (rollsLeft <= 0 || rolling) return;
    const activeKeep = keepOverride || kept;
    setRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setDice(prev => prev.map((d, i) => activeKeep[i] ? d : rollDie()));
      count++;
      if (count >= 6) {
        clearInterval(interval);
        setRolling(false);
        setRollsLeft(r => {
          const newR = r - 1;
          if (newR <= 0) setPhase('scoring');
          return newR;
        });
      }
    }, 80);
  }, [rollsLeft, rolling, kept]);

  const toggleKeep = useCallback((i) => {
    if (rollsLeft === 3 || phase === 'scoring') return;
    setKept(k => { const n = [...k]; n[i] = !n[i]; return n; });
  }, [rollsLeft, phase]);

  const scoreCategory = useCallback((catId) => {
    const score = calcScore(catId, dice);
    const newCards = scoreCards.map((sc, i) => {
      if (i !== currentPlayer) return sc;
      return { ...sc, [catId]: score };
    });
    setScoreCards(newCards);

    const nextP = (currentPlayer + 1) % n;
    const newRound = nextP === 0 ? round + 1 : round;

    // Check game over (13 rounds)
    if (newRound > 13) {
      setGameOver(true);
      return;
    }

    setCurrentPlayer(nextP);
    setRound(newRound);
    setDice([1, 1, 1, 1, 1]);
    setKept([false, false, false, false, false]);
    setRollsLeft(3);
    setPhase('rolling');
  }, [dice, scoreCards, currentPlayer, n, round]);

  // Bot turn
  useEffect(() => {
    if (gameOver) return;
    if (!players[currentPlayer]?.isBot) return;
    if (rolling) return;
    if (phase === 'rolling' && rollsLeft === 3) {
      setTimeout(rollDice, 700);
      return;
    }
    if (phase === 'rolling' && rollsLeft > 0) {
      setTimeout(() => {
        const keep = botChooseKeep(dice, rollsLeft, players[currentPlayer].botDifficulty);
        setKept(keep);
        setTimeout(() => rollDice(keep), 400);
      }, 700);
      return;
    }
    if (phase === 'scoring') {
      setTimeout(() => {
        const cat = botChooseCategory(scoreCards[currentPlayer], dice);
        if (cat) scoreCategory(cat);
      }, 700);
    }
  }, [phase, currentPlayer, rollsLeft, rolling, gameOver]); // eslint-disable-line

  if (gameOver) {
    const totals = scoreCards.map(calcTotalScore);
    const maxScore = Math.max(...totals);
    const winnerIdx = totals.indexOf(maxScore);
    return (
      <div style={st.container}>
        <h2 style={st.title}>Yahtzee — Game Over!</h2>
        <h3 style={{ color: '#f39c12' }}>{players[winnerIdx].name} wins with {maxScore} points!</h3>
        <div style={st.scoreTable}>
          {players.map((p, i) => (
            <div key={i} style={{ ...st.scoreRow, background: i === winnerIdx ? '#1a5276' : '#2c3e50' }}>
              <span>{p.name}</span>
              <span>{totals[i]} pts</span>
            </div>
          ))}
        </div>
        <button style={st.btn} onClick={() => { setScoreCards(initScoreCards()); setCurrentPlayer(0); setRound(1); setDice([1,1,1,1,1]); setKept([false,false,false,false,false]); setRollsLeft(3); setPhase('rolling'); setGameOver(false); }}>Play Again</button>
        <button style={{ ...st.btn, background: '#7f8c8d' }} onClick={onBack}>Back</button>
      </div>
    );
  }

  const diceSymbols = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  return (
    <div style={st.container}>
      <div style={st.header}>
        <button style={st.backBtn} onClick={onBack}>← Back</button>
        <h2 style={st.title}>🎲 Yahtzee</h2>
        <span style={{ color: '#bdc3c7', fontSize: 14 }}>Round {round}/13</span>
      </div>

      <div style={{ textAlign: 'center', fontSize: 18, color: '#f39c12', fontWeight: 'bold', marginBottom: 12 }}>
        {players[currentPlayer].name}'s Turn
        {players[currentPlayer].isBot ? ' (Bot thinking...)' : ''}
      </div>

      {/* Dice */}
      <div style={st.diceArea}>
        {dice.map((d, i) => (
          <div key={i}
            style={{
              ...st.die,
              background: kept[i] ? '#1a5276' : '#2c3e50',
              border: kept[i] ? '3px solid #3498db' : '3px solid #34495e',
              animation: rolling && !kept[i] ? 'spin 0.08s linear infinite' : 'none',
              cursor: rollsLeft < 3 && phase === 'rolling' && !players[currentPlayer].isBot ? 'pointer' : 'default',
              transform: rolling && !kept[i] ? 'rotate(45deg)' : 'none',
            }}
            onClick={() => !players[currentPlayer].isBot && toggleKeep(i)}
          >
            <span style={{ fontSize: 36 }}>{diceSymbols[d]}</span>
            {kept[i] && <span style={{ fontSize: 9, color: '#3498db', display: 'block' }}>KEPT</span>}
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        {!players[currentPlayer].isBot && phase === 'rolling' && (
          <button style={{ ...st.btn, opacity: rollsLeft === 0 ? 0.5 : 1 }} onClick={rollDice} disabled={rollsLeft === 0 || rolling}>
            Roll Dice ({rollsLeft} left)
          </button>
        )}
        {rollsLeft < 3 && rollsLeft > 0 && phase === 'rolling' && !players[currentPlayer].isBot && (
          <div style={{ color: '#bdc3c7', fontSize: 12, marginTop: 4 }}>Click dice to keep them</div>
        )}
        {phase === 'scoring' && !players[currentPlayer].isBot && (
          <div style={{ color: '#f39c12', fontWeight: 'bold' }}>Choose a scoring category below</div>
        )}
      </div>

      {/* Score cards */}
      <div style={st.scoreCardsArea}>
        {players.map((p, pi) => {
          const total = calcTotalScore(scoreCards[pi]);
          const upper = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].reduce((acc, id) => acc + (scoreCards[pi][id] || 0), 0);
          const isActive = pi === currentPlayer;
          return (
            <div key={pi} style={{ ...st.scoreCard, border: isActive ? '2px solid #f39c12' : '2px solid #34495e', opacity: isActive ? 1 : 0.75 }}>
              <div style={st.scoreCardHeader}>{p.name} — {total} pts</div>
              <div style={{ fontSize: 11, color: '#95a5a6', marginBottom: 4 }}>
                Upper: {upper}/63 {upper >= 63 ? '✓ +35' : `(${63 - upper} to bonus)`}
              </div>
              {CATEGORIES.map(cat => {
                const filled = scoreCards[pi][cat.id] !== null;
                const preview = !filled && isActive && phase === 'scoring' ? calcScore(cat.id, dice) : null;
                return (
                  <div key={cat.id}
                    style={{
                      ...st.catRow,
                      background: filled ? '#1e3a4a' : (preview !== null && preview > 0 && isActive ? '#1a5276' : '#2c3e50'),
                      cursor: !filled && isActive && phase === 'scoring' && !players[currentPlayer].isBot ? 'pointer' : 'default',
                      borderLeft: cat.section === 'upper' ? '3px solid #2ecc71' : '3px solid #e74c3c',
                    }}
                    onClick={() => !filled && isActive && phase === 'scoring' && !players[currentPlayer].isBot && scoreCategory(cat.id)}
                  >
                    <span style={{ fontSize: 11 }}>{cat.label}</span>
                    <span style={{ fontSize: 11, color: filled ? '#f39c12' : '#27ae60' }}>
                      {filled ? scoreCards[pi][cat.id] : (preview !== null ? `→${preview}` : '')}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const st = {
  container: { background: '#1a2634', minHeight: '100vh', padding: 16, color: '#ecf0f1', fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 24, color: '#f39c12', flex: 1 },
  backBtn: { background: '#7f8c8d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', minHeight: 40 },
  btn: { background: '#e67e22', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 16, margin: 8, minHeight: 44 },
  diceArea: { display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' },
  die: { width: 70, height: 70, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s, border 0.2s', userSelect: 'none' },
  scoreCardsArea: { display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 },
  scoreCard: { minWidth: 160, background: '#1e2d3e', borderRadius: 8, padding: 8, flexShrink: 0 },
  scoreCardHeader: { fontWeight: 'bold', marginBottom: 6, fontSize: 13, textAlign: 'center' },
  catRow: { display: 'flex', justifyContent: 'space-between', padding: '3px 6px', marginBottom: 2, borderRadius: 4, fontSize: 11 },
  scoreTable: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
  scoreRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 16px', borderRadius: 8 },
};
