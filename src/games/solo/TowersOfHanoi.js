import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';

const DISC_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#e91e63'];
const MIN_MOVES = { easy: 15, medium: 63, hard: 255 };
const DISC_COUNT = { easy: 4, medium: 6, hard: 8 };

// Compute the optimal sequence of moves to solve Hanoi from the initial state.
// Returns array of {from, to} moves.
function hanoiMoves(n, from, to, aux) {
  if (n === 0) return [];
  return [
    ...hanoiMoves(n - 1, from, aux, to),
    { from, to },
    ...hanoiMoves(n - 1, aux, to, from),
  ];
}

// Given the current peg state, find the next hint move.
// Strategy: simulate the full solution from initial state and find where we are.
// We do this by simulating the full move sequence and matching current state.
function getHintMove(pegs, nDiscs) {
  // Generate all moves for the complete solution (A→C using B)
  const allMoves = hanoiMoves(nDiscs, 0, 2, 1);

  // Simulate from initial state and find the first move that matches current state
  // "Matches current state" means: applying this move to simPegs gives us something
  // that makes sense. Instead, find the move index by simulating and comparing.
  const simPegs = [
    Array.from({ length: nDiscs }, (_, i) => nDiscs - i), // [n, n-1, ..., 1]
    [],
    [],
  ];

  // Build a state signature for comparison
  const sig = (p) => p.map(peg => peg.join(',')).join('|');
  const targetSig = sig(pegs);

  // Walk through the solution until we reach the current state, then return next move
  if (sig(simPegs) === targetSig) {
    return allMoves[0] || null;
  }
  for (let i = 0; i < allMoves.length; i++) {
    const { from, to } = allMoves[i];
    simPegs[to].push(simPegs[from].pop());
    if (sig(simPegs) === targetSig) {
      return allMoves[i + 1] || null;
    }
  }
  // State not on optimal path — fall back to finding any valid move
  // that moves the smallest disc toward the goal
  for (let pegFrom = 0; pegFrom < 3; pegFrom++) {
    if (pegs[pegFrom].length === 0) continue;
    const topFrom = pegs[pegFrom][pegs[pegFrom].length - 1];
    for (let pegTo = 0; pegTo < 3; pegTo++) {
      if (pegTo === pegFrom) continue;
      const topTo = pegs[pegTo].length === 0 ? Infinity : pegs[pegTo][pegs[pegTo].length - 1];
      if (topFrom < topTo) return { from: pegFrom, to: pegTo };
    }
  }
  return null;
}

