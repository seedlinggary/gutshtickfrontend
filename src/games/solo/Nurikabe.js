import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';
import HowToPlay from '../HowToPlay';

// Cell states: 'unknown', 'black', 'white'
// Puzzles: { size, clues: [[r,c,n],...], solution: 2d array of 'B'|'W' }
// Solutions verified programmatically: each number's white island has exactly n cells,
// islands don't touch orthogonally, all black cells are connected, no 2x2 all-black block.
const PUZZLES = {
  easy: [
    {
      // 5x5
      size: 5,
      clues: [[0,4,3],[2,0,2],[3,4,2],[1,2,1],[3,2,1],[4,0,1]],
      solution: [
        ['B','B','B','W','W'],
        ['W','B','W','B','W'],
        ['W','B','B','B','B'],
        ['B','B','W','B','W'],
        ['W','B','B','B','W'],
      ],
    },
    {
      // 5x5
      size: 5,
      clues: [[4,2,4],[0,3,2],[4,4,1],[2,2,3],[2,4,1]],
      solution: [
        ['B','B','B','W','W'],
        ['B','W','W','B','B'],
        ['B','B','W','B','W'],
        ['W','B','B','B','B'],
        ['W','W','W','B','W'],
      ],
    },
  ],
  medium: [
    {
      // 7x7
      size: 7,
      clues: [[5,1,4],[2,1,2],[3,5,3],[6,5,2],[0,5,1],[4,3,3],[0,0,2],[0,2,1],[1,3,1]],
      solution: [
        ['W','B','W','B','B','W','B'],
        ['W','B','B','W','B','B','B'],
        ['B','W','B','B','W','W','B'],
        ['B','W','B','W','B','W','B'],
        ['B','B','B','W','B','B','B'],
        ['W','W','B','W','B','W','B'],
        ['W','W','B','B','B','W','B'],
      ],
    },
    {
      // 7x7
      size: 7,
      clues: [[4,2,3],[1,4,2],[1,0,4],[3,0,1],[6,2,3],[5,4,2],[0,6,3],[3,6,1],[5,6,1]],
      solution: [
        ['W','B','B','B','B','W','W'],
        ['W','W','W','B','W','B','W'],
        ['B','B','B','B','W','B','B'],
        ['W','B','W','B','B','B','W'],
        ['B','W','W','B','W','B','B'],
        ['B','B','B','B','W','B','W'],
        ['B','W','W','W','B','B','B'],
      ],
    },
  ],
  hard: [
    {
      // 10x10
      size: 10,
      clues: [[7,5,5],[4,2,3],[0,2,2],[7,8,4],[9,8,3],[9,4,2],[1,7,5],[3,0,3],[4,6,4],[0,4,2],[2,2,1],[2,5,1],[3,4,1],[4,8,1],[6,0,1],[8,0,1],[9,2,1]],
      solution: [
        ['B','W','W','B','W','B','W','W','B','B'],
        ['B','B','B','B','W','B','B','W','W','B'],
        ['W','B','W','B','B','W','B','B','W','B'],
        ['W','B','B','B','W','B','W','B','B','B'],
        ['W','B','W','B','B','B','W','B','W','B'],
        ['B','B','W','W','B','W','W','B','B','B'],
        ['W','B','B','B','B','B','B','B','W','W'],
        ['B','B','W','W','W','W','W','B','W','W'],
        ['W','B','B','B','B','B','B','B','B','B'],
        ['B','B','W','B','W','W','B','W','W','W'],
      ],
    },
    {
      // 10x10
      size: 10,
      clues: [[1,1,3],[3,8,4],[6,0,5],[9,5,2],[9,2,4],[7,9,3],[6,4,2],[6,6,1],[1,6,3],[4,3,2],[1,3,1],[0,8,1],[2,5,1],[3,6,1],[4,5,1],[6,2,1],[6,8,1],[7,7,1],[9,0,1],[9,7,1]],
      solution: [
        ['B','B','B','B','B','W','W','B','W','B'],
        ['W','W','B','W','B','B','W','B','B','B'],
        ['B','W','B','B','B','W','B','B','W','B'],
        ['B','B','B','W','B','B','W','B','W','B'],
        ['W','W','B','W','B','W','B','W','W','B'],
        ['W','B','B','B','W','B','B','B','B','B'],
        ['W','B','W','B','W','B','W','B','W','B'],
        ['W','B','B','B','B','B','B','W','B','W'],
        ['B','B','W','W','B','W','B','B','B','W'],
        ['W','B','W','W','B','W','B','W','B','W'],
      ],
    },
  ],
};

