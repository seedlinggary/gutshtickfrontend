import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';

const SIZE = 8;
const GEM_EMOJI = ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣'];
const NUM_TYPES = GEM_EMOJI.length;

function randomType() {
  return Math.floor(Math.random() * NUM_TYPES);
}

function idx(r, c) {
  return r * SIZE + c;
}

// Find every cell that's part of a run of 3+ matching gems, horizontally or
// vertically. Returns a Set of board indices.
function findMatches(board) {
  const matched = new Set();

  for (let r = 0; r < SIZE; r++) {
    let run = 1;
    for (let c = 1; c <= SIZE; c++) {
      const cur = c < SIZE ? board[idx(r, c)] : null;
      const prev = board[idx(r, c - 1)];
      if (cur !== null && cur === prev) {
        run++;
      } else {
        if (run >= 3) {
          for (let k = c - run; k < c; k++) matched.add(idx(r, k));
        }
        run = 1;
      }
    }
  }

  for (let c = 0; c < SIZE; c++) {
    let run = 1;
    for (let r = 1; r <= SIZE; r++) {
      const cur = r < SIZE ? board[idx(r, c)] : null;
      const prev = board[idx(r - 1, c)];
      if (cur !== null && cur === prev) {
        run++;
      } else {
        if (run >= 3) {
          for (let k = r - run; k < r; k++) matched.add(idx(k, c));
        }
        run = 1;
      }
    }
  }

  return matched;
}

// Build a board with no pre-existing 3-in-a-row, by excluding gem types that
// would immediately complete a run while filling left-to-right, top-to-bottom.
function buildBoard() {
  const board = new Array(SIZE * SIZE);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const exclude = new Set();
      if (c >= 2 && board[idx(r, c - 1)] === board[idx(r, c - 2)]) {
        exclude.add(board[idx(r, c - 1)]);
      }
      if (r >= 2 && board[idx(r - 1, c)] === board[idx(r - 2, c)]) {
        exclude.add(board[idx(r - 1, c)]);
      }
      let candidates = [];
      for (let t = 0; t < NUM_TYPES; t++) if (!exclude.has(t)) candidates.push(t);
      if (candidates.length === 0) candidates = [randomType()];
      board[idx(r, c)] = candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  return board;
}

function isAdjacent(a, b) {
  const rA = Math.floor(a / SIZE);
  const cA = a % SIZE;
  const rB = Math.floor(b / SIZE);
  const cB = b % SIZE;
  return Math.abs(rA - rB) + Math.abs(cA - cB) === 1;
}

function hasPossibleMove(board) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const a = idx(r, c);
      if (c + 1 < SIZE) {
        const b = idx(r, c + 1);
        const trial = board.slice();
        [trial[a], trial[b]] = [trial[b], trial[a]];
        if (findMatches(trial).size > 0) return true;
      }
      if (r + 1 < SIZE) {
        const b = idx(r + 1, c);
        const trial = board.slice();
        [trial[a], trial[b]] = [trial[b], trial[a]];
        if (findMatches(trial).size > 0) return true;
      }
    }
  }
  return false;
}

function generateValidBoard() {
  let board = buildBoard();
  let attempts = 0;
  while (!hasPossibleMove(board) && attempts < 25) {
    board = buildBoard();
    attempts++;
  }
  return board;
}

// Clear matched cells and let remaining gems fall to fill the gaps, refilling
// empty space at the top of each column with fresh random gems.
function applyGravity(board, matched) {
  const next = board.slice();
  for (let c = 0; c < SIZE; c++) {
    const remaining = [];
    for (let r = 0; r < SIZE; r++) {
      const i = idx(r, c);
      if (!matched.has(i)) remaining.push(board[i]);
    }
    const missing = SIZE - remaining.length;
    const refill = [];
    for (let i = 0; i < missing; i++) refill.push(randomType());
    const full = refill.concat(remaining);
    for (let r = 0; r < SIZE; r++) next[idx(r, c)] = full[r];
  }
  return next;
}

export default function ZenMatch3() {
  const [board, setBoard] = useState(() => generateValidBoard());
  const [selected, setSelected] = useState(null);
  const [clearing, setClearing] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [clearedCount, setClearedCount] = useState(0);

  function stepResolve(currentBoard) {
    const matched = findMatches(currentBoard);
    if (matched.size === 0) {
      setBoard(currentBoard);
      setBusy(false);
      return;
    }
    setClearedCount((n) => n + matched.size);
    setClearing(matched);
    setBoard(currentBoard);
    setTimeout(() => {
      const fallen = applyGravity(currentBoard, matched);
      setClearing(new Set());
      setBoard(fallen);
      setTimeout(() => stepResolve(fallen), 140);
    }, 220);
  }

  function trySwap(a, b) {
    const trial = board.slice();
    [trial[a], trial[b]] = [trial[b], trial[a]];
    const matched = findMatches(trial);
    if (matched.size === 0) {
      setSelected(null);
      return;
    }
    setSelected(null);
    setBusy(true);
    stepResolve(trial);
  }

  function handleCellClick(cellIdx) {
    if (busy) return;
    if (selected === null) {
      setSelected(cellIdx);
      return;
    }
    if (selected === cellIdx) {
      setSelected(null);
      return;
    }
    if (!isAdjacent(selected, cellIdx)) {
      setSelected(cellIdx);
      return;
    }
    trySwap(selected, cellIdx);
  }

  function handleNewBoard() {
    setBoard(generateValidBoard());
    setSelected(null);
    setClearing(new Set());
    setBusy(false);
    setClearedCount(0);
  }

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">💎 Zen Match-3</h1>
        <p className="game-subtitle">Swap gems, make matches, keep going forever. No timer, no losing.</p>
      </div>
      <HowToPlay>
        <p>Classic match-3, minus the pressure.</p>
        <ul>
          <li>Tap a gem, then tap an adjacent gem to swap them.</li>
          <li>If the swap lines up 3 or more matching gems in a row or column, they clear and new gems fall in.</li>
          <li>If a swap wouldn't make a match, nothing happens — just pick again.</li>
          <li>There's no timer, no move limit, and no way to lose. Play as long as you like.</li>
        </ul>
      </HowToPlay>

      <p className="zen-match3-counter">✨ Gems cleared: {clearedCount}</p>

      <div className="zen-match3-board-wrap">
        <div className="zen-match3-board" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
          {board.map((type, i) => (
            <button
              key={i}
              type="button"
              className={`zen-match3-gem${selected === i ? ' is-selected' : ''}${clearing.has(i) ? ' is-clearing' : ''}`}
              onClick={() => handleCellClick(i)}
              aria-label={`Gem ${type + 1}`}
            >
              {GEM_EMOJI[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="zen-match3-footer">
        <button type="button" className="zen-match3-btn" onClick={handleNewBoard}>
          New Board
        </button>
      </div>
    </div>
  );
}
