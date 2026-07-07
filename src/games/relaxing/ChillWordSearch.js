import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';

const GRID_SIZE = 12;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// Horizontal, vertical, and both diagonals — all traced "forward" (top-left
// toward bottom-right / bottom-left). Players can still drag either
// direction along a placed word; the match check accepts both orderings.
const DIRECTIONS = [
  [0, 1],   // right
  [1, 0],   // down
  [1, 1],   // diagonal down-right
  [1, -1],  // diagonal down-left
];

// ~35 calm / cozy themed words, all uppercase, all <= 10 letters so they
// comfortably fit (and place diagonally) on a 12x12 grid.
const WORD_BANK = [
  'BREEZE', 'GARDEN', 'SUNSET', 'PILLOW', 'MEADOW', 'HAMMOCK', 'LAVENDER',
  'CANDLE', 'BLANKET', 'OCEAN', 'CLOUD', 'MORNING', 'WHISPER', 'FOREST',
  'RIVER', 'COZY', 'WARMTH', 'WILLOW', 'SERENE', 'HARMONY', 'LULLABY',
  'BREATHE', 'SUNRISE', 'RAINBOW', 'FEATHER', 'JASMINE', 'SOOTHE',
  'TRANQUIL', 'SEASHELL', 'HORIZON', 'TWILIGHT', 'MELODY', 'COMFORT',
  'STARLIGHT', 'PEACEFUL', 'DRIFTWOOD',
];

function randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
function randomLetter() { return ALPHABET[randInt(0, 25)]; }

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPuzzle() {
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
  const wordCount = randInt(6, 8);
  // Longer words first so they have the most room to be placed successfully.
  const candidates = shuffled(WORD_BANK).slice(0, wordCount).sort((a, b) => b.length - a.length);

  const placed = [];

  for (const word of candidates) {
    let success = false;
    for (let attempt = 0; attempt < 200 && !success; attempt++) {
      const [dr, dc] = DIRECTIONS[randInt(0, DIRECTIONS.length - 1)];
      const len = word.length;
      const rMax = dr === 1 ? GRID_SIZE - len : GRID_SIZE - 1;
      let cMin = 0, cMax = GRID_SIZE - 1;
      if (dc === 1) cMax = GRID_SIZE - len;
      else if (dc === -1) cMin = len - 1;
      if (rMax < 0 || cMax < cMin) continue;

      const r0 = randInt(0, rMax);
      const c0 = randInt(cMin, cMax);

      const cells = [];
      let ok = true;
      for (let i = 0; i < len; i++) {
        const r = r0 + dr * i, c = c0 + dc * i;
        const existing = grid[r][c];
        if (existing && existing !== word[i]) { ok = false; break; }
        cells.push({ r, c });
      }
      if (ok) {
        cells.forEach((cell, i) => { grid[cell.r][cell.c] = word[i]; });
        placed.push(word);
        success = true;
      }
    }
  }

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) grid[r][c] = randomLetter();
    }
  }

  return { grid, words: placed, key: Math.random().toString(36).slice(2) };
}

const cellKey = (r, c) => `${r}-${c}`;

export default function ChillWordSearch() {
  const [puzzle, setPuzzle] = useState(() => buildPuzzle());
  const [selecting, setSelecting] = useState(false);
  const [selStart, setSelStart] = useState(null);
  const [selCells, setSelCells] = useState([]);
  const [found, setFound] = useState({});

  const foundList = Object.keys(found);
  const allFound = foundList.length > 0 && foundList.length === puzzle.words.length;

  const newPuzzle = useCallback(() => {
    setPuzzle(buildPuzzle());
    setSelecting(false);
    setSelStart(null);
    setSelCells([]);
    setFound({});
  }, []);

  const selectedSet = useMemo(
    () => new Set(selCells.map((p) => cellKey(p.r, p.c))),
    [selCells]
  );

  const foundCellSet = useMemo(() => {
    const s = new Set();
    Object.values(found).forEach((cells) => cells.forEach((p) => s.add(cellKey(p.r, p.c))));
    return s;
  }, [found]);

  const handleCellPointerDown = useCallback((e, r, c) => {
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    setSelecting(true);
    setSelStart({ r, c });
    setSelCells([{ r, c }]);
  }, []);

  // Pointer capture keeps sending move/up events to the cell that was first
  // pressed, so we look up the real element under the finger/cursor via
  // elementFromPoint instead of relying on e.target here.
  const handlePointerMove = useCallback((e) => {
    if (!selecting || !selStart) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.dataset.row === undefined) return;
    const r = Number(el.dataset.row), c = Number(el.dataset.col);
    const dr = r - selStart.r, dc = c - selStart.c;
    const isStraight = dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
    if (!isStraight) return; // ignore drags that aren't a straight line; keep last valid trail
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
    const cells = [];
    for (let i = 0; i <= steps; i++) {
      cells.push({ r: selStart.r + stepR * i, c: selStart.c + stepC * i });
    }
    setSelCells(cells);
  }, [selecting, selStart]);

  const finishSelection = useCallback(() => {
    if (!selecting) return;
    setSelecting(false);
    if (selCells.length >= 2) {
      const letters = selCells.map((p) => puzzle.grid[p.r][p.c]).join('');
      const reversed = letters.split('').reverse().join('');
      const match = puzzle.words.find((w) => !found[w] && (w === letters || w === reversed));
      if (match) {
        setFound((f) => ({ ...f, [match]: selCells }));
      }
    }
    setSelCells([]);
    setSelStart(null);
  }, [selecting, selCells, puzzle, found]);

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🔤 Chill Word Search</h1>
        <p className="game-subtitle">Drag across letters to find each cozy word. No timer, no losing.</p>
      </div>

      <HowToPlay>
        <p><b>Objective:</b> find every word from the list hidden in the grid.</p>
        <ul>
          <li>Words are placed horizontally, vertically, or diagonally.</li>
          <li>Click and drag (or touch and swipe) in a straight line from a word's first letter to its last — either direction works.</li>
          <li>Correct words stay highlighted in the grid and get struck through in the list.</li>
          <li>Press "New Puzzle" any time for a fresh grid and word list.</li>
        </ul>
      </HowToPlay>

      <div className="word-search-layout">
        <div className="word-search-board-scroll">
          <div
            className="word-search-grid"
            onPointerMove={handlePointerMove}
            onPointerUp={finishSelection}
            onPointerCancel={finishSelection}
          >
            {puzzle.grid.map((row, r) => row.map((letter, c) => {
              const key = cellKey(r, c);
              const isFound = foundCellSet.has(key);
              const isSelected = !isFound && selectedSet.has(key);
              return (
                <div
                  key={key}
                  data-row={r}
                  data-col={c}
                  className={`word-search-cell${isFound ? ' found' : ''}${isSelected ? ' selected' : ''}`}
                  onPointerDown={(e) => handleCellPointerDown(e, r, c)}
                >
                  {letter}
                </div>
              );
            }))}
          </div>
        </div>

        <div className="word-search-side">
          <ul className="word-search-words">
            {puzzle.words.map((w) => (
              <li key={w} className={found[w] ? 'found' : ''}>{w}</li>
            ))}
          </ul>
          {allFound && <p className="word-search-complete">🎉 All found!</p>}
          <div className="word-search-controls">
            <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={newPuzzle}>New Puzzle</button>
          </div>
        </div>
      </div>
    </div>
  );
}
