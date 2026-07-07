import React, { useState, useEffect } from 'react';
import HowToPlay from '../HowToPlay';

// ── Piece constants ──────────────────────────────────────
const EMPTY = null;
const W = 'w', B = 'b';
const PAWN = 'P', ROOK = 'R', KNIGHT = 'N', BISHOP = 'B', QUEEN = 'Q', KING = 'K';

const SYMBOLS = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

// Piece-square tables (for white; flip for black)
const PST = {
  P: [
    [0,0,0,0,0,0,0,0],
    [50,50,50,50,50,50,50,50],
    [10,10,20,30,30,20,10,10],
    [5,5,10,25,25,10,5,5],
    [0,0,0,20,20,0,0,0],
    [5,-5,-10,0,0,-10,-5,5],
    [5,10,10,-20,-20,10,10,5],
    [0,0,0,0,0,0,0,0],
  ],
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,0,0,0,0,-20,-40],
    [-30,0,10,15,15,10,0,-30],
    [-30,5,15,20,20,15,5,-30],
    [-30,0,15,20,20,15,0,-30],
    [-30,5,10,15,15,10,5,-30],
    [-40,-20,0,5,5,0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,0,0,0,0,0,0,-10],
    [-10,0,5,10,10,5,0,-10],
    [-10,5,5,10,10,5,5,-10],
    [-10,0,10,10,10,10,0,-10],
    [-10,10,10,10,10,10,10,-10],
    [-10,5,0,0,0,0,5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  R: [
    [0,0,0,0,0,0,0,0],
    [5,10,10,10,10,10,10,5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [0,0,0,5,5,0,0,0],
  ],
  Q: [
    [-20,-10,-10,-5,-5,-10,-10,-20],
    [-10,0,0,0,0,0,0,-10],
    [-10,0,5,5,5,5,0,-10],
    [-5,0,5,5,5,5,0,-5],
    [0,0,5,5,5,5,0,-5],
    [-10,5,5,5,5,5,0,-10],
    [-10,0,5,0,0,0,0,-10],
    [-20,-10,-10,-5,-5,-10,-10,-20],
  ],
  K: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20,20,0,0,0,0,20,20],
    [20,30,10,0,0,10,30,20],
  ],
};

// ── Board initialization ──────────────────────────────────
function initBoard() {
  const b = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRank = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];
  backRank.forEach((p, c) => {
    b[0][c] = { color: B, type: p };
    b[7][c] = { color: W, type: p };
  });
  for (let c = 0; c < 8; c++) {
    b[1][c] = { color: B, type: PAWN };
    b[6][c] = { color: W, type: PAWN };
  }
  return b;
}

function initState() {
  return {
    board: initBoard(),
    turn: W,
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null, // [r, c] of capturable pawn
    halfMove: 0,
    moveHistory: [],
    captured: { w: [], b: [] },
  };
}

