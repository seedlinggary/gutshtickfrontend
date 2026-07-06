import React, { useState, useEffect } from 'react';

// Board: 8x8. 1=red, 2=black, 3=red king, 4=black king
const EMPTY = 0, RED = 1, BLACK = 2, RED_KING = 3, BLACK_KING = 4;
const RED_DIR = [[-1, -1], [-1, 1]];
const BLACK_DIR = [[1, -1], [1, 1]];
const KING_DIR = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

function isRed(v) { return v === RED || v === RED_KING; }
function isBlack(v) { return v === BLACK || v === BLACK_KING; }
function isKing(v) { return v === RED_KING || v === BLACK_KING; }
function ownPiece(cell, player) { return player === 1 ? isRed(cell) : isBlack(cell); }
function oppPiece(cell, player) { return player === 1 ? isBlack(cell) : isRed(cell); }

function initBoard() {
  const b = Array(8).fill(null).map(() => Array(8).fill(0));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = BLACK;
  for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = RED;
  return b;
}

function getDirs(piece) {
  if (isKing(piece)) return KING_DIR;
  return piece === RED ? RED_DIR : BLACK_DIR;
}

function getJumps(board, r, c, player) {
  const piece = board[r][c];
  if (!piece) return [];
  const dirs = getDirs(piece);
  const jumps = [];
  for (const [dr, dc] of dirs) {
    const mr = r + dr, mc = c + dc;
    const lr = r + 2 * dr, lc = c + 2 * dc;
    if (lr < 0 || lr >= 8 || lc < 0 || lc >= 8) continue;
    if (oppPiece(board[mr]?.[mc], player) && board[lr][lc] === EMPTY) {
      jumps.push({ from: [r, c], to: [lr, lc], captured: [mr, mc] });
    }
  }
  return jumps;
}

function getMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const dirs = getDirs(piece);
  const moves = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === EMPTY) {
      moves.push({ from: [r, c], to: [nr, nc], captured: null });
    }
  }
  return moves;
}

function getAllMoves(board, player) {
  const jumps = [], moves = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (ownPiece(board[r][c], player)) {
      jumps.push(...getJumps(board, r, c, player));
      moves.push(...getMoves(board, r, c));
    }
  }
  return jumps.length > 0 ? jumps : moves;
}

function applyMove(board, move) {
  const nb = board.map(row => [...row]);
  const [fr, fc] = move.from, [tr, tc] = move.to;
  nb[tr][tc] = nb[fr][fc];
  nb[fr][fc] = EMPTY;
  if (move.captured) nb[move.captured[0]][move.captured[1]] = EMPTY;
  if (nb[tr][tc] === RED && tr === 0) nb[tr][tc] = RED_KING;
  if (nb[tr][tc] === BLACK && tr === 7) nb[tr][tc] = BLACK_KING;
  return nb;
}

function scoreBoard(board, player) {
  let s = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const v = board[r][c];
    if (ownPiece(v, player)) s += isKing(v) ? 5 : 3;
    else if (oppPiece(v, player)) s -= isKing(v) ? 5 : 3;
  }
  return s;
}

function minimax(board, depth, alpha, beta, isMax, player) {
  const mover = isMax ? player : (player === 1 ? 2 : 1);
  const moves = getAllMoves(board, mover);
  if (depth === 0 || !moves.length) return scoreBoard(board, player);
  if (isMax) {
    let best = -Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m);
      best = Math.max(best, minimax(nb, depth - 1, alpha, beta, false, player));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m);
      best = Math.min(best, minimax(nb, depth - 1, alpha, beta, true, player));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBotMove(board, difficulty) {
  const moves = getAllMoves(board, 2);
  if (!moves.length) return null;
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
  const depth = difficulty === 'medium' ? 4 : 8;
  let best = -Infinity, bestMove = moves[0];
  const shuffled = [...moves].sort(() => Math.random() - 0.5);
  for (const m of shuffled) {
    const nb = applyMove(board, m);
    const score = minimax(nb, depth - 1, -Infinity, Infinity, false, 2);
    if (score > best) { best = score; bestMove = m; }
  }
  return bestMove;
}

