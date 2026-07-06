import React, { useState, useEffect } from 'react';

const ROWS = 6, COLS = 7;

function emptyBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

function dropPiece(board, col, player) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) {
      const nb = board.map(row => [...row]);
      nb[r][col] = player;
      return { board: nb, row: r };
    }
  }
  return null;
}

function checkFour(board) {
  // Returns { winner, cells } or null
  const check = (cells) => {
    const vals = cells.map(([r, c]) => board[r]?.[c]);
    if (vals.every(v => v && v === vals[0])) return { winner: vals[0], cells };
    return null;
  };

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Horizontal
      if (c + 3 < COLS) {
        const res = check([[r,c],[r,c+1],[r,c+2],[r,c+3]]);
        if (res) return res;
      }
      // Vertical
      if (r + 3 < ROWS) {
        const res = check([[r,c],[r+1,c],[r+2,c],[r+3,c]]);
        if (res) return res;
      }
      // Diag down-right
      if (r + 3 < ROWS && c + 3 < COLS) {
        const res = check([[r,c],[r+1,c+1],[r+2,c+2],[r+3,c+3]]);
        if (res) return res;
      }
      // Diag down-left
      if (r + 3 < ROWS && c - 3 >= 0) {
        const res = check([[r,c],[r+1,c-1],[r+2,c-2],[r+3,c-3]]);
        if (res) return res;
      }
    }
  }
  if (board[0].every(c => c !== 0)) return { winner: 0, cells: [] }; // draw
  return null;
}

function scoreBoard(board, player) {
  let score = 0;
  const opp = player === 1 ? 2 : 1;

  function scoreWindow(window) {
    const p = window.filter(v => v === player).length;
    const e = window.filter(v => v === 0).length;
    const o = window.filter(v => v === opp).length;
    if (p === 4) return 100;
    if (p === 3 && e === 1) return 5;
    if (p === 2 && e === 2) return 2;
    if (o === 3 && e === 1) return -4;
    return 0;
  }

  // Center column preference
  const centerCol = board.map(r => r[3]);
  score += centerCol.filter(v => v === player).length * 3;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 3 < COLS) score += scoreWindow([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]]);
      if (r + 3 < ROWS) score += scoreWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]]);
      if (r + 3 < ROWS && c + 3 < COLS) score += scoreWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]]);
      if (r + 3 < ROWS && c - 3 >= 0) score += scoreWindow([board[r][c], board[r+1][c-1], board[r+2][c-2], board[r+3][c-3]]);
    }
  }
  return score;
}

function getValidCols(board) {
  return Array.from({ length: COLS }, (_, c) => c).filter(c => board[0][c] === 0);
}