function cycleState(cur) {
  if (cur === 'unknown') return 'black';
  if (cur === 'black') return 'white';
  return 'unknown';
}

// Rule-based win check: validates the actual Nurikabe constraints against the
// player's board (independent of the bundled `solution`), so any legitimate
// solving of the puzzle's clues is recognized as a win, not just one exact grid.
function checkWin(board, clues, size) {
  // Every cell must be resolved (no 'unknown' left)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 'unknown') return false;
    }
  }
  // No 2x2 all-black block
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      if (board[r][c] === 'black' && board[r+1][c] === 'black' &&
          board[r][c+1] === 'black' && board[r+1][c+1] === 'black') return false;
    }
  }
  const neighbors4 = (r, c) => {
    const out = [];
    if (r > 0) out.push([r-1, c]);
    if (r < size-1) out.push([r+1, c]);
    if (c > 0) out.push([r, c-1]);
    if (c < size-1) out.push([r, c+1]);
    return out;
  };
  // White islands: each connected white region must contain exactly one clue
  // cell and have exactly that many cells; total islands must equal clue count.
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  let islandCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 'white' && !visited[r][c]) {
        islandCount++;
        const stack = [[r, c]];
        visited[r][c] = true;
        const cells = [[r, c]];
        while (stack.length) {
          const [cr, cc] = stack.pop();
          for (const [nr, nc] of neighbors4(cr, cc)) {
            if (board[nr][nc] === 'white' && !visited[nr][nc]) {
              visited[nr][nc] = true;
              stack.push([nr, nc]);
              cells.push([nr, nc]);
            }
          }
        }
        const clueCells = cells.filter(([cr, cc]) => clues.some(([qr, qc]) => qr === cr && qc === cc));
        if (clueCells.length !== 1) return false;
        const clue = clues.find(([qr, qc]) => qr === clueCells[0][0] && qc === clueCells[0][1]);
        if (cells.length !== clue[2]) return false;
      }
    }
  }
  if (islandCount !== clues.length) return false;
  // Black sea: all black cells must form a single connected region
  let blackCount = 0, firstBlack = null;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 'black') { blackCount++; if (!firstBlack) firstBlack = [r, c]; }
    }
  }
  if (blackCount > 0) {
    const bvisited = Array.from({ length: size }, () => Array(size).fill(false));
    const stack = [firstBlack];
    bvisited[firstBlack[0]][firstBlack[1]] = true;
    let reached = 1;
    while (stack.length) {
      const [cr, cc] = stack.pop();
      for (const [nr, nc] of neighbors4(cr, cc)) {
        if (board[nr][nc] === 'black' && !bvisited[nr][nc]) {
          bvisited[nr][nc] = true;
          stack.push([nr, nc]);
          reached++;
        }
      }
    }
    if (reached !== blackCount) return false;
  }
  return true;
}

// Detect 2x2 black blocks and return set of error cell keys
function findErrors(board, size) {
  const errors = new Set();
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      if (
        board[r][c] === 'black' && board[r + 1][c] === 'black' &&
        board[r][c + 1] === 'black' && board[r + 1][c + 1] === 'black'
      ) {
        [`${r},${c}`, `${r + 1},${c}`, `${r},${c + 1}`, `${r + 1},${c + 1}`].forEach(k => errors.add(k));
      }
    }
  }
  return errors;
}

// Touch drag support: touchmove doesn't retarget to the element under the
// finger (unlike mouseenter), so we look up the DOM node at the touch point
// and read its data-r/data-c attributes to find the cell being dragged over.
function getCellFromTouch(e) {
  const touch = e.touches && e.touches[0];
  if (!touch) return null;
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const cellEl = el && el.closest ? el.closest('[data-r]') : null;
  if (!cellEl) return null;
  const r = Number(cellEl.dataset.r);
  const c = Number(cellEl.dataset.c);
  if (Number.isNaN(r) || Number.isNaN(c)) return null;
  return { r, c };
}