export default function Checkers({ mode, difficulty, onBack }) {
  const [board, setBoard] = useState(initBoard());
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [mustJumpFrom, setMustJumpFrom] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [botThinking, setBotThinking] = useState(false);

  const isBot = mode === 'vs_computer' && currentPlayer === 2;

  useEffect(() => {
    if (!isBot || gameResult || botThinking) return;
    const allMoves = getAllMoves(board, 2);
    if (!allMoves.length) { setGameResult({ winner: 1 }); return; }
    setBotThinking(true);
    const t = setTimeout(() => {
      const move = getBotMove(board, difficulty);
      if (move) {
        let nb = applyMove(board, move);
        if (move.captured) {
          let pos = move.to, mj = getJumps(nb, pos[0], pos[1], 2);
          while (mj.length > 0) {
            const cont = mj[Math.floor(Math.random() * mj.length)];
            nb = applyMove(nb, cont); pos = cont.to;
            mj = getJumps(nb, pos[0], pos[1], 2);
          }
        }
        setBoard(nb);
        const allP1 = getAllMoves(nb, 1);
        if (!allP1.length) setGameResult({ winner: 2 });
        else setCurrentPlayer(1);
        setSelected(null); setValidMoves([]); setMustJumpFrom(null);
      }
      setBotThinking(false);
    }, 600);
    return () => clearTimeout(t);
  }, [isBot, board, difficulty, gameResult, botThinking]);

  function handleCellClick(r, c) {
    if (gameResult || botThinking) return;
    if (mode === 'vs_computer' && currentPlayer !== 1) return;
    const cell = board[r][c];

    if (selected) {
      const dest = validMoves.find(m => m.to[0] === r && m.to[1] === c);
      if (dest) {
        const nb = applyMove(board, dest);
        if (dest.captured) {
          const mj = getJumps(nb, r, c, currentPlayer);
          if (mj.length > 0) {
            setBoard(nb); setSelected([r, c]); setValidMoves(mj); setMustJumpFrom([r, c]);
            return;
          }
        }
        setBoard(nb); setSelected(null); setValidMoves([]); setMustJumpFrom(null);
        const nextP = currentPlayer === 1 ? 2 : 1;
        if (!getAllMoves(nb, nextP).length) setGameResult({ winner: currentPlayer });
        else setCurrentPlayer(nextP);
        return;
      }
      if (ownPiece(cell, currentPlayer) && !mustJumpFrom) {
        const jumps = getJumps(board, r, c, currentPlayer);
        const allJumps = getAllMoves(board, currentPlayer).filter(m => m.captured);
        if (allJumps.length > 0 && jumps.length === 0) return;
        const ms = jumps.length > 0 ? jumps : getMoves(board, r, c);
        setSelected([r, c]); setValidMoves(ms); return;
      }
      if (mustJumpFrom) return; // must continue jumping with the same piece; ignore stray clicks
      setSelected(null); setValidMoves([]); return;
    }

    if (ownPiece(cell, currentPlayer)) {
      if (mustJumpFrom) return;
      const jumps = getJumps(board, r, c, currentPlayer);
      const allJumps = getAllMoves(board, currentPlayer).filter(m => m.captured);
      if (allJumps.length > 0 && jumps.length === 0) return;
      const ms = jumps.length > 0 ? jumps : getMoves(board, r, c);
      setSelected([r, c]); setValidMoves(ms);
    }
  }

  function reset() {
    setBoard(initBoard()); setCurrentPlayer(1); setSelected(null);
    setValidMoves([]); setMustJumpFrom(null); setGameResult(null); setBotThinking(false);
  }

  const p1label = mode === 'local' ? 'Player 1' : 'You';
  const p2label = mode === 'local' ? 'Player 2' : 'Computer';
  const validDestSet = new Set(validMoves.map(m => `${m.to[0]},${m.to[1]}`));

  // Fluid sizing: shrinks to fit narrow phones, clamps at the original
  // fixed sizes (60/46/16/22) once the viewport is wide enough that the
  // 486px board never had a problem to begin with — desktop is unchanged.
  const CELL_SIZE = 'clamp(30px, 9vw, 60px)';
  const DISC_SIZE = 'clamp(23px, 6.9vw, 46px)';
  const HINT_DOT = 'clamp(8px, 2.4vw, 16px)';
  const KING_FONT = 'clamp(11px, 3.3vw, 22px)';

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={onBack}>Back</button>
        <h1 className="game-title">Checkers</h1>
        <p className="game-subtitle">{mode === 'local' ? 'Pass & Play' : `vs Computer (${difficulty})`}</p>
      </div>

      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
          {p1label} (Red)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#1e293b', display: 'inline-block' }} />
          {p2label} (Black)
        </span>
      </div>

      {gameResult ? (
        <div className="game-msg success" style={{ marginBottom: 16 }}>
          {gameResult.winner === 1 ? `${p1label} wins!` : `${p2label} wins!`}
        </div>
      ) : (
        <div className="game-msg info" style={{ marginBottom: 16 }}>
          {botThinking ? 'Computer is thinking...' : `${currentPlayer === 1 ? p1label : p2label}'s turn`}
          {mustJumpFrom && ' — must continue jumping!'}
        </div>
      )}

      <div style={{ overflowX: 'auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(8, ${CELL_SIZE})`, border: '3px solid #334155', borderRadius: 6 }}>
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSel = selected && selected[0] === r && selected[1] === c;
              const isVD = validDestSet.has(`${r},${c}`);
              const bg = isSel ? '#fbbf24' : isDark ? '#334155' : '#f8fafc';
              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  style={{
                    width: CELL_SIZE, height: CELL_SIZE, background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: (isDark && (ownPiece(cell, currentPlayer) || isVD)) ? 'pointer' : 'default',
                    transition: 'background 100ms',
                  }}
                >
                  {isVD && cell === EMPTY && (
                    <div style={{ width: HINT_DOT, height: HINT_DOT, borderRadius: '50%', background: 'rgba(34,197,94,0.6)', border: '2px solid #22c55e' }} />
                  )}
                  {cell !== EMPTY && (
                    <div style={{
                      width: DISC_SIZE, height: DISC_SIZE, borderRadius: '50%',
                      background: isRed(cell) ? '#ef4444' : '#1e293b',
                      border: `3px solid ${isRed(cell) ? '#dc2626' : '#475569'}`,
                      boxShadow: 'inset 0 3px 6px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: KING_FONT,
                    }}>
                      {isKing(cell) && <span style={{ color: 'gold', lineHeight: 1 }}>♛</span>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="game-controls">
        <button className="gs-btn gs-btn-outline" onClick={reset}>New Game</button>
      </div>
      <div style={{ marginTop: 16, padding: '10px 16px', background: 'var(--bg)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', maxWidth: 500, margin: '16px auto 0' }}>
        <strong>Rules:</strong> Click piece then a dot to move. Jumps are mandatory. Kings (♛) move in all directions.
      </div>
    </div>
  );
}