function minimax(board, depth, alpha, beta, isMax, botPlayer) {
  const result = checkFour(board);
  if (result) {
    if (result.winner === botPlayer) return 10000 + depth;
    if (result.winner !== 0) return -10000 - depth;
    return 0;
  }
  if (depth === 0) return scoreBoard(board, botPlayer);

  const valid = getValidCols(board);
  if (!valid.length) return 0;

  if (isMax) {
    let best = -Infinity;
    for (const c of valid) {
      const res = dropPiece(board, c, botPlayer);
      if (!res) continue;
      best = Math.max(best, minimax(res.board, depth - 1, alpha, beta, false, botPlayer));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    const opp = botPlayer === 1 ? 2 : 1;
    let best = Infinity;
    for (const c of valid) {
      const res = dropPiece(board, c, opp);
      if (!res) continue;
      best = Math.min(best, minimax(res.board, depth - 1, alpha, beta, true, botPlayer));
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

function getBotMove(board, difficulty) {
  const valid = getValidCols(board);
  if (!valid.length) return -1;
  if (difficulty === 'easy') return valid[Math.floor(Math.random() * valid.length)];
  const depth = difficulty === 'medium' ? 3 : 7;
  let best = -Infinity, bestCol = valid[0];
  // Shuffle for variety
  const shuffled = [...valid].sort(() => Math.random() - 0.5);
  for (const c of shuffled) {
    const res = dropPiece(board, c, 2);
    if (!res) continue;
    const score = minimax(res.board, depth - 1, -Infinity, Infinity, false, 2);
    if (score > best) { best = score; bestCol = c; }
  }
  return bestCol;
}

const P1_COLOR = '#ef4444'; // red
const P2_COLOR = '#3b82f6'; // blue

export default function ConnectFour({ mode, difficulty, onBack }) {
  const [board, setBoard] = useState(emptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [result, setResult] = useState(null);
  const [hoverCol, setHoverCol] = useState(null);
  const [botThinking, setBotThinking] = useState(false);
  const [winCells, setWinCells] = useState([]);

  const isBot = mode === 'vs_computer' && currentPlayer === 2;

  useEffect(() => {
    if (!isBot || result || botThinking) return;
    setBotThinking(true);
    const t = setTimeout(() => {
      const move = getBotMove(board, difficulty);
      if (move >= 0) {
        const res = dropPiece(board, move, 2);
        if (res) {
          setBoard(res.board);
          const r = checkFour(res.board);
          if (r) {
            setResult(r);
            setWinCells(r.cells.map(([row, col]) => `${row}-${col}`));
          } else {
            setCurrentPlayer(1);
          }
        }
      }
      setBotThinking(false);
    }, 700);
    return () => clearTimeout(t);
  }, [isBot, board, difficulty, result, botThinking]);

  function handleColumnClick(col) {
    if (result || botThinking) return;
    if (mode === 'vs_computer' && currentPlayer !== 1) return;
    const res = dropPiece(board, col, currentPlayer);
    if (!res) return;
    setBoard(res.board);
    const r = checkFour(res.board);
    if (r) {
      setResult(r);
      setWinCells(r.cells.map(([row, col]) => `${row}-${col}`));
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  }

  function reset() {
    setBoard(emptyBoard());
    setCurrentPlayer(1);
    setResult(null);
    setWinCells([]);
    setBotThinking(false);
  }

  const p1label = mode === 'local' ? 'Player 1' : 'You';
  const p2label = mode === 'local' ? 'Player 2' : 'Computer';

  // Fluid sizing: shrinks to fit narrow phones, clamps at the original fixed
  // sizes once the viewport is wide enough that the 428px board never had a
  // problem to begin with — desktop is unchanged.
  const CELL_SIZE = 'clamp(30px, 9vw, 52px)';
  const BOARD_GAP = 'clamp(4px, 1.2vw, 8px)';
  const BOARD_PAD = 'clamp(4px, 1.2vw, 8px)';

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={onBack}>Back</button>
        <h1 className="game-title">Connect Four</h1>
        <p className="game-subtitle">{mode === 'local' ? 'Pass & Play' : `vs Computer (${difficulty})`}</p>
      </div>

      {/* Status */}
      {result ? (
        <div className={`game-msg ${result.winner === 0 ? 'info' : 'success'}`}>
          {result.winner === 0 ? "It's a draw!" : result.winner === 1 ? `${p1label} wins!` : `${p2label} wins!`}
        </div>
      ) : (
        <div className="game-msg info">
          {botThinking ? 'Computer is thinking...' : (
            <>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: currentPlayer === 1 ? P1_COLOR : P2_COLOR, display: 'inline-block', marginRight: 8 }} />
              {currentPlayer === 1 ? `${p1label}'s turn` : `${p2label}'s turn`}
            </>
          )}
        </div>
      )}

      {/* Board */}
      <div style={{ overflowX: 'auto', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-grid',
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gap: 0,
            marginBottom: 4,
          }}
        >
          {/* Column click targets with hover arrows */}
          {Array.from({ length: COLS }, (_, c) => (
            <button
              key={c}
              onClick={() => handleColumnClick(c)}
              onMouseEnter={() => setHoverCol(c)}
              onMouseLeave={() => setHoverCol(null)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 0',
                cursor: result || botThinking ? 'default' : 'pointer',
                fontSize: 18,
                color: currentPlayer === 1 ? P1_COLOR : P2_COLOR,
                opacity: hoverCol === c && !result && !botThinking ? 1 : 0,
                transition: 'opacity 150ms',
              }}
            >
              ▼
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'inline-block',
            background: '#1e40af',
            borderRadius: 12,
            padding: BOARD_PAD,
          }}
        >
          {board.map((row, r) => (
            <div key={r} style={{ display: 'flex', gap: BOARD_GAP, marginBottom: r < ROWS - 1 ? BOARD_GAP : 0 }}>
              {row.map((cell, c) => {
                const key = `${r}-${c}`;
                const isWin = winCells.includes(key);
                const isHover = hoverCol === c && !cell && !result;
                return (
                  <div
                    key={c}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: '50%',
                      background: cell === 1 ? P1_COLOR : cell === 2 ? P2_COLOR : (isHover ? (currentPlayer === 1 ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.25)') : 'rgba(255,255,255,0.15)'),
                      border: isWin ? '3px solid #fbbf24' : '3px solid transparent',
                      transition: 'background 150ms',
                      boxShadow: isWin ? '0 0 12px #fbbf24' : 'none',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 12, fontSize: 13, color: 'var(--muted)', flexWrap: 'wrap' }}>
        <span><span style={{ color: P1_COLOR, fontWeight: 700 }}>●</span> {p1label}</span>
        <span><span style={{ color: P2_COLOR, fontWeight: 700 }}>●</span> {p2label}</span>
      </div>

      <div className="game-controls">
        <button className="gs-btn gs-btn-outline" onClick={reset}>New Game</button>
      </div>
    </div>
  );
}
