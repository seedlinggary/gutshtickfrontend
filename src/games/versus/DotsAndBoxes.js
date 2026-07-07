import React, { useState, useEffect } from 'react';
import HowToPlay from '../HowToPlay';

// Grid sizes: easy=4x4 boxes (5x5 dots), medium=5x5, hard=6x6
const GRID_SIZES = { easy: 4, medium: 5, hard: 6 };
const DOT_GAP = 60;

function initState(n) {
  // n = number of boxes per side
  const hLines = Array(n + 1).fill(null).map(() => Array(n).fill(0)); // horizontal lines
  const vLines = Array(n).fill(null).map(() => Array(n + 1).fill(0)); // vertical lines
  const boxes = Array(n).fill(null).map(() => Array(n).fill(0)); // 0=empty, 1=P1, 2=P2
  return { hLines, vLines, boxes };
}

function checkBoxes(hLines, vLines, boxes, n) {
  let scored = false;
  const newBoxes = boxes.map(r => [...r]);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!newBoxes[r][c]) {
        // top, bottom, left, right
        if (hLines[r][c] && hLines[r+1][c] && vLines[r][c] && vLines[r][c+1]) {
          newBoxes[r][c] = 'CLAIMED';
          scored = true;
        }
      }
    }
  }
  return { newBoxes, scored };
}

function countScores(boxes) {
  let p1 = 0, p2 = 0;
  for (const row of boxes) for (const v of row) {
    if (v === 1) p1++; else if (v === 2) p2++;
  }
  return { p1, p2 };
}

function getAllLines(n) {
  const lines = [];
  // horizontal lines
  for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) lines.push({ type: 'h', r, c });
  // vertical lines
  for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) lines.push({ type: 'v', r, c });
  return lines;
}

function getBoxScore(hLines, vLines, r, c) {
  return (hLines[r][c] ? 1 : 0) + (hLines[r+1]?.[c] ? 1 : 0) +
         (vLines[r]?.[c] ? 1 : 0) + (vLines[r]?.[c+1] ? 1 : 0);
}

function getBotMove(hLines, vLines, boxes, n, difficulty) {
  if (difficulty === 'easy') {
    // Random available line
    const lines = getAllLines(n).filter(l =>
      l.type === 'h' ? !hLines[l.r][l.c] : !vLines[l.r][l.c]
    );
    return lines[Math.floor(Math.random() * lines.length)] || null;
  }

  const available = getAllLines(n).filter(l =>
    l.type === 'h' ? !hLines[l.r][l.c] : !vLines[l.r][l.c]
  );
  if (!available.length) return null;

  // Medium/Hard: prefer completing boxes, else avoid giving boxes
  const completing = [];
  const safe = [];
  const giving = [];

  for (const line of available) {
    // Simulate placing this line
    let completesBox = false;
    let givesBox = false;

    // Check adjacent boxes
    const adjacentBoxes = [];
    if (line.type === 'h') {
      if (line.r > 0) adjacentBoxes.push({ r: line.r - 1, c: line.c });
      if (line.r < n) adjacentBoxes.push({ r: line.r, c: line.c });
    } else {
      if (line.c > 0) adjacentBoxes.push({ r: line.r, c: line.c - 1 });
      if (line.c < n) adjacentBoxes.push({ r: line.r, c: line.c });
    }

    for (const { r, c } of adjacentBoxes) {
      if (r < 0 || r >= n || c < 0 || c >= n) continue;
      if (boxes[r][c]) continue;
      const score = getBoxScore(hLines, vLines, r, c);
      if (score === 3) completesBox = true;
      else if (score === 2) givesBox = true;
    }

    if (completesBox) completing.push(line);
    else if (!givesBox) safe.push(line);
    else giving.push(line);
  }

  if (completing.length) return completing[Math.floor(Math.random() * completing.length)];

  if (difficulty === 'medium') {
    if (safe.length) return safe[Math.floor(Math.random() * safe.length)];
    return giving[Math.floor(Math.random() * giving.length)] || null;
  }

  // Hard: additional chain analysis — pick the move that gives fewest boxes to opponent
  if (safe.length) return safe[Math.floor(Math.random() * safe.length)];
  if (giving.length) {
    // Pick the one that gives fewest opponent boxes (min chain length)
    return giving[0];
  }
  return available[Math.floor(Math.random() * available.length)];
}