// ── Move Generation ───────────────────────────────────────
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function rawMoves(state, r, c) {
  const { board, enPassant, castling } = state;
  const piece = board[r][c];
  if (!piece) return [];
  const { color, type } = piece;
  const opp = color === W ? B : W;
  const moves = [];

  function addMove(tr, tc, special = null) {
    if (!inBounds(tr, tc)) return;
    const target = board[tr][tc];
    if (target && target.color === color) return;
    moves.push({ from: [r, c], to: [tr, tc], special });
  }

  function slide(dirs) {
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (target) {
          if (target.color !== color) moves.push({ from: [r, c], to: [nr, nc], special: null });
          break;
        }
        moves.push({ from: [r, c], to: [nr, nc], special: null });
        nr += dr; nc += dc;
      }
    }
  }

  if (type === PAWN) {
    const dir = color === W ? -1 : 1;
    const startRow = color === W ? 6 : 1;
    const promRow = color === W ? 0 : 7;
    // Forward
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      const isPromo = (r + dir) === promRow;
      moves.push({ from: [r, c], to: [r + dir, c], special: isPromo ? 'promo' : null });
      if (r === startRow && !board[r + 2 * dir][c]) {
        moves.push({ from: [r, c], to: [r + 2 * dir, c], special: 'double' });
      }
    }
    // Captures
    for (const dc of [-1, 1]) {
      const tr = r + dir, tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr][tc];
      if (target && target.color === opp) {
        const isPromo = tr === promRow;
        moves.push({ from: [r, c], to: [tr, tc], special: isPromo ? 'promo' : null });
      }
      // En passant
      if (enPassant && enPassant[0] === tr && enPassant[1] === tc) {
        moves.push({ from: [r, c], to: [tr, tc], special: 'enpassant' });
      }
    }
  } else if (type === KNIGHT) {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      addMove(r + dr, c + dc);
    }
  } else if (type === BISHOP) {
    slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  } else if (type === ROOK) {
    slide([[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (type === QUEEN) {
    slide([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]);
  } else if (type === KING) {
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      addMove(r + dr, c + dc);
    }
    // Castling
    const homeRow = color === W ? 7 : 0;
    if (r === homeRow) {
      const kRook = board[homeRow][7];
      const qRook = board[homeRow][0];
      if (castling[`${color}K`] && kRook && kRook.type === ROOK && kRook.color === color && !board[homeRow][5] && !board[homeRow][6]) {
        moves.push({ from: [r, c], to: [homeRow, 6], special: 'castle-K' });
      }
      if (castling[`${color}Q`] && qRook && qRook.type === ROOK && qRook.color === color && !board[homeRow][3] && !board[homeRow][2] && !board[homeRow][1]) {
        moves.push({ from: [r, c], to: [homeRow, 2], special: 'castle-Q' });
      }
    }
  }

  return moves;
}

function isInCheck(board, color) {
  // Find king
  let kr = -1, kc = -1;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (p && p.color === color && p.type === KING) { kr = r; kc = c; break; }
  }
  if (kr < 0) return false;
  const opp = color === W ? B : W;
  // Check if any opponent piece attacks the king
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p || p.color !== opp) continue;
    const fakeState = { board, enPassant: null, castling: { wK:false,wQ:false,bK:false,bQ:false } };
    const moves = rawMoves(fakeState, r, c);
    if (moves.some(m => m.to[0] === kr && m.to[1] === kc)) return true;
  }
  return false;
}

function applyMoveToBoard(state, move) {
  const { board, castling, enPassant } = state;
  const nb = board.map(row => row.map(p => p ? { ...p } : null));
  const [fr, fc] = move.from, [tr, tc] = move.to;
  const piece = nb[fr][fc];
  const newCastling = { ...castling };
  let newEnPassant = null;
  const newCaptured = { w: [...state.captured.w], b: [...state.captured.b] };

  // Capture
  if (nb[tr][tc]) {
    newCaptured[piece.color === W ? 'b' : 'w'].push(nb[tr][tc]);
  }

  if (move.special === 'enpassant') {
    const captureRow = fr; // en passant capture is on same row as pawn
    const target = nb[captureRow][tc];
    if (target) newCaptured[piece.color === W ? 'b' : 'w'].push(target);
    nb[captureRow][tc] = null;
  }

  if (move.special === 'double') {
    // Store the en passant target square (the square the capturing pawn lands on,
    // which is one step in the moving pawn's direction from its start row).
    // e.g. white pawn moves from row 6 to row 4: en passant square is row 5.
    newEnPassant = [(fr + tr) >> 1, tc]; // midpoint between from and to
  }

  if (move.special === 'promo') {
    nb[tr][tc] = { color: piece.color, type: QUEEN };
    nb[fr][fc] = null;
  } else {
    nb[tr][tc] = piece;
    nb[fr][fc] = null;
  }

  // Castling
  if (move.special === 'castle-K') {
    const rr = fr;
    nb[rr][5] = nb[rr][7];
    nb[rr][7] = null;
  }
  if (move.special === 'castle-Q') {
    const rr = fr;
    nb[rr][3] = nb[rr][0];
    nb[rr][0] = null;
  }

  // Update castling rights
  if (piece.type === KING) { newCastling[`${piece.color}K`] = false; newCastling[`${piece.color}Q`] = false; }
  if (piece.type === ROOK) {
    if (fr === 7 && fc === 7) newCastling.wK = false;
    if (fr === 7 && fc === 0) newCastling.wQ = false;
    if (fr === 0 && fc === 7) newCastling.bK = false;
    if (fr === 0 && fc === 0) newCastling.bQ = false;
  }

  return {
    ...state,
    board: nb,
    castling: newCastling,
    enPassant: newEnPassant,
    captured: newCaptured,
  };
}

