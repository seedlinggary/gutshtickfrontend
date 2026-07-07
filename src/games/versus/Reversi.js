import React, { useState, useEffect } from 'react';
import HowToPlay from '../HowToPlay';

const SIZE = 8;
const DIRECTIONS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const CORNERS = [[0,0],[0,7],[7,0],[7,7]];
const CORNER_KEYS = new Set(CORNERS.map(([r,c]) => `${r},${c}`));

function emptyBoard() {
  const b = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
  b[3][3] = 2; b[3][4] = 1; b[4][3] = 1; b[4][4] = 2;
  return b;
}

function getFlips(board, r, c, player) {
  if (board[r][c] !== 0) return [];
  const opp = player === 1 ? 2 : 1;
  const allFlips = [];
  for (const [dr, dc] of DIRECTIONS) {
    const line = [];
    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === opp) {
      line.push([nr, nc]);
      nr += dr; nc += dc;
    }
    if (line.length && nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) {
      allFlips.push(...line);
    }
  }
  return allFlips;
}

function getValidMoves(board, player) {
  const moves = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0 && getFlips(board, r, c, player).length > 0) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

function applyMove(board, r, c, player) {
  const flips = getFlips(board, r, c, player);
  if (!flips.length) return null;
  const nb = board.map(row => [...row]);
  nb[r][c] = player;
  flips.forEach(([fr, fc]) => { nb[fr][fc] = player; });
  return nb;
}

function countPieces(board) {
  let p1 = 0, p2 = 0;
  for (const row of board) for (const v of row) { if (v === 1) p1++; else if (v === 2) p2++; }
  return { p1, p2 };
}

function heuristic(board, player) {
  const opp = player === 1 ? 2 : 1;
  const { p1, p2 } = countPieces(board);
  const myPieces = player === 1 ? p1 : p2;
  const oppPieces = player === 1 ? p2 : p1;

  // Mobility
  const myMoves = getValidMoves(board, player).length;
  const oppMoves = getValidMoves(board, opp).length;
  const mobility = myMoves + oppMoves === 0 ? 0 : 100 * (myMoves - oppMoves) / (myMoves + oppMoves);

  // Corners
  let myCorners = 0, oppCorners = 0;
  for (const [r, c] of CORNERS) {
    if (board[r][c] === player) myCorners++;
    else if (board[r][c] === opp) oppCorners++;
  }
  const cornerScore = 25 * (myCorners - oppCorners);

  // Piece parity (less important early)
  const total = p1 + p2;
  const parity = total > 40 ? 10 * (myPieces - oppPieces) : 0;

  return mobility + cornerScore + parity;
}

