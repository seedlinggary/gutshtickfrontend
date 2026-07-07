import React, { useState, useEffect } from 'react';
import HowToPlay from '../HowToPlay';

// Kalah variant: 6 pits per side, 2 stores, 4 seeds per pit
// Board layout (indices):
//   P2 store = idx 13, P1 store = idx 6
//   P1 pits: 0-5 (left to right), P2 pits: 7-12 (right to left from P2's perspective)

function initBoard() {
  const b = Array(14).fill(4);
  b[6] = 0; // P1 store
  b[13] = 0; // P2 store
  return b;
}

function P1_PITS() { return [0,1,2,3,4,5]; }
function P2_PITS() { return [7,8,9,10,11,12]; }

function sow(board, idx, player) {
  // Returns { board, extraTurn, captureHappened }
  const nb = [...board];
  let seeds = nb[idx];
  nb[idx] = 0;
  let cur = idx;
  const opponentStore = player === 1 ? 13 : 6;

  while (seeds > 0) {
    cur = (cur + 1) % 14;
    if (cur === opponentStore) continue; // skip opponent's store
    nb[cur]++;
    seeds--;
  }

  // Extra turn if last seed lands in own store
  const ownStore = player === 1 ? 6 : 13;
  const extraTurn = cur === ownStore;

  // Capture: last seed in empty pit on own side
  const ownPits = player === 1 ? P1_PITS() : P2_PITS();
  const oppPits = player === 1 ? P2_PITS() : P1_PITS();
  let captureHappened = false;
  if (!extraTurn && ownPits.includes(cur) && nb[cur] === 1) {
    const oppIdx = 12 - cur; // mirror index
    if (nb[oppIdx] > 0) {
      nb[ownStore] += nb[cur] + nb[oppIdx];
      nb[cur] = 0;
      nb[oppIdx] = 0;
      captureHappened = true;
    }
  }

  return { board: nb, extraTurn, captureHappened };
}

function isGameOver(board) {
  const p1Empty = P1_PITS().every(i => board[i] === 0);
  const p2Empty = P2_PITS().every(i => board[i] === 0);
  return p1Empty || p2Empty;
}

function collectRemaining(board) {
  const nb = [...board];
  nb[6] += P1_PITS().reduce((s, i) => s + nb[i], 0);
  nb[13] += P2_PITS().reduce((s, i) => s + nb[i], 0);
  P1_PITS().forEach(i => { nb[i] = 0; });
  P2_PITS().forEach(i => { nb[i] = 0; });
  return nb;
}