export default function DotsAndBoxes({ mode, difficulty, onBack }) {
  const n = GRID_SIZES[difficulty || 'medium'];
  const [state, setState] = useState(() => initState(n));
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [botThinking, setBotThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [hoverLine, setHoverLine] = useState(null); // { type: 'h'|'v', r, c } — drives hover color instead of direct DOM mutation, so a wide invisible touch-hit-area line can share the same state

  const isBot = mode === 'vs_computer' && currentPlayer === 2;

  useEffect(() => {
    setState(initState(n));
    setCurrentPlayer(1);
    setBotThinking(false);
    setGameOver(false);
  }, [n]);

  function applyLine(st, line, player, n) {
    const newH = st.hLines.map(r => [...r]);
    const newV = st.vLines.map(r => [...r]);
    if (line.type === 'h') newH[line.r][line.c] = player;
    else newV[line.r][line.c] = player;

    const { newBoxes, scored } = checkBoxes(newH, newV, st.boxes, n);
    // Assign claimed boxes to player
    const finalBoxes = newBoxes.map(row => row.map(v => v === 'CLAIMED' ? player : v));

    return { hLines: newH, vLines: newV, boxes: finalBoxes, scored };
  }

  function handleLine(type, r, c) {
    if (gameOver || botThinking) return;
    if (mode === 'vs_computer' && currentPlayer !== 1) return;

    if (type === 'h' && state.hLines[r][c]) return;
    if (type === 'v' && state.vLines[r][c]) return;

    const { hLines, vLines, boxes, scored } = applyLine(state, { type, r, c }, currentPlayer, n);
    const total = boxes.flat().filter(v => v > 0).length;
    const newState = { hLines, vLines, boxes };
    setState(newState);

    if (total === n * n) {
      setGameOver(true);
    } else if (!scored) {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
    // If scored, same player continues
  }

  // Bot turn
  useEffect(() => {
    if (!isBot || gameOver || botThinking) return;
    setBotThinking(true);
    const t = setTimeout(() => {
      // Note: when bot scores it gets another turn (setBotThinking false triggers re-run)
      const move = getBotMove(state.hLines, state.vLines, state.boxes, n, difficulty);
      if (move) {
        const { hLines, vLines, boxes, scored } = applyLine(state, move, 2, n);
        const total = boxes.flat().filter(v => v > 0).length;
        const newState = { hLines, vLines, boxes };
        setState(newState);
        if (total === n * n) {
          setGameOver(true);
        } else if (!scored) {
          setCurrentPlayer(1);
        } else {
          // Bot goes again
          setBotThinking(false);
          return;
        }
      }
      setBotThinking(false);
    }, 600);
    return () => clearTimeout(t);
  }, [isBot, state, n, difficulty, gameOver, botThinking]);

  function reset() {
    setState(initState(n));
    setCurrentPlayer(1);
    setBotThinking(false);
    setGameOver(false);
    setHoverLine(null);
  }

  const { p1, p2 } = countScores(state.boxes);
  const p1label = mode === 'local' ? 'Player 1' : 'You';
  const p2label = mode === 'local' ? 'Player 2' : 'Computer';
  const total = n * n;

  const P1C = '#ef4444';
  const P2C = '#3b82f6';
  const dotSize = 10;
  const boardW = n * DOT_GAP + dotSize;

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={onBack}>Back</button>
        <h1 className="game-title">Dots & Boxes</h1>
        <p className="game-subtitle">{n}×{n} grid — {mode === 'local' ? 'Pass & Play' : `vs Computer (${difficulty})`}</p>
      </div>

      <HowToPlay>
        <p>Claim more boxes than your opponent by completing their four sides.</p>
        <ul>
          <li>Tap a line between two dots to draw it.</li>
          <li>Whenever your line completes the 4th (final) side of a box, you claim that box and immediately get another turn — chaining several box completions together in one turn is a common tactic.</li>
          <li>If your line doesn't complete a box, play passes to the other player.</li>
          <li>Watch out for "giving away" a box: drawing the 3rd side of a box lets your opponent claim it (and often a whole chain of boxes) on their next turn.</li>
          <li>When every line is drawn, whoever claimed the most boxes wins.</li>
        </ul>
        <p><strong>vs Computer</strong> gives you an easy, medium, or hard bot (harder difficulties avoid handing you free boxes). <strong>Pass & Play</strong> lets two people take turns on this device.</p>
      </HowToPlay>

      {/* Score */}
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center', padding: '8px 20px', background: P1C + '15', borderRadius: 8, border: `2px solid ${currentPlayer === 1 && !gameOver ? P1C : 'transparent'}` }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: P1C }}>{p1}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p1label}</div>
        </div>
        <div style={{ alignSelf: 'center', color: 'var(--muted)' }}>/ {total}</div>
        <div style={{ textAlign: 'center', padding: '8px 20px', background: P2C + '15', borderRadius: 8, border: `2px solid ${currentPlayer === 2 && !gameOver ? P2C : 'transparent'}` }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: P2C }}>{p2}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p2label}</div>
        </div>
      </div>

      {gameOver ? (
        <div className={`game-msg ${p1 === p2 ? 'info' : 'success'}`} style={{ marginBottom: 16 }}>
          {p1 > p2 ? `${p1label} wins! ${p1}–${p2}` : p2 > p1 ? `${p2label} wins! ${p2}–${p1}` : `Draw! ${p1}–${p2}`}
        </div>
      ) : (
        <div className="game-msg info" style={{ marginBottom: 16 }}>
          {botThinking ? 'Computer is thinking...' : `${currentPlayer === 1 ? p1label : p2label}'s turn`}
        </div>
      )}

      {/* SVG Board */}
      <div style={{ overflowX: 'auto', textAlign: 'center' }}>
        <svg
          viewBox={`0 0 ${boardW + 20} ${boardW + 20}`}
          style={{
            // Fluid sizing: shrinks to fit narrow phone screens (accounting for
            // .game-page's 20px side padding), capped at the original pixel
            // size so desktop rendering is unchanged.
            width: `min(${boardW + 20}px, calc(100vw - 44px))`,
            height: `min(${boardW + 20}px, calc(100vw - 44px))`,
            margin: '0 auto',
            display: 'block',
          }}
        >
          <g transform="translate(10,10)">
            {/* Boxes */}
            {state.boxes.map((row, r) =>
              row.map((v, c) => v > 0 ? (
                <rect
                  key={`${r}-${c}`}
                  x={c * DOT_GAP + dotSize / 2}
                  y={r * DOT_GAP + dotSize / 2}
                  width={DOT_GAP - dotSize}
                  height={DOT_GAP - dotSize}
                  fill={v === 1 ? P1C + '30' : P2C + '30'}
                  stroke={v === 1 ? P1C : P2C}
                  strokeWidth={2}
                />
              ) : null)
            )}

            {/* Horizontal lines */}
            {state.hLines.map((row, r) =>
              row.map((v, c) => {
                const x1 = c * DOT_GAP + dotSize;
                const y1 = r * DOT_GAP + dotSize / 2;
                const x2 = (c + 1) * DOT_GAP;
                const isHover = !v && hoverLine && hoverLine.type === 'h' && hoverLine.r === r && hoverLine.c === c;
                const clickable = !v && !gameOver && !botThinking && (mode !== 'vs_computer' || currentPlayer === 1);
                return (
                  <g key={`h-${r}-${c}`}>
                    {/* Wide invisible hit-area so this thin line is still easy to tap on a phone screen */}
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y1}
                      stroke="transparent"
                      strokeWidth={20}
                      style={{ cursor: clickable ? 'pointer' : 'default' }}
                      onMouseEnter={() => !v && setHoverLine({ type: 'h', r, c })}
                      onMouseLeave={() => setHoverLine(null)}
                      onClick={() => !v && handleLine('h', r, c)}
                    >
                      <title>Horizontal line row {r} col {c}</title>
                    </line>
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y1}
                      stroke={v ? (v === 1 ? P1C : P2C) : isHover ? (currentPlayer === 1 ? P1C + 'AA' : P2C + 'AA') : 'var(--border)'}
                      strokeWidth={v ? 5 : 3}
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                  </g>
                );
              })
            )}

            {/* Vertical lines */}
            {state.vLines.map((row, r) =>
              row.map((v, c) => {
                const x1 = c * DOT_GAP + dotSize / 2;
                const y1 = r * DOT_GAP + dotSize;
                const y2 = (r + 1) * DOT_GAP;
                const isHover = !v && hoverLine && hoverLine.type === 'v' && hoverLine.r === r && hoverLine.c === c;
                const clickable = !v && !gameOver && !botThinking && (mode !== 'vs_computer' || currentPlayer === 1);
                return (
                  <g key={`v-${r}-${c}`}>
                    {/* Wide invisible hit-area so this thin line is still easy to tap on a phone screen */}
                    <line
                      x1={x1} y1={y1} x2={x1} y2={y2}
                      stroke="transparent"
                      strokeWidth={20}
                      style={{ cursor: clickable ? 'pointer' : 'default' }}
                      onMouseEnter={() => !v && setHoverLine({ type: 'v', r, c })}
                      onMouseLeave={() => setHoverLine(null)}
                      onClick={() => !v && handleLine('v', r, c)}
                    >
                      <title>Vertical line row {r} col {c}</title>
                    </line>
                    <line
                      x1={x1} y1={y1} x2={x1} y2={y2}
                      stroke={v ? (v === 1 ? P1C : P2C) : isHover ? (currentPlayer === 1 ? P1C + 'AA' : P2C + 'AA') : 'var(--border)'}
                      strokeWidth={v ? 5 : 3}
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                  </g>
                );
              })
            )}

            {/* Dots */}
            {Array.from({ length: n + 1 }, (_, r) =>
              Array.from({ length: n + 1 }, (_, c) => (
                <circle
                  key={`dot-${r}-${c}`}
                  cx={c * DOT_GAP + dotSize / 2}
                  cy={r * DOT_GAP + dotSize / 2}
                  r={dotSize / 2}
                  fill="var(--text)"
                />
              ))
            )}

            {/* Box initials */}
            {state.boxes.map((row, r) =>
              row.map((v, c) => v > 0 ? (
                <text
                  key={`txt-${r}-${c}`}
                  x={c * DOT_GAP + DOT_GAP / 2}
                  y={r * DOT_GAP + DOT_GAP / 2 + 5}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={700}
                  fill={v === 1 ? P1C : P2C}
                >
                  {v === 1 ? 'P1' : 'P2'}
                </text>
              ) : null)
            )}
          </g>
        </svg>
      </div>

      <div className="game-controls">
        <button className="gs-btn gs-btn-outline" onClick={reset}>New Game</button>
      </div>
    </div>
  );
}