function minimaxReversi(board, depth, alpha, beta, isMax, botPlayer) {
  const opp = botPlayer === 1 ? 2 : 1;
  const player = isMax ? botPlayer : opp;
  const moves = getValidMoves(board, player);

  if (depth === 0) return heuristic(board, botPlayer);

  if (moves.length === 0) {
    // Current player must pass — check if opponent can move
    const oppMoves = getValidMoves(board, player === 1 ? 2 : 1);
    if (oppMoves.length === 0) return heuristic(board, botPlayer); // game over
    // Pass turn to opponent
    return minimaxReversi(board, depth - 1, alpha, beta, !isMax, botPlayer);
  }

  if (isMax) {
    let best = -Infinity;
    for (const [r, c] of moves) {
      const nb = applyMove(board, r, c, player);
      if (!nb) continue;
      best = Math.max(best, minimaxReversi(nb, depth - 1, alpha, beta, false, botPlayer));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of moves) {
      const nb = applyMove(board, r, c, player);
      if (!nb) continue;
      best = Math.min(best, minimaxReversi(nb, depth - 1, alpha, beta, true, botPlayer));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBotMove(board, difficulty) {
  const moves = getValidMoves(board, 2);
  if (!moves.length) return null;
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
  const depth = difficulty === 'medium' ? 3 : 5;
  let best = -Infinity, bestMove = moves[0];
  for (const [r, c] of moves) {
    const nb = applyMove(board, r, c, 2);
    if (!nb) continue;
    const score = minimaxReversi(nb, depth - 1, -Infinity, Infinity, false, 2);
    if (score > best) { best = score; bestMove = [r, c]; }
  }
  return bestMove;
}

export default function Reversi({ mode, difficulty, onBack }) {
  const [board, setBoard] = useState(emptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [validMoves, setValidMoves] = useState(() => getValidMoves(emptyBoard(), 1));
  const [botThinking, setBotThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const isBot = mode === 'vs_computer' && currentPlayer === 2;

  function updateValidMoves(b, player) {
    const moves = getValidMoves(b, player);
    setValidMoves(moves);
    return moves;
  }

  function advanceTurn(nb, nextPlayer) {
    const moves = getValidMoves(nb, nextPlayer);
    if (moves.length > 0) {
      setCurrentPlayer(nextPlayer);
      setValidMoves(moves);
      setSkipped(false);
    } else {
      // Skip turn
      const oppMoves = getValidMoves(nb, nextPlayer === 1 ? 2 : 1);
      if (oppMoves.length > 0) {
        setSkipped(true);
        setCurrentPlayer(nextPlayer === 1 ? 2 : 1);
        setValidMoves(oppMoves);
      } else {
        setGameOver(true);
        setValidMoves([]);
      }
    }
  }

  // Bot turn
  useEffect(() => {
    if (!isBot || gameOver || botThinking) return;
    if (!validMoves.length) return;
    setBotThinking(true);
    const t = setTimeout(() => {
      const move = getBotMove(board, difficulty);
      if (move) {
        const [r, c] = move;
        const nb = applyMove(board, r, c, 2);
        if (nb) {
          setBoard(nb);
          advanceTurn(nb, 1);
        }
      }
      setBotThinking(false);
    }, 600);
    return () => clearTimeout(t);
  }, [isBot, board, difficulty, gameOver, botThinking, validMoves]);

  function handleCellClick(r, c) {
    if (gameOver || botThinking) return;
    if (mode === 'vs_computer' && currentPlayer !== 1) return;
    const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c);
    if (!isValid) return;
    const nb = applyMove(board, r, c, currentPlayer);
    if (!nb) return;
    setBoard(nb);
    advanceTurn(nb, currentPlayer === 1 ? 2 : 1);
  }

  function reset() {
    const b = emptyBoard();
    setBoard(b);
    setCurrentPlayer(1);
    setValidMoves(getValidMoves(b, 1));
    setBotThinking(false);
    setGameOver(false);
    setSkipped(false);
  }

  const { p1, p2 } = countPieces(board);
  const validSet = new Set(validMoves.map(([r, c]) => `${r},${c}`));
  const p1label = mode === 'local' ? 'Player 1' : 'You';
  const p2label = mode === 'local' ? 'Player 2' : 'Computer';

  // Fluid sizing: shrinks to fit narrow phones, clamps at the original fixed
  // sizes once the viewport is wide enough that the 453px board never had a
  // problem to begin with — desktop is unchanged.
  const CELL_SIZE = 'clamp(30px, 9vw, 52px)';
  const BOARD_GAP = 'clamp(2px, 0.6vw, 3px)';
  const BOARD_PAD = 'clamp(4px, 1.2vw, 8px)';
  const DISC_SIZE = 'clamp(23px, 6.9vw, 40px)';
  const HINT_DOT = 'clamp(7px, 2.1vw, 12px)';

  let statusMsg = '';
  if (gameOver) {
    if (p1 > p2) statusMsg = `${p1label} wins! ${p1}–${p2}`;
    else if (p2 > p1) statusMsg = `${p2label} wins! ${p2}–${p1}`;
    else statusMsg = `Draw! ${p1}–${p2}`;
  } else if (skipped) {
    statusMsg = `No valid moves — turn skipped!`;
  } else if (botThinking) {
    statusMsg = 'Computer is thinking...';
  } else {
    statusMsg = `${currentPlayer === 1 ? p1label : p2label}'s turn`;
  }

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={onBack}>Back</button>
        <h1 className="game-title">Reversi</h1>
        <p className="game-subtitle">{mode === 'local' ? 'Pass & Play' : `vs Computer (${difficulty})`}</p>
      </div>

      <HowToPlay>
        <p>Finish with more discs of your color on the board than your opponent.</p>
        <ul>
          <li>Tap one of the highlighted cells to place a disc there — only cells that would flip at least one opponent line are valid moves and get highlighted.</li>
          <li>Placing a disc flips every opponent disc caught in a straight line (horizontal, vertical, or diagonal) between your new disc and another one of your discs already on the board — you must flip at least one line for a move to be legal.</li>
          <li>If you have no legal moves, your turn is automatically skipped and play passes to your opponent.</li>
          <li>The four corner cells are marked — discs there can never be flipped, making them especially valuable.</li>
          <li>The game ends when the board is full or neither player has a legal move; whoever has more discs on the board wins.</li>
        </ul>
        <p><strong>vs Computer</strong> gives you an easy, medium, or hard bot. <strong>Pass & Play</strong> lets two people take turns on this device.</p>
      </HowToPlay>

      {/* Score */}
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1e293b', border: '2px solid var(--border)', margin: '0 auto 4px' }} />
          <div style={{ fontSize: 22, fontWeight: 800 }}>{p1}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p1label}</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--muted)', alignSelf: 'center' }}>vs</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f8fafc', border: '2px solid #334155', margin: '0 auto 4px' }} />
          <div style={{ fontSize: 22, fontWeight: 800 }}>{p2}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p2label}</div>
        </div>
      </div>

      <div className={`game-msg ${gameOver ? (p1 === p2 ? 'info' : 'success') : 'info'}`}>{statusMsg}</div>

      {/* Board */}
      <div style={{ overflowX: 'auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-grid',
          gridTemplateColumns: `repeat(${SIZE}, ${CELL_SIZE})`,
          gap: BOARD_GAP,
          background: '#166534',
          padding: BOARD_PAD,
          borderRadius: 10,
        }}>
          {board.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r},${c}`;
              const isValid = validSet.has(key);
              const isCorner = CORNER_KEYS.has(key);
              return (
                <div
                  key={key}
                  onClick={() => handleCellClick(r, c)}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    background: '#15803d',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isValid && !botThinking ? 'pointer' : 'default',
                    border: isCorner ? '2px solid rgba(251,191,36,0.4)' : '1px solid rgba(0,0,0,0.2)',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { if (isValid) e.currentTarget.style.background = '#166534'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#15803d'; }}
                >
                  {cell !== 0 && (
                    <div style={{
                      width: DISC_SIZE,
                      height: DISC_SIZE,
                      borderRadius: '50%',
                      background: cell === 1 ? '#1e293b' : '#f8fafc',
                      border: cell === 1 ? '2px solid #475569' : '2px solid #334155',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                      transition: 'transform 200ms',
                    }} />
                  )}
                  {isValid && cell === 0 && (
                    <div style={{
                      width: HINT_DOT,
                      height: HINT_DOT,
                      borderRadius: '50%',
                      background: currentPlayer === 1 ? 'rgba(30,41,59,0.4)' : 'rgba(248,250,252,0.4)',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }} />
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
    </div>
  );
}
