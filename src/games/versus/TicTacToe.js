import React, { useState, useEffect } from 'react';
import HowToPlay from '../HowToPlay';

// ── Helpers ──────────────────────────────────────────────
function checkWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { winner: board[a], line: [a,b,c] };
  }
  if (board.every(c => c)) return { winner: 'draw', line: [] };
  return null;
}

function minimax(board, isMax, depth, alpha, beta) {
  const result = checkWinner(board);
  if (result) {
    if (result.winner === 'O') return 10 - depth;
    if (result.winner === 'X') return depth - 10;
    return 0;
  }
  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false, depth + 1, alpha, beta));
        board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true, depth + 1, alpha, beta));
        board[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

function getBotMove(board, difficulty) {
  const empty = board.map((v, i) => v ? null : i).filter(i => i !== null);
  if (!empty.length) return -1;
  if (difficulty === 'easy') return empty[Math.floor(Math.random() * empty.length)];
  if (difficulty === 'medium') {
    // 50% random, 50% minimax
    if (Math.random() < 0.5) return empty[Math.floor(Math.random() * empty.length)];
  }
  let bestScore = -Infinity, bestMove = empty[0];
  for (const i of empty) {
    board[i] = 'O';
    const score = minimax(board, false, 0, -Infinity, Infinity);
    board[i] = null;
    if (score > bestScore) { bestScore = score; bestMove = i; }
  }
  return bestMove;
}

// ── Ultimate (Super) Tic-Tac-Toe ───────────────────────
function checkUltimateWinner(metaBoard) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (const [a,b,c] of lines) {
    if (metaBoard[a] && metaBoard[a] !== 'draw' && metaBoard[a] === metaBoard[b] && metaBoard[a] === metaBoard[c])
      return metaBoard[a];
  }
  if (metaBoard.every(c => c)) return 'draw';
  return null;
}

// ── Classic Board Component ─────────────────────────────
function ClassicBoard({ board, onMove, winLine, disabled }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 6,
      maxWidth: 300,
      margin: '0 auto',
    }}>
      {board.map((cell, i) => {
        const isWin = winLine && winLine.includes(i);
        return (
          <button
            key={i}
            onClick={() => !cell && !disabled && onMove(i)}
            style={{
              height: 'clamp(64px, 22vw, 90px)',
              fontSize: 'clamp(28px, 9.8vw, 40px)',
              fontWeight: 800,
              border: '2px solid var(--border)',
              borderRadius: 10,
              background: isWin ? (cell === 'X' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)') : 'var(--surface)',
              color: cell === 'X' ? 'var(--danger)' : 'var(--accent)',
              cursor: cell || disabled ? 'default' : 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            {cell}
          </button>
        );
      })}
    </div>
  );
}