export default function Nurikabe() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(null);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [board, setBoard] = useState([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState('');

  // Drag state
  const isDragging = useRef(false);
  // When dragging, what state are we painting? 'black' or 'white'
  const dragPaintState = useRef('black');

  const startGame = useCallback((diff, idx = 0) => {
    setDifficulty(diff);
    setPuzzleIdx(idx);
    const p = PUZZLES[diff][idx];
    setPuzzle(p);
    // Initialize board: all unknown, clue cells pre-set to white
    const b = Array.from({ length: p.size }, () => Array(p.size).fill('unknown'));
    p.clues.forEach(([r, c]) => { b[r][c] = 'white'; });
    setBoard(b);
    setHintUsed(false);
    setWon(false);
    setMsg('');
  }, []);

  const isClue = (r, c) => puzzle?.clues.some(([cr, cc]) => cr === r && cc === c);

  // Apply a single cell change and check win
  const applyCell = (r, c, newState, currentBoard) => {
    if (won || isClue(r, c)) return currentBoard;
    const newBoard = currentBoard.map(row => [...row]);
    newBoard[r][c] = newState;
    setBoard(newBoard);
    if (checkWin(newBoard, puzzle.clues, puzzle.size)) {
      setWon(true);
      const score = puzzle.size * puzzle.size * 10 - (hintUsed ? 50 : 0);
      setMsg(`Nurikabe solved! Score: ${score}`);
      if (isLoggedIn()) apiRequest('POST', { game_type: 'nurikabe', result: 'win', difficulty, score }, '/game/save');
    }
    return newBoard;
  };

  const handleMouseDown = (e, r, c) => {
    e.preventDefault();
    if (won || isClue(r, c)) return;
    isDragging.current = true;
    if (e.button === 2) {
      // Right-click: paint white (or clear if already white)
      dragPaintState.current = 'white';
      const newState = board[r][c] === 'white' ? 'unknown' : 'white';
      applyCell(r, c, newState, board);
    } else {
      // Left-click: cycle unknown→black→white→unknown for single click;
      // for drag, paint black (or clear if already black)
      dragPaintState.current = 'black';
      const newState = cycleState(board[r][c]);
      applyCell(r, c, newState, board);
    }
  };

  const handleMouseEnter = (r, c) => {
    if (!isDragging.current || won || isClue(r, c)) return;
    // During drag, paint the target color; toggle off if already that color
    const target = dragPaintState.current;
    const newState = board[r][c] === target ? 'unknown' : target;
    applyCell(r, c, newState, board);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Touch equivalents of the mouse drag handlers above. Touch has no
  // right-tap gesture, so it mirrors the left-click branch of handleMouseDown
  // (button 0) — reusing that exact function via a minimal stub event.
  const handleBoardTouchStart = (e) => {
    const cell = getCellFromTouch(e);
    if (!cell) return;
    e.preventDefault();
    handleMouseDown({ preventDefault: () => {}, button: 0 }, cell.r, cell.c);
  };

  const handleBoardTouchMove = (e) => {
    const cell = getCellFromTouch(e);
    if (!cell) return;
    e.preventDefault();
    handleMouseEnter(cell.r, cell.c);
  };

  const handleHint = () => {
    if (hintUsed || !puzzle || won) return;
    setHintUsed(true);
    // Find the first incorrectly set cell and fix it
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        const expected = puzzle.solution[r][c] === 'B' ? 'black' : 'white';
        if (board[r][c] !== expected && !isClue(r, c)) {
          const newBoard = board.map(row => [...row]);
          newBoard[r][c] = expected;
          setBoard(newBoard);
          if (checkWin(newBoard, puzzle.clues, puzzle.size)) {
            setWon(true);
            const score = puzzle.size * puzzle.size * 10 - 50;
            setMsg(`Nurikabe solved! Score: ${score}`);
            if (isLoggedIn()) apiRequest('POST', { game_type: 'nurikabe', result: 'win', difficulty, score }, '/game/save');
          } else {
            setMsg(`Hint: one cell revealed (${expected})!`);
          }
          return;
        }
      }
    }
    setMsg('Hint: all visible cells look correct!');
  };

  const errors = puzzle && board.length > 0 ? findErrors(board, puzzle.size) : new Set();
  const cellSize = puzzle && puzzle.size === 10 ? 40 : puzzle && puzzle.size === 7 ? 48 : 56;

  if (!difficulty) {
    return (
      <div className="game-page">
        <div className="gs-container">
          <div className="game-header">
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
            <h1>Nurikabe</h1>
          </div>
          <div className="gs-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Left-click to cycle (unknown → black → white → unknown). Right-click to paint white.
              Each number shows the size of its white island. Black cells form one connected river. No 2×2 black blocks.
            </p>
            <div className="difficulty-select">
              {['easy', 'medium', 'hard'].map(d => (
                <button key={d} className={`diff-btn diff-${d}`} onClick={() => startGame(d)}>
                  <span className="diff-label">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                  <span className="diff-sub">
                    {d === 'easy' ? '5×5 grid' : d === 'medium' ? '7×7 grid' : '10×10 grid'}
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
    <div className="game-page" onMouseUp={handleMouseUp} onContextMenu={e => e.preventDefault()}
      onTouchEnd={handleMouseUp} onTouchCancel={handleMouseUp}>
      <div className="gs-container">
        <div className="game-header">
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate('/games')}>← Games</button>
          <h1>Nurikabe</h1>
          <span className={`diff-badge diff-${difficulty}`}>{difficulty}</span>
        </div>
        <HowToPlay>
          <p>Shade the grid into black "sea" cells and white "island" cells so it matches every numbered clue.</p>
          <ul>
            <li>Every numbered clue starts a white island containing exactly that many connected white cells, including the clue cell itself.</li>
            <li>Islands can't touch each other — no two islands may share an edge (only the black sea can separate them).</li>
            <li>All the black cells must form a single connected region (one sea, not several separate blobs), and no 2×2 block of cells may be entirely black.</li>
          </ul>
          <p>Click or tap a cell to cycle it through unknown → black → white → unknown. On desktop, right-click sets a cell straight to white; click-and-drag (or drag a finger on touch) paints a run of cells the same way as your first click/tap in that drag. A red outline flags an illegal 2×2 all-black block.</p>
        </HowToPlay>
        <div className="game-meta" style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Left-click: cycle (unknown/black/white) | Right-click: white | Drag to paint
          {hintUsed && <span className="hint-used" style={{ marginLeft: '1rem' }}>Hint used</span>}
          {errors.size > 0 && <span style={{ color: 'var(--danger)', marginLeft: '1rem' }}>2×2 block detected!</span>}
        </div>
        {msg && <div className={`game-msg ${won ? 'success' : 'info'}`}>{msg}</div>}

        <div style={{ margin: '1rem 0', userSelect: 'none', width: '100%', overflowX: 'auto' }}>
          <div
            onTouchStart={handleBoardTouchStart}
            onTouchMove={handleBoardTouchMove}
            onTouchEnd={handleMouseUp}
            onTouchCancel={handleMouseUp}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${puzzle.size}, 1fr)`,
              gridTemplateRows: `repeat(${puzzle.size}, 1fr)`,
              width: `min(100%, ${cellSize * puzzle.size + (puzzle.size - 1)}px)`,
              minWidth: `${24 * puzzle.size + (puzzle.size - 1)}px`,
              aspectRatio: '1 / 1',
              margin: '0 auto',
              gap: 1,
              backgroundColor: 'var(--border)',
            }}>
            {board.map((row, r) => row.map((cell, c) => {
              const clue = puzzle.clues.find(([cr, cc]) => cr === r && cc === c);
              const hasError = errors.has(`${r},${c}`);
              return (
                <div key={`${r}-${c}`}
                  data-r={r} data-c={c}
                  onMouseDown={e => handleMouseDown(e, r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  style={{
                    cursor: clue ? 'default' : 'pointer',
                    backgroundColor: cell === 'black' ? '#222' : cell === 'white' ? 'var(--surface)' : 'var(--bg)',
                    border: hasError ? '2px solid var(--danger)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                    touchAction: 'none',
                  }}>
                  {clue && (
                    <div style={{
                      width: '75%', height: '75%',
                      borderRadius: '50%',
                      backgroundColor: 'var(--surface)',
                      border: '2px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: cellSize <= 40 ? '0.8rem' : '1rem',
                      fontWeight: 'bold', color: 'var(--text)', zIndex: 1,
                    }}>
                      {clue[2]}
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        </div>

        <div className="game-controls">
          {!hintUsed && !won && (
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={handleHint}>Hint</button>
          )}
          <button className="gs-btn gs-btn-outline gs-btn-sm"
            onClick={() => startGame(difficulty, (puzzleIdx + 1) % PUZZLES[difficulty].length)}>
            Next Puzzle
          </button>
          {won ? (
            <>
              <button className="gs-btn gs-btn-primary" onClick={() => startGame(difficulty, puzzleIdx)}>Play Again</button>
              <button className="gs-btn gs-btn-outline" onClick={() => setDifficulty(null)}>Change Difficulty</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