function getLegalMoves(state, r, c) {
  const piece = state.board[r][c];
  if (!piece) return [];
  const raw = rawMoves(state, r, c);
  return raw.filter(move => {
    // Can't castle through/into check
    if (move.special === 'castle-K' || move.special === 'castle-Q') {
      if (isInCheck(state.board, piece.color)) return false;
      const midCol = move.special === 'castle-K' ? 5 : 3;
      const nb2 = state.board.map(row => row.map(p => p ? {...p} : null));
      nb2[move.from[0]][midCol] = piece;
      nb2[move.from[0]][move.from[1]] = null;
      if (isInCheck(nb2, piece.color)) return false;
    }
    const newState = applyMoveToBoard(state, move);
    return !isInCheck(newState.board, piece.color);
  });
}

function getAllLegalMoves(state, color) {
  const moves = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = state.board[r][c];
    if (p && p.color === color) moves.push(...getLegalMoves(state, r, c));
  }
  return moves;
}

// ── Evaluation ────────────────────────────────────────────
function evaluate(state, color) {
  let score = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = state.board[r][c];
    if (!p) continue;
    const pstRow = p.color === W ? r : 7 - r;
    const pst = PST[p.type]?.[pstRow]?.[c] || 0;
    const val = PIECE_VALUES[p.type] + pst;
    score += p.color === color ? val : -val;
  }
  return score;
}