export default function TowersOfHanoi() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [nDiscs, setNDiscs] = useState(4);
  const [pegs, setPegs] = useState([[], [], []]);
  const [selected, setSelected] = useState(null); // peg index
  const [moves, setMoves] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintMsg, setHintMsg] = useState('');
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState('');

  const startGame = useCallback((diff) => {
    setDifficulty(diff);
    const n = DISC_COUNT[diff];
    setNDiscs(n);
    // Discs on peg A from bottom (largest) to top (smallest): [n, n-1, ..., 1]
    const initPegs = [Array.from({ length: n }, (_, i) => n - i), [], []];
    setPegs(initPegs);
    setSelected(null);
    setMoves(0);
    setHintUsed(false);
    setHintMsg('');
    setWon(false);
    setMsg('');
  }, []);

  const handlePegClick = (pegIdx) => {
    if (won) return;
    if (selected === null) {
      if (pegs[pegIdx].length === 0) {
        setMsg('That peg is empty!');
        setTimeout(() => setMsg(''), 1500);
        return;
      }
      setSelected(pegIdx);
      setMsg('');
    } else {
      if (selected === pegIdx) {
        // Deselect
        setSelected(null);
        return;
      }
      // Attempt move: top of selected peg → target peg
      const srcTop = pegs[selected][pegs[selected].length - 1];
      const dstTop = pegs[pegIdx].length > 0 ? pegs[pegIdx][pegs[pegIdx].length - 1] : Infinity;
      if (srcTop < dstTop) {
        const newPegs = pegs.map(p => [...p]);
        newPegs[pegIdx].push(newPegs[selected].pop());
        setPegs(newPegs);
        const newMoves = moves + 1;
        setMoves(newMoves);
        setSelected(null);
        setMsg('');
        if (newPegs[2].length === nDiscs) {
          setWon(true);
          const score = Math.max(0, 1000 - Math.max(0, newMoves - MIN_MOVES[difficulty]) * 10 - (hintUsed ? 100 : 0));
          setMsg(`Solved in ${newMoves} moves! (Optimal: ${MIN_MOVES[difficulty]}) Score: ${score}`);
          if (isLoggedIn()) apiRequest('POST', { game_type: 'towers_hanoi', result: 'win', difficulty, score }, '/game/save');
        }
      } else {
        setMsg('Cannot place a larger disc on a smaller one!');
        setTimeout(() => setMsg(''), 2000);
        setSelected(null);
      }
    }
  };

  const handleHint = () => {
    if (hintUsed || won) return;
    setHintUsed(true);
    const hint = getHintMove(pegs, nDiscs);
    if (hint) {
      const pegNames = ['A', 'B', 'C'];
      setHintMsg(`Hint: Move top disc from peg ${pegNames[hint.from]} to peg ${pegNames[hint.to]}`);
      setTimeout(() => setHintMsg(''), 5000);
    } else {
      setHintMsg('Hint: puzzle is already solved or in a winning position!');
      setTimeout(() => setHintMsg(''), 3000);
    }
  };

  const discWidth = (disc) => 30 + (disc / nDiscs) * 120;
  const pegHeight = nDiscs * 32 + 20;

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>Towers of Hanoi</h1>
          </div>
          <div className="gs-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
              Move all discs from peg A to peg C. You may only place a smaller disc on top of a larger one.
            </p>
            <div className="difficulty-select">
              {['easy', 'medium', 'hard'].map(d => (
                <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                  <span className="diff-label">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                  <span className="diff-sub">
                    {d === 'easy' ? '4 discs (15 min moves)' : d === 'medium' ? '6 discs (63 min moves)' : '8 discs (255 min moves)'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page">
      <div className="gs-container">
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <h1>Towers of Hanoi</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <div className="game-meta">
          <span>Moves: {moves}</span>
          <span style={{ marginLeft: '1rem', color: 'var(--muted)' }}>Optimal: {MIN_MOVES[difficulty]}</span>
          {hintUsed && <span className="hint-used" style={{ marginLeft: '1rem' }}>Hint used</span>}
        </div>
        {msg && <div className={`game-msg ${won ? 'success' : 'info'}`}>{msg}</div>}
        {hintMsg && <div className="game-msg info">{hintMsg}</div>}

        {/* Peg display */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(0.5rem, 3vw, 2rem)', margin: '2rem 0', alignItems: 'flex-end' }}>
            {pegs.map((peg, pi) => (
              <div key={pi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: '1 1 0', minWidth: 64, maxWidth: 180 }}>
                <div
                  onClick={() => handlePegClick(pi)}
                  style={{
                    width: '100%', height: pegHeight,
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center',
                    position: 'relative', cursor: 'pointer',
                    border: selected === pi ? '2px solid var(--accent)' : '2px solid transparent',
                    borderRadius: 'var(--radius)',
                    backgroundColor: selected === pi ? '#00aaff11' : 'transparent',
                    transition: 'all 0.15s',
                  }}>
                  {/* Pole */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                    width: 8, height: '100%', backgroundColor: 'var(--muted)', borderRadius: 4,
                  }} />
                  {/* Discs rendered bottom to top */}
                  {[...peg].reverse().map((disc, di) => (
                    <div key={di} style={{
                      width: `${((discWidth(disc) / 180) * 100).toFixed(2)}%`, height: 28,
                      backgroundColor: DISC_COLORS[(disc - 1) % DISC_COLORS.length],
                      borderRadius: 14, marginBottom: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: 'bold', color: '#fff',
                      position: 'relative', zIndex: 1,
                    }}>{disc}</div>
                  ))}
                </div>
                <div style={{
                  fontWeight: 'bold', fontSize: '1.1rem',
                  color: selected === pi ? 'var(--accent)' : 'var(--muted)',
                }}>
                  {['A', 'B', 'C'][pi]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selected !== null && (
          <p style={{ textAlign: 'center', color: 'var(--accent)' }}>
            Peg {['A', 'B', 'C'][selected]} selected — click another peg to move top disc
          </p>
        )}

        <div className="game-controls">
          {!hintUsed && !won && (
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={handleHint}>Hint</button>
          )}
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => startGame(difficulty)}>Reset</button>
          {won ? (
            <>
              <button className="gs-btn gs-btn-primary" onClick={() => startGame(difficulty)}>Play Again</button>
              <button className="gs-btn gs-btn-outline" onClick={() => setDifficulty(null)}>Change Difficulty</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