// ── Ultimate Board Component ────────────────────────────
function UltimateBoard({ boards, metaBoard, activeBoard, onMove, currentPlayer }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 8,
      maxWidth: 600,
      margin: '0 auto',
    }}>
      {boards.map((board, bi) => {
        const meta = metaBoard[bi];
        const isActive = activeBoard === null ? !meta : activeBoard === bi;
        return (
          <div
            key={bi}
            style={{
              border: `3px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10,
              padding: 6,
              background: isActive ? 'rgba(245,158,11,0.05)' : 'var(--surface)',
              opacity: meta ? 0.55 : 1,
              position: 'relative',
            }}
          >
            {meta && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(32px, 12vw, 52px)',
                fontWeight: 900,
                color: meta === 'X' ? 'var(--danger)' : meta === 'O' ? 'var(--accent)' : 'var(--muted)',
                zIndex: 2,
              }}>
                {meta === 'draw' ? '–' : meta}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
              {board.map((cell, ci) => (
                <button
                  key={ci}
                  onClick={() => isActive && !meta && !cell && onMove(bi, ci)}
                  style={{
                    // Height was a fixed 44px while the width tracked the fluid
                    // 1fr grid column — on narrow phones the (unconstrained)
                    // width shrank a lot more than the fixed height, leaving
                    // very thin, elongated cells. Scale height down with the
                    // viewport too (clamps to exactly 44px on desktop/tablet
                    // widths, unchanged from before).
                    height: 'clamp(24px, 7.3vw, 44px)',
                    fontSize: 'clamp(12px, 4.4vw, 20px)',
                    fontWeight: 800,
                    border: '1px solid var(--border)',
                    borderRadius: 5,
                    background: 'var(--bg)',
                    color: cell === 'X' ? 'var(--danger)' : 'var(--accent)',
                    cursor: isActive && !meta && !cell ? 'pointer' : 'default',
                  }}
                >
                  {cell}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────
export default function TicTacToe({ mode, difficulty, onBack }) {
  const [variant, setVariant] = useState('classic'); // 'classic' | 'ultimate'
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [result, setResult] = useState(null);
  const [botThinking, setBotThinking] = useState(false);

  // Ultimate state
  const [uBoards, setUBoards] = useState(() => Array(9).fill(null).map(() => Array(9).fill(null)));
  const [uMeta, setUMeta] = useState(Array(9).fill(null));
  const [uActive, setUActive] = useState(null);
  const [uResult, setUResult] = useState(null);
  const [uCurrentPlayer, setUCurrentPlayer] = useState('X');

  const isBot = mode === 'vs_computer' && currentPlayer === 'O';
  const isUBot = mode === 'vs_computer' && uCurrentPlayer === 'O';

  // ── Classic Bot ──────────────────────────────────────
  useEffect(() => {
    if (variant !== 'classic' || !isBot || result || botThinking) return;
    setBotThinking(true);
    const t = setTimeout(() => {
      const move = getBotMove([...board], difficulty);
      if (move >= 0) {
        const nb = [...board];
        nb[move] = 'O';
        setBoard(nb);
        const r = checkWinner(nb);
        if (r) setResult(r);
        else setCurrentPlayer('X');
      }
      setBotThinking(false);
    }, 600);
    return () => clearTimeout(t);
  }, [variant, isBot, board, difficulty, result, botThinking]);

  function handleClassicMove(i) {
    if (board[i] || result || botThinking) return;
    const nb = [...board];
    nb[i] = currentPlayer;
    setBoard(nb);
    const r = checkWinner(nb);
    if (r) { setResult(r); return; }
    setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
  }

  function resetClassic() {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setResult(null);
    setBotThinking(false);
  }

  // ── Ultimate Bot ─────────────────────────────────────
  useEffect(() => {
    if (variant !== 'ultimate' || !isUBot || uResult || botThinking) return;
    setBotThinking(true);
    const t = setTimeout(() => {
      const validBoards = uActive !== null
        ? (uMeta[uActive] ? null : [uActive])
        : uBoards.map((_, bi) => !uMeta[bi] ? bi : null).filter(bi => bi !== null);

      if (!validBoards || !validBoards.length) { setBotThinking(false); return; }

      let move = null;
      if (difficulty === 'easy') {
        const bi = validBoards[Math.floor(Math.random() * validBoards.length)];
        const empty = uBoards[bi].map((v, ci) => v ? null : ci).filter(ci => ci !== null);
        if (empty.length) move = { bi, ci: empty[Math.floor(Math.random() * empty.length)] };
      } else {
        // Pick move that completes a local board, else random
        let found = false;
        for (const bi of validBoards) {
          const b = [...uBoards[bi]];
          for (let ci = 0; ci < 9; ci++) {
            if (!b[ci]) {
              b[ci] = 'O';
              if (checkWinner(b)?.winner === 'O') { move = { bi, ci }; found = true; break; }
              b[ci] = null;
            }
          }
          if (found) break;
        }
        if (!move) {
          const bi = validBoards[Math.floor(Math.random() * validBoards.length)];
          const empty = uBoards[bi].map((v, ci) => v ? null : ci).filter(ci => ci !== null);
          if (empty.length) move = { bi, ci: empty[Math.floor(Math.random() * empty.length)] };
        }
      }
      if (move) handleUltimateMove(move.bi, move.ci, true);
      setBotThinking(false);
    }, 600);
    return () => clearTimeout(t);
  }, [variant, isUBot, uResult, botThinking, uActive, uBoards, uMeta, difficulty]);

  function handleUltimateMove(bi, ci, isBot = false) {
    if (uMeta[bi] || uBoards[bi][ci] || uResult) return;
    if (!isBot && uActive !== null && uActive !== bi) return;

    const player = isBot ? 'O' : uCurrentPlayer;
    const newBoards = uBoards.map((b, i) => i === bi ? [...b] : b);
    newBoards[bi][ci] = player;

    const newMeta = [...uMeta];
    const localResult = checkWinner(newBoards[bi]);
    if (localResult) newMeta[bi] = localResult.winner;

    const overallWinner = checkUltimateWinner(newMeta);

    // Next active board
    const nextActive = newMeta[ci] ? null : ci;

    setUBoards(newBoards);
    setUMeta(newMeta);
    setUActive(nextActive);
    setUCurrentPlayer(player === 'X' ? 'O' : 'X');
    if (overallWinner) setUResult(overallWinner);
  }

  function resetUltimate() {
    setUBoards(Array(9).fill(null).map(() => Array(9).fill(null)));
    setUMeta(Array(9).fill(null));
    setUActive(null);
    setUResult(null);
    setUCurrentPlayer('X');
    setBotThinking(false);
  }

  // ── Render ────────────────────────────────────────────
  const p1label = mode === 'local' ? 'Player 1 (X)' : 'You (X)';
  const p2label = mode === 'local' ? 'Player 2 (O)' : 'Computer (O)';

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={onBack}>Back</button>
        <h1 className="game-title">Tic-Tac-Toe</h1>
        <p className="game-subtitle">
          {mode === 'local' ? 'Pass & Play' : `vs Computer (${difficulty})`}
        </p>
      </div>

      <HowToPlay>
        <p><strong>Classic 3x3:</strong> Tap an empty cell to place your mark. Get three of your marks in a row — horizontally, vertically, or diagonally — to win. If all nine cells fill up with no winner, it's a draw.</p>
        <p><strong>Ultimate (Super) Tic-Tac-Toe:</strong> The board is 9 small 3x3 boards arranged in a 3x3 grid. Tap a cell in the highlighted (active) sub-board to play there.</p>
        <ul>
          <li>Whichever cell you pick inside a sub-board sends your opponent to the matching sub-board next (e.g. play the top-right cell and they must play in the top-right sub-board).</li>
          <li>Win a sub-board by getting three in a row inside it — that claims the sub-board for you.</li>
          <li>If the sub-board you'd be sent to is already won or full, your opponent may play in any open sub-board instead.</li>
          <li>Win three sub-boards in a row (on the big 3x3 meta-grid) to win the game.</li>
        </ul>
        <p><strong>vs Computer</strong> gives you an easy, medium, or hard bot to play against. <strong>Pass & Play</strong> lets two people take turns on this device.</p>
      </HowToPlay>

      {/* Variant selector */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
        {['classic', 'ultimate'].map(v => (
          <button
            key={v}
            className={`gs-btn ${variant === v ? 'gs-btn-primary' : 'gs-btn-outline'} gs-btn-sm`}
            onClick={() => { setVariant(v); resetClassic(); resetUltimate(); }}
            style={{ textTransform: 'capitalize' }}
          >
            {v === 'classic' ? 'Classic 3x3' : 'Ultimate'}
          </button>
        ))}
      </div>

      {variant === 'classic' && (
        <>
          {result ? (
            <div className={`game-msg ${result.winner === 'draw' ? 'info' : 'success'}`} style={{ marginBottom: 16 }}>
              {result.winner === 'draw'
                ? "It's a draw!"
                : result.winner === 'X'
                  ? `${p1label} wins!`
                  : `${p2label} wins!`}
            </div>
          ) : (
            <div className="game-msg info" style={{ marginBottom: 16 }}>
              {botThinking ? 'Computer is thinking...' : (currentPlayer === 'X' ? `${p1label}'s turn` : `${p2label}'s turn`)}
            </div>
          )}
          <ClassicBoard
            board={board}
            onMove={handleClassicMove}
            winLine={result?.line}
            disabled={!!result || isBot}
          />
          <div className="game-controls">
            <button className="gs-btn gs-btn-outline" onClick={resetClassic}>New Game</button>
          </div>
        </>
      )}

      {variant === 'ultimate' && (
        <>
          {uResult ? (
            <div className={`game-msg ${uResult === 'draw' ? 'info' : 'success'}`} style={{ marginBottom: 16 }}>
              {uResult === 'draw' ? "It's a draw!" : uResult === 'X' ? `${p1label} wins!` : `${p2label} wins!`}
            </div>
          ) : (
            <div className="game-msg info" style={{ marginBottom: 16 }}>
              {botThinking && mode === 'vs_computer' && uCurrentPlayer === 'O'
                ? 'Computer is thinking...'
                : uCurrentPlayer === 'X' ? `${p1label}'s turn` : `${p2label}'s turn`}
              {!botThinking && uActive !== null ? ` — play in board ${uActive + 1}` : !botThinking ? ' — play in any open board' : ''}
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <UltimateBoard
              boards={uBoards}
              metaBoard={uMeta}
              activeBoard={uActive}
              onMove={(bi, ci) => !isUBot && handleUltimateMove(bi, ci)}
              currentPlayer={uCurrentPlayer}
            />
          </div>
          <div className="game-controls">
            <button className="gs-btn gs-btn-outline" onClick={resetUltimate}>New Game</button>
          </div>
        </>
      )}
    </div>
  );
}