function getBotMove(board, player, difficulty) {
  const pits = player === 2 ? P2_PITS() : P1_PITS();
  const available = pits.filter(i => board[i] > 0);
  if (!available.length) return -1;

  if (difficulty === 'easy') return available[Math.floor(Math.random() * available.length)];

  // Medium/Hard: pick move that gives extra turn, else most seeds
  const extraTurns = available.filter(i => {
    const { extraTurn } = sow(board, i, player);
    return extraTurn;
  });
  if (extraTurns.length) return extraTurns[0];

  if (difficulty === 'medium') {
    // Greedy: pick move that results in most seeds in store
    const store = player === 1 ? 6 : 13;
    let best = -1, bestStore = -1;
    for (const i of available) {
      const { board: nb } = sow(board, i, player);
      if (nb[store] > bestStore) { bestStore = nb[store]; best = i; }
    }
    return best >= 0 ? best : available[0];
  }

  // Hard: simple minimax depth 4
  function evaluate(b, p) {
    return p === 1 ? b[6] - b[13] : b[13] - b[6];
  }

  function mm(b, p, depth) {
    if (depth === 0 || isGameOver(b)) return evaluate(b, player);
    const ps = p === 1 ? P1_PITS() : P2_PITS();
    const avail = ps.filter(i => b[i] > 0);
    if (!avail.length) return evaluate(b, player);

    let best = p === player ? -Infinity : Infinity;
    for (const i of avail) {
      const { board: nb, extraTurn } = sow(b, i, p);
      const nextP = extraTurn ? p : (p === 1 ? 2 : 1);
      const score = mm(nb, nextP, depth - 1);
      if (p === player) best = Math.max(best, score);
      else best = Math.min(best, score);
    }
    return best;
  }

  let best = -1, bestScore = -Infinity;
  for (const i of available) {
    const { board: nb, extraTurn } = sow(board, i, player);
    const nextP = extraTurn ? player : (player === 1 ? 2 : 1);
    const score = mm(nb, nextP, 4);
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best >= 0 ? best : available[0];
}

export default function Mancala({ mode, difficulty, onBack }) {
  const [board, setBoard] = useState(initBoard());
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [botThinking, setBotThinking] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [extraTurnMsg, setExtraTurnMsg] = useState('');

  const isBot = mode === 'vs_computer' && currentPlayer === 2;

  function makeMove(idx, player) {
    if (!board[idx]) return;
    const { board: nb, extraTurn } = sow(board, idx, player);

    let finalBoard = nb;
    let over = false;
    if (isGameOver(nb)) {
      finalBoard = collectRemaining(nb);
      over = true;
    }

    setBoard(finalBoard);
    setLastMove(idx);
    setGameOver(over);

    if (!over) {
      if (extraTurn) {
        setExtraTurnMsg(`Extra turn!`);
      } else {
        setExtraTurnMsg('');
        setCurrentPlayer(player === 1 ? 2 : 1);
      }
    }
  }

  function handlePitClick(idx) {
    if (gameOver || botThinking) return;
    if (mode === 'vs_computer' && currentPlayer !== 1) return;
    const p1Pits = P1_PITS();
    if (currentPlayer === 1 && !p1Pits.includes(idx)) return;
    if (currentPlayer === 2 && !P2_PITS().includes(idx)) return;
    if (!board[idx]) return;
    setExtraTurnMsg('');
    makeMove(idx, currentPlayer);
  }

  // Bot turn
  useEffect(() => {
    if (!isBot || gameOver || botThinking) return;
    setBotThinking(true);
    const t = setTimeout(() => {
      const move = getBotMove(board, 2, difficulty);
      if (move >= 0) {
        const { board: nb, extraTurn } = sow(board, move, 2);
        let finalBoard = nb;
        let over = false;
        if (isGameOver(nb)) {
          finalBoard = collectRemaining(nb);
          over = true;
        }
        setBoard(finalBoard);
        setLastMove(move);
        setGameOver(over);
        if (!over) {
          if (extraTurn) {
            setExtraTurnMsg('Computer gets extra turn!');
          } else {
            setExtraTurnMsg('');
            setCurrentPlayer(1);
          }
        }
      }
      setBotThinking(false);
    }, 700);
    return () => clearTimeout(t);
  }, [isBot, board, difficulty, gameOver, botThinking]);

  function reset() {
    setBoard(initBoard());
    setCurrentPlayer(1);
    setGameOver(false);
    setBotThinking(false);
    setLastMove(null);
    setExtraTurnMsg('');
  }

  const p1label = mode === 'local' ? 'Player 1' : 'You';
  const p2label = mode === 'local' ? 'Player 2' : 'Computer';
  const P1C = '#ef4444';
  const P2C = '#3b82f6';

  // P2 pits displayed right-to-left
  const p2Display = [12,11,10,9,8,7];

  // Fluid sizing: pits/stores shrink on narrow phones, capped at their
  // original pixel sizes (unchanged desktop rendering) once the viewport is
  // wide enough (~600px+) to fit the full row comfortably.
  const pitSize = 'clamp(38px, 10.7vw, 64px)';
  const storeW = 'clamp(48px, 13.3vw, 80px)';
  const storeH = 'clamp(96px, 26.7vw, 160px)';
  const pitLabelW = 'clamp(22px, 6.7vw, 40px)';

  function renderPit(idx, player, clickable) {
    const count = board[idx];
    const isLast = lastMove === idx;
    const canClick = clickable && count > 0 && !gameOver && !botThinking;
    return (
      <button
        key={idx}
        onClick={() => handlePitClick(idx)}
        disabled={!canClick}
        style={{
          width: pitSize, height: pitSize, borderRadius: '50%',
          background: isLast ? (player === 1 ? P1C + '25' : P2C + '25') : 'var(--surface)',
          border: `3px solid ${canClick ? (player === 1 ? P1C : P2C) : 'var(--border)'}`,
          cursor: canClick ? 'pointer' : 'default',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontSize: 'clamp(13px, 3.3vw, 20px)', fontWeight: 800, color: 'var(--text)', transition: 'all 150ms',
          transform: canClick ? 'scale(1)' : 'scale(0.95)',
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (canClick) e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = canClick ? 'scale(1)' : 'scale(0.95)'; }}
      >
        {count}
        <span style={{ fontSize: 'clamp(6px, 1.3vw, 8px)', color: 'var(--muted)', fontWeight: 400 }}>#{idx}</span>
      </button>
    );
  }

  function renderStore(store, label, color) {
    return (
      <div style={{
        width: storeW, height: storeH, borderRadius: 40,
        background: color + '10', border: `3px solid ${color}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 'clamp(18px, 4.7vw, 28px)', fontWeight: 900, color }}>{board[store]}</div>
        <div style={{ fontSize: 'clamp(8px, 1.7vw, 10px)', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</div>
      </div>
    );
  }

  const winner = gameOver
    ? (board[6] > board[13] ? 1 : board[13] > board[6] ? 2 : 0)
    : null;

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={onBack}>Back</button>
        <h1 className="game-title">Mancala</h1>
        <p className="game-subtitle">{mode === 'local' ? 'Pass & Play' : `vs Computer (${difficulty})`}</p>
      </div>

      <HowToPlay>
        <p>This is the Kalah variant: sow seeds around the board and collect more in your store than your opponent to win.</p>
        <ul>
          <li>Tap one of your own (non-empty) pits — the 6 pits on your side of the board.</li>
          <li>Its seeds are sown one-by-one counter-clockwise into each following pit, including your own store but skipping your opponent's store.</li>
          <li>If your very last seed lands in your own store, you get an extra turn.</li>
          <li>If your very last seed lands in a pit on your side that was empty, you capture: that seed plus everything in the directly-opposite pit on your opponent's side both go into your store.</li>
          <li>The game ends when one side's 6 pits are all empty; each player then sweeps any seeds remaining on their own side into their own store. Whoever has the most seeds in their store wins.</li>
        </ul>
        <p><strong>vs Computer</strong> gives you an easy, medium, or hard bot. <strong>Pass & Play</strong> lets two people take turns on this device.</p>
      </HowToPlay>

      {gameOver ? (
        <div className={`game-msg ${winner === 0 ? 'info' : 'success'}`} style={{ marginBottom: 16 }}>
          {winner === 0 ? `Draw! ${board[6]}–${board[13]}` :
           winner === 1 ? `${p1label} wins! ${board[6]}–${board[13]}` :
                         `${p2label} wins! ${board[13]}–${board[6]}`}
        </div>
      ) : extraTurnMsg ? (
        <div className="game-msg success" style={{ marginBottom: 16 }}>{extraTurnMsg}</div>
      ) : (
        <div className="game-msg info" style={{ marginBottom: 16 }}>
          {botThinking ? 'Computer is thinking...' : `${currentPlayer === 1 ? p1label : p2label}'s turn`}
        </div>
      )}

      {/* Board */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 2vw, 12px)', justifyContent: 'center' }}>
          {/* P1 Store */}
          {renderStore(6, p1label, P1C)}

          {/* Pits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* P2 row (top, facing down) */}
            <div style={{ display: 'flex', gap: 'clamp(4px, 1.7vw, 10px)', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: P2C, fontWeight: 700, width: pitLabelW, textAlign: 'center', flexShrink: 0 }}>{p2label}</div>
              {p2Display.map(i => renderPit(i, 2, currentPlayer === 2 && mode !== 'vs_computer'))}
            </div>
            {/* Divider */}
            <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }} />
            {/* P1 row (bottom) */}
            <div style={{ display: 'flex', gap: 'clamp(4px, 1.7vw, 10px)', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: P1C, fontWeight: 700, width: pitLabelW, textAlign: 'center', flexShrink: 0 }}>{p1label}</div>
              {P1_PITS().map(i => renderPit(i, 1, currentPlayer === 1))}
            </div>
          </div>

          {/* P2 Store */}
          {renderStore(13, p2label, P2C)}
        </div>
      </div>

      <div className="game-controls">
        <button className="gs-btn gs-btn-outline" onClick={reset}>New Game</button>
      </div>

      <div style={{ marginTop: 16, padding: '10px 16px', background: 'var(--bg)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', maxWidth: 500, margin: '16px auto 0' }}>
        <strong>Rules:</strong> Pick a pit on your side to sow seeds counter-clockwise. If the last seed lands in your store, take another turn. If it lands in an empty pit on your side, capture the opponent's opposite pit. Most seeds in your store wins.
      </div>
    </div>
  );
}