function minimaxChess(state, depth, alpha, beta, isMax, botColor) {
  const turn = state.turn;
  const moves = getAllLegalMoves(state, turn);

  if (depth === 0 || !moves.length) {
    if (!moves.length) {
      if (isInCheck(state.board, turn)) {
        return isMax ? -50000 : 50000; // checkmate
      }
      return 0; // stalemate
    }
    return evaluate(state, botColor);
  }

  const shuffled = [...moves].sort(() => Math.random() - 0.3);

  if (isMax) {
    let best = -Infinity;
    for (const m of shuffled) {
      const ns = applyMoveToBoard({ ...state, turn: turn === W ? B : W }, m);
      ns.turn = turn === W ? B : W;
      best = Math.max(best, minimaxChess(ns, depth - 1, alpha, beta, false, botColor));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of shuffled) {
      const ns = applyMoveToBoard({ ...state, turn: turn === W ? B : W }, m);
      ns.turn = turn === W ? B : W;
      best = Math.min(best, minimaxChess(ns, depth - 1, alpha, beta, true, botColor));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBotMove(state, difficulty) {
  const color = state.turn;
  const moves = getAllLegalMoves(state, color);
  if (!moves.length) return null;
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
  const depth = difficulty === 'medium' ? 2 : 4;
  let best = -Infinity, bestMove = moves[0];
  for (const m of moves) {
    const ns = applyMoveToBoard({ ...state }, m);
    ns.turn = color === W ? B : W;
    const score = minimaxChess(ns, depth - 1, -Infinity, Infinity, false, color);
    if (score > best) { best = score; bestMove = m; }
  }
  return bestMove;
}

function toAlgebraic(move, piece, captured, check, checkmate) {
  const files = 'abcdefgh';
  const [fr, fc] = move.from, [tr, tc] = move.to;
  if (move.special === 'castle-K') return checkmate ? 'O-O#' : check ? 'O-O+' : 'O-O';
  if (move.special === 'castle-Q') return checkmate ? 'O-O-O#' : check ? 'O-O-O+' : 'O-O-O';
  let s = piece.type !== PAWN ? piece.type : '';
  if (piece.type === PAWN && captured) s = files[fc];
  if (captured || move.special === 'enpassant') s += 'x';
  s += files[tc] + (8 - tr);
  if (move.special === 'promo') s += '=Q';
  if (checkmate) s += '#'; else if (check) s += '+';
  return s;
}

// ── Main Component ────────────────────────────────────────
export default function Chess({ mode, difficulty, onBack }) {
  const [state, setState] = useState(() => initState());
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing'|'check'|'checkmate'|'stalemate'
  const [statusMsg, setStatusMsg] = useState('');
  const [botThinking, setBotThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [promotionChoice, setPromotionChoice] = useState(null); // { from, to }

  const botColor = B;
  const humanColor = W;
  const isBot = mode === 'vs_computer' && state.turn === botColor;

  function checkGameStatus(newState) {
    const turn = newState.turn;
    const moves = getAllLegalMoves(newState, turn);
    const inCheck = isInCheck(newState.board, turn);
    if (!moves.length) {
      return inCheck ? 'checkmate' : 'stalemate';
    }
    return inCheck ? 'check' : 'playing';
  }

  // Bot turn
  useEffect(() => {
    if (!isBot || gameStatus === 'checkmate' || gameStatus === 'stalemate' || botThinking) return;
    setBotThinking(true);
    const t = setTimeout(() => {
      const move = getBotMove(state, difficulty);
      if (move) {
        const piece = state.board[move.from[0]][move.from[1]];
        const captured = state.board[move.to[0]][move.to[1]];
        const newState = applyMoveToBoard(state, move);
        newState.turn = W;
        const status = checkGameStatus(newState);
        const alg = toAlgebraic(move, piece, captured, status === 'check', status === 'checkmate');
        setState(newState);
        setMoveHistory(h => [...h, alg]);
        setGameStatus(status);
        setSelected(null);
        setLegalMoves([]);
        if (status === 'checkmate') setStatusMsg(`Checkmate! Computer wins.`);
        else if (status === 'stalemate') setStatusMsg('Stalemate — draw!');
        else if (status === 'check') setStatusMsg('Check!');
        else setStatusMsg('');
      }
      setBotThinking(false);
    }, 600);
    return () => clearTimeout(t);
  }, [isBot, state, difficulty, gameStatus, botThinking]);

  function handleSquareClick(r, c) {
    if (gameStatus === 'checkmate' || gameStatus === 'stalemate') return;
    if (botThinking) return;
    if (mode === 'vs_computer' && state.turn !== humanColor) return;

    const piece = state.board[r][c];

    if (selected) {
      // Try to make a move
      const dest = legalMoves.find(m => m.to[0] === r && m.to[1] === c);
      if (dest) {
        const movingPiece = state.board[dest.from[0]][dest.from[1]];
        const captured = state.board[r][c];
        const newState = applyMoveToBoard(state, dest);
        const nextTurn = state.turn === W ? B : W;
        newState.turn = nextTurn;
        const status = checkGameStatus(newState);
        const alg = toAlgebraic(dest, movingPiece, captured, status === 'check', status === 'checkmate');
        setState(newState);
        setMoveHistory(h => [...h, alg]);
        setGameStatus(status);
        setSelected(null);
        setLegalMoves([]);
        if (status === 'checkmate') {
          setStatusMsg(`Checkmate! ${state.turn === W ? (mode === 'local' ? 'White' : 'You') : (mode === 'local' ? 'Black' : 'Computer')} wins!`);
        } else if (status === 'stalemate') {
          setStatusMsg('Stalemate — draw!');
        } else if (status === 'check') {
          setStatusMsg('Check!');
        } else {
          setStatusMsg('');
        }
        return;
      }

      // Select different piece of same color
      if (piece && piece.color === state.turn) {
        const ml = getLegalMoves(state, r, c);
        setSelected([r, c]);
        setLegalMoves(ml);
        return;
      }

      setSelected(null); setLegalMoves([]);
      return;
    }

    // Select piece
    if (piece && piece.color === state.turn) {
      const ml = getLegalMoves(state, r, c);
      setSelected([r, c]);
      setLegalMoves(ml);
    }
  }

  function reset() {
    setState(initState());
    setSelected(null);
    setLegalMoves([]);
    setGameStatus('playing');
    setStatusMsg('');
    setBotThinking(false);
    setMoveHistory([]);
    setPromotionChoice(null);
  }

  const p1label = mode === 'local' ? 'White' : 'You (White)';
  const p2label = mode === 'local' ? 'Black' : 'Computer (Black)';
  const legalDestSet = new Set(legalMoves.map(m => `${m.to[0]},${m.to[1]}`));

  // Fluid square size: shrinks to fit narrow phone screens, but clamps at the
  // original 58px on any viewport wide enough that it was never a problem
  // (~645px+), so desktop rendering is unchanged.
  const CELL_SIZE = 'clamp(30px, 9vw, 58px)';
  const PIECE_FONT = 'clamp(20px, 6.2vw, 40px)';
  const HINT_DOT = 'clamp(10px, 2.8vw, 18px)';
  const FILES = 'abcdefgh';

  function renderCaptured(color) {
    const caps = state.captured[color === W ? 'b' : 'w'];
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, minHeight: 24 }}>
        {caps.map((p, i) => (
          <span key={i} style={{ fontSize: 18 }}>{SYMBOLS[`${p.color}${p.type}`]}</span>
        ))}
      </div>
    );
  }

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={onBack}>Back</button>
        <h1 className="game-title">Chess</h1>
        <p className="game-subtitle">{mode === 'local' ? 'Pass & Play' : `vs Computer (${difficulty})`}</p>
      </div>

      <HowToPlay>
        <p>Standard chess rules — checkmate your opponent's king to win.</p>
        <ul>
          <li>Tap a piece to select it — its legal destination squares light up with a dot (or a highlighted outline if it would capture a piece there). Tap a highlighted square to move.</li>
          <li>Each piece type moves as in standard chess (pawns, knights, bishops, rooks, queens, kings).</li>
          <li>Castling, en passant, and pawn double-moves are all supported. Pawns that reach the far rank automatically promote to a queen.</li>
          <li>If your king is in check, you'll see a "Check!" message — you must make a move that gets it out of check.</li>
          <li>Checkmate (no legal move escapes check) ends the game for the side in check; stalemate (no legal move, but not in check) is a draw.</li>
          <li>Captured pieces and the move list are shown next to the board.</li>
        </ul>
        <p><strong>vs Computer</strong> gives you an easy, medium, or hard bot. <strong>Pass & Play</strong> lets two people take turns on this device (White moves first).</p>
      </HowToPlay>

      {/* Status */}
      {(statusMsg || botThinking || gameStatus !== 'playing') && (
        <div className={`game-msg ${gameStatus === 'checkmate' || gameStatus === 'stalemate' ? 'success' : gameStatus === 'check' ? 'fail' : 'info'}`} style={{ marginBottom: 12 }}>
          {botThinking ? 'Computer is thinking...' : statusMsg || `${state.turn === W ? p1label : p2label}'s turn`}
        </div>
      )}

      {!statusMsg && !botThinking && gameStatus === 'playing' && (
        <div className="game-msg info" style={{ marginBottom: 12 }}>
          {state.turn === W ? p1label : p2label}'s turn
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' }}>
        {/* Board */}
        <div>
          {/* Black captured by white */}
          <div style={{ marginBottom: 6 }}>{renderCaptured(B)}</div>

          <div style={{ display: 'flex' }}>
            {/* Row labels */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {Array.from({ length: 8 }, (_, r) => (
                <div key={r} style={{ width: 20, height: CELL_SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>
                  {8 - r}
                </div>
              ))}
            </div>

            {/* Board grid */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(8, ${CELL_SIZE})`, border: '2px solid #334155', borderRadius: 4 }}>
                {state.board.map((row, r) =>
                  row.map((piece, c) => {
                    const isLight = (r + c) % 2 === 0;
                    const isSel = selected && selected[0] === r && selected[1] === c;
                    const isLDest = legalDestSet.has(`${r},${c}`);
                    const isKingCheck = piece && piece.type === KING && piece.color === state.turn && (gameStatus === 'check');
                    let bg = isLight ? '#f0d9b5' : '#b58863';
                    if (isSel) bg = '#f6f669';
                    if (isKingCheck) bg = '#ff6b6b';

                    return (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => handleSquareClick(r, c)}
                        style={{
                          width: CELL_SIZE, height: CELL_SIZE, background: bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', position: 'relative', userSelect: 'none',
                          transition: 'background 80ms',
                        }}
                      >
                        {isLDest && (
                          <div style={{
                            width: piece ? '100%' : HINT_DOT, height: piece ? '100%' : HINT_DOT,
                            borderRadius: piece ? 0 : '50%',
                            background: piece ? 'transparent' : 'rgba(0,0,0,0.2)',
                            border: piece ? '3px solid rgba(0,0,0,0.3)' : 'none',
                            position: 'absolute',
                            pointerEvents: 'none',
                          }} />
                        )}
                        {piece && (
                          <span style={{ fontSize: PIECE_FONT, lineHeight: 1, zIndex: 1, filter: piece.color === W ? 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))' : 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))' }}>
                            {SYMBOLS[`${piece.color}${piece.type}`]}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* File labels */}
              <div style={{ display: 'flex', paddingLeft: 0 }}>
                {Array.from({ length: 8 }, (_, c) => (
                  <div key={c} style={{ width: CELL_SIZE, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>
                    {FILES[c]}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* White captured by black */}
          <div style={{ marginTop: 6 }}>{renderCaptured(W)}</div>
        </div>

        {/* Move history */}
        <div style={{ width: 160, maxHeight: 500, overflowY: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Moves</div>
          {moveHistory.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>No moves yet</div>}
          {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, padding: '2px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--muted)', width: 20 }}>{i + 1}.</span>
              <span style={{ flex: 1 }}>{moveHistory[i * 2]}</span>
              <span style={{ flex: 1, color: 'var(--muted)' }}>{moveHistory[i * 2 + 1] || ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="game-controls">
        <button className="gs-btn gs-btn-outline" onClick={reset}>New Game</button>
      </div>
    </div>
  );
}
